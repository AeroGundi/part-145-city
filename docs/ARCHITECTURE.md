# Part-145 City — architecture

## The one rule

**Official text and editorial content never mix.**

| Layer | Where | Written by | May change official text? |
|---|---|---|---|
| Official dataset | `src/data/generated/part145.json` | `scripts/ingest` only | — |
| Editorial | `src/content/` | people | never |
| Knowledge graph | `src/graph/graph.ts` | derived at start-up from the two above | never |
| UI | `src/ui/` | reads through `src/data/dataset.ts` and the graph | never |
| City | `src/city/` | generated from `src/content/city.ts` | never |

`RegText.tsx` is the only component that renders official text, and it only lays it out. Explanations, memory hooks,
auditor considerations, locations and scenarios are always labelled as written for this application.

## Regulatory ingestion (`npm run ingest`)

Source: the EASA Easy Access Rules XML export (a Word flat-OPC package), kept in `sources/`.

1. The structure is **derived** from the export's own table of contents (`<er:toc>`): everything under
   "Annex II (Part-145)". No list of points is hardcoded.
2. Each topic's content control is converted to canonical blocks (`scripts/ingest/word.ts`): paragraphs with their
   list markers and indent levels, tables with merged cells, inline formatting, hyperlinks.
3. AMC/GM are attached to the most specific published point; point paths such as `(d)(1)(i)` are assigned.
4. Cross-references become `REFERENCES` (inside Part-145) or external references (Part-M, Part-66, …).
5. A Part-145 appendix that only points elsewhere (Appendix I → Part-M Appendix II, EASA Form 1) pulls that text in,
   flagged as *linked*.
6. **Integrity check:** for every topic, the text in the blocks must equal the text in the source, character for
   character (whitespace aside). The result is stored in `meta.integrity` and asserted by the tests.
7. The publication's revision label and each item's source act and applicability date are stored.

8. **Later amendments** (`scripts/ingest/amend.ts`) are applied on top of the export — see below.

Current dataset: revision **September 2025** (published 2 September 2025) plus four amending acts — 74 rule topics
(46 points), 121 AMC, 69 GM, 4 appendices + 3 appendices to AMC, 25 definitions; 273/273 topics pass the integrity
check; 7/7 amended items pass the check against their amending act.

### Amendments applied on top of the export (checked 6 October 2026)

EASA re-publishes the Easy Access Rules only now and then; the September 2025 revision is still the latest. The acts
adopted since are applied by the ingestion so the app shows the text that applies today. Official sources are kept in
`sources/amendments/` and pinned by SHA-256 in `amend.ts`.

| Act | Applicable from | Changes in Part-145 | Where the text comes from |
| --- | --- | --- | --- |
| Regulation (EU) 2025/111 | 13 Feb 2026 | 145.A.30(h)(2)(ii) replaced; Appendix II points (l) and (m) replaced | Official Journal XHTML (EU Publications Office) |
| Regulation (EU) 2025/2293 | 22 Feb 2026 | 145.B.300(g) replaced (correction) | Official Journal XHTML |
| ED Decision 2026/002/R — AMC & GM Issue 2, Amdt 8 | 4 Feb 2026 | GM1 145.A.10, AMC1 145.A.20 | EASA PDF |
| ED Decision 2026/005/R — AMC & GM Issue 2, Amdt 9 | 7 Aug 2026 | AMC2 145.A.60 deleted; AMC1 145.B.300(f) | EASA PDF |

How wording is kept honest:

- **Rules:** the replacement text is *read* from the act — whatever it quotes after "is replaced by the following" —
  and must be found, contiguous and character for character, in the act's annex. The amending instruction is checked
  against the expected one and stored with the item.
- **AMC/GM:** EASA publishes marked-up text (deleted struck through, new highlighted). `scripts/ingest/pdf_changes.py`
  (PyMuPDF) recovers those marks from the PDF into `*.changes.txt` (`{-deleted-}`, `{+new+}`). The edits in `amend.ts`
  are then checked: the item's text before must be what the PDF shows as existing/deleted, the text after must be what
  it shows as existing/new, and the length must add up. A wrong edit throws; nothing reaches the dataset.
- Every amended item keeps its export text in `previous`, lists the acts in `amendments`, and marks changed
  paragraphs with `amd`. A deleted item stays addressable with empty `blocks` and `deleted` set. The UI shows all
  of this next to the text. `meta.amendments` carries the acts, dates, URLs and verification results.
- Tests fail if an amendment is unverified, not yet applicable, or leaves no trace on its item.

Reviewed with no change to the dataset: Regulation (EU) 2026/100 (amends Article 3 and Part-M, -ML, -CAMO, -CAO only)
and the Part-M AMC/GM amendments 9 and 10 (do not touch the Form 1 appendix reproduced here). See
`src/content/currency.ts`.

### Remaining limitations

- The amended wording is **this project's consolidation, not EASA's**. When EASA publishes the next revision:
  download the XML, run `npm run ingest -- path/to/file.xml`, delete from `amend.ts` the acts it incorporates
  (their targets will no longer match and the ingestion will stop until you do), run `npm test`.
- Only Annex II is reproduced; the articles of Regulation (EU) No 1321/2014 (also amended by 2025/111 and 2026/100)
  are not.
- Acts adopted after 6 October 2026 are not included. `CURRENCY_GAPS` in `currency.ts` is the place to record an act
  that is known but not yet applied; the dataset badge and a test surface it.
- `Appendix I to Part-66` (referred to by Appendix IV) is published as a tree of sub-topics and is left as an
  external reference.
- One source label differs between the body and the metadata of the export (AMC 145.A.47(a)); the body wins.
- The amendment PDF for AMC2 145.A.60 reproduces the deleted text without its final full stop; recorded as a note.

## The city

`src/content/city.ts` is the model: districts (domains) → rooms (sub-domains) → anchors (roles and objects), plus
the road network. Buildings are domains, never single regulations; points attach to anchors through
`src/content/mapping.ts` (longest matching point reference wins, so `AMC1 145.A.30(e)` inherits `145.A.30(e)`).

`src/city/`:

| File | Role |
|---|---|
| `parts.ts` | everything static is a list of coloured primitives → one `InstancedMesh` per geometry/material |
| `buildings.ts`, `prefabs.ts` | architecture and props generated from the model |
| `Districts.tsx` | cut-away opening (roof lifts, walls drop) and click targets |
| `layout.ts` | paths, pavements and zebra crossings derived from the road model, traffic routes |
| `traffic.ts` | vehicles and pedestrians that see each other: fixed-step, seeded simulation (following, give-way at junctions, keep-clear boxes, yielding to people and aircraft); covered by `traffic.test.ts` |
| `looks.ts` | who wears what (role → outfit) and the airside boundary: only people with a reason go beyond it, and they wear hi-vis |
| `emblems.ts` | one signature object per room, a memory aid placed beside the anchors |
| `Life.tsx`, `aircraft.ts` | draws people, vehicles, aircraft, clouds; aircraft and clouds are closed-form functions of the clock |
| `Overlays.tsx`, `Labels.tsx` | pins, connection arcs, information-security layer; DOM labels projected each frame |
| `CityCanvas.tsx` | light, day/night, camera flights (GSAP), keyboard control |

Measured on the development machine: ~165 draw calls, ~290k triangles, 60 fps. "Reduced performance mode" removes
shadows and clouds and thins the crowd; with animation off the canvas renders on demand only. Without WebGL, or
below 760 px, the city is replaced by the 2D plan (`ui/MiniMap.tsx`) and all content stays available.

## Not built

- Rapier and Lenis (listed in the brief) are not used: nothing needed physics or scroll hijacking.
- 3D assets are procedural; no GLB files.
- Room-level interiors are schematic (one prop per anchor); people are stylised pegs.
- Mobile shows the 2D plan rather than a simplified 3D city.
- Semantic search is tag-based (FlexSearch + editorial tags), not embedding-based.
