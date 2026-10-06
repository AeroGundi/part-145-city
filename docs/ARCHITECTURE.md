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

Current dataset: revision **September 2025** (published 2 September 2025) — 74 rule topics (46 points), 122 AMC,
69 GM, 4 appendices + 3 appendices to AMC, 25 definitions; 273/273 topics pass the integrity check.

### Known regulatory gaps (checked 6 October 2026)

Recorded in `src/content/currency.ts` and shown in the app's dataset dialog and badge.

- **Regulation (EU) 2025/111** amends Part-145 and applies from 13 February 2026. EASA states it is not in the
  September 2025 Easy Access Rules. Which points it changes was not verified here.
- **AMC & GM to Part-145, Issue 2, Amendments 8 and 9** (the latter by ED Decision 2026/005/R) are not in the dataset,
  which ends at Amendment 7.
- EUR-Lex consolidated text was **not** ingested: only the EASA XML was available as machine-readable source.
- `Appendix I to Part-66` (referred to by Appendix IV) is published as a tree of sub-topics and is left as an
  external reference.
- One source label differs between the body and the metadata of the export (AMC 145.A.47(a)); the body wins.

To close the gap: download the newer XML from EASA, run `npm run ingest -- path/to/file.xml`, run `npm test`
(new points without a location fail the "nothing pending" test — add rules in `src/content/mapping.ts`), then
delete the closed entries from `currency.ts`.

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
| `layout.ts` | paths, pedestrian network from the road model, traffic routes |
| `Life.tsx`, `aircraft.ts` | people, vehicles, aircraft, clouds — closed-form functions of a clock and a seeded PRNG |
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
