/** Main-thread side of the search worker, with a synchronous fallback when Workers are unavailable. */
import { DATA, ITEMS, pointOf, rootPoint } from '../data/dataset'
import { blocksText } from '../data/schema'
import { EDITORIAL } from '../content/editorial'
import { DISTRICTS, resolvePlace } from '../content/city'
import { placesOf } from '../graph/graph'
import { DEFINITION_PLACES } from '../content/processes'
import type { SearchDoc, SearchHit } from './worker'

export type { SearchHit }

export function placeLabel(place: string | null): string {
  if (!place) return 'Spatial mapping pending'
  const r = resolvePlace(place)
  if (!r) return 'Spatial mapping pending'
  return r.room ? `${r.district.name} › ${r.room.name}` : r.district.name
}

function buildDocs(): SearchDoc[] {
  const docs: SearchDoc[] = []
  for (const id of DATA.order) {
    const it = ITEMS[id]
    const tags = [...(EDITORIAL[id]?.tags ?? []), ...(EDITORIAL[pointOf(id).id]?.tags ?? []), ...(EDITORIAL[rootPoint(id).id]?.tags ?? []), ...it.keywords]
    docs.push({
      id, kind: 'item', type: it.type, reference: it.reference, title: it.title, tags: [...new Set(tags)].join('|'),
      text: blocksText(it.blocks) || (it.parts ?? []).map((p) => blocksText(ITEMS[p].blocks)).join('\n'),
      location: placeLabel(placesOf(id).primary), order: it.order,
    })
  }
  DATA.definitions.forEach((d, i) => docs.push({
    id: 'def:' + d.term, kind: 'definition', type: 'DEF', reference: d.term, title: 'Definition', tags: 'definition|glossary',
    text: blocksText(d.blocks), location: placeLabel(DEFINITION_PLACES[d.term] ?? 'documents/glossary'), order: 5000 + i,
  }))
  DISTRICTS.forEach((d, i) => {
    docs.push({ id: 'place:' + d.id, kind: 'place', type: 'PLACE', reference: d.name, title: 'District', tags: [d.short, d.category].join('|'), text: d.blurb + ' ' + d.rooms.map((r) => r.name).join(', '), location: d.name, order: 6000 + i * 20 })
    d.rooms.forEach((r, j) => docs.push({ id: `place:${d.id}/${r.id}`, kind: 'place', type: 'PLACE', reference: r.name, title: d.name, tags: r.anchors.map((a) => a.name).join('|'), text: r.anchors.map((a) => a.name).join(', '), location: d.name, order: 6000 + i * 20 + j + 1 }))
  })
  return docs
}

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, (hits: SearchHit[]) => void>()
let ready: Promise<void> | null = null

function start() {
  if (ready) return ready
  ready = new Promise<void>((resolve) => {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      if (e.data.type === 'ready') resolve()
      else if (e.data.type === 'result') { waiting.get(e.data.seq)?.(e.data.hits); waiting.delete(e.data.seq) }
    }
    worker.postMessage({ type: 'index', docs: buildDocs() })
  })
  return ready
}

export const warmSearch = () => void start()

export async function search(q: string, limit = 30): Promise<SearchHit[]> {
  await start()
  return new Promise((resolve) => {
    const s = ++seq
    waiting.set(s, resolve)
    worker!.postMessage({ type: 'query', q, seq: s, limit })
  })
}
