const axios = require("axios");
const yts = require("yt-search");

module.exports = async (req, res) => {
    // Bisa pakai parameter ?url=... atau ?q=...
    const input = req.query.url || req.query.q;

    // 1. Validasi Input
    if (!input) {
        return res.status(400).json({
            status: false,
            creator: "Rynn-UI",
            error: "Masukan parameter url atau q. Contoh: /api/ytmp3?q=dj+malam+pagi"
        });
    }

    try {
        let targetUrl = input;
        let videoMeta = null;

        // 2. Cek apakah input berupa Link atau Judul Lagu
        const isUrl = input.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/);

        if (!isUrl) {
            // Kalau inputnya JUDUL, kita cari dulu videonya pakai yt-search
            const search = await yts(input);
            if (!search.all || search.all.length === 0) {
                return res.status(404).json({ 
                    status: false, 
                    creator: "Rynn-UI",
                    error: "Lagu tidak ditemukan" 
                });
            }
            // Ambil video pertama
            targetUrl = search.all[0].url;
            videoMeta = {
                title: search.all[0].title,
                duration: search.all[0].timestamp,
                views: search.all[0].views,
                author: search.all[0].author.name
            };
        }

        // 3. Tembak API Nekolabs
        // URL Endpoint: https://api.nekolabs.web.id/downloader/youtube/v1?url=...&format=mp3
        const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${targetUrl}&format=mp3`;
        
        const response = await axios.get(nekolabsUrl);
        const data = response.data;

        // 4. Cek respon dari Nekolabs
        if (!data || !data.status) {
            return res.status(500).json({
                status: false,
                creator: "Rynn-UI",
                error: "Gagal mengambil data dari Nekolabs (API Down atau Limit)."
            });
        }

        // 5. Kirim Hasil ke User
        return res.status(200).json({
            status: true,
            creator: "Rynn-UI",
            metadata: {
                // Prioritas ambil data dari Nekolabs, kalau kosong ambil dari yt-search tadi
                title: data.data?.title || videoMeta?.title,
                originalUrl: targetUrl,
                ...videoMeta // Merge sisa info search
            },
            result: data.data // Isi download link dll dari Nekolabs
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            creator: "Rynn-UI",
            error: error.message
        });
    }
};
