/*
 * posters.js
 * Capa de imágenes/metadatos externos.
 *
 * Fuentes:
 *  - Cine/Series: TMDB (The Movie Database) — requiere API key gratuita.
 *  - Anime: AniList (GraphQL público, sin key).
 *  - Música: iTunes Search API (sin key). Opcional: Spotify si hay client id/secret.
 *
 * Uso:
 *   const result = await fetchPoster({ title, type, year });
 *   // result = { title, year, poster, source } | null
 */
const TMDB_API_KEY_STORAGE = "emotions_vault_tmdb_key";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

function getTmdbKey() {
  try {
    return localStorage.getItem(TMDB_API_KEY_STORAGE) || "";
  } catch (_e) {
    return "";
  }
}

function setTmdbKey(key) {
  try {
    localStorage.setItem(TMDB_API_KEY_STORAGE, key.trim());
  } catch (_e) {
    // ignore
  }
}

async function tmdbConfig() {
  const key = getTmdbKey();
  if (!key) return null;
  try {
    const url = `${TMDB_BASE}/configuration?api_key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.images || null;
  } catch (_e) {
    return null;
  }
}

async function fetchTMDBPoster(title, type, year) {
  const key = getTmdbKey();
  if (!key) return null;

  try {
    const mediaType = type === "series" ? "tv" : "movie";
    const params = new URLSearchParams({
      api_key: key,
      query: title,
      include_adult: "false",
      language: "es-ES",
      page: "1"
    });
    if (year) params.set("year", String(year));

    const res = await fetch(`${TMDB_BASE}/search/${mediaType}?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();

    const results = data.results || [];
    if (!results.length) return null;

    // Preferir coincidencia exacta o por año si está disponible
    let best = results[0];
    if (year) {
      const withYear = results.find((r) => (r.release_date || r.first_air_date || "").startsWith(String(year)));
      if (withYear) best = withYear;
    }

    const posterPath = best.poster_path;
    if (!posterPath) return null;

    // Elegir tamaño alto disponible; w780 es buen balance calidad/rendimiento
    const config = await tmdbConfig();
    let size = "w500";
    if (config && config.poster_sizes && config.poster_sizes.includes("w780")) {
      size = "w780";
    }

    return {
      title: best.title || best.name || title,
      year: (best.release_date || best.first_air_date || "").slice(0, 4) || year,
      poster: `${TMDB_IMG_BASE}/${size}${posterPath}`,
      source: "tmdb"
    };
  } catch (_e) {
    return null;
  }
}

async function fetchAniListPoster(title, year) {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 3) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          startDate { year }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: title } })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const media = (json.data && json.data.Page && json.data.Page.media && json.data.Page.media[0]) || null;
    if (!media) return null;

    const cover = media.coverImage && (media.coverImage.extraLarge || media.coverImage.large);
    if (!cover) return null;

    const mediaYear = (media.startDate && media.startDate.year) || year;
    const mediaTitle = media.title && (media.title.romaji || media.title.english || media.title.native || title);

    return {
      title: mediaTitle,
      year: mediaYear,
      poster: cover,
      source: "anilist"
    };
  } catch (_e) {
    return null;
  }
}

async function fetchiTunesPoster(title, year) {
  try {
    const params = new URLSearchParams({
      term: title,
      media: "music",
      limit: "5",
      country: "US"
    });
    if (year) params.set("attribute", "year"); // no estrictamente soportado por iTunes; se filtra luego

    const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();

    const results = data.results || [];
    if (!results.length) return null;

    // Elegir el resultado con artwork de mayor resolución
    let best = results[0];
    results.forEach((r) => {
      const bestSize = (best.artworkUrl100 || "").replace("100x100", "600x600");
      const candidateSize = (r.artworkUrl100 || "").replace("100x100", "600x600");
      if (candidateSize && (!bestSize || candidateSize.length > bestSize.length)) best = r;
    });

    const artwork = (best.artworkUrl100 || "").replace("100x100", "600x600");
    if (!artwork) return null;

    return {
      title: best.collectionName || best.trackName || title,
      year: (best.releaseDate || "").slice(0, 4) || year,
      poster: artwork,
      source: "itunes"
    };
  } catch (_e) {
    return null;
  }
}

async function fetchPoster({ title, type, year }) {
  if (!title || !type) return null;

  const normalizedType = String(type).toLowerCase();

  if (normalizedType === "movie" || normalizedType === "series") {
    return fetchTMDBPoster(title, normalizedType, year);
  }
  if (normalizedType === "anime") {
    return fetchAniListPoster(title, year);
  }
  if (normalizedType === "music") {
    return fetchiTunesPoster(title, year);
  }

  return null;
}
