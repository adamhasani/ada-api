const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Limit Vercel (4.5MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// "Topeng" cURL supaya server mengira kita adalah Terminal Linux
const CURL_AGENT = 'curl/7.68.0'; 

// --- 1. FILE.IO (Target Utama - Auto Hapus/Expires) ---
async function uploadToFileio(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    
    // Trik: Set expires biar dianggap request valid (bukan spam bot)
    form.append('expires', '3d'); // File tahan 3 hari
    form.append('maxDownloads', '100'); 
    
    const res = await axios.post('https://file.io', form, {
        headers: { 
            ...form.getHeaders(), 
            'User-Agent': CURL_AGENT, // Nyamar jadi cURL
            'Accept': 'application/json' // Minta JSON baik-baik
        }
    });

    if (res.data && res.data.success) {
        return res.data.link;
    }
    throw new Error(`File.io Blocked/Error`);
}

// --- 2. 0x0.ST (Cadangan Paling Stabil - The Null Pointer) ---
async function uploadTo0x0(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    
    const res = await axios.post('https://0x0.st', form, {
        headers: { 
            ...form.getHeaders(), 
            'User-Agent': CURL_AGENT 
        }
    });
    
    // 0x0.st balikin body string URL mentah (misal: https://0x0.st/abcd.jpg)
    if (res.data && typeof res.data === 'string' && res.data.startsWith('http')) {
        return res.data.trim();
    }
    throw new Error("0x0.st Failed");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });

            // Cek Limit Vercel (PENTING)
            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File max 4.5MB (Limit Vercel)." });
            }

            // LIST SERVER (Urutan: File.io -> 0x0.st)
            // Tidak perlu membedakan Gambar/Dokumen karena kedua server ini support SEMUA file.
            const providers = [
                { name: 'File.io', fn: () => uploadToFileio(file.buffer, file.originalname) },
                { name: '0x0.st', fn: () => uploadTo0x0(file.buffer, file.originalname) }
            ];

            let resultUrl = null;
            let serverName = "";
            let errors = [];

            // LOOPING PERCOBAAN
            for (const provider of providers) {
                try {
                    console.log(`Mencoba upload ke ${provider.name}...`);
                    resultUrl = await provider.fn();
                    serverName = provider.name;
                    break; // Kalau berhasil, STOP looping
                } catch (e) {
                    const msg = e.response ? `Status ${e.response.status}` : e.message;
                    console.log(`${provider.name} Gagal: ${msg}`);
                    errors.push(`${provider.name}: ${msg}`);
                }
            }

            // Jika semua gagal
            if (!resultUrl) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Gagal upload. Semua server menolak.",
                    debug_trace: errors
                });
            }

            // Berhasil
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
};