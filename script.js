// ================================
// GANTI DENGAN URL GOOGLE SHEETS ANDA
// Bisa isi link "edit" biasa, script ini akan otomatis
// mengubahnya menjadi link export CSV yang benar.
// ================================
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/187aeuiG2er1VLGTo_gxVaNzsvIagpkb42N6JEBEl6Ss/edit?usp=drivesdk';

let stockData = [];

// 🔧 Ubah link Google Sheets (edit/share) menjadi link export CSV
function toCsvUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return url;
  const sheetId = match[1];

  // Ambil gid jika ada di URL, default 0 (sheet pertama)
  const gidMatch = url.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// 🔧 Parser CSV sederhana yang tetap aman untuk koma di dalam tanda kutip
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(v => v.trim());
}

// 🔄 Ambil Data dari Google Sheets
async function fetchData() {
  const loadingEl = document.getElementById('loading');
  loadingEl.classList.remove('hidden');
  loadingEl.innerText = '⏳ Memuat data...';

  try {
    const csvUrl = toCsvUrl(SHEETS_URL);
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error('Response tidak OK, pastikan Sheet sudah dibagikan (Anyone with the link).');
    }

    const data = await response.text();

    // Jaga-jaga kalau Google malah mengembalikan halaman HTML login
    if (data.trim().startsWith('<')) {
      throw new Error('Sheet belum bisa diakses publik. Set sharing ke "Anyone with the link - Viewer".');
    }

    const rows = data.split(/\r?\n/).filter(r => r.trim() !== '');

    // Sheet ini punya 3 baris judul/header sebelum data (baris 1-3),
    // dan datanya mulai dari baris ke-4.
    // Kolom: A=No B=PLU C=DESCRIPTION D=OH(Sistem)
    const HEADER_ROWS = 3;
    const COL_PLU = 1;    // kolom B
    const COL_DESC = 2;   // kolom C
    const COL_SISTEM = 3; // kolom D

    stockData = rows
      .slice(HEADER_ROWS)
      .map(row => parseCsvLine(row))
      .map(cols => {
        const systemVal = parseInt(cols[COL_SISTEM]) || 0;
        return {
          plu: cols[COL_PLU]?.trim() || '',
          desc: cols[COL_DESC]?.trim() || '',
          system: systemVal,
          originalSystem: systemVal // disimpan untuk fitur Reset On Hand
        };
      })
      .filter(item => item.plu && /^\d+$/.test(item.plu)); // pastikan PLU angka & tidak kosong

    loadingEl.classList.add('hidden');
    renderTable(stockData);
  } catch (error) {
    console.error('Gagal mengambil data:', error);
    loadingEl.innerText = '⚠️ Gagal memuat data: ' + error.message;
  }
}

// 📦 Menampilkan data ke tabel
function renderTable(data) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">Tidak ada data</td></tr>`;
    return;
  }

  data.forEach((item, index) => {
    item.fisikFillCount = 0; // penanda kolom fisik mana yang sudah terisi

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="PLU">${item.plu}</td>
      <td data-label="Description" id="desc-${index}"></td>
      <td data-label="Sistem" id="sistem-${index}"></td>
      <td data-label="Fisik 1"><input type="number" class="fisik-input" id="fisik1-${index}" value="0" oninput="calculateDiff(${index})"></td>
      <td data-label="Fisik 2"><input type="number" class="fisik-input" id="fisik2-${index}" value="0" oninput="calculateDiff(${index})"></td>
      <td data-label="Fisik 3"><input type="number" class="fisik-input" id="fisik3-${index}" value="0" oninput="calculateDiff(${index})"></td>
      <td data-label="Selisih" id="diff-${index}">-${item.system}</td>
      <td data-label="Status" id="status-${index}" class="status-icon">🔴</td>
    `;
    tbody.appendChild(tr);
    renderDescCell(index);
    renderSistemCell(index);
  });
}

// ===== Description: klik untuk tambah qty ke kolom Fisik 1/2/3 =====
function renderDescCell(index) {
  const td = document.getElementById(`desc-${index}`);
  td.dataset.open = '0';
  td.innerHTML = `<span class="desc-text clickable-cell" onclick="openAddFisik(${index})" title="${stockData[index].desc}">${stockData[index].desc}</span>`;
}

function openAddFisik(index) {
  const td = document.getElementById(`desc-${index}`);

  // Toggle: kalau sedang terbuka, tutup lagi tanpa menyimpan
  if (td.dataset.open === '1') {
    renderDescCell(index);
    return;
  }
  td.dataset.open = '1';

  td.innerHTML = `
    <div class="inline-edit">
      <div class="inline-edit-fullname">${stockData[index].desc}</div>
      <div class="inline-edit-row">
        <input type="number" id="addfisik-${index}" placeholder="Qty">
        <button type="button" onclick="saveAddFisik(${index})">Simpan</button>
      </div>
    </div>
  `;
  const input = document.getElementById(`addfisik-${index}`);
  input.focus();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveAddFisik(index);
  });
}

// Isi kolom Fisik 1 → 2 → 3 secara berurutan.
// Input ke-3 dan seterusnya hanya menambah (akumulasi) di kolom 3.
function saveAddFisik(index) {
  const addInput = document.getElementById(`addfisik-${index}`);
  const addVal = parseInt(addInput.value) || 0;

  const fillCount = stockData[index].fisikFillCount || 0;

  if (fillCount === 0) {
    document.getElementById(`fisik1-${index}`).value = addVal;
  } else if (fillCount === 1) {
    document.getElementById(`fisik2-${index}`).value = addVal;
  } else {
    const f3 = document.getElementById(`fisik3-${index}`);
    f3.value = (parseInt(f3.value) || 0) + addVal;
  }

  stockData[index].fisikFillCount = fillCount + 1;

  calculateDiff(index);
  renderDescCell(index);
}

// ===== Sistem: klik untuk edit manual =====
function renderSistemCell(index) {
  const td = document.getElementById(`sistem-${index}`);
  td.innerHTML = `<span class="clickable-cell" onclick="editSistem(${index})">${stockData[index].system}</span>`;
}

function editSistem(index) {
  const td = document.getElementById(`sistem-${index}`);
  const currentVal = stockData[index].system;
  td.innerHTML = `<input type="number" id="editsistem-${index}" value="${currentVal}">`;

  const input = document.getElementById(`editsistem-${index}`);
  input.focus();
  input.select();
  input.addEventListener('blur', () => saveSistem(index));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });
}

function saveSistem(index) {
  const input = document.getElementById(`editsistem-${index}`);
  const newVal = parseInt(input.value) || 0;
  stockData[index].system = newVal;

  renderSistemCell(index);
  calculateDiff(index);
}

// ➕➖ Menghitung Selisih dan Status (total dari Fisik 1+2+3)
function calculateDiff(index) {
  const f1 = parseInt(document.getElementById(`fisik1-${index}`).value) || 0;
  const f2 = parseInt(document.getElementById(`fisik2-${index}`).value) || 0;
  const f3 = parseInt(document.getElementById(`fisik3-${index}`).value) || 0;
  const totalFisik = f1 + f2 + f3;

  const diffTd = document.getElementById(`diff-${index}`);
  const statusTd = document.getElementById(`status-${index}`);

  const systemStock = stockData[index].system;
  const selisih = totalFisik - systemStock;

  diffTd.innerText = selisih > 0 ? `+${selisih}` : selisih;

  if (selisih === 0) {
    statusTd.innerText = '🟢'; // Sesuai
  } else if (selisih < 0) {
    statusTd.innerText = '🔴'; // Minus
  } else {
    statusTd.innerText = '🟡'; // Plus
  }
}

// 🔎 Pencarian PLU & Description
function filterTable() {
  const pluFilter = document.getElementById('searchPLU').value.toLowerCase();
  const descFilter = document.getElementById('searchDesc').value.toLowerCase();
  const rows = document.querySelectorAll('#tableBody tr');

  rows.forEach(row => {
    if (!row.cells[1]) return; // lewati baris "Tidak ada data"
    const pluText = row.cells[0].innerText.toLowerCase();
    const descText = row.cells[1].innerText.toLowerCase();

    if (pluText.includes(pluFilter) && descText.includes(descFilter)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// 🔄 Reset semua input Fisik (1,2,3) kembali ke 0
function resetAll() {
  if (!confirm('Reset semua angka Fisik ke 0?')) return;

  stockData.forEach((item, index) => {
    const f1 = document.getElementById(`fisik1-${index}`);
    const f2 = document.getElementById(`fisik2-${index}`);
    const f3 = document.getElementById(`fisik3-${index}`);
    if (f1 && f2 && f3) {
      f1.value = 0;
      f2.value = 0;
      f3.value = 0;
      item.fisikFillCount = 0;
      calculateDiff(index);
    }
  });
}

// 🔁 Reset On Hand ke nilai awal dari spreadsheet
function resetOnHand() {
  if (!confirm('Reset semua nilai On Hand ke nilai awal dari spreadsheet?')) return;

  stockData.forEach((item, index) => {
    item.system = item.originalSystem;
    renderSistemCell(index);
    calculateDiff(index);
  });
}
// 📄 Download hasil Stock Opname ke PDF
function downloadPDF() {
  const original = document.getElementById('stockTable');

  // html2canvas kesulitan merender elemen <input> (sering hasilnya kosong/blank).
  // Solusi: buat salinan tabel, ganti semua <input> jadi teks biasa.
  const clone = original.cloneNode(true);

  clone.querySelectorAll('input').forEach(input => {
    const span = document.createElement('span');
    span.innerText = input.value || '0';
    input.parentNode.replaceChild(span, input);
  });

  // Bersihkan elemen interaktif (form input Simpan dsb) jika ada yang masih terbuka
  clone.querySelectorAll('.inline-edit').forEach(el => {
    const span = document.createElement('span');
    span.innerText = el.querySelector('.inline-edit-fullname')?.innerText || '';
    el.parentNode.replaceChild(span, el);
  });

  // Tempatkan salinan di luar layar dengan lebar penuh (tidak terpotong scroll)
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.background = '#ffffff';
  wrapper.style.padding = '10px';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const opt = {
    margin: 8,
    filename: 'Hasil_Stock_Opname.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opt).from(clone).save().then(() => {
    document.body.removeChild(wrapper);
  }).catch((err) => {
    console.error('Gagal membuat PDF:', err);
    document.body.removeChild(wrapper);
    alert('Gagal membuat PDF. Coba lagi.');
  });
}

// Jalankan saat aplikasi dibuka
fetchData();
