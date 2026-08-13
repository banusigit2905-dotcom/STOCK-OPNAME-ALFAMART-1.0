// ================================
// GANTI DENGAN URL GOOGLE SHEETS ANDA
// Bisa isi link "edit" biasa, script ini akan otomatis
// mengubahnya menjadi link export CSV yang benar.
// ================================
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Vap4wBxA_UCcdI2EVx_kn4-jBNYFMQj9znU5h5TeIHc/edit?usp=drivesdk';

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
    rows.shift(); // buang baris header

    stockData = rows
      .map(row => parseCsvLine(row))
      .map(cols => ({
        plu: cols[0]?.trim() || '',
        desc: cols[1]?.trim() || '',
        system: parseInt(cols[2]) || 0
      }))
      .filter(item => item.plu); // pastikan PLU tidak kosong

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
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">Tidak ada data</td></tr>`;
    return;
  }

  data.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="PLU">${item.plu}</td>
      <td data-label="Description">${item.desc}</td>
      <td data-label="Sistem">${item.system}</td>
      <td data-label="Fisik"><input type="number" id="fisik-${index}" value="0" oninput="calculateDiff(${index}, ${item.system})"></td>
      <td data-label="Selisih" id="diff-${index}">-${item.system}</td>
      <td data-label="Status" id="status-${index}" class="status-icon">🔴</td>
    `;
    tbody.appendChild(tr);
  });
}

// ➕➖ Menghitung Selisih dan Status
function calculateDiff(index, systemStock) {
  const fisikInput = document.getElementById(`fisik-${index}`);
  const diffTd = document.getElementById(`diff-${index}`);
  const statusTd = document.getElementById(`status-${index}`);

  const fisikVal = parseInt(fisikInput.value) || 0;
  const selisih = fisikVal - systemStock;

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

// 📄 Download hasil Stock Opname ke PDF
function downloadPDF() {
  const element = document.getElementById('stockTable');
  const opt = {
    margin: 10,
    filename: 'Hasil_Stock_Opname.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

// Jalankan saat aplikasi dibuka
fetchData();
