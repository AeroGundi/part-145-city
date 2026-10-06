/// <reference lib="webworker" />
/**
 * Search worker: FlexSearch document index over reference, title, tags and full
 * official text. Indexing 270+ items and all queries stay off the main thread.
 */
import FlexSearch from 'flexsearch'

export interface SearchDoc { id: string; kind: 'item' | 'definition' | 'place'; type: string; reference: string; title: string; tags: string; text: string; location: string; order: number }
export interface SearchHit { id: string; kind: SearchDoc['kind']; type: string; reference: string; title: string; context: string; location: string; score: number }

const docs = new Map<string, SearchDoc>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let index: any

const norm = (s: string) => s.toLowerCase().replace(/[‑–—]/g, '-')
const TYPE_BOOST: Record<string, number> = { IR: 30, APPENDIX: 26, AMC: 14, GM: 10, AMC_APPENDIX: 8, PLACE: 18, DEF: 16 }

function excerpt(text: string, terms: string[]): string {
  const lower = text.toLowerCase()
  let at = -1
  for (const t of terms) { at = lower.indexOf(t); if (at >= 0) break }
  if (at < 0) return text.slice(0, 150).trim() + (text.length > 150 ? '…' : '')
  const start = Math.max(0, at - 60)
  const s = text.slice(start, at + 110).replace(/\s+/g, ' ').trim()
  return (start > 0 ? '…' : '') + s + (at + 110 < text.length ? '…' : '')
}

function search(q: string, limit: number): SearchHit[] {
  const query = norm(q.trim())
  if (!query) return []
  const terms = query.split(/\s+/).filter((t) => t.length > 1)
  const scores = new Map<string, number>()
  const bump = (id: string, n: number) => scores.set(id, (scores.get(id) ?? 0) + n)

  // 1 — reference matching (exact, prefix, compact forms like "a45" or "145a45")
  const compact = query.replace(/[\s.]/g, '')
  for (const d of docs.values()) {
    const ref = norm(d.reference)
    const refCompact = ref.replace(/[\s.]/g, '')
    if (ref === query) bump(d.id, 400)
    else if (ref.startsWith(query)) bump(d.id, 220 - Math.min(60, ref.length - query.length))
    else if (ref.includes(query)) bump(d.id, 120)
    else if (compact.length >= 3 && /\d/.test(compact) && (refCompact.includes(compact) || refCompact.replace(/^145/, '').startsWith(compact))) bump(d.id, 110)
    const title = norm(d.title)
    if (title === query) bump(d.id, 160)
    else if (title.includes(query)) bump(d.id, 90)
    if (norm(d.tags).split('|').some((t) => t === query)) bump(d.id, 130)
    else if (norm(d.tags).includes(query)) bump(d.id, 60)
  }
  // 2 — full-text
  const WEIGHT: Record<string, number> = { reference: 80, title: 60, tags: 50, text: 20 }
  for (const group of index.search(query, { limit: 80 }) as { field: string; result: string[] }[]) {
    group.result.forEach((id, rank) => bump(id, WEIGHT[group.field] * (1 - rank / 160)))
  }
  if (scores.size < 5 && terms.length > 1) {
    for (const group of index.search(query, { limit: 40, suggest: true }) as { field: string; result: string[] }[]) {
      group.result.forEach((id, rank) => bump(id, 0.3 * WEIGHT[group.field] * (1 - rank / 80)))
    }
  }
  const hits: SearchHit[] = []
  for (const [id, base] of scores) {
    const d = docs.get(id)!
    hits.push({ id, kind: d.kind, type: d.type, reference: d.reference, title: d.title, location: d.location, context: excerpt(d.text, [query, ...terms]), score: (d.kind === 'place' ? base * 0.5 : base) + (TYPE_BOOST[d.type] ?? 0) })
  }
  hits.sort((a, b) => b.score - a.score || docs.get(a.id)!.order - docs.get(b.id)!.order)
  return hits.slice(0, limit)
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data
  if (msg.type === 'index') {
    index = new FlexSearch.Document({
      tokenize: 'forward', cache: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: { id: 'id', index: [{ field: 'reference', tokenize: 'full' }, 'title', 'tags', { field: 'text', tokenize: 'strict' }] as any },
    })
    for (const d of msg.docs as SearchDoc[]) { docs.set(d.id, d); index.add(d) }
    postMessage({ type: 'ready', count: docs.size })
  } else if (msg.type === 'query') {
    postMessage({ type: 'result', seq: msg.seq, hits: search(msg.q, msg.limit ?? 30) })
  }
}
