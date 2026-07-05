# emotions vault

Sitio estático de álbum personal: películas, series, anime y música vistas/escuchadas.

## Estructura

- `index.html` — shell semántico, modales y carga de scripts
- `css/styles.css` — tema editorial analógico y responsive
- `data/seeds.js` — catálogo base de ejemplo expuesto como `window.SEEDS`
- `data/storage.js` — persistencia local (`localStorage`) + merge con seeds
- `js/app.js` — render, filtros, búsqueda, orden y modal detalle
- `js/editor.js` — CRUD: alta, edición y eliminación
- `js/posters.js` — búsqueda de carátulas (TMDB, AniList, iTunes)

## Flujo

1. `seeds.js` alimenta la base.
2. `storage.js` usa seeds como fallback y guarda cambios en `localStorage`.
3. `app.js` renderiza el catálogo y expone `window.vaultRefresh()`.
4. `editor.js` permite agregar/editar/eliminar y actualiza la vista.

## Ejecución

- Abrir `index.html` directamente (funciona sin servidor).
- Para pruebas locales con cambios automáticos: cualquier servidor estático sobre esta carpeta.
