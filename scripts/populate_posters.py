#!/usr/bin/env python3
# Generate media entries with poster URLs from public APIs.
# - Anime -> AniList GraphQL
# - Movies/Series/Music -> iTunes Search API
import json, os, re, sys
from urllib.request import Request, urlopen
from urllib.parse import quote_plus

TMDB_BASE = "https://image.tmdb.org/t/p/w780"
ANILIST_URL = "https://graphql.anilist.co"
ITUNES_URL = "https://itunes.apple.com/search"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; vault-populate/1.0)",
    "Accept": "application/json",
}

def fetch_json(url, data=None, headers=None):
    req = Request(url, data=data, headers=headers or HEADERS, method="POST" if data else "GET")
    with urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))

def anilist_poster(title, year=None):
    query = """
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          title { romaji english native }
          coverImage { extraLarge large }
          startDate { year }
          siteUrl
        }
      }
    }
    """
    try:
        payload = json.dumps({"query": query, "variables": {"search": title}}).encode()
        data = fetch_json(ANILIST_URL, data=payload, headers={**HEADERS, "Content-Type": "application/json"})
        media = (((data.get("data") or {}).get("Page") or {}).get("media") or [None])[0]
        if not media:
            return None
        yr = ((media.get("startDate") or {}).get("year")) or year
        cover = (((media.get("coverImage") or {}).get("extraLarge")) or ((media.get("coverImage") or {}).get("large")))
        t = ((media.get("title") or {}).get("english") or (media.get("title") or {}).get("romaji") or title)
        if not cover:
            return None
        return {"title": t, "year": yr, "poster": cover, "source": "anilist"}
    except Exception as e:
        print(f"[anilist] {title}: {e}", file=sys.stderr)
        return None

def itunes_artwork(title, media="all", year=None):
    try:
        params = f"?term={quote_plus(title)}&media={media}&limit=5&country=US"
        data = fetch_json(ITUNES_URL + params)
        results = data.get("results") or []
        if not results:
            return None
        best = results[0]
        best_art = (best.get("artworkUrl100") or "").replace("100x100", "600x600")
        for r in results:
            art = (r.get("artworkUrl100") or "").replace("100x100", "600x600")
            if art and len(art) > len(best_art):
                best = r
                best_art = art
        if not best_art:
            return None
        t = best.get("collectionName") or best.get("trackName") or title
        yr = (best.get("releaseDate") or "").split("-")[0] or year
        return {"title": t, "year": int(yr) if yr and yr.isdigit() else year, "poster": best_art, "source": "itunes"}
    except Exception as e:
        print(f"[itunes] {title}: {e}", file=sys.stderr)
        return None

def slugify(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")

series = [
    ("Spartacus", "series", 2010, ["Drama","Acción"], "Serie de gladiadores y rebelión contra Roma; blood, sand and steel."),
    ("The Last of Us", "series", 2023, ["Drama","Post-apocalíptico"], "Joel y Ellie en un mundo devastado por hongos."),
    ("Peaky Blinders", "series", 2013, ["Drama","Crimen"], "Familia Shelby domina Birmingham entre guerras y negocios oscuros."),
    ("Euphoria", "series", 2019, ["Drama"], "Adolescencia sin filtro en torno a Zendaya."),
    ("True Detective", "series", 2014, ["Drama","Crimen"], "Temporadas tipo antología con casos oscuros y personajes atormentados."),
    ("The Queen's Gambit", "series", 2020, ["Drama"], "Ajedrez y obsesión en los años 60."),
    ("Sopranos", "series", 1999, ["Drama","Crimen"], "Terapia, familia y mafia en Nueva Jersey."),
    ("The Walking Dead", "series", 2010, ["Drama","Terror"], "Supervivencia extrema tras el apocalipsis zombi."),
    ("Dexter", "series", 2006, ["Drama","Crimen"], "Forense de día, justiciero nocturno de asesinos."),
    ("Mr. Robot", "series", 2015, ["Tecnología","Thriller"], "Hacker, ansiedad y hackeo global."),
    ("The Boys", "series", 2019, ["Acción","Comedia"], "Superhéroes corruptos versus humanos valientes."),
]

anime = [
    ("Fullmetal Alchemist: Brotherhood", "anime", 2009, ["Aventura","Fantasía"], "Alquimia, hermanos Elric y cero relleno."),
    ("Tokyo Ghoul", "anime", 2014, ["Terror","Drama"], "Entre humanos y ghouls con dilema de identidad."),
    ("Vinland Saga", "anime", 2019, ["Acción","Histórico"], "Vikingos, venganza y redención."),
    ("Sword Art Online", "anime", 2012, ["Ciencia ficción"], "MMORPG mortal entre la línea real y virtual."),
    ("Rick and Morty", "anime", 2013, ["Comedia","Ciencia ficción"], "Viajes dimensionales con humor negro."),
    ("Hunter x Hunter", "anime", 2011, ["Aventura","Fantasía"], "Exámenes Hunter, bestias cardenales y amistad."),
    ("Cowboy Bebop", "anime", 1998, ["Acción","Ciencia ficción"], "Cazarrecompensas espaciales con alma de jazz."),
    ("Demon Slayer", "anime", 2019, ["Acción","Fantasía"], "Demonios, respiración y redención familiar."),
]

movies = [
    ("The Dark Knight", "movie", 2008, ["Acción","Crimen"], "Batman y el Joker en duelo moral impecable."),
    ("The Wolf of Wall Street", "movie", 2013, ["Comedia","Drama"], "Excesos, dinero y autodestrucción en Wall Street."),
    ("Fight Club", "movie", 1999, ["Drama","Thriller"], "Primera regla: no hablar de Fight Club."),
    ("The Matrix", "movie", 1999, ["Ciencia ficción"], "Pastilla azul o roja; simulación y significado."),
    ("Gladiator", "movie", 2000, ["Acción","Drama"], "Venganza en la Antigua Roma."),
    ("Good Will Hunting", "movie", 1997, ["Drama"], "Genio invisible y terapia humana."),
    ("Joker", "movie", 2019, ["Drama","Crimen"], "Origen trágico del villano sin máscara social."),
    ("1917", "movie", 2019, ["Bélico","Drama"], "Misión en tiempo real en la Primera Guerra Mundial."),
    ("Shutter Island", "movie", 2010, ["Thriller","Misterio"], "Isla, locura y una verdad incómoda."),
    ("Taxi Driver", "movie", 1976, ["Drama","Crimen"], "Noche sucia y soledad en las calles."),
    ("Mad Max: Fury Road", "movie", 2015, ["Acción","Ciencia ficción"], "Persecución implacable en el desierto."),
    ("Ratatouille", "movie", 2007, ["Animación","Comedia"], "Cualquiera puede cocinar con pasión."),
    ("How to Train Your Dragon", "movie", 2010, ["Animación","Aventura"], "Chico, dragón y confianza entre especies."),
    ("Monsters, Inc.", "movie", 2001, ["Animación","Comedia"], "Susto como energía hasta que una niña lo cambia."),
    ("Monsters University", "movie", 2013, ["Animación","Comedia"], "Origen de la sorpresa y la competencia."),
]

already = {x["id"] for x in [
    {"id":"spirited-away"},{"id":"blade-runner-2049"},{"id":"breaking-bad"},
    {"id":"random-access-memories"},{"id":"fmab"},{"id":"parasite"},
    {"id":"the-bear"},{"id":"in-rainbows"}
]}

entries = []

def add(title, kind, year, genres, note):
    sid = slugify(title)
    if sid in already:
        sid = sid + "-2"
        if sid in already:
            sid = sid + "-" + os.urandom(2).hex()
    already.add(sid)
    entries.append({
        "id": sid,
        "type": kind,
        "title": title,
        "creator": "",
        "year": year,
        "rating": 0,
        "genres": genres,
        "note": note,
        "favorite": False,
        "poster": None,
        "added": "2025-07-07",
    })

for t,k,y,g,n in series: add(t,k,y,g,n)
for t,k,y,g,n in anime: add(t,k,y,g,n)
for t,k,y,g,n in movies: add(t,k,y,g,n)

print(f"[prepare] total entries: {len(entries)}")

# Enrich posters
enrich = []
anime_titles = [(e["title"], e["year"]) for e in entries if e["type"] == "anime"]
movie_titles = [(e["title"], e["year"]) for e in entries if e["type"] == "movie"]
series_titles = [(e["title"], e["year"]) for e in entries if e["type"] == "series"]

poster_map = {}

for title, year in anime_titles:
    res = anilist_poster(title, year)
    poster_map[title] = res

for title, year in series_titles:
    res = itunes_artwork(title, media="tvShow", year=year)
    poster_map[title] = res

for title, year in movie_titles:
    res = itunes_artwork(title, media="movie", year=year)
    poster_map[title] = res

missing = []
for e in entries:
    res = poster_map.get(e["title"])
    if res and res.get("poster"):
        e["poster"] = res["poster"]
        if not e["creator"]:
            e["creator"] = ""
        if not e["year"] and res.get("year"):
            e["year"] = res["year"]
    else:
        missing.append(e["title"])

print(f"[posters] with poster: {sum(1 for e in entries if e.get('poster'))}/{len(entries)}")
if missing:
    print(f"[posters] missing: {missing}", file=sys.stderr)

# Save output
with open("data/seed-extra.js", "w", encoding="utf-8") as f:
    f.write("/*\n * seed extra: added series, anime and movies requested by user.\n */\n")
    f.write("window.SEED_EXTRA = ")
    json.dump(entries, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print("[done] wrote data/seed-extra.js")
