# Mi Catálogo

Sitio personal para catalogar las películas, series, música y anime que he visto y me gustaron.
Inspirado en Letterboxd, Simkl y JustWatch: rejilla de portadas, filtros por tipo, búsqueda,
orden y ficha de detalle.

## Cómo funciona

Sitio **estático** (HTML + CSS + JS, sin build ni dependencias). El contenido vive separado de
la presentación en un único archivo de datos, para poder crecer sin tocar el resto.

```
index.html        Estructura de la página
css/styles.css    Estilos (tema oscuro, tokens de color)
js/app.js         Render del grid, filtros, búsqueda, orden y modal
data/media.js     El catálogo (fuente de verdad)
```

`app.js` lee todo a través de `getMedia()`. Hoy devuelve la variable global `MEDIA`; el día que
haya un backend, solo cambia esa función (a `fetch('/api')`) sin tocar el render.

## Añadir contenido

Edita `data/media.js` y añade un objeto:

```js
{
  id: "identificador-unico",
  type: "movie",            // movie | series | music | anime
  title: "Título",
  creator: "Director / artista / estudio",
  year: 2024,
  rating: 4.5,              // 0–5
  genres: ["Drama"],
  note: "Por qué me gustó",
  favorite: false,
  poster: null,             // URL de carátula, o null para portada generada
  added: "2025-01-20"       // YYYY-MM-DD (ordena "Recientes")
}
```

Si `poster` es `null`, se genera una portada con degradado e iniciales, así nunca hay imágenes rotas.

## Ver en local

Al abrir `index.html` directamente funciona porque los datos se cargan por `<script>` (sin `fetch`).
Para reproducir el entorno de producción:

```bash
python -m http.server 8000   # luego abre http://localhost:8000
```

## Desplegar en Vercel

Sitio estático, sin configuración: en Vercel elige **Add New → Project**, importa este repo y
**Deploy**. No hay build command ni framework que configurar.

## Siguientes pasos

- Portadas reales vía API (TMDB para cine/TV, MusicBrainz para música).
- Formulario para añadir desde el navegador (localStorage primero; backend después).
- Vistas de lista y estadísticas (géneros, décadas, ritmo de visionado).
- Enlaces profundos por ítem (`?id=…`) para compartir.
