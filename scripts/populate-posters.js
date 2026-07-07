/**
 * populate-posters.js
 *
 * Bulk-fill missing `poster` values for:
 * - anime  -> AniList GraphQL (no key)
 * - movies/series -> TMDB (requires key)
 * - music  -> iTunes Search API (no key)
 *
 * Usage:
 *   node populate-posters.js
 *
 * Writes updated files back to:
 *   data/seeds.js
 *   data/seed-extra.js
 *   data/seeds.js.bak / data/seed-extra.js.bak
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const FILES = [
  path.join(ROOT, 'data/seeds.js'),
  path.join(ROOT, 'data/seed-extra.js')
]

const TMDB_API_KEY_STORAGE = 'emotions_vault_tmdb_key'
const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p'

function esc(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts || {})
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url)
  return res.json()
}

async function tmdbConfig(key) {
  const data = await fetchJSON(`${TMDB_BASE}/configuration?api_key=${encodeURIComponent(key)}`)
  return data.images || null
}

async function fetchTMDBPoster(title, type, year, key) {
  const mediaType = type === 'series' ? 'tv' : 'movie'
  const params = new URLSearchParams({
    api_key: key,
    query: title,
    include_adult: 'false',
    language: 'es-ES',
    page: '1'
  })
  if (year) params.set('year', String(year))

  const data = await fetchJSON(`${TMDB_BASE}/search/${mediaType}?${params.toString()}`)
  const results = data.results || []
  if (!results.length) return null

  let best = results[0]
  if (year) {
    const withYear = results.find(r => (r.release_date || r.first_air_date || '').startsWith(String(year)))
    if (withYear) best = withYear
  }

  const posterPath = best.poster_path
  if (!posterPath) return null

  const config = await tmdbConfig(key)
  let size = 'w500'
  if (config && config.poster_sizes && config.poster_sizes.includes('w780')) size = 'w780'

  return {
    title: best.title || best.name || title,
    year: (best.release_date || best.first_air_date || '').slice(0, 4) || year,
    poster: `${TMDB_IMG_BASE}/${size}${posterPath}`,
    source: 'tmdb'
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
  `

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { search: title } })
  })
  if (!res.ok) throw new Error('AniList HTTP ' + res.status)
  const json = await res.json()
  const media = (json.data && json.data.Page && json.data.Page.media && json.data.Page.media[0]) || null
  if (!media) return null

  const cover = media.coverImage && (media.coverImage.extraLarge || media.coverImage.large)
  if (!cover) return null

  return {
    title: media.title && (media.title.romaji || media.title.english || media.title.native || title),
    year: (media.startDate && media.startDate.year) || year,
    poster: cover,
    source: 'anilist'
  }
}

async function fetchiTunesPoster(title, year) {
  const params = new URLSearchParams({
    term: title,
    media: 'music',
    limit: '5',
    country: 'US'
  })
  const data = await fetchJSON(`https://itunes.apple.com/search?${params.toString()}`)
  const results = data.results || []
  if (!results.length) return null

  let best = results[0]
  results.forEach(r => {
    const bestSize = (best.artworkUrl100 || '').replace('100x100', '600x600')
    const candidateSize = (r.artworkUrl100 || '').replace('100x100', '600x600')
    if (candidateSize && (!bestSize || candidateSize.length > bestSize.length)) best = r
  })

  const artwork = (best.artworkUrl100 || '').replace('100x100', '600x600')
  if (!artwork) return null

  return {
    title: best.collectionName || best.trackName || title,
    year: (best.releaseDate || '').slice(0, 4) || year,
    poster: artwork,
    source: 'itunes'
  }
}

async function fetchPoster(title, type, year, tmdbKey) {
  const normalizedType = String(type).toLowerCase()
  if (normalizedType === 'anime') return fetchAniListPoster(title, year)
  if (normalizedType === 'music') return fetchiTunesPoster(title, year)
  if ((normalizedType === 'movie' || normalizedType === 'series') && tmdbKey) return fetchTMDBPoster(title, normalizedType, year, tmdbKey)
  return null
}

async function main() {
  const tmdbKey = process.argv.includes('--tmdb-key') ? process.argv[process.argv.indexOf('--tmdb-key') + 1] : ''
  if (!tmdbKey) {
    // try read from localStorage file if exists
    try {
      const localStoragePath = path.join(process.env.APPDATA || process.env.LOCALAPPDATA || '', '..', 'Local', 'hermes', 'localStorage')
      // No local file to read reliably, continue without key
    } catch (_e) {}
  }

  for (const file of FILES) {
    if (!fs.existsSync(file)) continue

    const original = fs.readFileSync(file, 'utf8')
    if (!original.includes('window.SEED_EXTRA =') && !original.includes('window.SEEDS =')) continue

    const backup = file + '.bak'
    fs.writeFileSync(backup, original)

    const itemsMatch = original.match(/window\.(SEED_EXTRA|SEEDS)\s*=\s*(\[\s*[\s\S]*?\]);/)
    if (!itemsMatch) {
      console.log('No items array found in', file)
      continue
    }

    let items
    try {
      items = JSON.parse(itemsMatch[2])
    } catch (e) {
      console.log('JSON parse error in', file, e.message)
      continue
    }

    let updatedCount = 0
    for (const item of items) {
      if (item.poster) continue
      try {
        const result = await fetchPoster(item.title, item.type, item.year, tmdbKey)
        if (result && result.poster) {
          item.poster = result.poster
          updatedCount++
          console.log(`  ✓ ${item.title} -> ${result.source}`)
        } else {
          console.log(`  ✗ ${item.title} -> no poster found`)
        }
      } catch (e) {
        console.log(`  ! ${item.title} -> error: ${e.message}`)
      }
    }

    const newPayload = itemsMatch[1] + ' = ' + JSON.stringify(items, null, 2) + ';'
    const updated = original.replace(itemsMatch[0], newPayload)
    fs.writeFileSync(file, updated)
    console.log(`Updated ${updatedCount} posters in ${path.basename(file)}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
