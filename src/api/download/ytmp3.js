const axios = require('axios');
const https = require('https');

module.exports = function(app) {
    app.get('/api/download/ytmp3', async (req, res) => {
        const url = req.query.url;

        // 1. Validasi URL
        if (!url) return res.json({ status: false, error: "Mana link-nya? Parameter 'url' kosong." });

        try {
            const encodedUrl = encodeURIComponent(url);

            // Settingan Network (Anti-Timeout & Anti-Block)
            const agent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
            const axiosConfig = {
                httpsAgent: agent,
                timeout: 4500, // MAKSIMAL 4.5 Detik per server (biar total < 10 detik aman)
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            };

            // 2. LOGIKA: Jalankan Semua Server BERSAMAAN (Parallel)
            // Ini agar tidak kena limit 10 detik Vercel
            
            console.log('Mulai balapan download...');

            // Bungkus request biar tidak throw error, tapi return null kalau gagal
            const fetchFrom = async (name, apiLink) => {
                try {
                    const { data } = await axios.get(apiLink, axiosConfig);
                    // Cek Yupra/Neko/Zenz response pattern
                    if (!data) return null;
                    
                    // Normalisasi hasil agar seragam
                    let result = null;
                    if (name === 'Neko' && data.success) {
                        result = { title: data.result.title, url: data.result.downloadUrl, cover: data.result.cover };
                    } else if (name === 'Zenz' && data.result) {
                        result = { title: data.result.title, url: data.result.url, cover: data.result.thumb };
                    } else if (name === 'Yupra') {
                        const r = data.result || data;
                        if (r.url || r.download_url) {
                            result = { title: r.title, url: r.url || r.download_url, cover: r.thumb };
                        }
                    } else if (name === 'Ryzen') { // Backup tambahan
                        const r = data.result || data;
                        if (r.url) result = { title: r.title, url: r.url, cover: r.thumbnail };
                    }

                    if (result) return { server: name, ...result };
                    return null;
                } catch (e) {
                    console.log(`${name} Gagal: ${e.message}`);
                    return null;
                }
            };

            // List API yang akan ditembak barengan
            const requests = [
                fetchFrom('Yupra', `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodedUrl}`),
                fetchFrom('Ryzen', `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodedUrl}`),
                fetchFrom('Neko', `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`),
                fetchFrom('Zenz', `https://api.zenzxz.my.id/api/downloader/ytmp3?url=${encodedUrl}`)
            ];

            // Tunggu semua selesai, lalu ambil yang berhasil pertama kali
            const results = await Promise.all(requests);
            const winner = results.find(r => r !== null); // Ambil yang TIDAK null

            if (!winner) {
                // Jika semua null (gagal)
                throw new Error("Semua 4 server (Yupra, Ryzen, Neko, Zenz) tidak merespon atau memblokir IP Vercel.");
            }

            // 3. KIRIM HASIL
            res.json({
                status: true,
                creator: "Ada API",
                server: winner.server, // Info server yang menyelamatkanmu
                metadata: {
                    title: winner.title || 'Unknown',
                    cover: winner.cover || ''
                },
                result: {
                    downloadUrl: winner.winnerUrl || winner.url
                }
            });

        } catch (error) {
            console.error("FATAL ERROR:", error.message);
            // PENTING: Jangan pakai res.status(500) biar halaman error Vercel tidak muncul
            // Kita kirim JSON error saja biar kamu bisa baca di browser
            res.json({ 
                status: false, 
                creator: "Ada API", 
                message: "Gagal Total", 
                debug_error: error.message 
            });
        }
    });
};                }
            });

        } catch (error) {
            console.error("API FAIL:", error.message);
            // Tampilkan error aslinya di JSON biar kita tahu salahnya dimana
            res.status(500).json({ 
                status: false, 
                creator: "Ada API", 
                error: "Server Error",
                message: error.message 
            });
        }
    });
};                        })
                        .catch(err => {
                            // Kalau gagal, tambah counter
                            failureCount++;
                            // Jika SEMUA server (4) sudah gagal, baru kita nyerah (Reject)
                            if (failureCount === racers.length) {
                                reject(new Error("Maaf, semua server (Neko/Zenz/Yupra) sedang down atau sibuk."));
                            }
                        });
                });
            });

            // --- KIRIM HASIL KE USER ---
            res.status(200).json({
                status: true,
                creator: "Ada API",
                server: winner.server, // Info server mana yang menang
                metadata: {
                    title: winner.title || 'Unknown Title',
                    cover: winner.cover || 'https://i.imgur.com/MDSfT22.jpeg'
                },
                result: {
                    downloadUrl: winner.downloadUrl
                }
            });

        } catch (error) {
            console.error("Critical Error:", error.message);
            res.status(500).json({ 
                status: false, 
                creator: "Ada API", 
                error: "Internal Server Error",
                message: error.message 
            });
        }
    });
};
            // --- START BALAPAN ---
            const winner = await Promise.any([
                raceNekoV1(),
                raceNekoV2(),
                raceZenz(),
                raceYupra()
            ]);

            res.status(200).json({
                status: true,
                creator: "Ada API",
                server: winner.source,
                metadata: {
                    title: winner.title,
                    originalUrl: winner.originalUrl,
                    duration: winner.duration,
                    cover: winner.cover || 'https://i.imgur.com/MDSfT22.jpeg'
                },
                result: {
                    downloadUrl: winner.downloadUrl,
                    quality: winner.quality || '128kbps',
                    format: winner.format || 'mp3'
                }
            });

        } catch (error) {
            console.error("All racers failed:", error.message);
            res.status(500).json({ 
                status: false, 
                creator: "Ada API",
                error: "Gagal menghubungkan ke semua server (Network Error).",
                message: error.message
            });
        }
    });
};                    duration: res.duration || '-',
                    cover: res.thumb || res.thumbnail,
                    downloadUrl: res.url || res.download_url,
                    quality: '128kbps',
                    format: 'mp3'
                };
            };

            // --- START BALAPAN (4 SERVERS) ---
            // Mengambil siapa saja yang selesai & sukses duluan
            const winner = await Promise.any([
                raceNekoV1(),
                raceNekoV2(),
                raceZenz(),
                raceYupra()
            ]);

            // --- KIRIM RESPONSE ---
            res.status(200).json({
                status: true,
                creator: "Ada API",
                server: winner.source, // Debugging: Server mana yang menang
                metadata: {
                    title: winner.title,
                    originalUrl: winner.originalUrl,
                    duration: winner.duration,
                    cover: winner.cover || 'https://i.imgur.com/MDSfT22.jpeg'
                },
                result: {
                    downloadUrl: winner.downloadUrl,
                    quality: winner.quality || '128kbps',
                    format: winner.format || 'mp3'
                }
            });

        } catch (error) {
            console.error("All 4 racers failed:", error);
            res.status(500).json({ 
                status: false, 
                creator: "Ada API",
                error: "Semua server (Neko, Zenz, Yupra) sedang sibuk.",
                message: error.errors ? error.errors.map(e => e.message) : error.message
            });
        }
    });
};
