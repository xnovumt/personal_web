/*
 * Renderiza el catálogo a partir de MEDIA (data/media.js).
 * Sin dependencias ni build: DOM plano. Toda la data entra por getMedia(),
 * así el día que haya API solo cambia esa función.
 */
(function () {
  "use strict";

  const getMedia = () => (Array.isArray(window.MEDIA) ? window.MEDIA : []);

  const TYPES = {
    all: "Todo",
    movie: "Películas",
    series: "Series",
    music: "Música",
    anime: "Anime"
  };

  const state = { type: "all", query: "", sort: "recent" };

  const $ = (sel) => document.querySelector(sel);
  const grid = $("#grid");
  const emptyEl = $("#empty");
  const modal = $("#modal");
  const modalBody = $("#modal-body");
  let lastFocused = null;

  const STAR = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="m12 17.27 5.18 3.12-1.37-5.9 4.58-3.96-6.03-.52L12 4.5 9.64 10.01l-6.03.52 4.58 3.96-1.37 5.9L12 17.27Z"/></svg>';

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // Portada de reserva: ficha de catálogo (tinta plana de la categoría + iniciales).
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
          <span class="rating">${STAR}${item.rating.toFixed(1)}</span>
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
      .map(
        ([k, label]) =>
          `<button class="tab" role="tab" data-type="${k}" aria-selected="${k === state.type}">${esc(label)}</button>`
      )
      .join("");
  }

  // ---------- Modal ----------
  function openModal(item) {
    const genres = (item.genres || []).map((g) => `<span class="chip">${esc(g)}</span>`).join("");
    modalBody.innerHTML = `
      <div class="detail t-${esc(item.type)}">
        <div class="detail-poster">${posterInner(item)}</div>
        <div class="detail-info">
          <p class="detail-kicker">${esc(TYPES[item.type] || item.type)}</p>
          <h2 id="modal-title">${esc(item.title)}</h2>
          <p class="detail-meta">${esc(item.creator)} · ${item.year}</p>
          <p class="detail-rating">${STAR}${item.rating.toFixed(1)} / 5</p>
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
    renderTabs();
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
  render();
})();
