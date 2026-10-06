/**
 * Canonical regulatory schema.
 *
 * Everything under `RegItem.blocks` is OFFICIAL text extracted verbatim from the
 * EASA Easy Access Rules XML by `scripts/ingest`. Nothing in the application may
 * write to it. Editorial content (explanations, spatial mapping, memory hooks)
 * lives in `src/content/` and is joined to items by id at runtime.
 */

export type RegType = 'IR' | 'AMC' | 'GM' | 'APPENDIX' | 'AMC_APPENDIX'
export type RegSection = 'GENERAL' | 'A' | 'B' | 'APPENDICES' | 'AMC_APPENDICES' | 'LINKED'

/** A run of text with uniform formatting. `ref`/`ext` mark an official cross-reference. */
export interface Inline {
  t: string
  b?: 1
  i?: 1
  u?: 1
  sup?: 1
  sub?: 1
  /** id of a Part-145 item this run links to */
  ref?: string
  /** title of a non-Part-145 topic this run links to (external reference) */
  ext?: string
}

export interface ParaBlock {
  k: 'p'
  style: 'para' | 'list' | 'bullet' | 'heading' | 'note' | 'center' | 'right'
  /** indent level, 0-based */
  level: number
  /** list marker exactly as published, e.g. "(a)", "1.", "—" */
  label?: string
  /** full point path for IR list items, e.g. "(d)(1)(i)" */
  path?: string
  runs: Inline[]
  /** id of the later amendment (`Dataset.meta.amendments`) that introduced or changed this paragraph */
  amd?: string
}

export interface TableCell {
  blocks: Block[]
  span?: number
  /** vertical merge: 'start' opens a merged cell, 'cont' continues the one above */
  vmerge?: 'start' | 'cont'
  shade?: string
}

export interface TableBlock {
  k: 'table'
  rows: TableCell[][]
  /** id of the later amendment that introduced or changed this table */
  amd?: string
}

export type Block = ParaBlock | TableBlock

export interface RegReference {
  /** text of the reference as it appears in the official text */
  label: string
  /** Part-145 item id when the target is inside the dataset */
  target?: string
  /** external family when the target is outside Part-145 */
  external?: string
  /** title of the external topic when the source hyperlinks to it */
  externalTitle?: string
}

export interface RegSource {
  /** e.g. "Regulation (EU) 2021/1963" or "ED Decision 2022/011/R" — as published */
  document: string
  eRulesId: string
  sdtId: string
}

export interface RegItem {
  /** stable id, also the URL slug: "145.A.45", "145.A.45/amc/1-c", "appendix-i" */
  id: string
  /** reference exactly as published: "145.A.45", "AMC1 145.A.45(c)" */
  reference: string
  title: string
  type: RegType
  section: RegSection
  /** for AMC/GM: id of the IR item it belongs to; for IR sub-points: the parent point */
  parent?: string
  /** point the AMC/GM targets, as published, e.g. "145.A.45(c)" */
  targets?: string
  /** further points named in the title, e.g. "… and 145.B.300" */
  alsoTargets?: string[]
  /** set when the item is official text of another annex ingested because Part-145 points to it */
  family?: string
  /** child IR sub-points (145.A.30(a) …) in published order */
  parts?: string[]
  amc: string[]
  gm: string[]
  source: RegSource
  /** ISO date or null when the source does not state it */
  applicabilityDate: string | null
  entryIntoForceDate: string | null
  keywords: string[]
  blocks: Block[]
  references: RegReference[]
  referencedBy: string[]
  /** position in the published document */
  order: number
  /** later amendments applied to this item on top of the EASA export, oldest first */
  amendments?: ItemAmendment[]
  /** the item's text as it stands in the EASA export, kept when a later amendment changed it */
  previous?: Block[]
  /** id of the amendment that deleted this item; `blocks` is then empty */
  deleted?: string
}

/**
 * An amending act published after the ingested EASA export and applied on top of it.
 * The amended wording is taken from the act itself (`sourceFile`) and checked against it.
 */
export interface Amendment {
  id: string
  /** full name of the act, as published */
  act: string
  /** short form, same style as `RegSource.document` */
  short: string
  kind: 'IR' | 'AMC_GM'
  /** subject of the act, as published */
  subject: string
  /** e.g. "AMC and GM to Part-145 — Issue 2, Amendment 8" */
  issue?: string
  /** ISO date of publication */
  published: string
  /** ISO date from which the amended text applies */
  applicableFrom: string
  /** the act's own wording on entry into force / application */
  applicationClause: string
  url: string
  /** official source files the text was taken from, relative to the project root */
  sourceFiles: string[]
  /** items of the dataset changed by this act */
  items: string[]
  /** verification of the amended text against the act: units checked / equal character for character */
  verified: { checked: number; exact: number; notes: string[] }
}

export interface ItemAmendment {
  /** `Amendment.id` */
  by: string
  /** the amending instruction exactly as the act words it, when it has one */
  instruction?: string
  /** how the act presents the change when it gives no instruction (marked-up text) */
  presentation?: string
}

export interface Definition {
  term: string
  /** official text of the definition */
  blocks: Block[]
  /** id of the item that carries the definition */
  source: string
}

export interface TocNode {
  id: string
  label: string
  kind: 'section' | 'item'
  children?: TocNode[]
}

export interface Dataset {
  meta: {
    sourceTitle: string
    sourceFile: string
    /** publication timestamp stated by the EASA eRules export */
    publishedAt: string
    documentGuid: string
    ingestedAt: string
    counts: Record<string, number>
    /** latest entry of the publication's own revision table, as published */
    revision: { label: string; changes: string[] } | null
    /** ingestion self-check: topics whose text equals the source character for character (whitespace aside) */
    integrity: { checked: number; exact: number; failed: string[] }
    /** distinct regulatory sources found in Part-145, as published */
    sources: string[]
    /** acts published after the export and applied on top of it by `scripts/ingest/amend.ts` */
    amendments: Amendment[]
    warnings: string[]
  }
  toc: TocNode[]
  items: Record<string, RegItem>
  order: string[]
  definitions: Definition[]
}

/** Plain text of a run list. */
export const runsText = (runs: Inline[]) => runs.map((r) => r.t).join('')

/** Plain text of a block list — used for search indexing and excerpts only. */
export function blocksText(blocks: Block[]): string {
  const out: string[] = []
  for (const b of blocks) {
    if (b.k === 'p') out.push((b.label ? b.label + ' ' : '') + runsText(b.runs))
    else for (const row of b.rows) for (const c of row) out.push(blocksText(c.blocks))
  }
  return out.join('\n')
}
