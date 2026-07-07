/*
 * status-panel.js
 *
 * Filtros y badge por estado del ítem:
 *  - pending | watching | haven't finish | had watched
 */
(function () {
  'use strict';

  const LABELS = {
    all: 'Todos',
    pending: 'Pendiente',
    watching: 'Viendo / Reproduciendo',
    "haven't finish": 'No terminado',
    'had watched': 'Visto / Escuchado'
  };

  const PREFIX = {
    pending: '⏳',
    watching: '▶',
    "haven't finish": '⏸',
    'had watched': '✔'
  };

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureStyles() {
    if (document.getElementById('status-panel-styles')) return;
    const style = document.createElement('style');
    style.id = 'status-panel-styles';
    style.textContent = `
      .status-panel { display:flex; flex-wrap:wrap; gap:8px; }
      .status-panel[hidden] { display:none; }
      .status-chip { ... }
    `;
    document.head.appendChild(style);
  }

  function badgeHTML(status) {
    const key = String(status || 'pending').toLowerCase();
    const label = LABELS[key] || 'Pendiente';
    const prefix = PREFIX[key] || '';
    return `<span class="status-badge status-badge--${esc(key)}">${prefix} ${esc(label)}</span>`;
  }

  window.VAULT_STATUS = {
    badgeHTML,
    ensureStyles,
    LABELS,
    PREFIX
  };
})();
