const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// =======================================================
// 1. ATUR FOLDER STATIS (Perbaikan Lokasi)
// =======================================================

// Arahkan ke folder 'api-gate' (Tempat index.html & script.js kamu)
app.use(express.static(path.join(__dirname, 'api-gate')));

// Folder src tetap (untuk settings.json)
app.use('/src', express.static(path.join(__dirname, 'src')));

// --- SAFE SETTINGS LOADER ---
let globalCreator = "Ada API";
try {
    const settingsPath = path.join(__dirname, 'src', 'settings.json');
    if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const json = JSON.parse(raw);
        globalCreator = json.apiSettings.creator || "Ada API";
        console.log("✅ Settings Loaded. Creator:", globalCreator);
    }
} catch (e) {
    console.log("⚠️ Gagal baca settings:", e.message);
}

// Middleware Inject Creator
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object' && !data.error) {
            data.creator = globalCreator;
        }
        return originalJson.call(this, data);
    };
    next();
});

// =======================================================
// 2. LOAD ROUTES (Perbaikan Nama Folder)
// =======================================================
function loadRoute(filePath) {
    try {
        require(filePath)(app);
        console.log(`✅ Route OK: ${filePath}`);
    } catch (e) {
        // Tampilkan error kalau file gagal dimuat
        console.error(`❌ Gagal Load [${filePath}]:`, e.message);
    }
}

// 👇 INI PERBAIKANNYA: Pakai 'downloader' (bukan 'download')
loadRoute('./src/api/downloader/ytmp3');
loadRoute('./src/api/downloader/ytmp4');

// Tool lain
loadRoute('./src/api/tools/tourl');
loadRoute('./src/api/random/bluearchive');

// =======================================================
// 3. HALAMAN UTAMA
// =======================================================
app.get('/', (req, res) => {
    // Ambil index.html dari dalam api-gate
    const indexPath = path.join(__dirname, 'api-gate', 'index.html');
    
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(500).send(`
                <h1>Error 500</h1>
                <p>File <b>index.html</b> tidak ketemu di folder 'api-gate'.</p>
                <p>Pastikan nama folder kamu benar 'api-gate' (huruf kecil semua).</p>
            `);
        }
    });
});

// Custom 404
app.use((req, res) => {
    res.status(404).json({
        status: false,
        error: "404 Not Found (Endpoint salah atau file API gagal dimuat)"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
