/**
 * Guards the line between official data and editorial content: every reference the
 * editorial layer makes must resolve to something that exists in the ingested dataset
 * or in the city model. Nothing here checks wording — only that nothing points at air.
 */
import { describe, expect, it } from 'vitest'
import { DATA, ITEMS, resolveSlug } from '../data/dataset'
import { blocksText } from '../data/schema'
import { DISTRICTS, resolvePlace, placePosition, roomRects } from './city'
import { LOCATION_RULES, locate, INFOSEC_NODES, INFOSEC_ITEMS } from './mapping'
import { EDITORIAL } from './editorial'
import { CURRENCY_GAPS } from './currency'
import type { Block } from '../data/schema'
import { SCENARIOS } from './scenarios'
import { PROCESSES, DEFINITION_PLACES } from './processes'
import { GRAPH_STATS, connectionsOf, itemsAt, placesOf } from '../graph/graph'

const part145 = DATA.order.filter((id) => ITEMS[id].section !== 'LINKED')

describe('dataset', () => {
  it('was ingested without losing text', () => {
    expect(DATA.meta.integrity.failed).toEqual([])
    expect(CURRENCY_GAPS, 'amending acts known but not applied').toEqual([])
    expect(DATA.meta.integrity.exact).toBe(DATA.order.length)
  })
  it('has the sections of Annex II and all four appendices', () => {
    expect(DATA.toc.map((s) => s.id)).toEqual(expect.arrayContaining(['section:GENERAL', 'section:A', 'section:B', 'section:APPENDICES']))
    for (const id of ['145.1', '145.A.10', '145.A.45', '145.A.200', '145.A.200A', '145.A.205', '145.B.005', '145.B.355', 'appendix-i', 'appendix-ii', 'appendix-iii', 'appendix-iv']) expect(ITEMS[id], id).toBeDefined()
  })
  it('gives every item a source and non-empty text (own or through its sub-points)', () => {
    for (const id of DATA.order) {
      const it_ = ITEMS[id]
      expect(it_.source.document, id).not.toBe('')
      if (it_.deleted) { expect(it_.blocks, id).toEqual([]); continue }
      const text = blocksText(it_.blocks) + (it_.parts ?? []).map((p) => blocksText(ITEMS[p].blocks)).join('')
      expect(text.length, id).toBeGreaterThan(0)
    }
  })
  it('applies later amendments only from verified, applicable acts and keeps the earlier text', () => {
    const known = new Set(DATA.meta.amendments.map((a) => a.id))
    const marks = (bs: Block[]): string[] => bs.flatMap((b) => [...(b.amd ? [b.amd] : []), ...(b.k === 'table' ? b.rows.flatMap((r) => r.flatMap((c) => marks(c.blocks))) : [])])
    for (const a of DATA.meta.amendments) {
      expect(a.verified.exact, a.short).toBe(a.verified.checked)
      expect(a.verified.checked, a.short).toBe(a.items.length)
      // text that does not apply yet must never be shown as the current requirement
      expect(new Date(a.applicableFrom).getTime(), a.short).toBeLessThanOrEqual(Date.now())
      for (const id of a.items) {
        expect(ITEMS[id]?.amendments?.some((x) => x.by === a.id), id).toBe(true)
        expect(ITEMS[id].previous?.length, id).toBeGreaterThan(0)
        expect(blocksText(ITEMS[id].previous!), id).not.toBe(blocksText(ITEMS[id].blocks))
      }
    }
    for (const id of DATA.order) {
      const it_ = ITEMS[id]
      const used = [...marks(it_.blocks), ...(it_.amendments ?? []).map((x) => x.by), ...(it_.deleted ? [it_.deleted] : [])]
      for (const m of used) expect(known.has(m), `${id} → ${m}`).toBe(true)
      // a change mark needs an amendment on the item, and an amended item shows where it changed
      if (!it_.amendments) expect(used, id).toEqual([])
      else if (!it_.deleted) expect(marks(it_.blocks).length, id).toBeGreaterThan(0)
    }
  })
  it('has no decorative rooms: every room and every object or role in it carries at least one requirement', () => {
    const bare: string[] = []
    for (const d of DISTRICTS) for (const r of d.rooms) {
      if (!itemsAt(`${d.id}/${r.id}`).length) bare.push(`${d.id}/${r.id}`)
      for (const an of r.anchors) if (!itemsAt(`${d.id}/${r.id}/${an.id}`).length) bare.push(`${d.id}/${r.id}/${an.id}`)
    }
    expect(bare).toEqual([])
  })
  it('attaches every AMC and GM to an existing parent', () => {
    for (const id of part145) {
      const it_ = ITEMS[id]
      if ((it_.type === 'AMC' || it_.type === 'GM') && id.split('/')[0] !== 'annex-ii') expect(ITEMS[it_.parent ?? ''], id).toBeDefined()
    }
  })
  it('resolves deep-link forms', () => {
    expect(resolveSlug('145.A.45')).toEqual({ id: '145.A.45', path: '' })
    expect(resolveSlug('145.A.55(d)(1)(i)')?.id).toBe('145.A.55')
    expect(resolveSlug('145.A.55(d)(1)(i)')?.path).toBe('(d)(1)(i)')
    expect(ITEMS[resolveSlug('145.A.45/amc/1')!.id].type).toBe('AMC')
    expect(ITEMS[resolveSlug('145.A.45/gm/1')!.id].type).toBe('GM')
    expect(resolveSlug('appendix-i')?.id).toBe('appendix-i')
    expect(resolveSlug('145.A.999')).toBeNull()
  })
})

describe('city model', () => {
  it('has unique ids and rooms inside their footprint', () => {
    expect(new Set(DISTRICTS.map((d) => d.id)).size).toBe(DISTRICTS.length)
    for (const d of DISTRICTS) for (const r of roomRects(d)) {
      expect(Math.abs(r.x - d.pos[0]) + r.w / 2, `${d.id}/${r.room.id}`).toBeLessThanOrEqual(d.size[0] / 2 + 0.01)
      expect(Math.abs(r.z - d.pos[1]) + r.d / 2, `${d.id}/${r.room.id}`).toBeLessThanOrEqual(d.size[1] / 2 + 0.01)
    }
  })
  it('does not let buildings overlap', () => {
    for (const a of DISTRICTS) for (const b of DISTRICTS) {
      if (a.id >= b.id) continue
      const apart = Math.abs(a.pos[0] - b.pos[0]) >= (a.size[0] + b.size[0]) / 2 || Math.abs(a.pos[1] - b.pos[1]) >= (a.size[1] + b.size[1]) / 2
      expect(apart, `${a.id} × ${b.id}`).toBe(true)
    }
  })
})

describe('requirement → location mapping', () => {
  it('only points at places that exist', () => {
    for (const [key, rule] of Object.entries(LOCATION_RULES)) for (const p of [rule.primary, ...(rule.also ?? [])]) {
      expect(resolvePlace(p), `${key} → ${p}`).not.toBeNull()
      const r = resolvePlace(p)!
      if (p.split('/').length > 1) expect(r.room, `${key} → ${p}`).toBeDefined()
      if (p.split('/').length > 2) expect(r.anchor, `${key} → ${p}`).toBeDefined()
      expect(placePosition(p).every(Number.isFinite)).toBe(true)
    }
  })
  it('only has rules for points that exist in the dataset', () => {
    for (const key of Object.keys(LOCATION_RULES)) expect(resolveSlug(key) ?? DATA.order.find((id) => id.startsWith(key + '/')), key).toBeTruthy()
  })
  it('locates every Part-145 item (nothing left as "Spatial mapping pending")', () => {
    const pending = part145.filter((id) => !locate(ITEMS[id]))
    expect(pending).toEqual([])
  })
  it('sends the anchor requirements where the brief says they live', () => {
    const district = (id: string) => placesOf(id).primary?.split('/')[0]
    expect(placesOf('145.A.45').primary).toBe('technical-library/maintenance-data/technical-librarian')
    expect(district('145.A.42')).toBe('stores')
    expect(placesOf('145.A.50').primary).toContain('hangar/certification-office')
    expect(district('145.A.55')).toBe('records')
    expect(placesOf('145.A.60').primary).toContain('safety/occurrence-reporting')
    expect(district('145.A.70')).toBe('moe')
    expect(district('145.A.205')).toBe('contractor')
    expect(placesOf('145.A.35').primary).toContain('training/certifying-staff-office')
    for (const id of part145.filter((i) => ITEMS[i].section === 'B' && ITEMS[i].type === 'IR')) expect(district(id), id).toBe('authority')
    const ms = new Set([placesOf('145.A.200').primary!, ...placesOf('145.A.200').also].map((p) => p.split('/')[0]))
    for (const d of ['hq', 'safety', 'compliance']) expect(ms.has(d), d).toBe(true)
  })
  it('gives every district at least one requirement', () => {
    for (const d of DISTRICTS) expect(itemsAt(d.id).length, d.id).toBeGreaterThan(0)
  })
})

describe('editorial layer', () => {
  it('explains only items that exist', () => { for (const id of Object.keys(EDITORIAL)) expect(ITEMS[id], id).toBeDefined() })
  it('explains every top-level implementing rule and appendix', () => {
    const missing = part145.filter((id) => !ITEMS[id].parent && (ITEMS[id].type === 'IR' || ITEMS[id].type === 'APPENDIX') && !EDITORIAL[id])
    expect(missing).toEqual([])
  })
  it('builds scenarios from real points and real places', () => {
    for (const s of SCENARIOS) for (const a of s.areas) {
      expect(resolvePlace(a.place), `${s.id}/${a.id}`).not.toBeNull()
      for (const ref of a.items) expect(resolveSlug(ref), `${s.id}/${a.id} → ${ref}`).not.toBeNull()
      if (a.relevant) expect(a.items.length, `${s.id}/${a.id}`).toBeGreaterThan(0)
    }
  })
  it('builds processes, definitions and the information-security layer from real things', () => {
    for (const p of PROCESSES) { for (const i of p.items) expect(ITEMS[i], `${p.id} → ${i}`).toBeDefined(); for (const pl of p.places) expect(resolvePlace(pl), `${p.id} → ${pl}`).not.toBeNull() }
    const terms = new Set(DATA.definitions.map((d) => d.term))
    for (const [term, pl] of Object.entries(DEFINITION_PLACES)) { expect(terms.has(term), term).toBe(true); expect(resolvePlace(pl), term).not.toBeNull() }
    for (const n of INFOSEC_NODES) expect(resolvePlace(n.place), n.place).not.toBeNull()
    for (const i of INFOSEC_ITEMS) expect(ITEMS[i], i).toBeDefined()
  })
})

describe('knowledge graph', () => {
  it('is populated and answers connection queries', () => {
    const g = GRAPH_STATS()
    expect(g.nodes).toBeGreaterThan(500)
    expect(g.kinds.Regulation).toBeGreaterThan(40)
    const c = connectionsOf('145.A.200')
    expect(new Set(c.places.map((p) => p.split('/')[0])).size).toBeGreaterThanOrEqual(5)
  })
})
