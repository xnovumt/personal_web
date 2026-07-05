/*
 * storage.js
 * Capa de persistencia del catálogo.
 *
 * - Fase 1 (ahora): localStorage con fallback a seeds.
 * - Fase 2 (backend): reemplazar loadMedia/saveMedia por fetch('/api/media').
 *
 * Importante: nunca mutamos window.SEEDS; working copy siempre es un array nuevo.
 */
const STORAGE_KEY = "emotions_vault_media_v1";

function cloneSeeds() {
  try {
    return (Array.isArray(window.SEEDS) ? window.SEEDS : []).map((item) => ({ ...item }));
  } catch (_e) {
    return [];
  }
}

function loadMedia() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_e) {
    // localStorage corrupto o unavailable
  }
  return cloneSeeds();
}

function saveMedia(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (_e) {
    // storage lleno / bloqueado
  }
}

function resetMedia() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_e) {
    // ignore
  }
}

window.VAULT_STORAGE = { loadMedia, saveMedia, resetMedia };
