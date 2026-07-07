#!/usr/bin/env python3
"""Scrape TMDB TV show pages for poster paths."""
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

def get_poster_path(tmdb_id, media_type="tv"):
    url = f"https://www.themoviedb.org/{media_type}/{tmdb_id}"
    try:
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=20) as r:
            html = r.read().decode("utf-8", errors="ignore")
        parser = TMDBPosterParser()
        parser.feed(html)
        if parser.poster_path:
            return parser.poster_path
        m = re.search(r"/t/p/(?:w\d+_and_h\d+_face|w\d+|original)(/[A-Za-z0-9_.]+\.(?:jpg|jpeg|png))", html)
        if m:
            return m.group(1)
        return None
    except Exception as e:
        print(f"[scrape] {media_type}/{tmdb_id}: {e}", file=sys.stderr)
        return None

series = [
    ("spartacus", 10410, "tv"),
    ("the-last-of-us", 100088, "tv"),
    ("euphoria", 83864, "tv"),
    ("the-queens-gambit", 85902, "tv"),
    ("the-boys", 76479, "tv"),
    ("the-walking-dead", 1392, "tv"),
    ("breaking-bad", 1396, "tv"),
    ("haven-t-finish", None, "tv"),  # This might not be a real TMDB title or might be under a different name
]

# Skip haven-t-finish for now
results = {}
print("[tmdb] scraping series posters...")
for title, tid, mtype in series:
    if tid == "???":
        continue
    path = get_poster_path(tid, mtype)
    if path:
        results[title] = path
        print(f"  {title}: {path}")
    else:
        print(f"  {title}: MISSING", file=sys.stderr)

# Read existing and merge
try:
    with open("data/tmdb-posters.json", "r", encoding="utf-8") as f:
        existing = json.load(f)
except FileNotFoundError:
    existing = {}

existing.update(results)
with open("data/tmdb-posters.json", "w", encoding="utf-8") as f:
    json.dump(existing, f, indent=2)
print(f"[tmdb] wrote data/tmdb-posters.json ({len(existing)} total)")
