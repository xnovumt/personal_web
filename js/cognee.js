/**
 * Cognee-lite for personal_web
 *
 * Mirrors the cognitive operations of Cognee over the existing localStorage
 * layer used by this project:
 *
 * - remember  -> ingest + cognify + improve, durable graph in window.cognee
 * - recall    -> query with auto-routing: session memory first, graph fallback
 * - forget    -> delete chosen nodes/edges/dataset
 * - improve   -> refine memory quality via feedback
 *
 * Constraints preserved:
 *  - No backend, no npm, vanilla JS only
 *  - Works with seeds(immutable) -> storage(localStorage) -> app -> UI
 *  - Uses the same storage area already used by the media app
 */

(function () {
  'use strict'

  const STORAGE_KEY = 'emotions_vault_media_v1'
  const KNOWLEDGE_KEY = 'emotions_vault_cognee_v1'

  const memory = {
    _graph() {
      try {
        return JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '{"nodes":[],"edges":[],"memories":[]}')
      } catch (e) {
        return { nodes: [], edges: [], memories: [] }
      }
    },
    _save(graph) {
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(graph))
    },
    _mediaStore() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      } catch (e) {
        return []
      }
    },
    _upsertNode(id, type, title, tags) {
      const graph = this._graph()
      const nodeId = 'media_' + id
      const now = new Date().toISOString()
      const i = graph.nodes.findIndex(function (n) { return n.id === nodeId })
      const payload = { id: nodeId, type, title, tags: tags || [], last_seen: now, occurrences: 1, created_at: now, updated_at: now }
      if (i >= 0) {
        const prev = graph.nodes[i]
        payload.occurrences = (prev.occurrences || 0) + 1
        payload.created_at = prev.created_at || now
        payload.updated_at = now
        graph.nodes[i] = payload
      } else {
        graph.nodes.push(payload)
      }
      this._save(graph)
      return payload
    },
    _addEdge(sourceId, relation, targetId, weight) {
      const graph = this._graph()
      const exists = graph.edges.find(function (e) { return e.source === sourceId && e.relation === relation && e.target === targetId })
      if (exists) {
        exists.weight = Math.max(exists.weight || 1, (weight || 1))
        exists.updated_at = new Date().toISOString()
      } else {
        graph.edges.push({ source: sourceId, relation, target: targetId, weight: weight || 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      }
      this._save(graph)
    }
  }

  const actions = {
    remember(textOrMedia, overrides) {
      return new Promise(function (resolve) {
        var media = typeof textOrMedia === 'string' ? { title: textOrMedia, creator: '', year: '', genres: [], type: 'memory' } : Object.assign({ id: null }, textOrMedia)
        var node = memory._upsertNode(media.id || 'text_' + Date.now(), media.type || 'memory', media.title, media.genres || [])
        memory._addEdge('graph', 'MENTIONS', node.id, 1)

        var mergedText = (media.title || '').trim()
        if (media.creator) mergedText += ' by ' + media.creator
        if (media.genres && media.genres.length) mergedText += ' genres:' + media.genres.join(',')

        var graph = memory._graph()
        graph.memories = graph.memories || []
        graph.memories.push({ id: 'mem_' + Date.now(), text: mergedText, sourceId: node.id, created_at: new Date().toISOString() })
        memory._save(graph)

        try { actions.improve() } catch (e) { /* noop */ }

        resolve({ accepted: true, node: node, memoryId: 'mem_' + Date.now() })
      })
    },
    recall(query, options) {
      return new Promise(function (resolve) {
        var opts = options || {}
        var q = (query || '').trim().toLowerCase()

        var graph = memory._graph()
        var scoredNodes = (graph.nodes || []).map(function (node) {
          var titleScore = (node.title || '').toLowerCase().includes(q) ? 2 : 0
          var tagScore = (node.tags || []).filter(function (tag) { return (tag || '').toLowerCase().includes(q) }).length
          return { node: node, score: titleScore + tagScore + (node.occurrences || 0) * 0.1 }
        })
          .filter(function (r) { return r.score > 0 })
          .sort(function (a, b) { return b.score - a.score })
          .slice(0, 20)
          .map(function (r) { return r.node })

        var memoryMatches = (graph.memories || [])
          .map(function (m) { return { text: m.text, score: q ? ((m.text || '').toLowerCase().includes(q) ? 1 : 0) : 1 } })
          .filter(function (r) { return r.score > 0 })
          .slice(0, 20)

        if (memoryMatches.length && scoredNodes.length) return resolve({ mode: 'graph+memory', memories: memoryMatches, nodes: scoredNodes })
        if (memoryMatches.length) return resolve({ mode: 'memory', memories: memoryMatches, nodes: scoredNodes })
        if (scoredNodes.length) return resolve({ mode: 'graph', memories: [], nodes: scoredNodes })
        resolve({ mode: 'none', memories: [], nodes: scoredNodes })
      })
    },
    forget(dataset) {
      var graph = memory._graph()
      var datasetId = 'media_' + dataset
      graph.nodes = graph.nodes.filter(function (n) { return n.id !== datasetId })
      graph.edges = graph.edges.filter(function (e) { return e.source !== datasetId && e.target !== datasetId })
      graph.memories = graph.memories.filter(function (m) { return m.sourceId !== datasetId })
      memory._save(graph)
      return { deleted: true, dataset: dataset }
    },
    improve() {
      var media = memory._mediaStore()
      var graph = memory._graph()
      var seen = new Set((graph.nodes || []).map(function (n) { return n.id }))
      for (var i = 0; i < media.length; i++) {
        var m = media[i]
        if (!m || !m.id) continue
        var nodeId = 'media_' + m.id
        if (!seen.has(nodeId)) {
          memory._upsertNode(m.id, m.type, m.title, m.genres || [])
          seen.add(nodeId)
        }
        if (m.genres) {
          for (var g = 0; g < m.genres.length; g++) memory._addEdge(nodeId, 'IN_GENRE', 'genre_' + m.genres[g], 1)
        }
        if (m.type) memory._addEdge(nodeId, 'IS_A', 'type_' + m.type, 1)
        if (m.year) memory._addEdge(nodeId, 'RELEASED_IN', 'year_' + m.year, 1)
      }
      memory._save(graph)
      return { improved: true, indexed: media.length }
    },
    searchSimilar: function (seed, limit) {
      var self = this
      return new Promise(function (resolve) {
        var q = ''
        if (seed && typeof seed === 'object') q = seed.title || seed.query || ''
        if (typeof seed === 'string') q = seed
        resolve(self.recall(q, { limit: limit || 12 }))
      })
    }
  }

  actions.status = function () {
    var graph = memory._graph()
    return { nodes: (graph.nodes || []).length, edges: (graph.edges || []).length, memories: (graph.memories || []).length }
  }

  window.Cognee = actions
  window.cognee = window.Cognee
})()
