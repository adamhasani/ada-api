// Ada API Console – versi simple + fallback agar halaman nggak kosong

document.addEventListener("DOMContentLoaded", () => {
  // ================================
  // DOM CACHE
  // ================================
  const DOM = {
    body: document.body,

    // sidebar / nav
    sideNav: document.querySelector(".side-nav"),
    sideNavLinks: document.querySelectorAll(".side-nav-link"),
    menuToggle: document.getElementById("menuToggle"),
    navCollapseBtn: document.getElementById("collapseBtn"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),

    // header
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    themeToggle: document.getElementById("themeToggle"),
    themePreset: document.getElementById("themePreset"),

    // main sections
    apiFilters: document.getElementById("apiFilters"),
    apiContent: document.getElementById("apiContent"),
    apiRequestInput: document.getElementById("apiRequestInput"),
    sendApiRequest: document.getElementById("sendApiRequest"),
    requestHistoryList: document.getElementById("requestHistoryList"),
    logsConsole: document.getElementById("liveLogs"),

    // hero
    versionBadge: document.getElementById("versionBadge"),

    // fx
    bannerParallax: document.getElementById("bannerParallax"),
    cursorGlow: document.getElementById("cursorGlow"),

    // modal
    modalEl: document.getElementById("apiResponseModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    endpointText: document.getElementById("endpointText"),
    modalStatusLine: document.getElementById("modalStatusLine"),
    modalLoading: document.getElementById("modalLoading"),
    apiResponseContent: document.getElementById("apiResponseContent"),
    copyEndpointBtn: document.getElementById("copyEndpointBtn"),
    copyCurlBtn: document.getElementById("copyCurlBtn"),
  };

  const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl) : null;

  // ================================
  // STATE
  // ================================
  let settings = null;
  let favorites = loadJSON("ada-api-fav", []);      // array of path
  let historyItems = loadJSON("ada-api-history", []); // {name, path, ts}
  let themeMode = null;
  let themePresetInternal = null;

  // Fallback kalau settings.json gagal dimuat
  const fallbackCategories = [
    {
      name: "General",
      items: [
        {
          name: "Status API",
          desc: "Cek status dasar layanan Ada API.",
          method: "GET",
          path: "https://example.com/status",
          status: "online",
        },
        {
          name: "Info Versi",
          desc: "Contoh endpoint versi API.",
          method: "GET",
          path: "https://example.com/version",
          status: "online",
        },
      ],
    },
  ];

  // ================================
  // UTILITAS
  // ================================
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  function appendLog(line) {
    if (!DOM.logsConsole) return;
    const ts = new Date().toISOString().slice(11, 19);
    DOM.logsConsole.textContent += `[${ts}] ${line}\n`;
    DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
  }

  function addHistory(entry) {
    historyItems.unshift({
      name: entry.name,
      path: entry.path,
      ts: Date.now(),
    });
    historyItems = historyItems.slice(0, 20);
    saveJSON("ada-api-history", historyItems);
    renderHistory();
  }

  function renderHistory() {
    if (!DOM.requestHistoryList) return;
    DOM.requestHistoryList.innerHTML = "";
    historyItems.forEach((item) => {
      const li = document.createElement("li");
      const date = new Date(item.ts);
      li.textContent = `${date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })} — ${item.name} (${item.path})`;
      DOM.requestHistoryList.appendChild(li);
    });
  }

  function beautifyJSON(json) {
    try {
      if (typeof json === "string") json = JSON.parse(json);
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json);
    }
  }

  // ================================
  // MODE TERANG / GELAP
  // ================================
  function applyMode(mode) {
    const isDark = mode === "dark";
    DOM.body.classList.toggle("dark-mode", isDark);
    if (DOM.themeToggle) DOM.themeToggle.checked = isDark;
    themeMode = mode;
    saveJSON("ada-ui-mode", mode);
  }

  function initMode() {
    const stored = loadJSON("ada-ui-mode", null);
    if (stored === "dark" || stored === "light") {
      applyMode(stored);
    } else {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyMode(prefersDark ? "dark" : "light");
    }

    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener("change", () => {
        applyMode(DOM.themeToggle.checked ? "dark" : "light");
      });
    }
  }

  // ================================
  // THEME PRESET
  // ================================
  const presetMap = {
    emerald: "emerald-gold",
    noir: "noir",
    ivory: "emerald-gold",
    cyber: "cyber-glow",
    olive: "royal-amber",
  };

  const reversePresetMap = {
    "emerald-gold": "emerald",
    noir: "noir",
    "cyber-glow": "cyber",
    "royal-amber": "olive",
  };

  function applyPreset(internalKey) {
    const allowed = ["emerald-gold", "noir", "cyber-glow", "royal-amber"];
    if (!allowed.includes(internalKey)) internalKey = "emerald-gold";
    DOM.body.setAttribute("data-theme", internalKey);
    themePresetInternal = internalKey;
    saveJSON("ada-ui-theme", internalKey);

    if (DOM.themePreset) {
      const selectValue = reversePresetMap[internalKey] || "emerald";
      DOM.themePreset.value = selectValue;
    }
  }

  function initPreset() {
    let stored = loadJSON("ada-ui-theme", null);
    if (!stored) stored = "emerald-gold";
    applyPreset(stored);

    if (DOM.themePreset) {
      DOM.themePreset.addEventListener("change", () => {
        const userValue = DOM.themePreset.value;
        const internalKey = presetMap[userValue] || "emerald-gold";
        applyPreset(internalKey);
      });
    }
  }

  // ================================
  // SIDEBAR
  // ================================
  function openSidebarMobile() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.add("open");
    DOM.body.classList.add("sidebar-open");
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add("show");
  }

  function closeSidebarMobile() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.remove("open");
    DOM.body.classList.remove("sidebar-open");
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
  }

  function toggleSidebarCollapsedDesktop() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.toggle("collapsed");
  }

  function initSidebar() {
    if (DOM.menuToggle) {
      DOM.menuToggle.addEventListener("click", () => {
        if (window.innerWidth < 992) {
          if (DOM.sideNav.classList.contains("open")) {
            closeSidebarMobile();
          } else {
            openSidebarMobile();
          }
        } else {
          toggleSidebarCollapsedDesktop();
        }
      });
    }

    if (DOM.navCollapseBtn) {
      DOM.navCollapseBtn.addEventListener("click", () => {
        toggleSidebarCollapsedDesktop();
      });
    }

    if (DOM.sidebarBackdrop) {
      DOM.sidebarBackdrop.addEventListener("click", () => {
        closeSidebarMobile();
      });
    }

    DOM.sideNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 992) closeSidebarMobile();
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992 && DOM.sidebarBackdrop) {
        DOM.sidebarBackdrop.classList.remove("show");
        DOM.body.classList.remove("sidebar-open");
      }
    });

    window.addEventListener("scroll", () => {
      const headerOffset = 72;
      const scrollY = window.scrollY + headerOffset;

      document.querySelectorAll("main section[id]").forEach((section) => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute("id");
        const link = document.querySelector(
          `.side-nav-link[href="#${id}"]`
        );
        if (!link) return;
        if (scrollY >= top && scrollY < bottom) {
          DOM.sideNavLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    });
  }

  // ================================
  // SEARCH
  // ================================
  function filterApis(query) {
    query = query.trim().toLowerCase();
    const itemEls = DOM.apiContent
      ? DOM.apiContent.querySelectorAll(".api-item")
      : [];

    itemEls.forEach((el) => {
      const name =
        el.querySelector(".api-card-title")?.textContent.toLowerCase() || "";
      const desc =
        el.querySelector(".api-card-desc")?.textContent.toLowerCase() || "";
      const path =
        el.querySelector(".api-path")?.textContent.toLowerCase() || "";

      const match =
        !query ||
        name.includes(query) ||
        desc.includes(query) ||
        path.includes(query);

      el.style.display = match ? "" : "none";
    });
  }

  function initSearch() {
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener("input", () => {
        filterApis(DOM.searchInput.value);
      });
    }
    if (DOM.clearSearch) {
      DOM.clearSearch.addEventListener("click", () => {
        DOM.searchInput.value = "";
        filterApis("");
      });
    }
  }

  // ================================
  // FAVORIT
  // ================================
  function isFav(path) {
    return favorites.includes(path);
  }

  function toggleFav(path, btn) {
    const idx = favorites.indexOf(path);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      btn.classList.remove("favorited");
    } else {
      favorites.push(path);
      btn.classList.add("favorited");
    }
    saveJSON("ada-api-fav", favorites);
  }

  // ================================
  // RENDER KARTU API
  // ================================
  function buildApiCard(item) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4 api-item";

    const card = document.createElement("article");
    card.className = "api-card";

    const header = document.createElement("div");
    header.className = "api-card-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h4");
    title.className = "api-card-title";
    title.textContent = item.name;

    const desc = document.createElement("p");
    desc.className = "api-card-desc";
    desc.textContent = item.desc || "";

    titleWrap.appendChild(title);
    titleWrap.appendChild(desc);

    const metaRight = document.createElement("div");
    metaRight.className = "card-meta-row";

    const methodBadge = document.createElement("span");
    methodBadge.className = "http-badge";
    const method = (item.method || "GET").toUpperCase();
    methodBadge.textContent = method;
    if (method === "POST") methodBadge.classList.add("http-post");
    else if (method === "PUT") methodBadge.classList.add("http-put");
    else if (method === "DELETE") methodBadge.classList.add("http-delete");
    else methodBadge.classList.add("http-get");

    const statusBadge = document.createElement("span");
    statusBadge.className = "endpoint-status-pill";
    const status = (item.status || "unknown").toLowerCase();
    if (status === "ready" || status === "online") {
      statusBadge.classList.add("status-ok");
      statusBadge.textContent = "Online";
    } else if (status === "error" || status === "down") {
      statusBadge.classList.add("status-error");
      statusBadge.textContent = "Error";
    } else {
      statusBadge.classList.add("status-unknown");
      statusBadge.textContent = "Unknown";
    }

    metaRight.appendChild(methodBadge);
    metaRight.appendChild(statusBadge);

    header.appendChild(titleWrap);
    header.appendChild(metaRight);

    const footer = document.createElement("div");
    footer.className = "api-card-footer";

    const pathEl = document.createElement("div");
    pathEl.className = "api-path";
    pathEl.textContent = item.path;

    const actions = document.createElement("div");
    actions.className = "api-card-actions";

    const tryBtn = document.createElement("button");
    tryBtn.type = "button";
    tryBtn.className = "api-open-btn";
    tryBtn.innerHTML = '<i class="fas fa-play me-1"></i>Try';

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-toggle-btn";
    favBtn.dataset.path = item.path;
    favBtn.innerHTML = '<i class="fas fa-star"></i>';

    if (isFav(item.path)) {
      favBtn.classList.add("favorited");
    }

    actions.appendChild(tryBtn);
    actions.appendChild(favBtn);

    footer.appendChild(pathEl);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(footer);
    col.appendChild(card);

    favBtn.addEventListener("click", () => toggleFav(item.path, favBtn));
    tryBtn.addEventListener("click", () => openApiModal(item));

    return col;
  }

  function renderFilters(categories) {
    if (!DOM.apiFilters) return;
    DOM.apiFilters.innerHTML = "";

    categories.forEach((cat) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.textContent = cat.name;
      chip.addEventListener("click", () => {
        const targetId = `category-${cat.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        const section = document.getElementById(targetId);
        if (section) {
          window.scrollTo({
            top: section.offsetTop - 80,
            behavior: "smooth",
          });
        }
      });
      DOM.apiFilters.appendChild(chip);
    });
  }

  function renderApiCategories() {
    if (!DOM.apiContent) return;
    DOM.apiContent.innerHTML = "";

    let categories =
      settings && Array.isArray(settings.categories) && settings.categories.length
        ? settings.categories
        : fallbackCategories;

    renderFilters(categories);

    categories.forEach((category) => {
      const section = document.createElement("section");
      section.className = "category-section";
      section.id = `category-${category.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      const header = document.createElement("h3");
      header.className = "category-header section-title-oldmoney";
      header.textContent = category.name;

      const row = document.createElement("div");
      row.className = "row";

      const items = Array.isArray(category.items) ? [...category.items] : [];
      items.sort((a, b) => a.name.localeCompare(b.name));

      items.forEach((item) => {
        const col = buildApiCard(item);
        row.appendChild(col);
      });

      section.appendChild(header);
      section.appendChild(row);
      DOM.apiContent.appendChild(section);
    });
  }

  function populateFromSettings() {
    if (!settings) return;
    if (DOM.versionBadge && settings.version) {
      DOM.versionBadge.textContent = settings.version;
    }
  }

  function loadSettings() {
    // DISENGAJA pakai /src/settings.json supaya cocok sama struktur kamu
    fetch("/src/settings.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) {
          appendLog("settings.json tidak ditemukan, pakai fallback.");
          settings = null;
        } else {
          settings = json;
          appendLog("settings.json dimuat.");
        }
        populateFromSettings();
        renderApiCategories();
      })
      .catch(() => {
        appendLog("Gagal memuat settings.json, pakai fallback.");
        settings = null;
        renderApiCategories();
      });
  }

  // ================================
  // MODAL API
  // ================================
  function openApiModal(item) {
    if (!modalInstance) return;

    const path = item.path || "";
    const desc = item.desc || "";

    DOM.modalTitle.textContent = item.name || "Respons API";
    DOM.modalSubtitle.textContent = desc;
    DOM.endpointText.textContent = path;
    DOM.apiResponseContent.textContent = "";
    DOM.modalStatusLine.textContent = "";
    DOM.modalLoading.classList.remove("d-none");

    modalInstance.show();

    if (!path) {
      DOM.modalLoading.classList.add("d-none");
      DOM.apiResponseContent.textContent = "Endpoint tidak tersedia.";
      return;
    }

    appendLog(`Request: ${path}`);
    addHistory({ name: item.name || "Unknown", path });

    fetch(path)
      .then(async (res) => {
        let bodyText;
        try {
          const clone = res.clone();
          bodyText = await clone.text();
        } catch {
          bodyText = null;
        }

        let parsed;
        try {
          parsed = await res.json();
        } catch {
          parsed = bodyText || "Tidak dapat membaca respons.";
        }

        DOM.modalLoading.classList.add("d-none");
        DOM.modalStatusLine.textContent = `Status: ${res.status} ${res.statusText}`;
        DOM.apiResponseContent.textContent = beautifyJSON(parsed);
        appendLog(`Response ${res.status} untuk ${path}`);
      })
      .catch((err) => {
        DOM.modalLoading.classList.add("d-none");
        DOM.modalStatusLine.textContent = "Gagal menghubungi server.";
        DOM.apiResponseContent.textContent = String(err);
        appendLog(`ERROR request ${path}: ${err}`);
      });
  }

  if (DOM.copyEndpointBtn) {
    DOM.copyEndpointBtn.addEventListener("click", () => {
      const text = DOM.endpointText.textContent || "";
      if (!text) return;
      navigator.clipboard.writeText(text).catch(() => {});
    });
  }

  if (DOM.copyCurlBtn) {
    DOM.copyCurlBtn.addEventListener("click", () => {
      const endpoint = DOM.endpointText.textContent || "";
      if (!endpoint) return;
      const curl = `curl -X GET "${endpoint}"`;
      navigator.clipboard.writeText(curl).catch(() => {});
    });
  }

  // ================================
  // REQUEST → WHATSAPP
  // ================================
  if (DOM.sendApiRequest && DOM.apiRequestInput) {
    DOM.sendApiRequest.addEventListener("click", () => {
      const text = DOM.apiRequestInput.value.trim();
      const base = "https://wa.me/6287751121269";
      const url =
        text.length > 0
          ? `${base}?text=${encodeURIComponent(text)}`
          : base;
      window.open(url, "_blank");
    });
  }

  // ================================
  // AMBIENT CURSOR GLOW
  // ================================
  if (DOM.cursorGlow) {
    document.addEventListener("pointermove", (e) => {
      DOM.cursorGlow.style.opacity = "1";
      DOM.cursorGlow.style.left = `${e.clientX}px`;
      DOM.cursorGlow.style.top = `${e.clientY}px`;
    });

    document.addEventListener("pointerleave", () => {
      DOM.cursorGlow.style.opacity = "0";
    });
  }

  // ================================
  // PARALLAX BANNER
  // ================================
  if (DOM.bannerParallax) {
    DOM.bannerParallax.addEventListener("pointermove", (e) => {
      const rect = DOM.bannerParallax.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateX = y * -6;
      const rotateY = x * 6;
      DOM.bannerParallax.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    DOM.bannerParallax.addEventListener("pointerleave", () => {
      DOM.bannerParallax.style.transform = "rotateX(0) rotateY(0)";
    });
  }

  // ================================
  // SCROLL REVEAL
  // ================================
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("reveal-visible"));
  }

  // ================================
  // INIT
  // ================================
  initMode();
  initPreset();
  initSidebar();
  initSearch();
  renderHistory();
  loadSettings();
  appendLog("Ada API Console siap.");
});