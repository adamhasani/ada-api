const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Setup Multer (Simpan di RAM)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // Naikkan limit ke 15MB
});

// --- FUNGSI UPLOAD KE CATBOX (PRIORITAS 1) ---
async function uploadToCatbox(fileBuffer, fileName) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fileBuffer, fileName);

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0 (AdaAPI/1.0)' }
    });
    
    // Catbox return text raw link
    if (response.data && response.data.includes('catbox.moe')) {
        return response.data;
    }
    throw new Error("Gagal upload ke Catbox");
}

// --- FUNGSI UPLOAD KE YUPRA (CADANGAN/FALLBACK) ---
async function uploadToYupra(fileBuffer, fileName) {
    const form = new FormData();
    form.append('file', fileBuffer, fileName);

    const response = await axios.post('https://cdn.yupra.my.id/upload', form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0 (AdaAPI/1.0)' }
    });

    // Cek respon JSON Yupra
    const data = response.data;
    const url = data.url || (data.files && data.files[0]?.url) || data.link;
    
    if (url) return url;
    throw new Error("Gagal upload ke Yupra");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({
                    status: false,
                    creator: "Ada API",
                    error: "File tidak ditemukan. Kirim via form-data dengan key 'file'."
                });
            }

            let resultUrl = null;
            let usedServer = "";

            // LOGIKA FALLBACK (Coba satu-satu)
            try {
                // 1. Coba Catbox dulu
                resultUrl = await uploadToCatbox(file.buffer, file.originalname);
                usedServer = "Catbox";
            } catch (errCatbox) {
                console.log("Catbox error, beralih ke Yupra...", errCatbox.message);
                try {
                    // 2. Kalau Catbox gagal, Coba Yupra
                    resultUrl = await uploadToYupra(file.buffer, file.originalname);
                    usedServer = "Yupra";
                } catch (errYupra) {
                    // 3. Kalau dua-duanya gagal, nyerah
                    throw new Error("Semua server upload (Catbox & Yupra) sedang down.");
                }
            }

            // Kirim Hasil
            res.status(200).json({
                status: true,
                creator: "Ada API",
                result: {
                    name: file.originalname,
                    size: file.size,
                    mime: file.mimetype,
                    server: usedServer, // Biar tau file masuk ke server mana
                    url: resultUrl
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                status: false, 
                error: error.message || "Internal Server Error" 
            });
        }
    });
};
