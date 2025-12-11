const axios = require('axios');

module.exports = function(app) {
    
    // 👇 KITA UBAH JADI PANJANG LAGI
    app.get('/api/downloader/ytmp3', async (req, res) => {
        
        const url = req.query.url;

        if (!url) {  
            return res.status(400).json({  
                status: false,  
                creator: "Ada API",  
                error: "Parameter 'url' is required."  
            });  
        }  

        // Validasi Regex
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;  
        if (!youtubeRegex.test(url)) {  
            return res.status(400).json({ status: false, error: "Invalid YouTube URL." });  
        }  

        try {  
            // Request ke Nekolabs
            const encodedUrl = encodeURIComponent(url);  
            const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`;  
            
            const response = await axios.get(nekolabsUrl, {  
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36' }  
            });  
            
            const data = response.data;  

            if (!data || !data.success) {  
                return res.status(500).json({ status: false, error: "Gagal mengambil data." });  
            }  

            // Response JSON (Struktur Hybrid)
            res.status(200).json({  
                status: true,  
                creator: "Ada API",  
                result: {  
                    type: "audio",
                    title: data.result.title,
                    thumb: data.result.cover,
                    url: data.result.downloadUrl, 
                    duration: data.result.duration,  
                    quality: data.result.quality,  
                    format: data.result.format  
                }  
            });  

        } catch (error) {  
            res.status(500).json({ status: false, error: error.message });  
        }  
    });
};
