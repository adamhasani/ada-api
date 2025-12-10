const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Wajib
app.enable('trust proxy');
app.set("json spaces", 2);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- PENTING: IZINKAN AKSES FILE STATIS ---
// Baris ini yang bikin settings.json dan script.js bisa dibaca oleh browser
app.use(express.static('.')); 
app.use('/src', express.static(path.join(__dirname, 'src')));

// --- LOAD ROUTES API ---
// Pastikan file-file ini ADA di foldernya. Kalau tidak ada, hapus barisnya biar gak error.
try {
    // 1. Downloaders
    require('./src/api/download/ytmp3')(app);
    
    // 2. Tools & Upload
    require('./src/api/tools/tourl')(app);
    
    // 3. Random Images (Pastikan nama filenya ba.js atau bluearchive.js)
    // Cek folder src/api/random/ kamu, namanya apa? Sesuaikan di sini.
    // require('./src/api/random/ba')(app); 
    // ATAU
    require('./src/api/random/bluearchive')(app); 

    // 4. AI (Kalau ada)
    // require('./src/api/ai/luminai')(app);
    
    console.log("✅ Semua Route Berhasil Dimuat");
} catch (error) {
    console.log("⚠️ Ada Route yang Error/Hilang (Cek nama file):", error.message);
}

// --- HALAMAN UTAMA ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
