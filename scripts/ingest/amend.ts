/**
 * Amendments published after the EASA export, applied on top of it.
 *
 * EASA's Easy Access Rules are a consolidation that is re-published only now and
 * then. Until a new export exists, the acts adopted in the meantime are applied
 * here so the dataset shows the text that applies today.
 *
 * The rule of the project still holds: no wording is written by hand and trusted.
 *
 *   • Implementing-rule changes are READ from the Official Journal text of the
 *     amending regulation (sources/amendments/oj-*.xhtml, as served by the EU
 *     Publications Office). The replacement text is whatever the act quotes.
 *   • AMC/GM changes are published by EASA as marked-up PDFs (deleted text struck
 *     through, new text highlighted). The marks are recovered from the PDF by
 *     `pdf_changes.py` into a .changes.txt file; the edits below are then CHECKED
 *     against it: the text before must be what the PDF shows as existing/deleted,
 *     the text after must be what it shows as existing/new, to the character.
 *
 * Any mismatch throws — a wrong amendment must never reach the dataset.
 * Every touched item keeps its export text in `previous`.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { XMLParser } from 'fast-xml-parser'
import type { Amendment, Block, Inline, ParaBlock, RegItem, TableBlock, TableCell } from '../../src/data/schema'

const squash = (t: string) => t.replace(/[\s •▪‑]/g, '')
const flat = (bs: Block[]): string => bs.map((b) => (b.k === 'p' ? (b.label ?? '') + b.runs.map((r) => r.t).join('') : b.rows.map((r) => r.map((c) => flat(c.blocks)).join('')).join(''))).join('')
const textOf = (b: ParaBlock) => b.runs.map((r) => r.t).join('')
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const iso = (d: string | number, m: string | number, y: string | number) => `${y}-${String(typeof m === 'string' && isNaN(+m) ? MONTHS.indexOf(m) + 1 : m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// ───────────────────────── source files ────────────────────────────────────────
// The official files this stage reads, pinned by SHA-256: a file that is not the one
// the amendments were written against is refused rather than silently trusted.
const SOURCES: Record<string, string> = {
  'sources/amendments/oj-32025R0111.xhtml': '7fa9d2c927d9cc2cecab9cfa5ae13679343922d6bdd24c4e9497cc9b7f8e8160',
  'sources/amendments/oj-32025R2293.xhtml': '42648f8f993e9684e6e3c5330b5d2eb9d224a4313857e1adc253fbe5a9b1f216',
  'sources/amendments/amc-gm-part-145-issue-2-amdt-8.pdf': '80dfe25bf76e669d6b5b32271d7aba0844d15f659f088fe7563b43d77908d6ee',
  'sources/amendments/amc-gm-part-145-issue-2-amdt-8.changes.txt': '3d0a33828dbc86ffe798bc05f1533d6088889a4f103e00b595dcd84958e25f26',
  'sources/amendments/amc-gm-part-145-issue-2-amdt-9.pdf': 'd98611c752f234c64ff7a6bd867c2b6cba59ba4d498217ddc4828fb8949a40f9',
  'sources/amendments/amc-gm-part-145-issue-2-amdt-9.changes.txt': '4d254b3e7d0221ebb29d08afcd89609c8251c3f37b8e80308ea1186026dfeeea',
  'sources/amendments/ed-decision-2026-002-r.pdf': '68fc555faeae247b08086d367e8869c9ea068c7fcfeb4553b1188ab4f6842a2f',
  'sources/amendments/ed-decision-2026-005-r.pdf': '862c6ab92f7b6504f9be86ae88f14bc62885be87931d624ccc3ddfe42567cc9f',
}
function source(root: string, file: string): Buffer {
  const buf = readFileSync(resolve(root, file))
  const sha = createHash('sha256').update(buf).digest('hex')
  if (SOURCES[file] !== sha) throw new Error(`${file} is not the pinned official file (sha256 ${sha})`)
  return buf
}

// ───────────────────────── Official Journal (XHTML) ────────────────────────────
type Node = Record<string, unknown>
const tagOf = (n: Node) => Object.keys(n).find((k) => k !== ':@')!
const kidsOf = (n: Node) => (Array.isArray(n[tagOf(n)]) ? (n[tagOf(n)] as Node[]) : [])
const attr = (n: Node, k: string) => ((n[':@'] as Record<string, string> | undefined)?.['@_' + k] ?? '')
const xhtml = new XMLParser({ preserveOrder: true, ignoreAttributes: false, trimValues: false, processEntities: true, htmlEntities: true })

function runsOf(n: Node, fmt: Partial<Inline> = {}, out: Inline[] = []): Inline[] {
  for (const k of kidsOf(n)) {
    const t = tagOf(k)
    if (t === '#text') { out.push({ ...fmt, t: String(k['#text']).replace(/\s+/g, ' ') }); continue }
    const c = attr(k, 'class')
    runsOf(k, { ...fmt, ...(/oj-italic/.test(c) ? { i: 1 as const } : {}), ...(/oj-bold/.test(c) ? { b: 1 as const } : {}), ...(/oj-super/.test(c) ? { sup: 1 as const } : {}), ...(/oj-sub\b/.test(c) ? { sub: 1 as const } : {}) }, out)
  }
  return out
}
/** Layout whitespace of the HTML source is not text: collapse it, never touch a character. */
function tidy(runs: Inline[]): Inline[] {
  const out: Inline[] = []
  for (const r of runs) {
    const prev = out[out.length - 1]
    let t = r.t
    if ((!prev || prev.t.endsWith(' ')) && t.startsWith(' ')) t = t.slice(1)
    if (!t) continue
    const same = prev && !!prev.i === !!r.i && !!prev.b === !!r.b && !!prev.sup === !!r.sup && !!prev.sub === !!r.sub
    if (same) prev.t += t
    else out.push({ ...r, t })
  }
  if (out.length) out[out.length - 1].t = out[out.length - 1].t.trimEnd()
  return out.filter((r) => r.t)
}
function ojBlocks(nodes: Node[], level: number): Block[] {
  const out: Block[] = []
  for (const n of nodes) {
    const t = tagOf(n)
    if (t === 'p') {
      const runs = tidy(runsOf(n))
      if (runs.length) out.push({ k: 'p', style: /oj-note/.test(attr(n, 'class')) ? 'note' : 'para', level, runs })
    } else if (t === 'table' && /oj-table/.test(attr(n, 'class'))) out.push(ojTable(n))
    else if (t === 'table') {
      // the Official Journal lays a numbered point out as a two-column table: marker | content
      for (const tr of rowsOf(n)) {
        const tds = kidsOf(tr).filter((x) => tagOf(x) === 'td')
        if (tds.length !== 2) throw new Error('Official Journal layout not understood: a point with ' + tds.length + ' columns')
        const label = flat(ojBlocks(kidsOf(tds[0]), 0)).trim()
        const body = ojBlocks(kidsOf(tds[1]), level + 1)
        const first = body[0]
        if (first?.k === 'p') out.push({ ...first, style: 'list', level, label }, ...body.slice(1))
        else out.push({ k: 'p', style: 'list', level, label, runs: [] }, ...body)
      }
    } else if (t === 'div' || t === 'tbody') out.push(...ojBlocks(kidsOf(n), level))
  }
  return out
}
const rowsOf = (table: Node): Node[] => kidsOf(table).flatMap((x) => (tagOf(x) === 'tbody' ? kidsOf(x) : [x])).filter((x) => tagOf(x) === 'tr')
function ojTable(n: Node): TableBlock {
  const pending: ({ left: number; span: number } | undefined)[] = []
  const rows: TableCell[][] = []
  for (const tr of rowsOf(n)) {
    const row: TableCell[] = []
    let col = 0
    const carry = () => {
      while (pending[col]?.left) {
        const p = pending[col]!
        row.push({ blocks: [], vmerge: 'cont', ...(p.span > 1 ? { span: p.span } : {}) })
        p.left--
        col += p.span
      }
    }
    for (const td of kidsOf(tr).filter((x) => tagOf(x) === 'td')) {
      carry()
      const span = +attr(td, 'colspan') || 1
      const down = +attr(td, 'rowspan') || 1
      row.push({ blocks: ojBlocks(kidsOf(td), 0), ...(span > 1 ? { span } : {}), ...(down > 1 ? { vmerge: 'start' as const } : {}) })
      if (down > 1) pending[col] = { left: down - 1, span }
      col += span
    }
    carry()
    rows.push(row)
  }
  return { k: 'table', rows }
}

interface OjAct { file: string; raw: string; title: string[]; published: string; applicableFrom: string; clause: string; eli: string }
function readOj(root: string, file: string): OjAct {
  const raw = source(root, file).toString('utf8')
  const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }
  const plain = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m)).replace(/\s+/g, ' ').trim()
  const body = raw.slice(raw.indexOf('<body'))
  const firstTitle = body.indexOf('<p class="oj-doc-ti"')
  const title = [...body.matchAll(/<p class="oj-doc-ti"[^>]*>(.*?)<\/p>/gs)].map((m) => plain(m[1])).filter((t) => !/^ANNEX/.test(t))
  const d = plain(body.slice(0, firstTitle)).match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/)
  const text = plain(body.slice(firstTitle))
  const clause = text.match(/This Regulation shall enter into force[^.]*?Official Journal of the European Union\s*\.\s*It shall apply from (\d{1,2}) (\w+) (\d{4})\./)
  const num = title[0].match(/\(EU\) (\d{4})\/(\d+)$/)
  const eli = num && text.includes(`ELI: http://data.europa.eu/eli/reg_impl/${num[1]}/${num[2]}/oj`) ? [`https://eur-lex.europa.eu/eli/reg_impl/${num[1]}/${num[2]}/oj`] : null
  if (!d || !clause || !eli || title.length < 3) throw new Error(`${file}: publication date, application clause, ELI or title not found`)
  return { file, raw, title, published: iso(d[1], d[2], d[3]), applicableFrom: iso(clause[1], clause[2], clause[3]), clause: clause[0].replace(/\s+\./g, '.'), eli: eli[0] }
}
/** An annex of the act as blocks, plus its bare text for the verbatim check. */
function ojAnnex(act: OjAct, annexId: string) {
  const a = act.raw.indexOf(`<div class="eli-container" id="${annexId}">`)
  const b = act.raw.indexOf('<hr class="oj-doc-sep"/>', a)
  if (a < 0) throw new Error(`${act.file}: annex ${annexId} not found`)
  let frag = act.raw.slice(a, b < 0 ? act.raw.indexOf('</body>', a) : b)
  frag = frag.slice(0, frag.lastIndexOf('</div>'))
  const nodes = xhtml.parse(frag) as Node[]
  const rawText = squash(runsOf({ x: nodes }).map((r) => r.t).join(''))
  return { blocks: ojBlocks(nodes, 0), rawText }
}
/** The text an amending point quotes: "… is replaced by the following: ‘…’". */
function quoted(annex: { blocks: Block[]; rawText: string }, n: string, where: RegExp, file: string) {
  const top = annex.blocks.map((b, i) => (b.k === 'p' && b.level === 0 && b.style === 'list' ? i : -1)).filter((i) => i >= 0)
  const at = top.find((i) => (annex.blocks[i] as ParaBlock).label === n)
  if (at === undefined) throw new Error(`${file}: amending point ${n} not found`)
  const head = annex.blocks[at] as ParaBlock
  const instruction = textOf(head)
  if (!where.test(instruction)) throw new Error(`${file}: amending point ${n} reads “${instruction}”, not what was expected`)
  const next = annex.blocks.findIndex((b, i) => i > at && b.k === 'p' && b.level === 0)
  const body = clone(annex.blocks.slice(at + 1, next < 0 ? undefined : next))
  const first = body[0]
  const last = [...body].reverse().find((b): b is ParaBlock => b.k === 'p')
  if (first?.k !== 'p' || !first.label?.startsWith('‘') || !last || !/’[;.]$/.test(textOf(last))) throw new Error(`${file}: point ${n} is not a quoted replacement`)
  first.label = first.label.slice(1)
  const tail = last.runs[last.runs.length - 1]
  tail.t = tail.t.replace(/’[;.]$/, '')
  for (const b of body) if (b.k === 'p') b.level--
  // the quotation is contiguous in the act: what was taken must be found there, to the character
  const got = squash(flat(body))
  if (!annex.rawText.includes(got)) throw new Error(`${file}: text taken for point ${n} is not verbatim`)
  return { instruction, body }
}

// ───────────────────────── EASA marked-up amendments (PDF) ─────────────────────
interface Change { old: string[]; neu: string[]; deleted: number; inserted: number; removed: boolean }
/** Sections of a .changes.txt, keyed by squashed "reference title". */
function readChanges(root: string, file: string): Map<string, Change> {
  const lines = source(root, file).toString('utf8').split('\n').map((l) => l.trim()).filter(Boolean)
  const strip = (l: string) => l.replace(/\{[-+]|[-+]\}/g, '')
  const oldOf = (l: string) => l.replace(/\{\+.*?\+\}/g, '').replace(/\{-(.*?)-\}/g, '$1')
  const newOf = (l: string) => l.replace(/\{-.*?-\}/g, '').replace(/\{\+(.*?)\+\}/g, '$1')
  const out = new Map<string, Change>()
  let cur: Change | null = null
  for (const l of lines) {
    if (/^(AMC|GM)\d* (145\.|to Appendix)/.test(strip(l))) {
      cur = { old: [''], neu: [''], deleted: 0, inserted: 0, removed: /^\{-.*-\}$/.test(l) && !/\{\+/.test(l) }
      out.set(squash(strip(l)), cur)
      continue
    }
    if (!cur) continue
    if (l === '[…]') { cur.old.push(''); cur.neu.push(''); continue }
    cur.old[cur.old.length - 1] += squash(oldOf(l))
    cur.neu[cur.neu.length - 1] += squash(newOf(l))
    for (const m of l.matchAll(/\{-(.*?)-\}/g)) cur.deleted += squash(m[1]).length
    for (const m of l.matchAll(/\{\+(.*?)\+\}/g)) cur.inserted += squash(m[1]).length
  }
  return out
}
function inOrder(hay: string, chunks: string[]): boolean {
  let at = 0
  for (const c of chunks) {
    if (!c) continue
    const i = hay.indexOf(c, at)
    if (i < 0) return false
    at = i + c.length
  }
  return true
}

// ───────────────────────── editing helpers ─────────────────────────────────────
const paras = (bs: Block[]): ParaBlock[] => bs.flatMap((b) => (b.k === 'p' ? [b] : b.rows.flatMap((r) => r.flatMap((c) => paras(c.blocks)))))
function one<T>(xs: T[], what: string): T {
  if (xs.length !== 1) throw new Error(`Amendment target not unique: ${what} matched ${xs.length} time(s)`)
  return xs[0]
}
/** Replace `from` by `to` inside the single run that contains it. */
function swap(b: ParaBlock, from: string, to: string, amd: string) {
  const r = one(b.runs.filter((x) => x.t.includes(from)), `“${from}”`)
  if (r.t.split(from).length !== 2) throw new Error(`“${from}” occurs more than once`)
  r.t = r.t.replace(from, to)
  b.amd = amd
}
/** Turn mentions of Part-145 points inside newly inserted text into links, as the export does. */
function link(runs: Inline[], items: Record<string, RegItem>, self: string): Inline[] {
  return runs.flatMap((r) => {
    if (r.ref || r.ext) return [r]
    const out: Inline[] = []
    let at = 0
    for (const m of r.t.matchAll(/145\.[AB]\.\d+A?(?:\([a-z0-9]+\))*/g)) {
      const base = m[0].match(/^145\.[AB]\.\d+A?/)![0]
      if (!items[base] || base === self || items[self]?.parent === base) continue
      if (m.index! > at) out.push({ ...r, t: r.t.slice(at, m.index) })
      out.push({ ...r, t: m[0], ref: base })
      at = m.index! + m[0].length
    }
    if (at < r.t.length) out.push({ ...r, t: r.t.slice(at) })
    return out
  })
}
const mark = (bs: Block[], amd: string) => { for (const b of bs) b.amd = amd; return bs }

// ───────────────────────── the amendments ──────────────────────────────────────
export function applyAmendments(root: string, items: Record<string, RegItem>, warn: (m: string) => void): Amendment[] {
  const done: Amendment[] = []
  const touch = (a: Amendment, id: string, how: { instruction?: string; presentation?: string }) => {
    const it = items[id]
    if (!it) throw new Error(`${a.short}: ${id} is not in the dataset`)
    it.previous ??= clone(it.blocks)
    ;(it.amendments ??= []).push({ by: a.id, ...how })
    a.items.push(id)
    return it
  }
  const ojAmendment = (id: string, act: OjAct): Amendment => ({
    id, act: act.title[0].replace(/^COMMISSION IMPLEMENTING REGULATION/, 'Commission Implementing Regulation'), short: act.title[0].replace(/^COMMISSION IMPLEMENTING REGULATION/, 'Regulation'),
    kind: 'IR', subject: act.title[2], published: act.published, applicableFrom: act.applicableFrom, applicationClause: act.clause, url: act.eli,
    sourceFiles: [act.file], items: [], verified: { checked: 0, exact: 0, notes: [] },
  })

  // ── Regulation (EU) 2025/111 — Annex II amends Annex II (Part-145) ──
  {
    const act = readOj(root, 'sources/amendments/oj-32025R0111.xhtml')
    const a = ojAmendment('reg-2025-111', act)
    const annex = ojAnnex(act, 'anx_II')
    if (!/^Annex II \(Part-145\) to Regulation \(EU\) No 1321\/2014 is amended as follows:$/.test(textOf(annex.blocks[1] as ParaBlock))) throw new Error('2025/111: Annex II is not the Part-145 annex')
    const points = annex.blocks.filter((b) => b.k === 'p' && b.level === 0 && b.style === 'list').length
    if (points !== 2) throw new Error(`2025/111: Annex II has ${points} amending points, 2 are handled`)

    // (1) in point (h)(2) of point 145.A.30, point (ii) is replaced
    const p1 = quoted(annex, '(1)', /^in point \(h\)\(2\) of point 145\.A\.30, point \(ii\) is replaced by the following:$/, act.file)
    const h = touch(a, '145.A.30(h)', { instruction: p1.instruction })
    const two = h.blocks.findIndex((b) => b.k === 'p' && b.label === '2.')
    const target = one(h.blocks.filter((b, i): b is ParaBlock => i > two && two >= 0 && b.k === 'p' && b.label === '(ii)'), '145.A.30(h)(2)(ii)')
    const repl = one(p1.body, 'replacement of 145.A.30(h)(2)(ii)') as ParaBlock
    if (repl.label !== '(ii)') throw new Error('2025/111 point (1): unexpected replacement')
    target.runs = link(repl.runs, items, '145.A.30(h)')
    target.amd = a.id
    a.verified.checked++; a.verified.exact++

    // (2) in Appendix II, points (l) and (m) are replaced
    const p2 = quoted(annex, '(2)', /^in Appendix II, points \(l\) and \(m\) are replaced by the following:$/, act.file)
    const ap = touch(a, 'appendix-ii', { instruction: p2.instruction })
    const l = ap.blocks.findIndex((b) => b.k === 'p' && b.level === 0 && b.label === '(l)')
    const after = ap.blocks.slice(l).filter((b): b is ParaBlock => b.k === 'p' && b.level === 0 && !!b.label).map((b) => b.label)
    if (l < 0 || after.join() !== '(l),(m)') throw new Error('Appendix II: points (l) and (m) are not the last two points')
    if (p2.body.filter((b): b is ParaBlock => b.k === 'p' && b.level === 0 && !!b.label).map((b) => b.label).join() !== '(l),(m)') throw new Error('2025/111 point (2): unexpected replacement')
    // the footnote the replaced table refers to is printed at the end of the annex
    const note = annex.blocks[annex.blocks.length - 1]
    if (note.k !== 'p' || note.style !== 'note' || !flat(p2.body).includes('(*1)') || !textOf(note).startsWith('(*1)')) throw new Error('2025/111 point (2): footnote (*1) not found')
    ap.blocks.splice(l, ap.blocks.length - l, ...mark([...p2.body, clone(note)], a.id))
    a.verified.checked++; a.verified.exact++
    done.push(a)
  }

  // ── Regulation (EU) 2025/2293 — Annex VI corrects Annex II (Part-145) ──
  {
    const act = readOj(root, 'sources/amendments/oj-32025R2293.xhtml')
    const a = ojAmendment('reg-2025-2293', act)
    const annex = ojAnnex(act, 'anx_VI')
    if (!/^Annexes II and Vc to Regulation \(EU\) No 1321\/2014 are corrected as follows:$/.test(textOf(annex.blocks[1] as ParaBlock))) throw new Error('2025/2293: Annex VI is not the 1321/2014 annex')
    const p1 = quoted(annex, '(1)', /^in Annex II, point 145\.B\.300\(g\) is replaced by the following:$/, act.file)
    const it = touch(a, '145.B.300', { instruction: p1.instruction })
    const g = one(it.blocks.filter((b): b is ParaBlock => b.k === 'p' && b.level === 0 && b.label === '(g)'), '145.B.300(g)')
    const repl = one(p1.body, 'replacement of 145.B.300(g)') as ParaBlock
    if (repl.label !== '(g)') throw new Error('2025/2293 point (1): unexpected replacement')
    g.runs = link(repl.runs, items, '145.B.300')
    g.amd = a.id
    a.verified.checked++; a.verified.exact++
    done.push(a)
  }

  // ── AMC and GM — checked against the marks of the EASA PDF ──
  const verify = (a: Amendment, changes: Map<string, Change>, it: RegItem) => {
    const ch = changes.get(squash(`${it.reference} ${it.title}`))
    if (!ch) throw new Error(`${a.short}: no section “${it.reference} ${it.title}” in the amendment`)
    const before = squash(flat(it.previous!))
    const now = squash(flat(it.blocks))
    a.verified.checked++
    if (ch.removed !== !!it.deleted) throw new Error(`${a.short}: ${it.reference} — deletion of the whole item does not match the amendment`)
    if (!inOrder(before, ch.old)) throw new Error(`${a.short}: ${it.reference} — the existing text shown by the amendment is not the text of the dataset`)
    if (it.deleted) {
      const shown = ch.old.join('')
      if (shown !== before) {
        if (!before.startsWith(shown) || before.length - shown.length > 1) throw new Error(`${a.short}: ${it.reference} — deleted text differs from the dataset`)
        a.verified.notes.push(`${it.reference}: the amendment reproduces the deleted text without its final “${before.slice(shown.length)}”.`)
      }
    } else {
      if (!inOrder(now, ch.neu)) throw new Error(`${a.short}: ${it.reference} — amended text differs from the amendment`)
      if (now.length !== before.length - ch.deleted + ch.inserted) throw new Error(`${a.short}: ${it.reference} — ${now.length} characters after amendment, the amendment implies ${before.length - ch.deleted + ch.inserted}`)
    }
    a.verified.exact++
  }
  const P = (t: string, amd: string): ParaBlock => ({ k: 'p', style: 'para', level: 0, runs: [{ t }], amd })
  const MARKED = 'Published as marked-up text: deleted text struck through, new text highlighted.'

  // ── ED Decision 2026/002/R — AMC and GM to Part-145, Issue 2, Amendment 8 ──
  {
    const a: Amendment = {
      id: 'ed-2026-002-r', act: 'Executive Director Decision 2026/002/R', short: 'ED Decision 2026/002/R', kind: 'AMC_GM',
      subject: 'Amendments to the AMC and GM to Commission Regulation (EU) No 1321/2014 and to its annexes',
      issue: 'AMC and GM to Part-145 — Issue 2, Amendment 8',
      published: '2026-02-03', applicableFrom: '2026-02-04',
      applicationClause: 'This Decision shall enter into force on the day following that of its publication in the Official Publication of EASA.',
      url: 'https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2026002r',
      sourceFiles: ['sources/amendments/amc-gm-part-145-issue-2-amdt-8.pdf', 'sources/amendments/amc-gm-part-145-issue-2-amdt-8.changes.txt', 'sources/amendments/ed-decision-2026-002-r.pdf'],
      items: [], verified: { checked: 0, exact: 0, notes: [] },
    }
    const changes = readChanges(root, a.sourceFiles[1])
    if (changes.size !== 2) throw new Error(`${a.short}: ${changes.size} amended items in the PDF, 2 are handled`)

    const gm = touch(a, '145.A.10/gm/1', { presentation: MARKED })
    const pa = one(gm.blocks.filter((b): b is ParaBlock => b.k === 'p' && b.level === 0 && b.label === '(a)'), 'GM1 145.A.10(a)')
    swap(pa, 'only employ one person, who', 'employ only one person who', a.id)
    swap(pa, 'limited to the following terms of approval:', 'limited to the terms of approval specified in point (m) of Appendix II of Part-145.', a.id)
    const classes = gm.blocks.filter((b) => b.k === 'p' && b.style === 'bullet' && /^Class [A-D]/.test(textOf(b)))
    if (classes.length !== 6) throw new Error('GM1 145.A.10: expected the six “Class …” lines')
    gm.blocks = gm.blocks.filter((b) => !classes.includes(b))
    verify(a, changes, gm)

    const amc = touch(a, '145.A.20/amc/1', { presentation: MARKED })
    swap(amc.blocks[0] as ParaBlock, 'ATA Chapters', 'ATA chapters', a.id)
    const table = one(amc.blocks.filter((b): b is TableBlock => b.k === 'table'), 'table of AMC1 145.A.20')
    const RATING: Record<string, string> = { 'C4 Doors - Hatches': 'C4 Doors — Hatches', 'C10 Helicopters - Rotors': 'C10 Rotorcraft — Rotors', 'C11 Helicopter - Trans': 'C11 Rotorcraft — Trans' }
    let renamed = 0
    for (const row of table.rows.slice(1)) {
      const rating = one(paras(row[1].blocks), 'rating cell')
      const chapters = one(paras(row[2].blocks), 'ATA chapters cell')
      const r = textOf(rating)
      if (RATING[r]) { rating.runs = [{ t: RATING[r] }]; rating.amd = a.id; renamed++ }
      const c = textOf(chapters)
      const dashed = c.replace(/\s*-\s*/g, ' – ')
      if (dashed !== c) { chapters.runs = [{ t: dashed }]; chapters.amd = a.id }
    }
    if (renamed !== 3) throw new Error('AMC1 145.A.20: expected three renamed ratings')
    table.rows.push([{ blocks: [], vmerge: 'cont' }, { blocks: [P('C23 Others', a.id)] }, { blocks: [] }])
    table.amd = a.id
    amc.blocks.splice(amc.blocks.indexOf(table) + 1, 0,
      P('The rating for an organisation approved for the maintenance of an electric engine that powers a propeller/rotor to generate thrust and/or lift for the aircraft should be B4, rather than C5.', a.id),
      P('C23 should be used as component rating when C1 to C22 or the corresponding ATA chapters are not adequate for the component; for instance, in case of innovative aircraft architectures/systems.', a.id))
    verify(a, changes, amc)
    done.push(a)
  }

  // ── ED Decision 2026/005/R — AMC and GM to Part-145, Issue 2, Amendment 9 ──
  {
    const a: Amendment = {
      id: 'ed-2026-005-r', act: 'Executive Director Decision 2026/005/R', short: 'ED Decision 2026/005/R', kind: 'AMC_GM',
      subject: 'Airworthiness review process | Import of aircraft from other regulatory systems, and review of Part 21 Subpart H | Alignment of the IRs of Regulation (EU) 2018/1139 and the associated AMC and GM with Regulation (EU) No 376/2014 — Occurrence reporting',
      issue: 'AMC and GM to Part-145 — Issue 2, Amendment 9',
      published: '2026-07-06', applicableFrom: '2026-08-07',
      applicationClause: 'This Decision shall enter into force on the day following that of its publication in the Official Publication of EASA. It shall apply as of 7 August 2026.',
      url: 'https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2026005r',
      sourceFiles: ['sources/amendments/amc-gm-part-145-issue-2-amdt-9.pdf', 'sources/amendments/amc-gm-part-145-issue-2-amdt-9.changes.txt', 'sources/amendments/ed-decision-2026-005-r.pdf'],
      items: [], verified: { checked: 0, exact: 0, notes: [] },
    }
    const changes = readChanges(root, a.sourceFiles[1])
    if (changes.size !== 2) throw new Error(`${a.short}: ${changes.size} amended items in the PDF, 2 are handled`)

    const gone = touch(a, '145.A.60/amc/2', { presentation: 'Published as marked-up text: the whole AMC, heading included, is struck through.' })
    gone.blocks = []
    gone.deleted = a.id
    verify(a, changes, gone)

    const f = touch(a, '145.B.300/amc/1-f', { presentation: MARKED })
    const iv = one(f.blocks.filter((b): b is ParaBlock => b.k === 'p' && b.label === '(iv)'), 'AMC1 145.B.300(f)(c)(iv)')
    iv.runs = [{ t: 'investigations performed by the competent authority in accordance with point M.B.902.' }]
    iv.amd = a.id
    verify(a, changes, f)
    done.push(a)
  }

  for (const a of done) for (const f of a.sourceFiles) source(root, f)
  for (const a of done) for (const n of a.verified.notes) warn(`${a.short} — ${n}`)
  return done
}
