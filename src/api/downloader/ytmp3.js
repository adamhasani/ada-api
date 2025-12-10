const axios = require('axios');

module.exports = function(app) {
    app.get('/api/download/ytmp3', async (req, res) => {
        // Kita ubah jadi menangkap parameter 'url'
        const url = req.query.url;

        // 1. Cek apakah ada parameter url
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Parameter 'url' is required."
            });
        }

        // 2. Validasi: Apakah ini beneran Link YouTube?
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!youtubeRegex.test(url)) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Invalid YouTube URL. Harap masukkan link YouTube yang valid."
            });
        }

        try {
            // 3. Langsung tembak ke Nekolabs karena URL sudah valid
            const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${url}&format=mp3`;
            const response = await axios.get(nekolabsUrl);
            const data = response.data;

            if (!data || !data.status) {
                return res.status(500).json({
                    status: false,
                    error: "Gagal mengambil data dari server downloader."
                });
            }

            // 4. Kirim Hasil
            res.status(200).json({
                status: true,
                creator: "Ada API",
                metadata: {
                    title: data.data.title,
                    originalUrl: url
                },
                result: data.data
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
