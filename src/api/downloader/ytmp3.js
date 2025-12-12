const axios = require('axios');

module.exports = function(app) {

    // 👇 INI SUDAH BENAR SEKARANG. Sesuai nama folder 'downloader'.
    app.get('/api/downloader/ytmp3', async (req, res) => {
        const url = req.query.url;

        // 1. Validasi Input
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Parameter 'url' is required."
            });
        }

        // 2. Validasi Link YouTube
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!youtubeRegex.test(url)) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Invalid YouTube URL."
            });
        }

        try {
            // 3. Request ke Nekolabs (Logic yang kamu suka)
            const encodedUrl = encodeURIComponent(url);
            const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`;
            
            const response = await axios.get(nekolabsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 9000
            });
            
            const data = response.data;

            // 4. Cek Sukses
            if (!data || !data.success) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Gagal mengambil data dari server downloader.",
                    debug: data 
                });
            }

            // 5. Kirim Hasil
            res.status(200).json({
                status: true,
                creator: "Ada API",
                result: {
                    type: "audio",
                    title: data.result.title,
                    thumb: data.result.cover,
                    url: data.result.downloadUrl,
                    quality: data.result.quality,
                    format: data.result.format
                }
            });

        } catch (error) {
            console.error(error);
            if (error.code === 'ECONNABORTED') {
                return res.status(504).json({ status: false, error: "Server Timeout (Nekolabs sibuk)." });
            }
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
