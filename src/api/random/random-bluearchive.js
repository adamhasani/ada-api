const axios = require('axios');

module.exports = function(app) {
    // 👇 INI RAHASIANYA
    // Tulis '/random/ba' supaya linknya jadi: website-kamu.com/random/ba
    // Jangan tulis '/api/random/ba' kalau mau pendek.
    app.get('/random/ba', async (req, res) => {
        try {
            // 1. Ambil database link gambar
            const { data } = await axios.get('https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json');
            
            // 2. Acak gambar
            const randomUrl = data[Math.floor(Math.random() * data.length)];
            
            // 3. Redirect (Langsung pindah ke gambar, bukan download buffer)
            // Ini yang bikin tampilan bersih seperti Falcon API
            res.redirect(randomUrl);

        } catch (error) {
            res.status(500).json({ error: "Gagal mengambil gambar" });
        }
    });
};
