/*
 * Catálogo personal. Fuente de verdad de todo el sitio.
 * Para añadir algo: copia un objeto y edítalo. Campos:
 *   id        único (string)
 *   type      "movie" | "series" | "music" | "anime"
 *   title     título
 *   creator   director / artista / estudio
 *   year      año (number)
 *   rating    valoración personal 0–5 (permite medios: 4.5)
 *   genres    lista de géneros
 *   note      por qué me gustó
 *   favorite  true para destacarlo
 *   poster    URL de carátula (opcional; si es null se genera una portada)
 *   added     fecha ISO en que lo añadí (ordena "Recientes")
 *
 * Se expone en window para funcionar abriendo index.html directamente
 * (file://) sin servidor. Cambiar a fetch('/api') cuando exista backend.
 */
window.MEDIA = [
  {
    id: "spirited-away",
    type: "anime",
    title: "El viaje de Chihiro",
    creator: "Studio Ghibli",
    year: 2001,
    rating: 5,
    genres: ["Fantasía", "Aventura"],
    note: "La cima de Ghibli: imaginación desbordante y una protagonista que crece de verdad.",
    favorite: true,
    poster: null,
    added: "2024-11-02"
  },
  {
    id: "blade-runner-2049",
    type: "movie",
    title: "Blade Runner 2049",
    creator: "Denis Villeneuve",
    year: 2017,
    rating: 4.5,
    genres: ["Ciencia ficción", "Neo-noir"],
    note: "Fotografía hipnótica y una idea de identidad que se queda contigo.",
    favorite: true,
    poster: null,
    added: "2024-10-18"
  },
  {
    id: "breaking-bad",
    type: "series",
    title: "Breaking Bad",
    creator: "Vince Gilligan",
    year: 2008,
    rating: 5,
    genres: ["Drama", "Crimen"],
    note: "La transformación de personaje mejor escrita de la TV.",
    favorite: true,
    poster: null,
    added: "2024-09-30"
  },
  {
    id: "random-access-memories",
    type: "music",
    title: "Random Access Memories",
    creator: "Daft Punk",
    year: 2013,
    rating: 4.5,
    genres: ["Electrónica", "Disco"],
    note: "Producción impecable; suena vivo y cálido de principio a fin.",
    favorite: false,
    poster: null,
    added: "2024-11-20"
  },
  {
    id: "fmab",
    type: "anime",
    title: "Fullmetal Alchemist: Brotherhood",
    creator: "Bones",
    year: 2009,
    rating: 5,
    genres: ["Aventura", "Fantasía oscura"],
    note: "Trama, acción y temas maduros sin un solo episodio de relleno.",
    favorite: false,
    poster: null,
    added: "2024-08-14"
  },
  {
    id: "parasite",
    type: "movie",
    title: "Parásitos",
    creator: "Bong Joon-ho",
    year: 2019,
    rating: 4.5,
    genres: ["Thriller", "Drama social"],
    note: "Cambia de tono como quien cambia de marcha, sin despeinarse.",
    favorite: false,
    poster: null,
    added: "2024-07-05"
  },
  {
    id: "the-bear",
    type: "series",
    title: "The Bear",
    creator: "Christopher Storer",
    year: 2022,
    rating: 4,
    genres: ["Drama", "Comedia"],
    note: "Ritmo de cocina real; la tensión se siente en el estómago.",
    favorite: false,
    poster: null,
    added: "2024-12-01"
  },
  {
    id: "in-rainbows",
    type: "music",
    title: "In Rainbows",
    creator: "Radiohead",
    year: 2007,
    rating: 5,
    genres: ["Rock alternativo", "Art rock"],
    note: "Su disco más cálido y humano; crece con cada escucha.",
    favorite: true,
    poster: null,
    added: "2024-06-22"
  }
];
