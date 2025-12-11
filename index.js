const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. KONFIGURASI FOLDER (PENTING!) ---
// Kita suruh server "masuk" ke folder api-page untuk cari CSS/JS
app.use(express.static(path.join(process.cwd(), 'api-page')));

// Kita juga izinkan server baca folder src (untuk settings.json)
app.use('/src', express.static(path.join(process.cwd(), 'src')));

// --- 2. LOAD ROUTE API ---
function loadRoute(filePath) {
    try {
        require(filePath)(app);
        console.log(`✅ Loaded: ${filePath}`);
    } catch (e) {
        console.log(`⚠️ Skip: ${filePath} (${e.message})`);
    }
}

// Pastikan file-file ini ada di folder src/api/...
loadRoute('./src/api/download/ytmp3');
loadRoute('./src/api/download/ytmp4');
loadRoute('./src/api/tools/tourl');
loadRoute('./src/api/random/bluearchive'); 

// --- 3. HALAMAN UTAMA ---
app.get('/', (req, res) => {
    // Ambil index.html DARI DALAM FOLDER api-page
    const indexPath = path.join(process.cwd(), 'api-page', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(500).send(`
            <h1>Error 500</h1>
            <p>File index.html tidak ditemukan di dalam folder 'api-page'.</p>
            <p>Cek apakah nama foldernya benar 'api-page'?</p>
        `);
    }
});

app.listen(PORT, () => console.log(`Server running at ${PORT}`));
module.exports = app;
