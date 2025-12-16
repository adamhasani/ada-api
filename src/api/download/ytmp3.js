const axios = require('axios');
const https = require('https');

module.exports = function(app) {
    app.get('/api/download/ytmp3', async (req, res) => {
        const url = req.query.url;

        if (!url) return res.status(400).json({ status: false, error: "Url required" });

        try {
            // 1. SETUP NETWORK YANG LEBIH KUAT
            // Force IPv4 (family: 4) untuk mengatasi masalah koneksi Vercel
            const agent = new https.Agent({  
                keepAlive: true, 
                rejectUnauthorized: false, // Bypass SSL Error
                minVersion: 'TLSv1' // Support server jadul
            });

            const axiosConfig = {
                httpsAgent: agent,
                timeout: 10000, // 10 Detik Timeout
                // PENTING: Force IPv4 agar tidak disconnect di Vercel
                family: 4, 
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.google.com/',
                    'Accept': 'application/json'
                }
            };

            const encodedUrl = encodeURIComponent(url);

            // 2. DAFTAR SERVER (Prioritas Yupra & Zenz karena lebih stabil di Vercel)
            const tasks = [
                // SERVER 1: YUPRA
                async () => {
                    const { data } = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodedUrl}`, axiosConfig);
                    const r = data.result || data;
                    if (!r || (!r.url && !r.download_url)) throw new Error('Yupra Fail');
                    return { 
                        server: 'Yupra', 
                        title: r.title, 
                        cover: r.thumb, 
                        downloadUrl: r.url || r.download_url 
                    };
                },
                // SERVER 2: ZENZ
                async () => {
                    const { data } = await axios.get(`https://api.zenzxz.my.id/api/downloader/ytmp3?url=${encodedUrl}`, axiosConfig);
                    if (!data || !data.result) throw new Error('Zenz Fail');
                    return { 
                        server: 'Zenz', 
                        title: data.result.title, 
                        cover: data.result.thumb, 
                        downloadUrl: data.result.url 
                    };
                },
                // SERVER 3: NEKO V1
                async () => {
                    const { data } = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`, axiosConfig);
                    if (!data || !data.success) throw new Error('Neko V1 Fail');
                    return { 
                        server: 'Neko V1', 
                        title: data.result.title, 
                        cover: data.result.cover, 
                        downloadUrl: data.result.downloadUrl 
                    };
                }
            ];

            // 3. EKSEKUSI BALAPAN (MANUAL & AMAN)
            // Mencoba server satu per satu sampai ada yang berhasil (Sequential)
            // Ini lebih aman daripada parallel untuk menghindari crash memori di Vercel Free Plan
            let winner = null;
            let errors = [];

            for (const task of tasks) {
                try {
                    winner = await task();
                    break; // Jika berhasil, stop loop
                } catch (e) {
                    errors.push(e.message);
                }
            }

            if (!winner) {
                throw new Error(`Semua server gagal. Details: ${errors.join(', ')}`);
            }

            // 4. KIRIM HASIL
            res.status(200).json({
                status: true,
                creator: "Ada API",
                server: winner.server,
                metadata: {
                    title: winner.title || 'Unknown',
                    cover: winner.cover || ''
                },
                result: {
                    downloadUrl: winner.downloadUrl
                }
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
