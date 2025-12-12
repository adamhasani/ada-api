// src/api/downloader/ytmp3.js
const axios = require("axios");

module.exports = function (app) {

    // CORS
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") return res.sendStatus(204);
        next();
    });

    // ENDPOINT RESMI SESUAI PERMINTAAN
    app.get("/api/downloader/ytmp3", async (req, res) => {
        try {
            let url = req.query.url;
            const direct = req.query.direct === "1";

            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "Ada API",
                    error: "Parameter ?url= wajib diisi"
                });
            }

            // Validasi dasar YouTube
            const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
            if (!ytRegex.test(url)) {
                return res.status(400).json({
                    status: false,
                    creator: "Ada API",
                    error: "URL YouTube tidak valid"
                });
            }

            // Encode URL
            const encodedUrl = encodeURIComponent(url);

            // API Downloader Nekolabs
            const upstream = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`;

            const response = await axios.get(upstream, {
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 20000
            });

            const data = response.data;

            if (!data || !data.success || !data.result) {
                return res.status(502).json({
                    status: false,
                    creator: "Ada API",
                    error: "Upstream error",
                    debug: data
                });
            }

            const result = data.result;
            const downloadUrl = result.downloadUrl;

            if (!downloadUrl) {
                return res.status(502).json({
                    status: false,
                    creator: "Ada API",
                    error: "Upstream tidak menyediakan downloadUrl"
                });
            }

            // Redirect langsung? (Download otomatis)
            if (direct) return res.redirect(downloadUrl);

            // Jika tidak direct, kirim JSON
            return res.status(200).json({
                status: true,
                creator: "Ada API",
                metadata: {
                    title: result.title,
                    duration: result.duration,
                    cover: result.cover,
                    originalUrl: url
                },
                result: {
                    downloadUrl,
                    quality: result.quality,
                    format: result.format
                }
            });

        } catch (err) {
            console.error(err);

            if (err.response) {
                return res.status(502).json({
                    status: false,
                    creator: "Ada API",
                    error: "Upstream error",
                    upstreamStatus: err.response.status,
                    upstreamBody: err.response.data
                });
            }

            return res.status(500).json({
                status: false,
                creator: "Ada API",
                error: err.message
            });
        }
    });
};
