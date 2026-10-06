/**
 * Regulatory ingestion: EASA Easy Access Rules XML → canonical Part-145 dataset.
 *
 *   npm run ingest [-- path/to/easy-access-rules.xml]
 *
 * The structure (sections, points, AMC, GM, appendices) is DERIVED from the
 * export's own table of contents (<er:toc>) — nothing is hardcoded — so a new
 * EASA revision can be ingested by replacing the source file and re-running.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTopic } from './word'
import type { Block, Dataset, Definition, Inline, ParaBlock, RegItem, RegReference, RegSection, RegType, TocNode } from '../../src/data/schema'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const srcPath = resolve(root, process.argv[2] ?? 'sources/easa-ear-continuing-airworthiness.xml')
const outPath = resolve(root, 'src/data/generated/part145.json')
const ANNEX = /Annex II \(Part-145\)/i

const xml = readFileSync(srcPath, 'utf8')
const warnings: string[] = []
const warn = (m: string) => { warnings.push(m); console.warn('  ! ' + m) }

// ───────────────────────── 1. eRules table of contents ─────────────────────────
interface TocEntry { kind: 'heading' | 'topic'; depth: number; sdtId: string; title: string; attrs: Record<string, string>; headings: string[] }

const docStart = xml.indexOf('<er:document')
const docEnd = xml.indexOf('</er:document>')
if (docStart < 0) throw new Error('Not an EASA eRules XML export: <er:document> not found')
const erDoc = xml.slice(docStart, docEnd)
const docTag = erDoc.slice(0, erDoc.indexOf('>'))
const docAttr = (k: string) => docTag.match(new RegExp(`${k}="([^"]*)"`))?.[1] ?? ''
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'")

const entries: TocEntry[] = []
{
  let depth = 0
  const headingStack: { depth: number; title: string }[] = []
  for (const m of erDoc.matchAll(/<(\/?)er:(topic|heading|toc)\b([^>]*)>/g)) {
    const [, close, kind, rawAttrs] = m
    if (kind === 'toc') { depth += close ? -1 : 1; continue }
    const attrs: Record<string, string> = {}
    for (const a of rawAttrs.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = decode(a[2])
    while (headingStack.length && headingStack[headingStack.length - 1].depth >= depth) headingStack.pop()
    const title = (kind === 'heading' ? attrs.title : attrs['source-title']) ?? ''
    entries.push({ kind: kind as 'heading' | 'topic', depth, sdtId: attrs['sdt-id'], title: title.trim(), attrs, headings: headingStack.map((h) => h.title) })
    if (kind === 'heading') headingStack.push({ depth, title: title.trim() })
  }
}
const bySdt = new Map(entries.map((e) => [e.sdtId, e]))

// ───────────────────────── 2. document body → topic chunks ─────────────────────
const bodyStart = xml.indexOf('<pkg:part pkg:name="/word/document.xml"')
const bodyEnd = xml.indexOf('</pkg:part>', bodyStart)
const bodyXml = xml.slice(bodyStart, bodyEnd)
const chunkAt: { sdtId: string; start: number }[] = []
for (const m of bodyXml.matchAll(/<w:sdt><w:sdtPr>(?:<w:rPr>(?:(?!<\/w:rPr>).)*<\/w:rPr>)?<w:alias w:val="(?:topic|heading)" \/><w:tag w:val="(?:topic|heading)" \/><w:id w:val="(-?\d+)" \/>/g)) {
  chunkAt.push({ sdtId: m[1], start: m.index! })
}
const chunks = new Map<string, string>()
chunkAt.forEach((c, i) => {
  const raw = bodyXml.slice(c.start, chunkAt[i + 1]?.start ?? bodyXml.length)
  chunks.set(c.sdtId, raw.slice(0, raw.lastIndexOf('</w:sdt>') + 8))
})

// bookmark → topic, for the whole publication (needed to name external references)
const bookmarkOwner = new Map<string, string>()
for (const [sdtId, chunk] of chunks) for (const b of chunk.matchAll(/<w:bookmarkStart [^>]*w:name="([^"]+)"/g)) bookmarkOwner.set(b[1], sdtId)

// ───────────────────────── 3. Part-145 items ───────────────────────────────────
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
function isoDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2}) (\w+),? (\d{4})$/)
  if (!m) return null
  const mo = MONTHS.indexOf(m[2].toLowerCase())
  return mo < 0 ? null : `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const POINT = String.raw`145\.(?:[AB]\.\d{2,3}A?|1)`
const PARAS = String.raw`(?:\([a-z0-9]+\))*(?:;(?:\([a-z0-9]+\))+)*`
const roman = (s: string) => s.toLowerCase()

interface Parsed { type: RegType; reference: string; title: string; base: string; key?: string; targets?: string; also?: string }

function parseTitle(t: string, inAmcAppendices: boolean): Parsed | null {
  let m: RegExpMatchArray | null
  if ((m = t.match(new RegExp(`^(${POINT})((?:\\([a-z]+\\))*)\\s+(.*)$`)))) {
    return { type: 'IR', reference: m[1] + m[2], title: m[3].trim(), base: m[1] + m[2] }
  }
  if ((m = t.match(new RegExp(`^(AMC|GM)(\\d*)\\s+(${POINT})(${PARAS})(?:\\s+and\\s+(${POINT}${PARAS}))?\\s+(.*)$`)))) {
    const paras = [...m[4].matchAll(/\(([a-z0-9]+)\)/g)].map((x) => x[1])
    const key = ([m[2], ...paras].filter(Boolean).join('-') || '0') + (m[5] ? `-and-${m[5]}` : '')
    return {
      type: m[1] as RegType, reference: `${m[1]}${m[2]} ${m[3]}${m[4]}${m[5] ? ` and ${m[5]}` : ''}`, title: m[6].trim(),
      base: m[3], key, targets: m[3] + m[4], ...(m[5] ? { also: m[5] } : {}),
    }
  }
  if ((m = t.match(/^(AMC|GM)(\d*)\s+Appendix ([IVX]+)\s+[—–-]\s+(.*)$/))) {
    return { type: m[1] as RegType, reference: `${m[1]}${m[2]} Appendix ${m[3]}`, title: m[4].trim(), base: `appendix-${roman(m[3])}`, key: m[2] || '0', targets: `Appendix ${m[3]}` }
  }
  if ((m = t.match(/^(AMC|GM)(\d*)\s+to Annex II \(Part-145\)\s+(.*)$/))) {
    return { type: m[1] as RegType, reference: `${m[1]}${m[2]} to Annex II (Part-145)`, title: m[3].trim(), base: 'annex-ii', key: m[2] || '0', targets: 'Annex II (Part-145)' }
  }
  if ((m = t.match(/^Appendix ([IVX]+) to (.+?)\s+[—–-]\s+(.*)$/)) && inAmcAppendices) {
    return { type: 'AMC_APPENDIX', reference: `Appendix ${m[1]} to ${m[2]}`, title: m[3].trim(), base: `amc-appendix-${roman(m[1])}`, targets: m[2] }
  }
  if ((m = t.match(/^Appendix ([IVX]+)\s+[—–-]\s+(.*)$/))) {
    return { type: 'APPENDIX', reference: `Appendix ${m[1]}`, title: m[2].trim(), base: `appendix-${roman(m[1])}` }
  }
  return null
}

const items: Record<string, RegItem> = {}
const order: string[] = []
const sdtToId = new Map<string, string>()
const anchorsByItem = new Map<string, Map<Inline, string>>()
const sectionLabels = new Map<RegSection, string>()
const unknownStyles = new Set<string>()

const part145 = entries.filter((e) => e.kind === 'topic' && e.headings.some((h) => ANNEX.test(h)))
if (!part145.length) throw new Error('No topics found under "Annex II (Part-145)"')

for (const e of part145) {
  const sectionHeading = e.headings[e.headings.findIndex((h) => ANNEX.test(h)) + 1] ?? ''
  const section: RegSection = /^GENERAL/i.test(sectionHeading) ? 'GENERAL'
    : /^SECTION A/i.test(sectionHeading) ? 'A'
    : /^SECTION B/i.test(sectionHeading) ? 'B'
    : /^APPENDICES TO AMC/i.test(sectionHeading) ? 'AMC_APPENDICES' : 'APPENDICES'
  sectionLabels.set(section, sectionHeading)

  const parsed = parseTitle(e.title, section === 'AMC_APPENDICES')
  if (!parsed) { warn(`Unrecognised topic title, skipped: "${e.title}"`); continue }
  const chunk = chunks.get(e.sdtId)
  if (!chunk) { warn(`No body found for "${e.title}"`); continue }
  if ((chunk.match(/<w:sdt>/g)?.length ?? 0) !== (chunk.match(/<\/w:sdt>/g)?.length ?? 0)) throw new Error(`Unbalanced content control in "${e.title}"`)

  const body = parseTopic(chunk)
  body.unknownStyles.forEach((s) => unknownStyles.add(s))

  let id = parsed.key ? `${parsed.base}/${parsed.type.toLowerCase()}/${parsed.key}` : parsed.base
  for (let n = 2; items[id]; n++) id = `${parsed.base}/${parsed.type.toLowerCase()}/${parsed.key}~${n}`

  const sourceDoc = body.source || e.attrs.RegulatorySource || ''
  if (body.source && e.attrs.RegulatorySource && body.source !== e.attrs.RegulatorySource) {
    warn(`Source mismatch for ${parsed.reference}: body "${body.source}" vs metadata "${e.attrs.RegulatorySource}"`)
  }
  items[id] = {
    id, reference: parsed.reference, title: parsed.title, type: parsed.type, section,
    ...(parsed.targets ? { targets: parsed.targets } : {}),
    ...(parsed.also ? { alsoTargets: [parsed.also] } : {}),
    amc: [], gm: [],
    source: { document: sourceDoc, eRulesId: e.attrs.ERulesId ?? '', sdtId: e.sdtId },
    applicabilityDate: isoDate(e.attrs.ApplicabilityDate ?? ''),
    entryIntoForceDate: isoDate(e.attrs.EntryIntoForceDate ?? ''),
    keywords: (e.attrs.Keywords ?? '').split(';').map((k) => k.trim()).filter(Boolean),
    blocks: body.blocks, references: [], referencedBy: [], order: order.length,
  }
  order.push(id)
  sdtToId.set(e.sdtId, id)
}

// ───────────────────────── 3b. linked material from other annexes ─────────────
// A Part-145 appendix may consist only of a pointer ("The provisions of Appendix II
// to Annex I (Part-M) apply"). The pointed-to topic is official text of the same
// publication, so it is ingested too — clearly flagged with its own annex (`family`).
for (const id of [...order]) {
  if (items[id].type !== 'APPENDIX') continue
  const chunk = chunks.get(items[id].source.sdtId)!
  for (const a of chunk.matchAll(/<w:hyperlink [^>]*w:anchor="([^"]+)"/g)) {
    const sdt = bookmarkOwner.get(a[1])
    const idx = entries.findIndex((e) => e.sdtId === sdt)
    const e = entries[idx]
    if (!e || sdtToId.has(e.sdtId) || !/^Appendix [IVX]+\b/.test(e.title)) continue
    const family = e.headings.map((h) => h.match(/\((Part-[A-Za-z0-9]+)\)/)?.[1]).find(Boolean) ?? 'External'
    const annex = e.headings.find((h) => /^Annex/i.test(h)) ?? family
    const m = e.title.match(/^Appendix ([IVX]+)\s+[—–-]\s+(.*)$/)
    if (!m) continue
    const baseId = `${family.toLowerCase()}/appendix-${roman(m[1])}`
    const mk = (entry: TocEntry, nid: string, reference: string, title: string, type: RegType, parent?: string) => {
      const body = parseTopic(chunks.get(entry.sdtId)!)
      items[nid] = {
        id: nid, reference, title, type, section: 'LINKED', family, ...(parent ? { parent } : {}), amc: [], gm: [],
        source: { document: body.source || entry.attrs.RegulatorySource || '', eRulesId: entry.attrs.ERulesId ?? '', sdtId: entry.sdtId },
        applicabilityDate: isoDate(entry.attrs.ApplicabilityDate ?? ''), entryIntoForceDate: isoDate(entry.attrs.EntryIntoForceDate ?? ''),
        keywords: [], blocks: body.blocks, references: [], referencedBy: [], order: 0,
      }
      order.push(nid); sdtToId.set(entry.sdtId, nid)
      return items[nid]
    }
    const main = mk(e, baseId, `Appendix ${m[1]} to ${annex}`, m[2].trim(), 'APPENDIX')
    sectionLabels.set('LINKED', 'LINKED MATERIAL FROM OTHER ANNEXES')
    for (let j = idx + 1; j < entries.length; j++) {
      const n = entries[j]
      if (n.kind !== 'topic' || n.depth < e.depth) break
      if (n.depth === e.depth) {
        if (n.title) break
        // untitled sibling = continuation of the same appendix
        main.blocks.push(...parseTopic(chunks.get(n.sdtId)!).blocks); sdtToId.set(n.sdtId, baseId)
        continue
      }
      const k = n.title.match(/^(AMC|GM)(\d*)\s+to\s+(.+?)\s+[—–-]\s+(.*)$/)
      if (!k) continue
      const child = mk(n, `${baseId}/${k[1].toLowerCase()}/${k[2] || '0'}`, `${k[1]}${k[2]} to ${k[3]}`, k[4].trim(), k[1] as RegType, baseId)
      main[k[1] === 'AMC' ? 'amc' : 'gm'].push(child.id)
    }
    if (!main.blocks.length && !main.amc.length && !main.gm.length) {
      // published as a tree of sub-topics rather than one text: leave it as an external reference
      delete items[baseId]; order.splice(order.indexOf(baseId), 1)
      for (const [k, v] of [...sdtToId]) if (v === baseId) sdtToId.delete(k)
      console.log(`  - ${main.reference} (${family}) is not a single text in the export; kept as an external reference`)
      continue
    }
    console.log(`  + linked ${main.reference} (${family}) for ${items[id].reference}`)
  }
}

order.forEach((id, i) => { items[id].order = i })

// ───────────────────────── 3c. integrity check ────────────────────────────────
// Nothing may be silently dropped: for every ingested topic, the text carried by the
// canonical blocks (+ heading + source line) must equal, character for character and
// ignoring whitespace only, the text Word stores in that topic's content control.
const squash = (t: string) => t.replace(/[\s\u00a0•▪‑]/g, '')
function rawText(chunk: string) {
  const live = chunk.replace(/<w:(del|moveFrom)\b[^>]*>.*?<\/w:\1>/gs, '')
  return squash([...live.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => decode(m[1])).join(''))
}
const flatBlocks = (bs: Block[]): string => bs.map((b) => (b.k === 'p' ? (b.label ?? '') + b.runs.map((r) => r.t).join('') : b.rows.map((r) => r.map((c) => flatBlocks(c.blocks)).join('')).join(''))).join('')
let integrityChecked = 0
const integrityFailed: string[] = []
for (const id of order) {
  const it = items[id]
  const own = [...sdtToId].filter(([, v]) => v === id).map(([k]) => k)
  const raw = own.map((sdt) => rawText(chunks.get(sdt)!)).join('')
  const got = own.map((sdt) => { const b = parseTopic(chunks.get(sdt)!); return squash(b.title + b.source + flatBlocks(b.blocks)) }).join('')
  integrityChecked++
  if (raw !== got) { integrityFailed.push(it.reference); warn(`Integrity: text of ${it.reference} differs from the source (${raw.length} vs ${got.length} characters)`) }
}

// ───────────────────────── 3d. publication revision ───────────────────────────
// The revision table in the front matter states which amendments this export contains.
// (the heading "Note from the editor" directly follows that table)
const front = bodyXml.slice(0, Math.max(0, bodyXml.indexOf('Note from the editor')))
const frontText = [...front.matchAll(/<w:p[ >].*?<\/w:p>/gs)].map((p) => [...p[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => decode(m[1])).join('').trim()).filter(Boolean)
const MONTH_YEAR = /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/
const revRows = frontText
const lastRev = revRows.map((t, i) => (MONTH_YEAR.test(t) ? i : -1)).filter((i) => i >= 0).pop()
const revision = lastRev === undefined ? null : { label: revRows[lastRev], changes: revRows.slice(lastRev + 1).filter((t) => !/^\(/.test(t)) }
if (!revision) warn('Publication revision table not found in the front matter')

// ───────────────────────── 4. hierarchy ────────────────────────────────────────
const irIds = order.filter((id) => items[id].type === 'IR')
const part145Count = order.filter((id) => items[id].section !== 'LINKED').length
for (const id of irIds) {
  // 145.A.30(a) is a sub-point of 145.A.30 when both are published as topics
  const m = id.match(/^(.*?\d[A]?)\(/)
  if (m && items[m[1]]) { items[id].parent = m[1]; (items[m[1]].parts ??= []).push(id) }
}
function ownerOf(targets: string, base: string): string | undefined {
  // most specific published IR topic: "145.A.30(e)" before "145.A.30"
  const first = targets.split(';')[0]
  const paras = [...first.slice(base.length).matchAll(/\([a-z0-9]+\)/g)].map((x) => x[0])
  for (let n = paras.length; n >= 0; n--) {
    const cand = base + paras.slice(0, n).join('')
    if (items[cand]) return cand
  }
  return items[base] ? base : undefined
}
for (const id of order) {
  const it = items[id]
  if ((it.type !== 'AMC' && it.type !== 'GM') || it.section === 'LINKED') continue
  const base = id.split('/')[0]
  const owner = base.startsWith('145.') ? ownerOf(it.targets ?? base, base) : items[base] ? base : undefined
  if (!owner) { if (base !== 'annex-ii') warn(`No parent IR found for ${it.reference}`); continue }
  it.parent = owner
  items[owner][it.type === 'AMC' ? 'amc' : 'gm'].push(id)
  for (const also of it.alsoTargets ?? []) {
    const base2 = also.match(new RegExp(POINT))?.[0]
    const o2 = base2 && ownerOf(also, base2)
    if (o2) items[o2][it.type === 'AMC' ? 'amc' : 'gm'].push(id)
  }
}

// ───────────────────────── 5. point paths (a)(1)(i) ───────────────────────────
function assignPaths(blocks: Block[], prefix: string) {
  const stack: string[] = []
  for (const b of blocks) {
    if (b.k !== 'p') continue
    if (b.style === 'heading') { stack.length = 0; continue }
    if (b.style === 'list' && b.label && /^\([A-Za-z0-9]+\)$/.test(b.label)) {
      stack.length = b.level
      for (let i = 0; i < b.level; i++) stack[i] ??= ''
      stack[b.level] = b.label
      const path = stack.join('')
      // a sub-point topic such as 145.A.30(a) already carries "(a)" in its reference
      b.path = prefix && path.startsWith(prefix) ? path : prefix && b.level === 0 && path === prefix ? path : path
    }
  }
}
for (const id of irIds) assignPaths(items[id].blocks, '')

// ───────────────────────── 6. cross-references ─────────────────────────────────
const EXTERNAL: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/\bML\.[AB]\.\d{3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-ML'],
  [/\bM\.[AB]\.\d{3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-M'],
  [/\b66\.[AB]\.\d{1,3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-66'],
  [/\b147\.[AB]\.\d{1,3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-147'],
  [/\b21\.[AB]\.\d{1,3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-21'],
  [/\bCAMO\.[AB]\.\d{3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-CAMO'],
  [/\bCAO\.[AB]\.\d{3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-CAO'],
  [/\bIS\.(?:I|D)\.OR\.\d{3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-IS'],
  [/\bIS\.AR\.\d{3}[A-Z]?(?:\([a-z0-9]+\))*/g, () => 'Part-IS'],
  [/Regulation \((?:EU|EC)\) (?:No )?\d+\/\d+/g, (m) => m[0].replace('No ', '')],
  [/Part-(?:ML|M|66|147|21|CAMO|CAO|IS|T|26)\b/g, (m) => m[0]],
]
const familyOfHeading = (headings: string[]) => headings.map((h) => h.match(/\((Part-[A-Za-z0-9]+)\)/)?.[1]).find(Boolean) ?? headings[0] ?? 'External'

function walkRuns(blocks: Block[], fn: (r: Inline & { anchor?: string }, p: ParaBlock) => void) {
  for (const b of blocks) {
    if (b.k === 'p') b.runs.forEach((r) => fn(r, b))
    else for (const row of b.rows) for (const c of row) walkRuns(c.blocks, fn)
  }
}
for (const id of order) {
  const it = items[id]
  const refs = new Map<string, RegReference>()
  const add = (r: RegReference) => { const k = (r.target ?? r.external) + '|' + r.label; if (!refs.has(k)) refs.set(k, r) }
  let plain = ''
  walkRuns(it.blocks, (r) => {
    plain += r.t + ' '
    const anchor = r.anchor
    delete r.anchor
    if (!anchor) return
    const ownerSdt = bookmarkOwner.get(anchor)
    const target = ownerSdt && sdtToId.get(ownerSdt)
    if (target) { if (target !== id) { r.ref = target; add({ label: r.t.trim(), target }) } return }
    const ext = ownerSdt && bySdt.get(ownerSdt)
    if (ext) { r.ext = ext.title; add({ label: r.t.trim(), external: familyOfHeading(ext.headings), externalTitle: ext.title }) }
  })
  for (const m of plain.matchAll(new RegExp(`(?<![\\w.])(${POINT})((?:\\([a-z0-9]+\\))*)`, 'g'))) {
    const target = ownerOf(m[1] + m[2], m[1])
    if (target && target !== id && target !== it.parent && !(items[target].parent === id)) add({ label: m[0], target })
  }
  for (const [re, fam] of EXTERNAL) for (const m of plain.matchAll(re)) {
    const family = fam(m)
    if (family === 'Regulation (EU) 1321/2014') continue // the regulation Part-145 belongs to
    add({ label: m[0], external: family })
  }
  it.references = [...refs.values()]
}
for (const id of order) for (const r of items[id].references) {
  if (r.target && !items[r.target].referencedBy.includes(id)) items[r.target].referencedBy.push(id)
}

// ───────────────────────── 7. definitions ──────────────────────────────────────
const definitions: Definition[] = []
for (const id of order) {
  if (!/definitions/i.test(items[id].title)) continue
  for (const b of items[id].blocks) {
    if (b.k !== 'table') continue
    for (const row of b.rows) {
      if (row.length !== 2) continue
      const term = row[0].blocks.map((x) => (x.k === 'p' ? x.runs.map((r) => r.t).join('') : '')).join(' ').trim()
      if (term) definitions.push({ term, blocks: row[1].blocks, source: id })
    }
  }
}
if (!definitions.length) warn('No definitions table found')

// ───────────────────────── 8. navigation tree ──────────────────────────────────
const sectionOrder: RegSection[] = ['GENERAL', 'A', 'B', 'APPENDICES', 'AMC_APPENDICES', 'LINKED']
const node = (id: string): TocNode => {
  const it = items[id]
  const children = [...(it.parts ?? []), ...order.filter((o) => items[o].parent === id && !(it.parts ?? []).includes(o))].map(node)
  return { id, label: it.reference, kind: 'item', ...(children.length ? { children } : {}) }
}
const toc: TocNode[] = sectionOrder.filter((s) => sectionLabels.has(s)).map((s) => ({
  id: `section:${s}`, label: sectionLabels.get(s)!, kind: 'section' as const,
  children: order.filter((id) => items[id].section === s && !items[id].parent).map(node),
}))

// ───────────────────────── 9. write ────────────────────────────────────────────
const counts: Record<string, number> = {}
for (const id of order) counts[items[id].type] = (counts[items[id].type] ?? 0) + 1
if (unknownStyles.size) warn(`Unmapped Word styles rendered as plain paragraphs: ${[...unknownStyles].join(', ')}`)
if (part145Count !== part145.length) warn(`${part145.length - part145Count} Part-145 topic(s) could not be ingested`)

const dataset: Dataset = {
  meta: {
    sourceTitle: decode(docAttr('source-title')),
    sourceFile: basename(srcPath),
    publishedAt: docAttr('pub-time'),
    documentGuid: docAttr('guid'),
    ingestedAt: new Date().toISOString(),
    counts,
    revision,
    integrity: { checked: integrityChecked, exact: integrityChecked - integrityFailed.length, failed: integrityFailed },
    sources: [...new Set(order.map((id) => items[id].source.document))].sort(),
    warnings,
  },
  toc, items, order, definitions,
}
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(dataset))
console.log(`\n${dataset.meta.sourceTitle}\npublished ${dataset.meta.publishedAt}`)
console.log(`topics in Annex II (Part-145): ${part145.length} → ingested ${part145Count} (+${order.length - part145Count} linked)`, counts)
console.log(`revision: ${revision?.label ?? 'not found'} — ${revision?.changes.join(' ') ?? ''}`)
console.log(`integrity: ${integrityChecked - integrityFailed.length}/${integrityChecked} topics match the source character for character`)
console.log(`definitions: ${definitions.length} · warnings: ${warnings.length}`)
console.log(`→ ${outPath} (${(JSON.stringify(dataset).length / 1024).toFixed(0)} kB)`)
