# emotions vault

Sitio estático de álbum personal: películas, series, anime y música vistas/escuchadas.

## Estructura

- `index.html` — shell semántico, modales y carga de scripts
- `css/styles.css` — tema editorial analógico y responsive
- `data/seeds.js` — catálogo base inmutable
- `data/seed-extra.js` — entradas adicionales
- `data/storage.js` — persistencia local (`localStorage`) + merge con seeds
- `js/app.js` — render, filtros, búsqueda, orden y modal detalle
- `js/editor.js` — CRUD: alta, edición y eliminación
- `js/posters.js` — abstracción APIs de carátulas (TMDB, AniList, iTunes)
- `js/cognee.js` — capa de memoria tipo knowledge graph sobre localStorage

## Flujo

1. `seeds.js` + `seed-extra.js` alimentan la base.
2. `storage.js` usa seeds como fallback y guarda cambios en `localStorage`.
3. `app.js` renderiza el catálogo y expone `window.vaultRefresh()`.
4. `editor.js` permite agregar/editar/eliminar y actualiza la vista.
5. `cognee.js` agrega operaciones `remember/recall/forget/improve` y un indicador compacto en el contador de estadísticas.

## Ejecución

- Abrir `index.html` directamente (funciona sin servidor).
- Para pruebas locales con cambios automáticos: cualquier servidor estático sobre esta carpeta.

## Documentación y referencias

- `docs/system_prompts_leaks-mirror/` — mirror local para estudio de prompts.
- `docs/skills-manifest.md` — skills disponibles y mapeo hacia Claude.
