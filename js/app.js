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

  // Portada de reserva: gradiente determinista por título + iniciales.
  function fallbackPoster(item) {
    let h = 0;
    for (const ch of item.title) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const initials = item.title
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
    const bg = `linear-gradient(135deg, hsl(${h} 55% 30%), hsl(${(h + 40) % 360} 60% 18%))`;
    return `<div class="poster-fallback" style="background:${bg}">${esc(initials)}</div>`;
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
    const color = `var(--type-${item.type})`;
    const fav = item.favorite
      ? `<span class="fav-mark" title="Favorito"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="m12 21-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21Z"/></svg></span>`
      : "";
    return `
      <button class="card" data-id="${esc(item.id)}" aria-label="${esc(item.title)} — ver detalle">
        <span class="poster">
          <span class="badge-type" style="background:${color}">${esc(TYPES[item.type] || item.type)}</span>
          ${fav}
          <span class="rating-badge">${STAR}${item.rating.toFixed(1)}</span>
          ${posterInner(item)}
        </span>
        <span class="card-title">${esc(item.title)}</span>
        <span class="card-meta">${esc(item.creator)} · ${item.year}</span>
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
    $("#stats").innerHTML = Object.entries(TYPES)
      .filter(([k]) => k === "all" || counts[k])
      .map(([k, label]) => `<span class="stat-pill"><b>${counts[k] || 0}</b> ${esc(label)}</span>`)
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
      <div class="detail">
        <div class="detail-poster">${posterInner(item)}</div>
        <div class="detail-info">
          <h2 id="modal-title">${esc(item.title)}</h2>
          <p class="card-meta">${esc(TYPES[item.type] || item.type)} · ${esc(item.creator)} · ${item.year}</p>
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

  // ---------- Init ----------
  renderStats();
  renderTabs();
  render();
})();
