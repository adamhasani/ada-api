const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Limit Vercel Free (Max 4.5 MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// --- 1. PIXELDRAIN (Spesialis Dokumen - 30 Hari) ---
async function uploadToPixeldrain(buffer, filename) {
    try {
        const safeFilename = encodeURIComponent(filename);
        const res = await axios.put(`https://pixeldrain.com/api/file/${safeFilename}`, buffer, {
            headers: { 'User-Agent': FAKE_USER_AGENT, 'Content-Type': 'application/octet-stream' },
            timeout: 15000
        });
        if (res.data && res.data.success) return `https://pixeldrain.com/u/${res.data.id}`;
    } catch (e) { throw new Error(`Pixeldrain: ${e.message}`); }
    throw new Error("Pixeldrain Failed");
}

// --- 2. TELEGRAPH / GRAPH.ORG (Spesialis Gambar/Video - Unlimited) ---
async function uploadToTelegraph(buffer, filename) {
    try {
        const form = new FormData();
        form.append('file', buffer, filename);
        // Menggunakan proxy graph.org (resmi Telegram open source) karena telegra.ph sering diblokir ISP
        const res = await axios.post('https://graph.org/upload', form, {
            headers: { ...form.getHeaders(), 'User-Agent': FAKE_USER_AGENT },
            timeout: 15000
        });
        if (res.data && res.data[0] && res.data[0].src) {
            return 'https://graph.org' + res.data[0].src;
        }
    } catch (e) { throw new Error(`Telegraph: ${e.message}`); }
    throw new Error("Telegraph Failed");
}

// --- 3. EDGEONE DROP (Request User) ---
async function uploadToEdgeOne(buffer, filename) {
    try {
        const form = new FormData();
        form.append('file', buffer, filename); // Asumsi key-nya 'file'
        const res = await axios.post('https://pages.edgeone.ai/drop', form, {
            headers: { ...form.getHeaders(), 'User-Agent': FAKE_USER_AGENT },
            timeout: 15000
        });
        // Deteksi berbagai kemungkinan respon
        const data = res.data;
        if (typeof data === 'string' && data.startsWith('http')) return data.trim();
        if (data.url) return data.url;
        if (data.link) return data.link;
    } catch (e) { throw new Error(`EdgeOne: ${e.message}`); }
    throw new Error("EdgeOne Failed");
}

// --- 4. UGUU.SE (Cadangan Stabil - 24 Jam) ---
async function uploadToUguu(buffer, filename) {
    try {
        const form = new FormData();
        form.append('files[]', buffer, filename);
        const res = await axios.post('https://uguu.se/upload.php', form, {
            headers: { ...form.getHeaders(), 'User-Agent': FAKE_USER_AGENT },
            timeout: 15000
        });
        if (res.data && res.data.success) return res.data.files[0].url;
    } catch (e) { throw new Error(`Uguu: ${e.message}`); }
    throw new Error("Uguu Failed");
}

// --- 5. CATBOX (Cadangan Terakhir) ---
async function uploadToCatbox(buffer, filename) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, filename);
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders(), 'User-Agent': FAKE_USER_AGENT },
            timeout: 15000
        });
        if (typeof res.data === 'string' && res.data.includes('catbox.moe')) return res.data.trim();
    } catch (e) { throw new Error(`Catbox: ${e.message}`); }
    throw new Error("Catbox Failed");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });

            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File max 4.5MB (Limit Vercel)." });
            }

            // DETEKSI TIPE FILE
            // Dokumen: PDF, TXT, DOCX, ZIP
            const isDocument = file.mimetype.match(/pdf|text|word|office|plain|application|zip|rar/);
            // Gambar: Image, Video
            const isMedia = file.mimetype.match(/image|video/);

            // STRATEGI URUTAN SERVER
            let providers;
            
            if (isMedia) {
                // Media: Telegraph (Paling Cepat) -> EdgeOne -> Uguu -> Catbox -> Pixeldrain
                providers = [
                    { name: 'Telegraph (Graph.org)', fn: uploadToTelegraph },
                    { name: 'EdgeOne Drop', fn: uploadToEdgeOne },
                    { name: 'Uguu.se', fn: uploadToUguu },
                    { name: 'Catbox', fn: uploadToCatbox },
                    { name: 'Pixeldrain', fn: uploadToPixeldrain }
                ];
            } else {
                // Dokumen: Pixeldrain (Paling Stabil) -> EdgeOne -> Uguu -> Catbox
                providers = [
                    { name: 'Pixeldrain', fn: uploadToPixeldrain },
                    { name: 'EdgeOne Drop', fn: uploadToEdgeOne },
                    { name: 'Uguu.se', fn: uploadToUguu },
                    { name: 'Catbox', fn: uploadToCatbox }
                ];
            }

            let resultUrl = null;
            let serverName = "";
            let errors = [];

            // LOOPING PERCOBAAN
            for (const provider of providers) {
                try {
                    console.log(`Mencoba upload ke ${provider.name}...`);
                    resultUrl = await provider.fn(file.buffer, file.originalname);
                    serverName = provider.name;
                    break; // SUKSES? STOP.
                } catch (e) {
                    console.log(`${provider.name} Gagal: ${e.message}`);
                    errors.push(`${provider.name}: ${e.message}`);
                }
            }

            if (!resultUrl) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Semua server menolak file ini.",
                    debug_trace: errors
                });
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
};