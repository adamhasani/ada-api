const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Limit Vercel Free tetap 4.5MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- 1. UPLOAD KE QU.AX (All Rounder - Tahan Lama) ---
async function uploadToQuax(buffer, filename) {
    const form = new FormData();
    form.append('files[]', buffer, filename);
    const res = await axios.post('https://qu.ax/upload.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.data && res.data.success) return res.data.files[0].url;
    throw new Error("Qu.ax Failed");
}

// --- 2. UPLOAD KE PIXELDRAIN (Spesialis Dokumen - 30 Hari+) ---
async function uploadToPixeldrain(buffer, filename) {
    // Pixeldrain pakai method PUT binary, bukan form-data biasa
    // Encode filename biar aman
    const safeFilename = encodeURIComponent(filename);
    const res = await axios.put(`https://pixeldrain.com/api/file/${safeFilename}`, buffer, {
        headers: { 
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/octet-stream' // Penting buat binary
        }
    });
    
    if (res.data && res.data.success) {
        return `https://pixeldrain.com/u/${res.data.id}`;
    }
    throw new Error("Pixeldrain Failed");
}

// --- 3. UPLOAD KE CATBOX (Permanen - Khusus Multimedia) ---
async function uploadToCatbox(buffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, filename);
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' }
    });
    if (typeof res.data === 'string' && res.data.includes('catbox.moe')) return res.data.trim();
    throw new Error("Catbox Failed");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });

            // Cek Limit Vercel
            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File terlalu besar! Max 4.5MB (Limit Vercel)." });
            }

            let resultUrl = null;
            let serverName = "";
            let errors = [];

            // --- LOGIKA CERDAS BERDASARKAN TIPE FILE ---
            const isDocument = file.mimetype.includes('pdf') || file.mimetype.includes('text') || file.mimetype.includes('msword') || file.mimetype.includes('office');

            try {
                // SKENARIO 1: Jika Dokumen, Prioritaskan Pixeldrain (Pasti masuk)
                // SKENARIO 2: Jika Gambar/Video, Prioritaskan Qu.ax
                
                if (isDocument) {
                    console.log("Dokumen terdeteksi, mencoba Pixeldrain...");
                    resultUrl = await uploadToPixeldrain(file.buffer, file.originalname);
                    serverName = "Pixeldrain (30 Hari)";
                } else {
                    console.log("Media terdeteksi, mencoba Qu.ax...");
                    resultUrl = await uploadToQuax(file.buffer, file.originalname);
                    serverName = "Qu.ax";
                }

            } catch (e1) {
                errors.push(e1.message);
                try {
                    // Fallback 1: Tukar posisi (Kalau dokumen gagal di pixeldrain, coba quax. Dst)
                    if (isDocument) {
                        resultUrl = await uploadToQuax(file.buffer, file.originalname);
                        serverName = "Qu.ax";
                    } else {
                        resultUrl = await uploadToCatbox(file.buffer, file.originalname);
                        serverName = "Catbox";
                    }
                } catch (e2) {
                    errors.push(e2.message);
                    try {
                        // Fallback Terakhir: Coba server yang belum dicoba
                        if (serverName !== "Pixeldrain") {
                             resultUrl = await uploadToPixeldrain(file.buffer, file.originalname);
                             serverName = "Pixeldrain";
                        } else {
                             throw new Error("Semua opsi habis.");
                        }
                    } catch (e3) {
                        errors.push(e3.message);
                         return res.status(500).json({
                            status: false,
                            creator: "Ada API",
                            error: "Gagal upload ke semua server (Qu.ax, Pixeldrain, Catbox).",
                            debug_trace: errors
                        });
                    }
                }
            }

            res.status(200).json({
                status: true,
                creator: "Ada API",
                result: {
                    name: file.originalname,
                    mime: file.mimetype,
                    size: file.size,
                    server: serverName,
                    url: resultUrl
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });
};            }

            res.status(200).json({
                status: true,
                creator: "Ada API",
                result: {
                    name: file.originalname,
                    mime: file.mimetype,
                    size: file.size,
                    server: serverName,
                    url: resultUrl
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                status: false, 
                error: error.message 
            });
        }
    });
};
