#!/usr/bin/env python3
"""Scrape TMDB movie pages for poster paths."""
import re, sys, json
from urllib.request import Request, urlopen
from html.parser import HTMLParser

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

class TMDBPosterParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.poster_path = None
        self.in_img = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "img" and not self.poster_path:
            src = attrs.get("src", "")
            if "w300_and_h450_face" in src or "/t/p/" in src:
                m = re.search(r"/t/p/(?:w\d+_and_h\d+_face|w\d+|original)(/[A-Za-z0-9_.]+\.(?:jpg|jpeg|png))", src)
                if m:
                    self.poster_path = m.group(1)

def get_poster_path(tmdb_id, media_type="movie"):
    url = f"https://www.themoviedb.org/{media_type}/{tmdb_id}"
    try:
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=20) as r:
            html = r.read().decode("utf-8", errors="ignore")
        parser = TMDBPosterParser()
        parser.feed(html)
        if parser.poster_path:
            return parser.poster_path
        # Fallback: search raw html
        m = re.search(r"/t/p/(?:w\d+_and_h\d+_face|w\d+|original)(/[A-Za-z0-9_.]+\.(?:jpg|jpeg|png))", html)
        if m:
            return m.group(1)
        return None
    except Exception as e:
        print(f"[scrape] {media_type}/{tmdb_id}: {e}", file=sys.stderr)
        return None

movies = [
    ("the-dark-knight", 155, "movie"),
    ("fight-club", 550, "movie"),
    ("the-matrix", 603, "movie"),
    ("gladiator", 98, "movie"),
    ("good-will-hunting", 489, "movie"),
    ("joker", 475576, "movie"),
    ("1917", 531219, "movie"),
    ("shutter-island", 11324, "movie"),
    ("taxi-driver", 103, "movie"),
    ("mad-max-fury-road", 76341, "movie"),
    ("ratatouille", 2062, "movie"),
    ("how-to-train-your-dragon", 10191, "movie"),
    ("monsters-inc", 585, "movie"),
    ("monsters-university", 80708, "movie"),
    ("the-wolf-of-wall-street", 138697, "movie"),
]

series = [
    ("peaky-blinders", 4629, "tv"),
    ("true-detective", 46648, "tv"),
    ("sopranos", 1398, "tv"),
    ("dexter", 1406, "tv"),
    ("mr-robot", 62560, "tv"),
]

results = {}
print("[tmdb] scraping posters...")
for title, tid, mtype in movies + series:
    path = get_poster_path(tid, mtype)
    if path:
        results[title] = path
        print(f"  {title}: {path}")
    else:
        print(f"  {title}: MISSING", file=sys.stderr)

with open("data/tmdb-posters.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)
print(f"[tmdb] wrote data/tmdb-posters.json ({len(results)} entries)")
