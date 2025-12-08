// Pastikan DOM sudah dimuat sepenuhnya sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', async () => {
    // Selektor Elemen DOM Utama
    const DOM = {
        loadingScreen: document.getElementById("loadingScreen"),
        body: document.body,
        sideNav: document.querySelector('.side-nav'),
        mainWrapper: document.querySelector('.main-wrapper'),
        navCollapseBtn: document.querySelector('.nav-collapse-btn'),
        menuToggle: document.querySelector('.menu-toggle'),
        themeToggle: document.getElementById('themeToggle'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearch'),
        apiContent: document.getElementById('apiContent'),
        notificationToast: document.getElementById('notificationToast'), // Toast untuk notifikasi umum
        notificationBell: document.getElementById('notificationBell'), // Tombol lonceng
        notificationBadge: document.getElementById('notificationBadge'), // Badge merah
        modal: {
            instance: null, // Akan diinisialisasi nanti
            element: document.getElementById('apiResponseModal'),
            label: document.getElementById('apiResponseModalLabel'),
            desc: document.getElementById('apiResponseModalDesc'),
            endpoint: document.getElementById('apiEndpoint'),
            queryInputContainer: document.getElementById('apiQueryInputContainer'),
            responseContent: document.getElementById('apiResponseContent'),
            responseContainer: document.getElementById('responseContainer'),
            submitBtn: document.getElementById('submitQueryBtn'),
            loadingIndicator: document.getElementById('apiResponseLoading'),
            copyEndpointBtn: document.getElementById('copyEndpoint'),
            copyResponseBtn: document.getElementById('copyResponse'),
            dialog: document.getElementById('modalDialog')
        },
        theme: {
            switchInput: document.getElementById('themeToggle')
        },
        pageTitle: document.getElementById('page'),
        appName: document.getElementById('name'),
        wm: document.getElementById('wm'),
        sideNavName: document.getElementById('sideNavName'),
        versionBadge: document.getElementById('version'),
        versionHeaderBadge: document.getElementById('versionHeader'),
        appDescription: document.getElementById('description'),
        dynamicImage: document.getElementById('dynamicImage'), // ID untuk gambar banner di hero section
        apiLinksContainer: document.getElementById('apiLinks')
    };

    let settings = {}; // Untuk menyimpan data dari settings.json
    let currentApiData = null; // Menyimpan data API yang sedang aktif di modal
    let activeCategoryIndex = 0; // Menandai kategori aktif
    let activeItemIndex = 0; // Menandai item API aktif dalam kategori
    let notificationData = []; // Menyimpan data notifikasi dari notifications.json
    let newNotificationsCount = 0; // Jumlah notifikasi baru
    
    let originalBodyPaddingRight = ''; // Menyimpan padding-right asli dari body

    // --- Utility Functions ---

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const setPageContent = (element, text, fallback = "") => {
        if (element) {
            element.textContent = text || fallback;
        }
    };

    const showLoadingScreen = () => {
        if (DOM.loadingScreen) {
            DOM.loadingScreen.style.display = 'flex';
        }
    };

    const hideLoadingScreen = () => {
        if (DOM.loadingScreen) {
            DOM.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                DOM.loadingScreen.style.display = 'none';
            }, 300);
        }
    };

    const showToast = (message, type = 'info') => {
        if (!DOM.notificationToast) return;

        const toastElement = DOM.notificationToast;
        const toastBody = toastElement.querySelector('.toast-body');
        const toastTitle = toastElement.querySelector('.toast-title');
        const toastIcon = toastElement.querySelector('.toast-icon');

        toastBody.textContent = message;

        toastElement.classList.remove('toast-info', 'toast-success', 'toast-warning', 'toast-error');

        switch (type) {
            case 'success':
                toastTitle.textContent = 'Berhasil';
                toastIcon.className = 'toast-icon fas fa-check-circle me-2';
                toastElement.classList.add('toast-success');
                break;
            case 'warning':
                toastTitle.textContent = 'Peringatan';
                toastIcon.className = 'toast-icon fas fa-exclamation-triangle me-2';
                toastElement.classList.add('toast-warning');
                break;
            case 'error':
                toastTitle.textContent = 'Terjadi Kesalahan';
                toastIcon.className = 'toast-icon fas fa-times-circle me-2';
                toastElement.classList.add('toast-error');
                break;
            default:
                toastTitle.textContent = 'Notifikasi';
                toastIcon.className = 'toast-icon fas fa-info-circle me-2';
                toastElement.classList.add('toast-info');
        }

        const bootstrapToast = new bootstrap.Toast(toastElement);
        bootstrapToast.show();
    };
    
    const updateNotificationBadge = () => {
        if (!DOM.notificationBadge) return;

        if (newNotificationsCount > 0) {
            DOM.notificationBadge.textContent = newNotificationsCount;
            DOM.notificationBadge.style.display = 'inline-block';
        } else {
            DOM.notificationBadge.textContent = '';
            DOM.notificationBadge.style.display = 'none';
        }
    };

    const markAllNotificationsAsRead = () => {
        newNotificationsCount = 0;
        updateNotificationBadge();
    };

    const displayErrorState = (message) => {
        if (DOM.apiContent) {
            DOM.apiContent.innerHTML = `
                <div class="error-state">
                    <h3>Terjadi Kesalahan</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    };

    // --- Theme Handling ---

    const applyTheme = (theme) => {
        if (!DOM.body) return;
        DOM.body.setAttribute('data-theme', theme);
        if (DOM.themeToggle) {
            DOM.themeToggle.checked = theme === 'dark';
        }
        localStorage.setItem('theme', theme);
    };

    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark ? 'dark' : 'light');
        }
    };

    const handleThemeToggle = () => {
        const newTheme = DOM.themeToggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    // --- Side Navigation Handling ---

    const toggleSideNavCollapse = () => {
        if (!DOM.sideNav || !DOM.mainWrapper) return;

        const isCollapsed = DOM.sideNav.classList.toggle('collapsed');
        DOM.mainWrapper.classList.toggle('expanded');

        const collapseIcon = DOM.navCollapseBtn.querySelector('i');
        if (collapseIcon) {
            collapseIcon.classList.toggle('fa-angle-left', !isCollapsed);
            collapseIcon.classList.toggle('fa-angle-right', isCollapsed);
        }

        localStorage.setItem('sideNavCollapsed', isCollapsed ? 'true' : 'false');
    };

    const toggleSideNavMobile = () => {
        if (!DOM.sideNav) return;

        const isOpen = DOM.sideNav.classList.toggle('open');
        DOM.body.classList.toggle('no-scroll', isOpen);

        if (isOpen) {
            originalBodyPaddingRight = DOM.body.style.paddingRight;
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            DOM.body.style.paddingRight = `${scrollBarWidth}px`;
        } else {
            DOM.body.style.paddingRight = originalBodyPaddingRight || '';
        }
    };

    const initSideNavCollapsedState = () => {
        if (!DOM.sideNav || !DOM.mainWrapper || !DOM.navCollapseBtn) return;

        const isCollapsed = localStorage.getItem('sideNavCollapsed') === 'true';
        if (isCollapsed) {
            DOM.sideNav.classList.add('collapsed');
            DOM.mainWrapper.classList.add('expanded');

            const collapseIcon = DOM.navCollapseBtn.querySelector('i');
            if (collapseIcon) {
                collapseIcon.classList.remove('fa-angle-left');
                collapseIcon.classList.add('fa-angle-right');
            }
        }
    };

    const closeSideNavIfOpenOnMobile = () => {
        if (!DOM.sideNav || !DOM.body) return;

        if (DOM.sideNav.classList.contains('open')) {
            DOM.sideNav.classList.remove('open');
            DOM.body.classList.remove('no-scroll');
            DOM.body.style.paddingRight = originalBodyPaddingRight || '';
        }
    };

    const initSideNav = () => {
        initSideNavCollapsedState();
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                closeSideNavIfOpenOnMobile();
            }
        });

        document.addEventListener('click', (event) => {
            if (window.innerWidth > 992) return;
            if (!DOM.sideNav.classList.contains('open')) return;

            if (!DOM.sideNav.contains(event.target) && !DOM.menuToggle.contains(event.target)) {
                closeSideNavIfOpenOnMobile();
            }
        });
    };

    // --- Search Handling ---

    const filterApis = (query) => {
        if (!DOM.apiContent || !settings.categories || !settings.categories.length) return;

        const normalizedQuery = query.trim().toLowerCase();
        const apiSections = DOM.apiContent.querySelectorAll('.api-item');

        if (!normalizedQuery) {
            apiSections.forEach(item => item.classList.remove('hidden'));
            return;
        }

        apiSections.forEach(item => {
            const title = item.querySelector('.api-name')?.textContent.toLowerCase() || '';
            const desc = item.querySelector('.api-description')?.textContent.toLowerCase() || '';
            const methods = item.dataset.methods ? item.dataset.methods.toLowerCase() : '';
            const endpoint = item.dataset.endpoint ? item.dataset.endpoint.toLowerCase() : '';

            const matches = title.includes(normalizedQuery) ||
                            desc.includes(normalizedQuery) ||
                            methods.includes(normalizedQuery) ||
                            endpoint.includes(normalizedQuery);

            item.classList.toggle('hidden', !matches);
        });
    };

    const handleSearchInput = debounce((event) => {
        filterApis(event.target.value);
    }, 200);

    const clearSearch = () => {
        if (DOM.searchInput) {
            DOM.searchInput.value = '';
            filterApis('');
        }
    };

    // --- Banner + Branding Ada ---

    const populatePageContent = () => {
        if (!settings || Object.keys(settings).length === 0) return;

        const currentYear = new Date().getFullYear();
        const creator = settings.apiSettings?.creator || 'Ada';

        // Branding utama
        setPageContent(DOM.pageTitle, settings.name || 'Ada API', 'Ada API');
        setPageContent(DOM.wm, `© ${currentYear} ${creator}. Semua hak dilindungi.`);
        setPageContent(DOM.appName, settings.name || 'Ada API', 'Ada API');
        setPageContent(DOM.sideNavName, settings.name || 'Ada API');
        setPageContent(DOM.versionBadge, settings.version || 'v1.0', 'v1.0');
        setPageContent(DOM.versionHeaderBadge, settings.header?.status || 'Online!', 'Online!');
        setPageContent(
            DOM.appDescription,
            settings.description || 'Antarmuka dokumentasi Ada API yang simpel, modern, dan mudah disesuaikan.',
            'Antarmuka dokumentasi Ada API yang simpel, modern, dan mudah disesuaikan.'
        );

        // ------------------------
        //  Banner GIF Ada API
        // ------------------------
        if (DOM.dynamicImage) {
            // Default utama = GIF, fallback = static
            const defaultBanner = '/src/banner.gif';
            const fallbackBanner = settings.bannerFallbackImage || '/src/banner-fallback.jpg';
            const bannerSrc = settings.bannerImage || defaultBanner;

            DOM.dynamicImage.src = bannerSrc;
            DOM.dynamicImage.alt = settings.name ? `${settings.name} Banner` : 'Ada API Banner';
            DOM.dynamicImage.style.display = '';
            DOM.dynamicImage.style.opacity = '0';
            DOM.dynamicImage.dataset.originalSrc = bannerSrc;

            let hasTriedFallback = false;

            DOM.dynamicImage.onload = () => {
                DOM.dynamicImage.classList.add('banner-loaded');
                DOM.dynamicImage.style.opacity = '1';
            };

            DOM.dynamicImage.onerror = () => {
                console.error('Gagal memuat banner utama:', bannerSrc);

                // Jangan infinite loop fallback
                if (hasTriedFallback || !fallbackBanner) {
                    DOM.dynamicImage.classList.add('banner-error');
                    DOM.dynamicImage.style.opacity = '1';
                    return;
                }

                hasTriedFallback = true;
                DOM.dynamicImage.src = fallbackBanner;
                DOM.dynamicImage.alt = 'Ada API Banner Fallback';
                DOM.dynamicImage.style.display = '';
                DOM.dynamicImage.style.opacity = '1';
                if (typeof showToast === 'function') {
                    showToast('Banner utama gagal dimuat, menggunakan banner cadangan.', 'info');
                }
            };
        }

        // Link hero / CTA
        if (DOM.apiLinksContainer) {
            DOM.apiLinksContainer.innerHTML = '';
            const defaultLinks = [
                {
                    url: 'https://github.com/adamhasani/ada-api.git',
                    name: 'Lihat di GitHub',
                    icon: 'fab fa-github'
                }
            ];
            const linksToRender = settings.links?.length ? settings.links : defaultLinks;

            linksToRender.forEach(({ url, name, icon }, index) => {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'api-link btn btn-primary';
                link.style.animationDelay = `${index * 0.1}s`;
                link.setAttribute('aria-label', name);

                const iconElement = document.createElement('i');
                iconElement.className = icon || 'fas fa-external-link-alt';
                iconElement.setAttribute('aria-hidden', 'true');

                link.appendChild(iconElement);
                link.appendChild(document.createTextNode(` ${name}`));
                DOM.apiLinksContainer.appendChild(link);
            });
        }
    };

    // Efek hover / tilt untuk banner hero
    const initHeroBannerEffects = () => {
        const banner = DOM.dynamicImage;
        if (!banner) return;

        const container = banner.closest('.banner-container');
        if (!container) return;

        banner.style.transition = 'transform 400ms ease, filter 400ms ease, opacity 400ms ease';
        banner.style.transform = 'scale(1.02)';
        container.style.perspective = '1200px';

        const handleMove = (e) => {
            const rect = container.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            const rotateX = y * -6;
            const rotateY = x * 8;

            banner.style.transform = `
                scale(1.03)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
            `;
            banner.style.filter = 'brightness(1.08)';
        };

        const handleLeave = () => {
            banner.style.transform = 'scale(1.02) rotateX(0deg) rotateY(0deg)';
            banner.style.filter = 'brightness(1)';
        };

        container.addEventListener('mousemove', handleMove);
        container.addEventListener('mouseleave', handleLeave);
    };

    // --- Render Kategori dan Item API ---
    const renderApiCategories = () => {
        if (!DOM.apiContent || !settings.categories || !settings.categories.length) {
            displayErrorState("Tidak ada kategori API yang ditemukan.");
            return;
        }
        DOM.apiContent.innerHTML = ''; 

        settings.categories.forEach((category, categoryIndex) => {
            const sortedItems = category.items.sort((a, b) => a.name.localeCompare(b.name));
            
            const categorySection = document.createElement('section'); 
            categorySection.id = `category-${category.name.toLowerCase().replace(/\s+/g, '-')}`;
            categorySection.className = 'category-section';
            categorySection.style.animationDelay = `${categoryIndex * 0.15}s`;
            categorySection.setAttribute('aria-labelledby', `category-title-${categoryIndex}`);
            
            const categoryHeader = document.createElement('h3');
            categoryHeader.id = `category-title-${categoryIndex}`;
            categoryHeader.className = 'category-title';
            categoryHeader.textContent = category.name;
            
            const categoryDescription = document.createElement('p');
            categoryDescription.className = 'category-description';
            categoryDescription.textContent = category.description || '';
            
            const itemGrid = document.createElement('div');
            itemGrid.className = 'api-grid';
            
            sortedItems.forEach((item, itemIndex) => {
                const apiItem = document.createElement('article');
                apiItem.className = 'api-item glass-card';
                apiItem.style.animationDelay = `${(categoryIndex * 0.15) + (itemIndex * 0.05)}s`;
                apiItem.setAttribute('tabindex', '0');
                apiItem.setAttribute('role', 'button');
                apiItem.setAttribute('aria-label', `Buka detail API ${item.name}`);
                apiItem.dataset.categoryIndex = categoryIndex;
                apiItem.dataset.itemIndex = itemIndex;
                apiItem.dataset.endpoint = item.endpoint;
                apiItem.dataset.methods = item.methods?.join(', ') || '';
    
                const methodBadges = (item.methods || []).map(method => {
                    const methodClass =
                        method === 'GET' ? 'badge-get' :
                        method === 'POST' ? 'badge-post' :
                        method === 'PUT' ? 'badge-put' :
                        method === 'DELETE' ? 'badge-delete' :
                        'badge-default';
                    return `<span class="method-badge ${methodClass}">${method}</span>`;
                }).join(' ');
    
                apiItem.innerHTML = `
                    <div class="api-header">
                        <div class="api-title-group">
                            <h4 class="api-name">${item.name}</h4>
                            <div class="api-meta">
                                ${item.authRequired ? '<span class="badge-auth"><i class="fas fa-lock"></i> Auth</span>' : '<span class="badge-no-auth"><i class="fas fa-unlock"></i> Publik</span>'}
                                ${item.categoryLabel ? `<span class="badge-category">${item.categoryLabel}</span>` : ''}
                            </div>
                        </div>
                        <div class="api-methods">
                            ${methodBadges}
                        </div>
                    </div>
                    <p class="api-description">${item.description || ''}</p>
                    <div class="api-footer">
                        <code class="api-endpoint-preview">${item.endpoint}</code>
                        <button class="btn btn-sm btn-outline-light api-test-btn">
                            <span>Uji</span>
                            <i class="fas fa-play ms-2"></i>
                        </button>
                    </div>
                `;
    
                apiItem.addEventListener('click', () => {
                    activeCategoryIndex = categoryIndex;
                    activeItemIndex = itemIndex;
                    openApiModal(categoryIndex, itemIndex);
                });
    
                apiItem.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        activeCategoryIndex = categoryIndex;
                        activeItemIndex = itemIndex;
                        openApiModal(categoryIndex, itemIndex);
                    }
                });
    
                itemGrid.appendChild(apiItem);
            });
    
            categorySection.appendChild(categoryHeader);
            categorySection.appendChild(categoryDescription);
            categorySection.appendChild(itemGrid);
            DOM.apiContent.appendChild(categorySection);
        });
    };

    // --- Modal Handling ---

    const initModal = () => {
        if (!DOM.modal.element) return;
        DOM.modal.instance = new bootstrap.Modal(DOM.modal.element, {
            backdrop: 'static',
            keyboard: true
        });

        DOM.modal.element.addEventListener('hidden.bs.modal', () => {
            resetModal();
        });

        if (DOM.modal.copyEndpointBtn) {
            DOM.modal.copyEndpointBtn.addEventListener('click', () => {
                const endpointText = DOM.modal.endpoint.textContent.trim();
                if (endpointText) {
                    navigator.clipboard.writeText(endpointText)
                        .then(() => showToast('Endpoint berhasil disalin ke clipboard!', 'success'))
                        .catch(() => showToast('Gagal menyalin endpoint.', 'error'));
                }
            });
        }

        if (DOM.modal.copyResponseBtn) {
            DOM.modal.copyResponseBtn.addEventListener('click', () => {
                const responseText = DOM.modal.responseContent.textContent.trim();
                if (responseText) {
                    navigator.clipboard.writeText(responseText)
                        .then(() => showToast('Respons berhasil disalin ke clipboard!', 'success'))
                        .catch(() => showToast('Gagal menyalin respons.', 'error'));
                }
            });
        }
    };

    const resetModal = () => {
        if (!DOM.modal.element) return;

        DOM.modal.label.textContent = 'Nama API';
        DOM.modal.desc.textContent = 'Deskripsi API.';
        DOM.modal.endpoint.textContent = '';
        DOM.modal.queryInputContainer.innerHTML = '';
        DOM.modal.responseContent.textContent = '';
        DOM.modal.responseContent.classList.add('d-none');
        DOM.modal.responseContainer.classList.add('d-none');
        DOM.modal.loadingIndicator.classList.add('d-none');
        DOM.modal.submitBtn.disabled = true;
        DOM.modal.submitBtn.innerHTML = `<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>`;
        DOM.modal.dialog.classList.remove('modal-error');
    };

    const openApiModal = (categoryIndex, itemIndex) => {
        if (!DOM.modal.instance || !settings.categories) return;

        const category = settings.categories[categoryIndex];
        const item = category?.items[itemIndex];

        if (!item) {
            showToast('Data API tidak ditemukan.', 'error');
            return;
        }

        currentApiData = item;

        DOM.modal.label.textContent = item.name;
        DOM.modal.desc.textContent = item.description || 'Tidak ada deskripsi.';
        DOM.modal.endpoint.textContent = item.endpoint || '';

        DOM.modal.queryInputContainer.innerHTML = '';

        if (item.parameters && Object.keys(item.parameters).length > 0) {
            const params = item.parameters;
            Object.keys(params).forEach((paramKey) => {
                const paramConfig = params[paramKey];
                
                const inputGroup = document.createElement('div');
                inputGroup.className = 'mb-3';

                const label = document.createElement('label');
                label.className = 'form-label';
                label.setAttribute('for', `param-${paramKey}`);
                label.textContent = `${paramKey} ${paramConfig.required ? '*' : ''}`;
                
                const inputField = document.createElement('input');
                inputField.type = paramConfig.type === 'number' ? 'number' : 'text';
                inputField.className = 'form-control';
                inputField.id = `param-${paramKey}`;
                inputField.placeholder = `Masukkan ${paramKey}...`;
                inputField.dataset.param = paramKey;
                inputField.required = !!paramConfig.required;

                inputGroup.appendChild(label);
                inputGroup.appendChild(inputField);
                DOM.modal.queryInputContainer.appendChild(inputGroup);
            });

            DOM.modal.submitBtn.disabled = false;
        } else {
            DOM.modal.queryInputContainer.innerHTML = `
                <p class="text-muted mb-0">Endpoint ini tidak memerlukan parameter tambahan.</p>
            `;
            DOM.modal.submitBtn.disabled = false;
        }

        DOM.modal.responseContent.classList.add('d-none');
        DOM.modal.responseContainer.classList.add('d-none');
        DOM.modal.loadingIndicator.classList.add('d-none');
        DOM.modal.dialog.classList.remove('modal-error');
        DOM.modal.submitBtn.innerHTML = `<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>`;

        DOM.modal.instance.show();
    };

    const buildQueryParams = () => {
        if (!DOM.modal.queryInputContainer) return '';

        const inputs = DOM.modal.queryInputContainer.querySelectorAll('input[data-param]');
        const params = [];

        inputs.forEach(input => {
            const key = input.dataset.param;
            const value = input.value.trim();

            if (value) {
                params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        });

        return params.length ? `?${params.join('&')}` : '';
    };

    const handleSubmitApiRequest = async () => {
        if (!currentApiData || !DOM.modal.submitBtn) return;

        try {
            DOM.modal.dialog.classList.remove('modal-error');
            DOM.modal.responseContent.classList.add('d-none');
            DOM.modal.responseContainer.classList.add('d-none');

            DOM.modal.loadingIndicator.classList.remove('d-none');
            DOM.modal.submitBtn.disabled = true;
            DOM.modal.submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Memproses...`;

            const queryParams = buildQueryParams();
            const apiUrlWithParams = `${window.location.origin}${currentApiData.endpoint}${queryParams}`;

            const fetchOptions = {
                method: currentApiData.methods?.[0] || 'GET',
                headers: {}
            };

            if (currentApiData.requiresAuth && currentApiData.authToken) {
                fetchOptions.headers['Authorization'] = `Bearer ${currentApiData.authToken}`;
            }

            const response = await fetch(apiUrlWithParams, fetchOptions);
            const contentType = response.headers.get('Content-Type') || '';

            let responseData;
            if (contentType.includes('application/json')) {
                responseData = await response.json();
                DOM.modal.responseContent.textContent = JSON.stringify(responseData, null, 2);
            } else {
                responseData = await response.text();
                DOM.modal.responseContent.textContent = responseData;
            }

            DOM.modal.dialog.classList.remove('modal-error');
            DOM.modal.responseContent.classList.remove('d-none');
            DOM.modal.responseContainer.classList.remove('d-none');
            showToast('Permintaan API berhasil diproses.', 'success');
        } catch (error) {
            console.error('Error saat memproses permintaan API:', error);
            DOM.modal.dialog.classList.add('modal-error');
            DOM.modal.responseContent.textContent = `Terjadi kesalahan: ${error.message}`;
            DOM.modal.responseContent.classList.remove('d-none');
            DOM.modal.responseContainer.classList.remove('d-none');
            showToast('Terjadi kesalahan saat memproses permintaan API.', 'error');
        } finally {
            DOM.modal.loadingIndicator.classList.add('d-none');
            DOM.modal.submitBtn.disabled = false;
            DOM.modal.submitBtn.innerHTML = `<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>`;
        }
    };

    // --- Notifications ---

    const loadNotifications = async () => {
        try {
            const response = await fetch('/src/notifications.json');
            if (!response.ok) throw new Error(`Gagal memuat notifikasi: ${response.status}`);
            
            const data = await response.json();
            notificationData = data.notifications || [];
            
            newNotificationsCount = notificationData.filter(n => !n.read).length;
            updateNotificationBadge();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const showLatestNotification = () => {
        if (!notificationData.length) {
            showToast('Belum ada notifikasi.', 'info');
            return;
        }

        const latestNotification = notificationData[0];
        const type = latestNotification.type || 'info';
        showToast(latestNotification.message || 'Notifikasi baru.', type);

        latestNotification.read = true;
        newNotificationsCount = notificationData.filter(n => !n.read).length;
        updateNotificationBadge();
    };

    // --- Observers ---

    const observeApiItems = () => {
        if (!DOM.apiContent) return;

        const apiItems = DOM.apiContent.querySelectorAll('.api-item');
        if (!apiItems.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        apiItems.forEach(item => {
            observer.observe(item);
        });
    };

    // --- Inisialisasi dan Event Listeners ---

    const init = async () => {
        setupEventListeners();
        initTheme();
        initSideNav();
        initModal();
        await loadNotifications(); 
        
        try {
            const response = await fetch('/src/settings.json');
            if (!response.ok) throw new Error(`Gagal memuat pengaturan: ${response.status}`);
            settings = await response.json();
            populatePageContent();
            initHeroBannerEffects();
            renderApiCategories();
            observeApiItems();
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast(`Gagal memuat pengaturan: ${error.message}`, 'error');
            displayErrorState("Tidak dapat memuat konfigurasi API.");
        } finally {
            hideLoadingScreen();
        }
    };

    const setupEventListeners = () => {
        if (DOM.navCollapseBtn) DOM.navCollapseBtn.addEventListener('click', toggleSideNavCollapse);
        if (DOM.menuToggle) DOM.menuToggle.addEventListener('click', toggleSideNavMobile);
        if (DOM.themeToggle) DOM.themeToggle.addEventListener('change', handleThemeToggle);
        if (DOM.searchInput) DOM.searchInput.addEventListener('input', debounce(
            (event) => handleSearchInput(event),
            200
        ));
        if (DOM.clearSearchBtn) DOM.clearSearchBtn.addEventListener('click', clearSearch);
        if (DOM.notificationBell) DOM.notificationBell.addEventListener('click', () => {
            showLatestNotification();
            markAllNotificationsAsRead();
        });

        if (DOM.modal.submitBtn) {
            DOM.modal.submitBtn.addEventListener('click', handleSubmitApiRequest);
        }
    };

    // Mulai
    showLoadingScreen();
    await init();
});