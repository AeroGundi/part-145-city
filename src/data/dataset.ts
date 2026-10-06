/**
 * Runtime access to the canonical dataset. The JSON is the single source of truth
 * for official text; UI components only ever read it through these helpers.
 */
import raw from './generated/part145.json?raw'
import type { Amendment, Block, Dataset, ParaBlock, RegItem } from './schema'

export const DATA = JSON.parse(raw) as Dataset
export const ITEMS = DATA.items
export const getItem = (id: string | null | undefined): RegItem | undefined => (id ? ITEMS[id] : undefined)

export const TYPE_LABEL: Record<RegItem['type'], string> = { IR: 'IR', AMC: 'AMC', GM: 'GM', APPENDIX: 'Appendix', AMC_APPENDIX: 'Appendix to AMC' }
export const TYPE_LONG: Record<RegItem['type'], string> = {
  IR: 'Implementing rule', AMC: 'Acceptable means of compliance', GM: 'Guidance material', APPENDIX: 'Appendix', AMC_APPENDIX: 'Appendix to AMC',
}

/** The point an item is read under: itself for IR/appendix, its parent for AMC/GM. */
export function pointOf(id: string): RegItem {
  const it = ITEMS[id]
  return (it.type === 'AMC' || it.type === 'GM') && it.parent ? ITEMS[it.parent] : it
}
/** Top-level point: 145.A.30(a) → 145.A.30. */
export function rootPoint(id: string): RegItem {
  let it = pointOf(id)
  while (it.parent && ITEMS[it.parent]) it = ITEMS[it.parent]
  return it
}
/** An item with its published sub-points, in order. */
export const withParts = (it: RegItem): RegItem[] => [it, ...(it.parts ?? []).map((p) => ITEMS[p])]
export const amcOf = (it: RegItem) => [...new Set(withParts(it).flatMap((p) => p.amc))].map((id) => ITEMS[id])
export const gmOf = (it: RegItem) => [...new Set(withParts(it).flatMap((p) => p.gm))].map((id) => ITEMS[id])

export type Status = 'applicable' | 'future' | 'unstated'
export function statusOf(it: RegItem, now = new Date()): Status {
  if (!it.applicabilityDate) return 'unstated'
  return new Date(it.applicabilityDate) > now ? 'future' : 'applicable'
}
export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'not stated in source'

export const itemUrl = (id: string, path = '') => `/part-145/${id}${path}`

export interface Resolved { id: string; path: string }
/**
 * Resolve a URL slug. Accepts exact ids, point paths ("145.A.55(d)(1)(i)") and
 * the short AMC/GM form ("145.A.45/amc/1" → first AMC1 of that point).
 */
export function resolveSlug(slug: string): Resolved | null {
  const s = decodeURIComponent(slug).replace(/\/+$/, '')
  if (ITEMS[s]) return { id: s, path: '' }
  const lower = Object.keys(ITEMS).find((k) => k.toLowerCase() === s.toLowerCase())
  if (lower) return { id: lower, path: '' }
  const m = s.match(/^(.*?)\/(amc|gm)\/([^/]+)$/i)
  if (m) {
    const base = resolveSlug(m[1])
    if (!base) return null
    const list = (m[2].toLowerCase() === 'amc' ? amcOf : gmOf)(rootPoint(base.id))
    const key = m[3].toLowerCase()
    const hit = list.find((x) => x.id.split('/').pop() === key) ?? list.find((x) => x.id.split('/').pop()!.startsWith(key + '-')) ?? list.find((x) => x.id.split('/').pop()!.startsWith(key))
    return hit ? { id: hit.id, path: '' } : base
  }
  // strip trailing point groups until an item matches: 145.A.55(d)(1)(i) → 145.A.55 + "(d)(1)(i)"
  let head = s
  let tail = ''
  for (;;) {
    const p = head.match(/^(.*)(\([a-z0-9]+\))$/i)
    if (!p) return null
    head = p[1]
    tail = p[2] + tail
    const hit = ITEMS[head] ?? ITEMS[Object.keys(ITEMS).find((k) => k.toLowerCase() === head.toLowerCase()) ?? '']
    if (hit) return { id: hit.id, path: tail }
  }
}

export function findPara(it: RegItem, path: string): ParaBlock | undefined {
  for (const part of withParts(it)) for (const b of part.blocks) if (b.k === 'p' && b.path === path) return b
  return undefined
}

/** Top-level paragraphs of a point, e.g. (a), (b), … — used by the auditor view and graph. */
export function topParas(it: RegItem): { owner: RegItem; block: ParaBlock }[] {
  const out: { owner: RegItem; block: ParaBlock }[] = []
  for (const part of withParts(it)) for (const b of part.blocks as Block[]) {
    if (b.k === 'p' && b.path && /^\([a-z]+\)$/.test(b.path)) out.push({ owner: part, block: b })
  }
  return out
}

/** Acts published after the EASA export and applied on top of it, by id. */
export const AMENDMENTS: Record<string, Amendment> = Object.fromEntries(DATA.meta.amendments.map((a) => [a.id, a]))
/** The export's own revision name, e.g. "September 2025". */
export const EXPORT_REVISION = DATA.meta.revision?.label ?? fmtDate(DATA.meta.publishedAt.slice(0, 10))

export const DATASET_LABEL = `EASA Easy Access Rules · published ${fmtDate(DATA.meta.publishedAt.slice(0, 10))}`
