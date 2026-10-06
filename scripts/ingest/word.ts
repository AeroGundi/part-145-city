/**
 * WordprocessingML → canonical blocks.
 *
 * The EASA Easy Access Rules XML export is a Word "flat OPC" package. Every rule,
 * AMC and GM is a top-level content control (<w:sdt> tagged "topic"). This module
 * turns the body of one such control into `Block[]` without altering any text.
 */
import { XMLParser } from 'fast-xml-parser'
import type { Block, Inline, ParaBlock, TableCell } from '../../src/data/schema'

type Node = Record<string, unknown> & { ':@'?: Record<string, string> }

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: true,
})

export const parseXml = (xml: string) => parser.parse(xml) as Node[]

const tagOf = (n: Node) => Object.keys(n).find((k) => k !== ':@') as string
const kids = (n: Node) => (n[tagOf(n)] as Node[]) ?? []
const attr = (n: Node, name: string) => n[':@']?.[name]
const child = (n: Node, tag: string) => kids(n).find((c) => tagOf(c) === tag)

export interface TopicBody {
  title: string
  source: string
  blocks: Block[]
  bookmarks: string[]
  /** anchors used by hyperlinks, resolved by the caller */
  unknownStyles: Set<string>
}

interface Ctx {
  source?: string
  bookmarks: string[]
  unknownStyles: Set<string>
}

const SYMBOLS: Record<string, string> = { F0B7: '•', F0A7: '▪', F0B0: '°', F0B1: '±', F0D7: '×', F0B3: '≥', F0A3: '≤' }

function runFormat(r: Node): Omit<Inline, 't'> {
  const f: Omit<Inline, 't'> = {}
  const rPr = child(r, 'w:rPr')
  if (!rPr) return f
  for (const p of kids(rPr)) {
    const t = tagOf(p)
    const off = attr(p, 'w:val') === '0' || attr(p, 'w:val') === 'false' || attr(p, 'w:val') === 'none'
    if (t === 'w:b' && !off) f.b = 1
    else if (t === 'w:i' && !off) f.i = 1
    else if (t === 'w:u' && !off) f.u = 1
    else if (t === 'w:vertAlign') {
      if (attr(p, 'w:val') === 'superscript') f.sup = 1
      if (attr(p, 'w:val') === 'subscript') f.sub = 1
    }
  }
  return f
}

function collectRuns(nodes: Node[], out: (Inline & { anchor?: string })[], ctx: Ctx, anchor?: string) {
  for (const n of nodes) {
    const t = tagOf(n)
    if (t === 'w:r') {
      const f = runFormat(n)
      let text = ''
      for (const c of kids(n)) {
        const ct = tagOf(c)
        if (ct === 'w:t') text += kids(c).map((x) => (x['#text'] as string) ?? '').join('')
        else if (ct === 'w:tab') text += '\t'
        else if (ct === 'w:br' || ct === 'w:cr') text += '\n'
        else if (ct === 'w:noBreakHyphen') text += '‑'
        else if (ct === 'w:softHyphen') text += ''
        else if (ct === 'w:sym') text += SYMBOLS[(attr(c, 'w:char') ?? '').toUpperCase()] ?? '•'
      }
      if (text) out.push({ t: text, ...f, ...(anchor ? { anchor } : {}) })
    } else if (t === 'w:hyperlink') {
      collectRuns(kids(n), out, ctx, attr(n, 'w:anchor') ?? anchor)
    } else if (t === 'w:bookmarkStart') {
      const name = attr(n, 'w:name')
      if (name) ctx.bookmarks.push(name)
    } else if (t === 'w:del' || t === 'w:moveFrom') {
      // tracked deletions are not part of the published text
    } else if (t === 'w:ins' || t === 'w:moveTo' || t === 'w:smartTag' || t === 'w:fldSimple' || t === 'w:sdt' || t === 'w:sdtContent') {
      collectRuns(kids(n), out, ctx, anchor)
    }
  }
}

function sameFormat(a: Inline & { anchor?: string }, b: Inline & { anchor?: string }) {
  return a.b === b.b && a.i === b.i && a.u === b.u && a.sup === b.sup && a.sub === b.sub && a.anchor === b.anchor
}

function mergeRuns(runs: (Inline & { anchor?: string })[]) {
  const out: (Inline & { anchor?: string })[] = []
  for (const r of runs) {
    const last = out[out.length - 1]
    if (last && sameFormat(last, r)) last.t += r.t
    else out.push({ ...r })
  }
  return out
}

const LABEL = /^(\(?[A-Za-z0-9]{1,5}\)|[A-Za-z0-9]{1,3}[.)]|\d+(\.\d+)+\.?|[—–\-•▪o])$/

function styleOf(p: Node) {
  const pPr = child(p, 'w:pPr')
  const ps = pPr && child(pPr, 'w:pStyle')
  return (ps && attr(ps, 'w:val')) || ''
}

function paragraph(p: Node, ctx: Ctx): (ParaBlock & { wordStyle: string }) | null {
  const wordStyle = styleOf(p)
  const raw: (Inline & { anchor?: string })[] = []
  collectRuns(kids(p), raw, ctx)
  let runs = mergeRuns(raw)
  if (!runs.length || !runs.some((r) => r.t.trim())) return null

  let style: ParaBlock['style'] = 'para'
  let level = 0
  let m: RegExpMatchArray | null
  if ((m = wordStyle.match(/^ListLevel(\d)$/))) { style = 'list'; level = +m[1] }
  else if ((m = wordStyle.match(/^Normal(\d)$/))) { style = 'para'; level = +m[1] }
  else if ((m = wordStyle.match(/^bullet(\d)$/))) { style = 'bullet'; level = +m[1] }
  else if (/^Heading\d(OrgManual)?$/.test(wordStyle)) { style = 'heading'; level = wordStyle.startsWith('Heading4') ? 0 : 1 }
  else if (wordStyle === 'FinePrint') style = 'note'
  else if (wordStyle === 'TableCentered') style = 'center'
  else if (wordStyle === 'AlignRight') style = 'right'
  else if (wordStyle === 'TableNormal0' || wordStyle === '' || /^Heading\d(IR|AMC|GM)$/.test(wordStyle)) style = 'para'
  else ctx.unknownStyles.add(wordStyle)

  // Split "(a)<TAB>text" into marker + text. The marker is kept verbatim in `label`.
  let label: string | undefined
  if (style === 'list' || style === 'bullet') {
    const full = runs.map((r) => r.t).join('')
    const tab = full.indexOf('\t')
    if (tab > 0 && tab <= 8 && LABEL.test(full.slice(0, tab).trim())) {
      label = full.slice(0, tab).trim()
      let drop = tab + 1
      const rest: typeof runs = []
      for (const r of runs) {
        if (drop >= r.t.length) { drop -= r.t.length; continue }
        rest.push({ ...r, t: r.t.slice(drop) })
        drop = 0
      }
      runs = rest
    }
  }
  for (const r of runs) r.t = r.t.replace(/\t/g, ' ')
  if (runs.length) {
    runs[0].t = runs[0].t.replace(/^\s+/, '')
    runs[runs.length - 1].t = runs[runs.length - 1].t.replace(/\s+$/, '')
  }
  runs = runs.filter((r) => r.t.length)
  if (!runs.length && !label) return null
  return { k: 'p', style, level, ...(label ? { label } : {}), runs, wordStyle }
}

function table(tbl: Node, ctx: Ctx): Block {
  const rows: TableCell[][] = []
  for (const tr of kids(tbl)) {
    if (tagOf(tr) !== 'w:tr') continue
    const row: TableCell[] = []
    for (const tc of kids(tr)) {
      if (tagOf(tc) !== 'w:tc') continue
      const cell: TableCell = { blocks: body(kids(tc), ctx) }
      const tcPr = child(tc, 'w:tcPr')
      if (tcPr) {
        const span = child(tcPr, 'w:gridSpan')
        if (span && +attr(span, 'w:val')! > 1) cell.span = +attr(span, 'w:val')!
        const vm = child(tcPr, 'w:vMerge')
        if (vm) cell.vmerge = attr(vm, 'w:val') === 'restart' ? 'start' : 'cont'
        const shd = child(tcPr, 'w:shd')
        const fill = shd && attr(shd, 'w:fill')
        if (fill && fill !== 'auto' && fill.toUpperCase() !== 'FFFFFF') cell.shade = fill
      }
      row.push(cell)
    }
    if (row.length) rows.push(row)
  }
  return { k: 'table', rows }
}

function body(nodes: Node[], ctx: Ctx): Block[] {
  const out: Block[] = []
  for (const n of nodes) {
    const t = tagOf(n)
    if (t === 'w:p') {
      if (styleOf(n) === 'Dxshortdesc') {
        // "regulatory source" line published outside its content control
        const tmp: Inline[] = []
        collectRuns(kids(n), tmp, ctx)
        ctx.source ??= tmp.map((r) => r.t).join('').trim()
        continue
      }
      const p = paragraph(n, ctx)
      if (p) out.push(p)
    } else if (t === 'w:tbl') out.push(table(n, ctx))
    else if (t === 'w:sdt') {
      const c = child(n, 'w:sdtContent')
      if (c) out.push(...body(kids(c), ctx))
    } else if (t === 'w:bookmarkStart') {
      const name = attr(n, 'w:name')
      if (name) ctx.bookmarks.push(name)
    }
  }
  return out
}

/** Parse one top-level topic content control. */
export function parseTopic(xml: string): TopicBody {
  const root = parseXml(xml)[0]
  const content = child(root, 'w:sdtContent')
  if (!content) throw new Error('topic without sdtContent')
  const ctx: Ctx = { bookmarks: [], unknownStyles: new Set() }
  let source = ''
  const nodes: Node[] = []
  for (const n of kids(content)) {
    if (tagOf(n) === 'w:sdt') {
      const pr = child(n, 'w:sdtPr')
      const alias = pr && child(pr, 'w:alias')
      if (alias && attr(alias, 'w:val') === 'Regulatory source') {
        const tmp: Inline[] = []
        collectRuns(kids(child(n, 'w:sdtContent')!).flatMap(kids), tmp, ctx)
        source = tmp.map((r) => r.t).join('').trim()
        continue
      }
    }
    nodes.push(n)
  }
  const blocks = body(nodes, ctx) as (Block & { wordStyle?: string })[]
  // The first paragraph is the topic heading; it is carried as `title`, not body.
  let title = ''
  if (blocks[0]?.k === 'p' && /^Heading/.test(blocks[0].wordStyle ?? '')) {
    title = (blocks.shift() as ParaBlock).runs.map((r) => r.t).join('').trim()
  }
  const strip = (bs: Block[]) => {
    for (const b of bs) {
      if (b.k === 'p') delete (b as { wordStyle?: string }).wordStyle
      else for (const row of b.rows) for (const c of row) strip(c.blocks)
    }
  }
  strip(blocks)
  return { title, source: source || ctx.source || '', blocks, bookmarks: ctx.bookmarks, unknownStyles: ctx.unknownStyles }
}
