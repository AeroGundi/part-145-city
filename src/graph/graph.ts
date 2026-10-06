/**
 * Knowledge graph.
 *
 * Built once at start-up from (a) the official dataset and (b) the editorial city,
 * mapping and scenario modules. UI components query the graph; they do not hold
 * relationships of their own.
 */
import { DATA, ITEMS, pointOf, rootPoint, topParas, withParts } from '../data/dataset'
import type { RegItem } from '../data/schema'
import { DISTRICTS, resolvePlace, type Place } from '../content/city'
import { locate, INFOSEC_ITEMS, INFOSEC_NODES } from '../content/mapping'
import { SCENARIOS } from '../content/scenarios'
import { PROCESSES, DEFINITION_PLACES } from '../content/processes'

export type NodeKind =
  | 'Regulation' | 'Paragraph' | 'AMC' | 'GM' | 'Definition' | 'Appendix' | 'Form' | 'Person' | 'Building' | 'Room'
  | 'Object' | 'Process' | 'Role' | 'ExternalReference' | 'Scenario'

export type EdgeType =
  | 'LOCATED_IN' | 'RELATED_TO' | 'AMC_FOR' | 'GM_FOR' | 'REFERENCES' | 'REFERENCED_BY' | 'EXPLAINS' | 'CONNECTS_TO'
  | 'AUDIT_RELEVANT_TO' | 'VISUALISED_BY' | 'INVOLVES_ROLE' | 'INVOLVES_PROCESS'

export interface GNode { id: string; kind: NodeKind; label: string }
export interface GEdge { from: string; to: string; type: EdgeType; primary?: boolean; label?: string }

const nodes = new Map<string, GNode>()
const out = new Map<string, GEdge[]>()
const inc = new Map<string, GEdge[]>()

function node(id: string, kind: NodeKind, label: string) { if (!nodes.has(id)) nodes.set(id, { id, kind, label }) }
function edge(e: GEdge) {
  if (!nodes.has(e.from) || !nodes.has(e.to)) return
  const list = out.get(e.from) ?? out.set(e.from, []).get(e.from)!
  if (list.some((x) => x.to === e.to && x.type === e.type)) return
  list.push(e)
  ;(inc.get(e.to) ?? inc.set(e.to, []).get(e.to)!).push(e)
}
const placeId = (p: Place) => 'place:' + p
const kindOf = (it: RegItem): NodeKind =>
  it.type === 'IR' ? 'Regulation' : it.type === 'AMC' ? 'AMC' : it.type === 'GM' ? 'GM' : /form/i.test(it.title) ? 'Form' : 'Appendix'

// ── city
for (const d of DISTRICTS) {
  node(placeId(d.id), 'Building', d.name)
  for (const r of d.rooms) {
    node(placeId(`${d.id}/${r.id}`), 'Room', r.name)
    edge({ from: placeId(`${d.id}/${r.id}`), to: placeId(d.id), type: 'CONNECTS_TO' })
    for (const a of r.anchors) {
      node(placeId(`${d.id}/${r.id}/${a.id}`), a.type === 'role' ? 'Role' : 'Object', a.name)
      edge({ from: placeId(`${d.id}/${r.id}/${a.id}`), to: placeId(`${d.id}/${r.id}`), type: 'CONNECTS_TO' })
    }
  }
}

// ── regulatory items
for (const id of DATA.order) node(id, kindOf(ITEMS[id]), ITEMS[id].reference)
for (const id of DATA.order) {
  const it = ITEMS[id]
  if (it.type === 'IR') for (const { owner, block } of topParas(it)) {
    if (owner.id !== id) continue
    node(`${id}#${block.path}`, 'Paragraph', `${rootPoint(id).reference}${block.path}`)
    edge({ from: `${id}#${block.path}`, to: id, type: 'CONNECTS_TO' })
  }
}
for (const id of DATA.order) {
  const it = ITEMS[id]
  if ((it.type === 'AMC' || it.type === 'GM') && it.parent) {
    const type = it.type === 'AMC' ? 'AMC_FOR' : 'GM_FOR'
    edge({ from: id, to: it.parent, type })
    const para = it.targets?.match(/^145\.[AB]\.\d+A?(\([a-z]+\))/)?.[1]
    if (para) edge({ from: id, to: `${rootPoint(id).id}#${para}`, type })
  }
  if (it.parent && it.type === 'IR') edge({ from: id, to: it.parent, type: 'CONNECTS_TO' })
  for (const r of it.references) {
    if (r.target) { edge({ from: id, to: r.target, type: 'REFERENCES', label: r.label }); edge({ from: r.target, to: id, type: 'REFERENCED_BY' }) }
    else if (r.external) { node('ext:' + r.external, 'ExternalReference', r.external); edge({ from: id, to: 'ext:' + r.external, type: 'REFERENCES', label: r.label }) }
  }
  const loc = locate(it)
  if (loc) {
    ;[loc.primary, ...(loc.also ?? [])].forEach((p, i) => {
      const r = resolvePlace(p)
      if (!r) return
      edge({ from: id, to: placeId(p), type: 'LOCATED_IN', primary: i === 0 })
      if (r.anchor) {
        if (i === 0) edge({ from: id, to: placeId(p), type: 'VISUALISED_BY' })
        if (r.anchor.type === 'role') edge({ from: id, to: placeId(p), type: 'INVOLVES_ROLE' })
      }
    })
  }
}

// ── definitions
for (const d of DATA.definitions) {
  const id = 'def:' + d.term
  node(id, 'Definition', d.term)
  edge({ from: id, to: d.source, type: 'EXPLAINS' })
  const place = DEFINITION_PLACES[d.term]
  if (place) edge({ from: id, to: placeId(place), type: 'LOCATED_IN', primary: true })
}

// ── processes
for (const p of PROCESSES) {
  node('process:' + p.id, 'Process', p.name)
  for (const i of p.items) edge({ from: i, to: 'process:' + p.id, type: 'INVOLVES_PROCESS' })
  for (const pl of p.places) edge({ from: 'process:' + p.id, to: placeId(pl), type: 'CONNECTS_TO' })
  for (const a of p.items) for (const b of p.items) if (a !== b) edge({ from: a, to: b, type: 'RELATED_TO', label: p.name })
}

// ── audit scenarios
for (const s of SCENARIOS) {
  node('scenario:' + s.id, 'Scenario', s.title)
  for (const a of s.areas) if (a.relevant) for (const i of a.items) {
    const id = ITEMS[i] ? i : i.replace(/\([a-z0-9]+\)$/, '')
    edge({ from: id, to: 'scenario:' + s.id, type: 'AUDIT_RELEVANT_TO' })
  }
}

// ───────────────────────────── queries ─────────────────────────────
export const GRAPH = { nodes, out, inc }
export const edgesFrom = (id: string, type?: EdgeType) => (out.get(id) ?? []).filter((e) => !type || e.type === type)
export const edgesTo = (id: string, type?: EdgeType) => (inc.get(id) ?? []).filter((e) => !type || e.type === type)
export const nodeOf = (id: string) => nodes.get(id)

export interface Places { primary: Place | null; also: Place[]; key: string | null }
/** Where an item (or one of its paragraphs) lives. */
export function placesOf(id: string, path = ''): Places {
  const it = ITEMS[id]
  if (!it) return { primary: null, also: [], key: null }
  let target = it
  let rest = path
  if (path && it.type === 'IR') {
    // 145.A.30 + "(e)" → the published sub-point 145.A.30(e) keeps its own mapping
    const part = withParts(it).find((p) => p.id !== it.id && path.startsWith(p.id.slice(it.id.length)))
    if (part) { target = part; rest = path.slice(part.id.length - it.id.length) }
    else if (it.reference.endsWith(path.match(/^\([a-z]+\)/)?.[0] ?? '\u0000')) rest = path.replace(/^\([a-z]+\)/, '')
  }
  const loc = locate(target, rest)
  if (!loc) return { primary: null, also: [], key: null }
  return { primary: loc.primary, also: loc.also ?? [], key: loc.key }
}

/** All regulatory items located in a district / room / anchor. */
export function itemsAt(place: Place, opts: { primaryOnly?: boolean } = {}): RegItem[] {
  const seen = new Set<string>()
  const res: RegItem[] = []
  for (const [nid, list] of inc) {
    if (!nid.startsWith('place:')) continue
    const p = nid.slice(6)
    if (p !== place && !p.startsWith(place + '/')) continue
    for (const e of list) {
      if (e.type !== 'LOCATED_IN' || (opts.primaryOnly && !e.primary) || seen.has(e.from) || !ITEMS[e.from]) continue
      seen.add(e.from)
      res.push(ITEMS[e.from])
    }
  }
  return res.sort((a, b) => a.order - b.order)
}

export interface Related { item: RegItem; why: string }
/** Related Part-145 items: official cross-references first, then shared processes. */
export function relatedOf(id: string): Related[] {
  const point = pointOf(id)
  const res = new Map<string, Related>()
  const add = (target: string, why: string) => {
    const t = ITEMS[target]
    if (!t || t.id === point.id || t.parent === point.id || res.has(t.id)) return
    res.set(t.id, { item: t, why })
  }
  for (const p of withParts(point)) {
    for (const e of edgesFrom(p.id, 'REFERENCES')) if (ITEMS[e.to]) add(e.to, 'referenced in the text')
    for (const e of edgesFrom(p.id, 'REFERENCED_BY')) if (ITEMS[e.to]?.type === 'IR') add(e.to, 'refers to this point')
  }
  for (const e of edgesFrom(point.id, 'RELATED_TO')) add(e.to, e.label ?? 'related process')
  return [...res.values()]
}

export function externalRefsOf(id: string): { family: string; labels: string[] }[] {
  const point = pointOf(id)
  const fam = new Map<string, Set<string>>()
  for (const p of withParts(point)) for (const r of p.references) {
    if (r.external) (fam.get(r.external) ?? fam.set(r.external, new Set()).get(r.external)!).add(r.externalTitle ?? r.label)
  }
  return [...fam].map(([family, labels]) => ({ family, labels: [...labels].filter((l) => l !== family).slice(0, 8) })).sort((a, b) => a.family.localeCompare(b.family))
}

export interface Link { from: Place; to: Place; label?: string; kind: 'self' | 'reference' | 'process' | 'infosec' }
/** Places to light up for "Show connections": the item's own places plus those of related points. */
export function connectionsOf(id: string, path = ''): { places: Place[]; links: Link[] } {
  const own = placesOf(id, path)
  if (!own.primary) return { places: [], links: [] }
  const links: Link[] = own.also.map((p) => ({ from: own.primary!, to: p, kind: 'self' as const }))
  const districts = new Set([own.primary, ...own.also].map((p) => p.split('/')[0]))
  for (const r of relatedOf(id)) {
    if (r.item.type !== 'IR' && r.item.type !== 'APPENDIX') continue
    const p = placesOf(r.item.id).primary
    if (!p || districts.has(p.split('/')[0])) continue
    districts.add(p.split('/')[0])
    links.push({ from: own.primary, to: p, label: r.item.reference, kind: r.why.includes('process') ? 'process' : 'reference' })
    if (links.length >= 12) break
  }
  return { places: [own.primary, ...links.map((l) => l.to)], links }
}

export function infosecLinks(): { places: Place[]; links: Link[] } {
  const hub = INFOSEC_NODES[0].place
  const rest = INFOSEC_NODES.slice(1)
  const links: Link[] = rest.map((n) => ({ from: hub, to: n.place, label: n.label, kind: 'infosec' as const }))
  for (let i = 0; i < rest.length - 1; i++) links.push({ from: rest[i].place, to: rest[i + 1].place, kind: 'infosec' })
  return { places: INFOSEC_NODES.map((n) => n.place), links }
}
export { INFOSEC_ITEMS }

export const scenariosFor = (id: string) => edgesFrom(pointOf(id).id, 'AUDIT_RELEVANT_TO').map((e) => SCENARIOS.find((s) => 'scenario:' + s.id === e.to)!).filter(Boolean)

export const GRAPH_STATS = () => {
  const kinds: Record<string, number> = {}
  for (const n of nodes.values()) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1
  let edges = 0
  for (const l of out.values()) edges += l.length
  return { nodes: nodes.size, edges, kinds }
}
