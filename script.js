// GANTI DENGAN URL CSV DARI GOOGLE SHEETS ANDA
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Vap4wBxA_UCcdI2EVx_kn4-jBNYFMQj9znU5h5TeIHc/edit?usp=drivesdk';

let stockData = [];

// 🔄 Ambil Data dari Google Sheets
async function fetchData() {
    try {
        const response = await fetch(SHEETS_URL);
        const data = await response.text();
        const rows = data.split('\n').slice(1); // Lewati header baris pertama
        
        stockData = rows.map(row => {
            const cols = row.split(',');
            return {
                plu: cols[0]?.trim(),
                desc: cols[1]?.trim(),
                system: parseInt(cols[2]) || 0
            };
        }).filter(item => item.plu); // Pastikan PLU tidak kosong

        renderTable(stockData);
    } catch (error) {
        console.error("Gagal mengambil data:", error);
        alert("Gagal memuat data. Pastikan URL Google Sheets sudah benar dan di-publish sebagai CSV.");
    }
}

// 📦 Menampilkan data ke tabel
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.plu}</td>
            <td>${item.desc}</td>
            <td>${item.system}</td>
            <td><input type="number" id="fisik-${index}" value="0" oninput="calculateDiff(${index}, ${item.system})"></td>
            <td id="diff-${index}">-${item.system}</td>
            <td id="status-${index}" class="status-icon">🔴</td>
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

    // Logika Warna Status
    if (selisih === 0) {
        statusTd.innerText = "🟢"; // Sesuai
    } else if (selisih < 0) {
        statusTd.innerText = "🔴"; // Minus
    } else {
        statusTd.innerText = "🟡"; // Plus
    }
}

// 🔎 Pencarian PLU & Description
function filterTable() {
    const pluFilter = document.getElementById('searchPLU').value.toLowerCase();
    const descFilter = document.getElementById('searchDesc').value.toLowerCase();
    const rows = document.querySelectorAll('#tableBody tr');

    rows.forEach(row => {
        const pluText = row.cells[0].innerText.toLowerCase();
        const descText = row.cells[1].innerText.toLowerCase();
        
        if (pluText.includes(pluFilter) && descText.includes(descFilter)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
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
