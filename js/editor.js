/*
 * editor.js
 * Modal CRUD: agregar, editar y eliminar ítems del catálogo.
 *
 * Depende de:
 *  - window.VAULT_STORAGE (data/storage.js)
 *  - window.fetchPoster  (js/posters.js)
 *  - window.vaultRefresh () (js/app.js)
 */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const modal = $("#editor-modal");
  const backdrop = modal ? modal.querySelector("[data-close]") : null;
  const form = $("#editor-form");
  const deleteBtn = $("#editor-delete");
  const searchBtn = $("#editor-search-poster");
  const posterPreview = $("#editor-poster-preview");
  const posterUrlInput = $("#editor-poster");
  const titleInput = $("#editor-title");
  const typeInput = $("#editor-type");
  const yearInput = $("#editor-year");
  const feedback = $("#editor-feedback");

  let editingId = null;
  let lastFocused = null;

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function initForm() {
    if (!form) return;
    form.reset();
    setFeedback("");
    setPosterPreview(null);
    editingId = null;
    if (deleteBtn) deleteBtn.hidden = true;
  }

  function setFeedback(msg) {
    if (!feedback) return;
    feedback.textContent = msg || "";
    feedback.hidden = !msg;
  }

  function setPosterPreview(url) {
    if (!posterPreview) return;
    if (url) {
      posterPreview.innerHTML = `<img src="${esc(url)}" alt="Vista previa" />`;
    } else {
      posterPreview.innerHTML = `<span class="poster-fallback"><span class="pf-initials">?</span><span class="pf-label">Preview</span></span>`;
    }
  }

  function fillForm(item) {
    if (!form) return;
    setField("#editor-type", item.type || "movie");
    setField("#editor-title", item.title || "");
    setField("#editor-creator", item.creator || "");
    setField("#editor-year", item.year || "");
    setField("#editor-rating", item.rating ?? "");
    setField("#editor-genres", (item.genres || []).join(", "));
    setField("#editor-note", item.note || "");
    setField("#editor-poster", item.poster || "");
    setField("#editor-favorite", item.favorite ? "on" : "");
    setPosterPreview(item.poster || null);
  }

  function setField(sel, value) {
    const el = $(sel);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = !!value;
    } else {
      el.value = value;
    }
  }

  function getField(sel) {
    const el = $(sel);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return el.value.trim();
  }

  function collect() {
    const type = getField("#editor-type");
    const title = getField("#editor-title");
    const creator = getField("#editor-creator");
    const yearRaw = getField("#editor-year");
    const ratingRaw = getField("#editor-rating");
    const genresRaw = getField("#editor-genres");
    const note = getField("#editor-note");
    const poster = getField("#editor-poster");
    const favorite = !!getField("#editor-favorite");

    const year = yearRaw ? Number(yearRaw) : null;
    const rating = ratingRaw === "" ? null : Number(ratingRaw);

    const genres = genresRaw
      ? genresRaw.split(",").map((g) => g.trim()).filter(Boolean)
      : [];

    return {
      id: editingId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
      type,
      title,
      creator,
      year,
      rating,
      genres,
      note,
      favorite,
      poster: poster || null,
      added: editingId ? undefined : todayISO()
    };
  }

  function validate(data) {
    if (!data.title) return "El título es obligatorio.";
    if (!["movie", "series", "music", "anime"].includes(data.type)) return "Tipo inválido.";
    if (data.year !== null && (data.year < 1800 || data.year > new Date().getFullYear() + 5)) return "Año fuera de rango.";
    if (data.rating !== null && (data.rating < 0 || data.rating > 5)) return "Rating debe estar entre 0 y 5.";
    return null;
  }

  function persist(items) {
    if (typeof window.VAULT_STORAGE !== "undefined" && window.VAULT_STORAGE.saveMedia) {
      window.VAULT_STORAGE.saveMedia(items);
    }
  }

  function openAdd() {
    editingId = null;
    initForm();
    if (modal) modal.hidden = false;
    if (backdrop) backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    const first = $("#editor-type") || titleInput;
    if (first) first.focus();
  }

  function openEdit(id) {
    const source = typeof window.VAULT_STORAGE !== "undefined" && window.VAULT_STORAGE.loadMedia
      ? window.VAULT_STORAGE.loadMedia()
      : [];
    const item = source.find((m) => m.id === id);
    if (!item) return;
    editingId = id;
    initForm();
    fillForm(item);
    if (deleteBtn) deleteBtn.hidden = false;
    if (modal) modal.hidden = false;
    if (backdrop) backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    if (titleInput) titleInput.focus();
  }

  function openDelete(id) {
    if (!confirm("¿Eliminar este ítem del catálogo?")) return;
    const items = (typeof window.VAULT_STORAGE !== "undefined" && window.VAULT_STORAGE.loadMedia
      ? window.VAULT_STORAGE.loadMedia()
      : []).filter((m) => m.id !== id);
    persist(items);
    close();
    if (typeof window.vaultRefresh === "function") window.vaultRefresh();
  }

  function close() {
    if (modal) modal.hidden = true;
    if (backdrop) backdrop.hidden = true;
    document.body.style.overflow = "";
    editingId = null;
  }

  async function submit() {
    setFeedback("");
    const data = collect();
    const err = validate(data);
    if (err) {
      setFeedback(err);
      return;
    }

    let items = (typeof window.VAULT_STORAGE !== "undefined" && window.VAULT_STORAGE.loadMedia
      ? window.VAULT_STORAGE.loadMedia()
      : []);

    if (editingId) {
      const idx = items.findIndex((m) => m.id === editingId);
      if (idx === -1) {
        setFeedback("No se encontró el ítem a editar.");
        return;
      }
      // Mantener added original si no viene data nueva
      if (data.added === undefined) data.added = items[idx].added;
      items[idx] = data;
    } else {
      items = [data, ...items];
    }

    persist(items);
    close();
    if (typeof window.vaultRefresh === "function") window.vaultRefresh();
  }

  async function searchPoster() {
    const title = getField("#editor-title");
    const type = getField("#editor-type");
    const yearRaw = getField("#editor-year");
    const year = yearRaw ? Number(yearRaw) : null;

    if (!title) {
      setFeedback("Primero escribí el título para buscar la carátula.");
      return;
    }
    if (typeof window.fetchPoster !== "function") {
      setFeedback("El buscador de carátulas no está disponible.");
      return;
    }

    setFeedback("Buscando carátula…");
    if (searchBtn) searchBtn.disabled = true;

    try {
      const result = await window.fetchPoster({ title, type, year });
      if (!result) {
        setFeedback("No se encontró una carátula. Probá ajustar el título o el año.");
        return;
      }
      setField("#editor-title", result.title || title);
      if (result.year && !yearRaw) setField("#editor-year", result.year);
      setField("#editor-poster", result.poster);
      setPosterPreview(result.poster);
      setFeedback(`Carátula encontrada (${result.source.toUpperCase()}).`);
    } catch (e) {
      setFeedback("Error al buscar la carátula. Probá de nuevo más tarde.");
    } finally {
      if (searchBtn) searchBtn.disabled = false;
    }
  }

  // ---------- Events ----------
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
  }

  const addBtn = $("#add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", openAdd);
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (editingId) openDelete(editingId);
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", searchPoster);
  }

  backdrop && backdrop.addEventListener("click", close);
  modal && modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) close();
  });

  // Si podés editar desde la ficha de detalle (app.js), exponer API:
  window.vaultEdit = function (id) {
    openEdit(id);
  };
})();
