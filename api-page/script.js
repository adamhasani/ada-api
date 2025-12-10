/**
 * ADA API CONSOLE - MAIN SCRIPT (ULTIMATE HYBRID EDITION)
 * -----------------------------------------------------
 * Version: 3.0.0 (Hybrid View)
 * Features:
 * - Hybrid UI: Tampilan Download Button untuk User Biasa
 * - Developer Mode: Tetap bisa liat JSON asli
 * - Smart Upload System
 * - Anti-Stuck Modal Fix
 * - Visual Effects (Parallax, Glow, Toast)
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ================================================================
    // 1. DOM ELEMENTS CACHE
    // ================================================================
    const DOM = {
        // Layout
        body: document.body,
        
        // Sidebar & Nav
        sideNav: document.querySelector(".side-nav"),
        sideNavLinks: document.querySelectorAll(".side-nav-link"),
        menuToggle: document.getElementById("menuToggle"),
        navCollapseBtn: document.getElementById("collapseBtn"),
        sidebarBackdrop: document.getElementById("sidebarBackdrop"),
        
        // Search & Filter
        searchInput: document.getElementById("searchInput"),
        clearSearch: document.getElementById("clearSearch"),
        apiFilters: document.getElementById("apiFilters"),
        
        // Theme Controls
        themeToggle: document.getElementById("themeToggle"),
        themePreset: document.getElementById("themePreset"),
        
        // Content Area
        apiContent: document.getElementById("apiContent"),
        versionBadge: document.getElementById("versionBadge"),
        
        // Request Box (WhatsApp)
        apiRequestInput: document.getElementById("apiRequestInput"),
        sendApiRequest: document.getElementById("sendApiRequest"),
        
        // Logs & History
        logsConsole: document.getElementById("liveLogs"),
        requestHistoryList: document.getElementById("requestHistoryList"),
        
        // Visual Effects
        bannerParallax: document.getElementById("bannerParallax"),
        cursorGlow: document.getElementById("cursorGlow"),
        
        // MODAL ELEMENTS
        modalEl: document.getElementById("apiResponseModal"),
        modalTitle: document.getElementById("modalTitle"),
        modalSubtitle: document.getElementById("modalSubtitle"),
        endpointText: document.getElementById("endpointText"),
        modalStatusLine: document.getElementById("modalStatusLine"),
        modalLoading: document.getElementById("modalLoading"),
        apiResponseContent: document.getElementById("apiResponseContent"),
        
        // Action Buttons inside Modal
        copyEndpointBtn: document.getElementById("copyEndpointBtn"),
        copyCurlBtn: document.getElementById("copyCurlBtn"),
    };

    const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl, { keyboard: true }) : null;

    // ================================================================
    // 2. STATE MANAGEMENT
    // ================================================================
    let appSettings = null;
    let currentApiItem = null;
    
    // Load Data
    let userFavorites = loadLocalStorage("ada-api-fav", []);
    let userHistory = loadLocalStorage("ada-api-history", []);
    let currentThemeMode = loadLocalStorage("ada-ui-mode", "light");
    let currentThemePreset = loadLocalStorage("ada-ui-theme", "emerald-gold");

    const fallbackCategories = [{ name: "System", items: [{ name: "Status Check", path: "/status", method: "GET", status: "unknown" }] }];

    // ================================================================
    // 3. UTILITY FUNCTIONS
    // ================================================================
    
    function loadLocalStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch { return defaultValue; }
    }

    function saveLocalStorage(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }

    function appendLog(message, type = "info") {
        if (!DOM.logsConsole) return;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const logLine = document.createElement("div");
        logLine.className = `log-line log-${type}`;
        logLine.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${message}</span>`;
        DOM.logsConsole.appendChild(logLine);
        DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
    }

    function beautifyJSON(jsonString) {
        try {
            const jsonObj = JSON.parse(jsonString);
            return JSON.stringify(jsonObj, null, 2);
        } catch { return jsonString; }
    }

    // TOAST SYSTEM
    function showToast(message, type = "success") {
        let toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999;";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0 show`;
        toast.style.marginBottom = "10px";
        toast.style.padding = "10px 20px";
        toast.style.borderRadius = "8px";
        toast.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div></div>`;

        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ================================================================
    // 4. THEME ENGINE
    // ================================================================

    function initThemeEngine() {
        applyThemeMode(currentThemeMode);
        applyThemePreset(currentThemePreset);

        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener("change", (e) => applyThemeMode(e.target.checked ? "dark" : "light"));
        }

        if (DOM.themePreset) {
            DOM.themePreset.addEventListener("change", (e) => {
                const map = { "emerald": "emerald-gold", "noir": "noir", "ivory": "royal-amber", "cyber": "cyber-glow" };
                applyThemePreset(map[e.target.value] || "emerald-gold");
            });
        }
    }

    function applyThemeMode(mode) {
        currentThemeMode = mode;
        saveLocalStorage("ada-ui-mode", mode);
        DOM.body.classList.toggle("dark-mode", mode === "dark");
        if (DOM.themeToggle) DOM.themeToggle.checked = (mode === "dark");
    }

    function applyThemePreset(presetKey) {
        currentThemePreset = presetKey;
        saveLocalStorage("ada-ui-theme", presetKey);
        DOM.body.setAttribute("data-theme", presetKey);
        if (DOM.themePreset) {
            const reverseMap = { "emerald-gold": "emerald", "noir": "noir", "royal-amber": "ivory", "cyber-glow": "cyber" };
            DOM.themePreset.value = reverseMap[presetKey] || "emerald";
        }
    }

    // ================================================================
    // 5. SIDEBAR Logic
    // ================================================================

    function initSidebarLogic() {
        const toggle = () => DOM.sideNav.classList.toggle("collapsed");
        const mobileToggle = () => {
            const open = DOM.sideNav.classList.contains("open");
            DOM.sideNav.classList.toggle("open", !open);
            DOM.body.classList.toggle("sidebar-open", !open);
            if(DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.toggle("show", !open);
        };

        if (DOM.menuToggle) DOM.menuToggle.onclick = () => window.innerWidth < 992 ? mobileToggle() : toggle();
        if (DOM.navCollapseBtn) DOM.navCollapseBtn.onclick = toggle;
        if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.onclick = mobileToggle;

        DOM.sideNavLinks.forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth < 992) mobileToggle();
            });
        });
    }

    // ================================================================
    // 6. FAVORITES & HISTORY
    // ================================================================

    function toggleFavorite(path, btn) {
        const index = userFavorites.indexOf(path);
        if (index === -1) {
            userFavorites.push(path);
            btn.classList.add("favorited");
            btn.closest(".api-item").dataset.fav = "1";
            showToast("Ditambahkan ke Favorit");
        } else {
            userFavorites.splice(index, 1);
            btn.classList.remove("favorited");
            btn.closest(".api-item").dataset.fav = "0";
            showToast("Dihapus dari Favorit", "danger");
        }
        saveLocalStorage("ada-api-fav", userFavorites);
    }

    function addToHistory(item) {
        userHistory.unshift({ name: item.name, path: item.path, time: new Date().toISOString() });
        if (userHistory.length > 20) userHistory = userHistory.slice(0, 20);
        saveLocalStorage("ada-api-history", userHistory);
        renderHistoryList();
    }

    function renderHistoryList() {
        if (!DOM.requestHistoryList) return;
        DOM.requestHistoryList.innerHTML = "";
        userHistory.forEach(h => {
            const li = document.createElement("li");
            li.className = "history-item";
            li.innerHTML = `<span class="history-name text-truncate">${h.name}</span><span class="history-path text-muted small text-truncate">${h.path}</span>`;
            DOM.requestHistoryList.appendChild(li);
        });
    }

    // ================================================================
    // 7. RENDER API CARDS
    // ================================================================

    function renderApiContent() {
        if (!DOM.apiContent) return;
        const categories = (appSettings && appSettings.categories) ? appSettings.categories : fallbackCategories;
        
        // Filters
        if (DOM.apiFilters) {
            DOM.apiFilters.innerHTML = `<button class="filter-chip active" data-filter="all">Semua</button>`;
            categories.forEach(c => DOM.apiFilters.innerHTML += `<button class="filter-chip" data-filter="${c.name}">${c.name}</button>`);
            DOM.apiFilters.innerHTML += `<button class="filter-chip" data-filter="favorites">Favorit</button>`;
            
            DOM.apiFilters.onclick = (e) => {
                if (!e.target.classList.contains("filter-chip")) return;
                DOM.apiFilters.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                filterApiItems(e.target.dataset.filter);
            };
        }
        
        // Cards
        DOM.apiContent.innerHTML = "";
        const row = document.createElement("div");
        row.className = "row g-4";

        categories.forEach(cat => {
            (cat.items || []).forEach(item => {
                const col = document.createElement("div");
                col.className = "col-12 col-md-6 col-lg-4 api-item";
                col.dataset.category = cat.name;
                col.dataset.fav = userFavorites.includes(item.path) ? "1" : "0";
                
                col.innerHTML = `
                    <article class="api-card h-100">
                        <div class="api-card-header d-flex justify-content-between align-items-start mb-2">
                            <h4 class="api-card-title h6 fw-bold mb-0 text-truncate">${item.name}</h4>
                            <div class="d-flex align-items-center gap-2">
                                <span class="http-badge http-${(item.method||'GET').toLowerCase()} badge">${item.method||'GET'}</span>
                                <span class="endpoint-status-pill badge bg-secondary" data-path="${item.path}">...</span>
                            </div>
                        </div>
                        <p class="api-card-desc text-muted small mb-3">${item.desc || ''}</p>
                        <div class="api-card-footer mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                            <code class="api-path small text-truncate me-2 bg-light px-2 py-1 rounded" style="max-width: 60%;">${item.path}</code>
                            <div class="api-card-actions">
                                <button type="button" class="btn btn-sm btn-primary api-open-btn"><i class="fas fa-play me-1"></i> Try</button>
                                <button type="button" class="btn btn-sm btn-outline-warning fav-toggle-btn ${userFavorites.includes(item.path) ? 'favorited' : ''}"><i class="fas fa-star"></i></button>
                            </div>
                        </div>
                    </article>
                `;
                
                col.querySelector(".api-open-btn").onclick = () => openApiModal(item);
                col.querySelector(".fav-toggle-btn").onclick = (e) => { e.stopPropagation(); toggleFavorite(item.path, e.target.closest("button")); };
                row.appendChild(col);
            });
        });

        DOM.apiContent.appendChild(row);
        checkAllEndpointStatuses();
    }

    function filterApiItems(filterValue) {
        const q = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : "";
        document.querySelectorAll(".api-item").forEach(item => {
            const catMatch = (filterValue === "all") || (filterValue === "favorites" && item.dataset.fav === "1") || (item.dataset.category === filterValue);
            const searchMatch = item.textContent.toLowerCase().includes(q);
            item.style.display = (catMatch && searchMatch) ? "" : "none";
        });
    }

    function checkAllEndpointStatuses() {
        document.querySelectorAll(".endpoint-status-pill").forEach(pill => {
            const method = pill.closest(".api-card").querySelector(".http-badge").textContent;
            if (method !== "GET") { pill.className = "endpoint-status-pill badge bg-success"; pill.textContent = "Ready"; return; }
            
            fetch(pill.dataset.path, { method: "HEAD" })
                .then(r => {
                    pill.className = (r.ok || r.status===405 || r.status===400) ? "endpoint-status-pill badge bg-success" : "endpoint-status-pill badge bg-danger";
                    pill.textContent = (r.ok || r.status===405 || r.status===400) ? "Online" : "Error";
                })
                .catch(() => { pill.className = "endpoint-status-pill badge bg-danger"; pill.textContent = "Offline"; });
        });
    }

    // ================================================================
    // 8. MODAL SYSTEM & HYBRID LOGIC (THE MAGIC)
    // ================================================================

    function openApiModal(item) {
        currentApiItem = item;
        const method = (item.method || "GET").toUpperCase();

        DOM.modalTitle.textContent = item.name;
        DOM.modalSubtitle.textContent = item.desc;
        DOM.endpointText.textContent = item.path;
        DOM.modalStatusLine.textContent = "Ready";
        DOM.apiResponseContent.innerHTML = "";
        DOM.modalLoading.classList.add("d-none");
        
        addToHistory(item);
        if (modalInstance) modalInstance.show();

        if (method === "POST" || method === "PUT") {
            // UPLOAD FORM
            DOM.apiResponseContent.innerHTML = `
                <div class="text-center p-5 border rounded bg-light" style="border: 2px dashed #ccc;">
                    <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                    <h5>File Upload Required</h5>
                    <div class="mb-3 mt-3"><input class="form-control" type="file" id="modalFileInput"></div>
                    <button id="triggerUploadBtn" class="btn btn-primary w-100"><i class="fas fa-paper-plane me-2"></i> Send Request</button>
                </div>
                <div id="uploadResultContainer" class="mt-3"></div>
            `;
            document.getElementById("triggerUploadBtn").onclick = () => {
                const inp = document.getElementById("modalFileInput");
                if (!inp.files.length) return showToast("Pilih file dulu!", "warning");
                executeApiRequest(inp.files[0]);
            };
        } else {
            // GET AUTO EXECUTE
            executeApiRequest();
        }
    }

    // FIX: ANTI STUCK MODAL
    if (DOM.modalEl) {
        DOM.modalEl.addEventListener('hidden.bs.modal', function () {
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            DOM.body.classList.remove('modal-open');
            DOM.body.style.overflow = 'auto'; 
            DOM.body.style.paddingRight = '0px';
        });
    }

    async function executeApiRequest(fileData = null) {
        if (!currentApiItem) return;
        const method = (currentApiItem.method || "GET").toUpperCase();
        const url = currentApiItem.path;
        const resultContainer = document.getElementById("uploadResultContainer") || DOM.apiResponseContent;
        
        DOM.modalLoading.classList.remove("d-none");
        DOM.modalStatusLine.textContent = "Sending Request...";
        appendLog(`[REQ] ${method} ${url}`);

        try {
            let options = { method: method };
            if (fileData) {
                const fd = new FormData();
                fd.append("file", fileData);
                options.body = fd;
            }

            const startTime = performance.now();
            const response = await fetch(url, options);
            const duration = (performance.now() - startTime).toFixed(0);

            DOM.modalStatusLine.innerHTML = `<span class="${response.ok?'text-success':'text-danger'} fw-bold">Status: ${response.status}</span> (${duration}ms)`;

            const cType = response.headers.get("content-type");
            let html = "";

            if (response.redirected) {
                html += `<div class="alert alert-info">Redirected to: <a href="${response.url}" target="_blank">${response.url}</a></div>`;
            }

            if (cType && cType.includes("image")) {
                const blob = await response.blob();
                html += `<div class="text-center bg-dark p-3 rounded"><img src="${URL.createObjectURL(blob)}" class="img-fluid" style="max-height:400px;"></div>`;
            } else {
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    
                    // === HYBRID VIEW LOGIC ===
                    // 1. Tampilan Download (Untuk YTMP3/Video)
                    if (json.result && json.result.url && json.result.title) {
                         const r = json.result;
                         html += `
                            <div class="card border-0 shadow-sm mb-3">
                                <div class="card-body text-center p-4">
                                    ${r.thumb ? `<img src="${r.thumb}" class="img-fluid rounded mb-3 shadow" style="max-height: 200px;">` : ''}
                                    <h5 class="fw-bold mb-2">${r.title}</h5>
                                    <a href="${r.url}" target="_blank" class="btn btn-success btn-lg w-100 mb-2 mt-3">
                                        <i class="fas fa-download me-2"></i> Download File
                                    </a>
                                </div>
                                <div class="card-footer bg-light text-start">
                                    <details>
                                        <summary class="small text-primary" style="cursor:pointer">Show Raw JSON</summary>
                                        <pre class="mt-2 p-2 bg-dark text-white rounded small">${JSON.stringify(json, null, 2)}</pre>
                                    </details>
                                </div>
                            </div>
                         `;
                    }
                    // 2. Tampilan Upload (Tourl)
                    else if (json.result && json.result.url) {
                        html += `
                            <div class="alert alert-success text-center">
                                <h4>✅ Upload Success!</h4>
                                <div class="input-group mb-2 mt-3">
                                    <input type="text" class="form-control" value="${json.result.url}" readonly>
                                    <button class="btn btn-outline-secondary" onclick="navigator.clipboard.writeText('${json.result.url}')">Copy</button>
                                </div>
                                <a href="${json.result.url}" target="_blank" class="btn btn-primary btn-sm">Open Link</a>
                            </div>
                            <pre class="bg-dark text-white p-3 rounded">${JSON.stringify(json, null, 2)}</pre>
                        `;
                    } 
                    // 3. Normal JSON
                    else {
                        html += `<pre class="json-response p-3 rounded" style="background:#1e1e1e;color:#d4d4d4;"><code>${JSON.stringify(json, null, 2)}</code></pre>`;
                    }

                } catch {
                    html += `<pre class="p-3 bg-light border rounded">${text}</pre>`;
                }
            }
            
            resultContainer.innerHTML = html;
            appendLog(`[RES] ${response.status} OK`);

        } catch (e) {
            resultContainer.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
            appendLog(`[ERR] ${e.message}`, "error");
        } finally {
            DOM.modalLoading.classList.add("d-none");
        }
    }

    // ================================================================
    // 9. EVENTS & VISUALS
    // ================================================================

    function initEvents() {
        // Copy Full Endpoint
        if (DOM.copyEndpointBtn) {
            DOM.copyEndpointBtn.onclick = async () => {
                const fullUrl = window.location.origin + DOM.endpointText.textContent.trim();
                await navigator.clipboard.writeText(fullUrl);
                showToast("Link Salin Berhasil!");
            };
        }
        
        // Copy cURL
        if (DOM.copyCurlBtn) {
            DOM.copyCurlBtn.onclick = async () => {
                if(!currentApiItem) return;
                const fullUrl = window.location.origin + currentApiItem.path;
                const cmd = `curl -X ${(currentApiItem.method||"GET").toUpperCase()} "${fullUrl}"`;
                await navigator.clipboard.writeText(cmd);
                showToast("cURL Salin Berhasil!");
            };
        }

        // WhatsApp
        if (DOM.sendApiRequest) {
            DOM.sendApiRequest.onclick = () => {
                const t = DOM.apiRequestInput.value.trim();
                if(t) window.open(`https://wa.me/6287751121269?text=${encodeURIComponent("Req: "+t)}`, "_blank");
            };
        }

        // Search
        if (DOM.searchInput) DOM.searchInput.oninput = () => {
            const active = DOM.apiFilters.querySelector(".active").dataset.filter;
            filterApiItems(active);
        };

        // Parallax
        if (DOM.bannerParallax) {
            DOM.bannerParallax.onmousemove = (e) => {
                const r = DOM.bannerParallax.getBoundingClientRect();
                const x = (e.clientX - r.left)/r.width - 0.5;
                const y = (e.clientY - r.top)/r.height - 0.5;
                const img = DOM.bannerParallax.querySelector("img");
                if(img) img.style.transform = `scale(1.1) translate(${x*20}px, ${y*20}px)`;
            };
        }
    }

    // ================================================================
    // 10. INIT APP
    // ================================================================

    async function init() {
        initThemeEngine();
        initSidebarLogic();
        initEvents();
        renderHistoryList();

        try {
            const r = await fetch("/src/settings.json");
            appSettings = await r.json();
            if(DOM.versionBadge) DOM.versionBadge.textContent = appSettings.version;
        } catch { appSettings = { categories: fallbackCategories }; }
        
        renderApiContent();
    }

    init();
});