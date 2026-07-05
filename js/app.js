/*
 * app.js — Render del catálogo, filtros, búsqueda, orden y modal detalle.
 *
 * Cambios vs original:
 *  - Ahora lee a través de storage.loadMedia().
 *  - Expone window.vaultRefresh() para re-renderizar tras cambios CRUD.
 */
(function () {
  "use strict";

  const { loadMedia, saveMedia } = (function () {
    try {
      const s = window.VAULT_STORAGE;
      return s || {};
    } catch (_e) {
      return {};
    }
  })();

  const getMedia = () => (Array.isArray(loadMedia) ? loadMedia() : []);

  const TYPES = { all: "Todo", movie: "Películas", series: "Series", music: "Música", anime: "Anime" };

  // Icono de línea minimalista
  const svg = (inner) =>
    `<svg viewBox="0 0 24 24" class="ic" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const CATEGORY_ICONS = {
    all: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    movie: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    series: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 3l4 4 4-4"/>'),
    music: svg('<circle cx="6" cy="18" r="2.5"/><circle cx="16" cy="16" r="2.5"/><path d="M8.5 18V5l10-2v11"/>'),
    anime: svg('<path d="M12 3l2.2 6.1L20.5 12l-6.3 2.9L12 21l-2.2-6.1L3.5 12l6.3-2.9L12 3z"/>')
  };

  // Iconos por género (familias) + reserva
  const GI = {
    star: svg('<path d="M12 3l2.5 6.3 6.5.4-5 4.2 1.6 6.4L12 17.3 5.9 20.7l1.6-6.4-5-4.2 6.5-.4L12 3z"/>'),
    compass: svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3 5.3-2.2z"/>'),
    rocket: svg('<path d="M12 3c3 2.2 4.5 5.2 4.5 9L12 21l-4.5-9C7.5 8.2 9 5.2 12 3z"/><circle cx="12" cy="10" r="1.4"/><path d="M9 16l-2.5 3.5M15 16l2.5 3.5"/>'),
    magnifier: svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/>'),
    masks: svg('<path d="M4 5c0 7.5 3.5 12 8 12s8-4.5 8-12c-5.3-1-10.7-1-16 0z"/><circle cx="9" cy="9.5" r=".6"/><circle cx="15" cy="9.5" r=".6"/><path d="M9 13c1.4 1.3 4.6 1.3 6 0"/>'),
    smile: svg('<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r=".6"/><circle cx="15" cy="10" r=".6"/><path d="M8 14c1.6 2 6.4 2 8 0"/>'),
    wave: svg('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>'),
    disc: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>'),
    bolt: svg('<path d="M13 3L5 13h5l-1 8 8-11h-5l1-7z"/>'),
    tag: svg('<path d="M4 4h8l8 8-8 8-8-8V4z"/><circle cx="8" cy="8" r="1.2"/>')
  };
  const GENRE_ICON = {
    "fantasía": GI.star, "fantasía oscura": GI.star,
    "aventura": GI.compass,
    "ciencia ficción": GI.rocket,
    "neo-noir": GI.magnifier, "crimen": GI.magnifier, "thriller": GI.magnifier,
    "drama": GI.masks, "drama social": GI.masks,
    "comedia": GI.smile,
    "electrónica": GI.wave,
    "disco": GI.disc,
    "rock alternativo": GI.bolt, "art rock": GI.bolt
  };
  const genreIcon = (g) => GENRE_ICON[g.toLowerCase()] || GI.tag;

  const state = { type: "all", query: "", sort: "recent", genre: null };

  const $ = (sel) => document.querySelector(sel);
  const grid = $("#grid");
  const emptyEl = $("#empty");
  const modal = $("#modal");
  const modalBody = $("#modal-body");
  const genreBtn = $("#genre-btn");
  const genrePanel = $("#genre-panel");
  let lastFocused = null;

  const STAR = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="m12 17.27 5.18 3.12-1.37-5.9 4.58-3.96-6.03-.52L12 4.5 9.64 10.01l-6.03.52 4.58 3.96-1.37 5.9L12 17.27Z"/></svg>';

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // Portada de reserva: ficha de catálogo (tinta plana + iniciales)
  function fallbackPoster(item) {
    const initials = item.title
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
    return `<span class="poster-fallback"><span class="pf-initials">${esc(initials)}</span><span class="pf-label">${esc(TYPES[item.type] || item.type)}</span></span>`;
  }

  const posterInner = (item) =>
    item.poster
      ? `<img src="${esc(item.poster)}" alt="Carátula de ${esc(item.title)}" loading="lazy" />`
      : fallbackPoster(item);

  function matches(item) {
    if (state.type !== "all" && item.type !== state.type) return false;
    if (state.genre && !(item.genres || []).includes(state.genre)) return false;
    if (state.query && !item.title.toLowerCase().includes(state.query)) return false;
    return true;
  }

  const SORTERS = {
    recent: (a, b) => (b.added || "").localeCompare(a.added || ""),
    rating: (a, b) => b.rating - a.rating,
    year: (a, b) => b.year - a.year,
    title: (a, b) => a.title.localeCompare(b.title, "es")
  };

  function cardHTML(item) {
    const label = esc(TYPES[item.type] || item.type);
    const fav = item.favorite ? `<span class="fav-stamp">${STAR}FAV</span>` : "";
    return `
      <button class="card t-${esc(item.type)}" data-id="${esc(item.id)}" aria-label="${esc(item.title)} — ver detalle">
        <span class="poster">
          <span class="tag">${label}</span>
          ${fav}
          <span class="rating">${STAR}${Number(item.rating).toFixed(1)}</span>
          ${posterInner(item)}
        </span>
        <span class="card-body">
          <span class="card-kicker">${label}</span>
          <span class="card-title">${esc(item.title)}</span>
          <span class="card-meta">${esc(item.creator)} · ${item.year}</span>
        </span>
      </button>`;
  }

  function render() {
    const items = getMedia().filter(matches).sort(SORTERS[state.sort] || SORTERS.recent);
    grid.innerHTML = items.map(cardHTML).join("");
    emptyEl.hidden = items.length > 0;
  }

  function renderStats() {
    const media = getMedia();
    const counts = { all: media.length };
    for (const m of media) counts[m.type] = (counts[m.type] || 0) + 1;
    const pad = (n) => String(n).padStart(2, "0");
    const labels = { all: "Títulos", movie: "Cine", series: "Series", music: "Música", anime: "Anime" };
    $("#stats").innerHTML = Object.keys(labels)
      .filter((k) => k === "all" || counts[k])
      .map((k) => `<span class="stat${k === "all" ? " is-total" : ""}"><b>${pad(counts[k] || 0)}</b> ${esc(labels[k])}</span>`)
      .join("");
  }

  function renderTabs() {
    $("#tabs").innerHTML = Object.entries(TYPES)
      .map(([k, label]) =>
        `<button class="tab" role="tab" data-type="${k}" aria-selected="${k === state.type}">${CATEGORY_ICONS[k] || ""}<span class="tab-label">${esc(label)}</span></button>`
      )
      .join("");
  }

  // ---------- Géneros ----------
  function availableGenres() {
    const set = new Set();
    for (const m of getMedia()) {
      if (state.type !== "all" && m.type !== state.type) continue;
      (m.genres || []).forEach((g) => set.add(g));
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }

  function renderGenrePanel() {
    const chip = (g, active, label) =>
      `<button class="genre-chip${active ? " is-active" : ""}" data-genre="${esc(g)}" aria-pressed="${active}">${g ? genreIcon(g) : GI.tag}<span>${esc(label)}</span></button>`;
    genrePanel.innerHTML =
      chip("", !state.genre, "Todos") +
      availableGenres().map((g) => chip(g, state.genre === g, g)).join("");
  }

  function syncGenreBtn() {
    genreBtn.innerHTML = `${GI.tag}<span>${esc(state.genre || "Género")}</span>`;
    genreBtn.classList.toggle("is-filtering", !!state.genre);
  }

  function updateGenreControl() {
    const inSection = state.type !== "all";
    genreBtn.hidden = !inSection;
    if (!inSection) {
      state.genre = null;
      genrePanel.hidden = true;
      genreBtn.setAttribute("aria-expanded", "false");
    }
    syncGenreBtn();
    if (!genrePanel.hidden) renderGenrePanel();
  }

  // ---------- Modal ----------
  function openModal(item) {
    const genres = (item.genres || []).map((g) => `<span class="chip">${genreIcon(g)}${esc(g)}</span>`).join("");
    modalBody.innerHTML = `
      <div class="detail t-${esc(item.type)}">
        <div class="detail-poster">${posterInner(item)}</div>
        <div class="detail-info">
          <p class="detail-kicker">${esc(TYPES[item.type] || item.type)}</p>
          <h2 id="modal-title">${esc(item.title)}</h2>
          <p class="detail-meta">${esc(item.creator)} · ${item.year}</p>
          <p class="detail-rating">${STAR}${Number(item.rating).toFixed(1)} / 5</p>
          <div class="genres">${genres}</div>
          ${item.note ? `<p class="detail-note">${esc(item.note)}</p>` : ""}
        </div>
      </div>`;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $(".modal-close").focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  // ---------- Eventos ----------
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const item = getMedia().find((m) => m.id === card.dataset.id);
    if (item) openModal(item);
  });

  $("#tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    state.type = tab.dataset.type;
    state.genre = null;
    renderTabs();
    updateGenreControl();
    render();
  });

  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    render();
  });

  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });

  genreBtn.addEventListener("click", () => {
    const open = genrePanel.hidden;
    genrePanel.hidden = !open;
    genreBtn.setAttribute("aria-expanded", String(open));
    if (open) renderGenrePanel();
  });

  genrePanel.addEventListener("click", (e) => {
    const chip = e.target.closest(".genre-chip");
    if (!chip) return;
    state.genre = chip.dataset.genre || null;
    syncGenreBtn();
    renderGenrePanel();
    render();
  });

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // ---------- Tema ----------
  const themeBtn = $("#theme-toggle");
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.11-1.36A5.39 5.39 0 0 1 12 3Z"/></svg>';
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-6h.01M12 23h.01M1 12h.01M23 12h.01M4 4l.01.01M20 20l.01.01M20 4l.01.01M4 20l.01.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function syncThemeBtn() {
    const dark = document.documentElement.dataset.theme === "dark";
    themeBtn.innerHTML = dark ? SUN + "<span>Día</span>" : MOON + "<span>Noche</span>";
    themeBtn.setAttribute("aria-pressed", String(dark));
    themeBtn.setAttribute("aria-label", dark ? "Cambiar a modo día" : "Cambiar a modo noche");
  }

  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncThemeBtn();
  });

  // ---------- Init ----------
  syncThemeBtn();
  renderStats();
  renderTabs();
  updateGenreControl();
  render();

  // API pública para re-renderizar desde el editor
  window.vaultRefresh = function () {
    renderStats();
    renderTabs();
    updateGenreControl();
    render();
  };
})();
