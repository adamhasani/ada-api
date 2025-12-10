const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.enable('trust proxy');
app.set("json spaces", 2);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- IZINKAN AKSES FILE STATIS (CSS, JS, JSON) ---
// Gunakan __dirname agar path-nya akurat di dalam server Vercel
app.use(express.static(__dirname)); 
app.use('/src', express.static(path.join(__dirname, 'src')));

// --- LOAD ROUTES API ---
try {
    // 1. Downloaders
    require('./src/api/download/ytmp3')(app);
    
    // 2. Tools
    require('./src/api/tools/tourl')(app);
    
    // 3. Random
    require('./src/api/random/bluearchive')(app); // Sesuaikan nama file kamu

    console.log("✅ Routes Loaded");
} catch (error) {
    console.log("⚠️ Route Error (Cek nama file):", error.message);
}

// --- HALAMAN UTAMA ---
app.get('/', (req, res) => {
    // Gunakan path.join(__dirname) untuk menemukan index.html yang 'sebelahan' dengan index.js
    const indexPath = path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
