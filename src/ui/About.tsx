import { X } from 'lucide-react'
import { DATA, EXPORT_REVISION, ITEMS, fmtDate, statusOf } from '../data/dataset'
import { useApp } from '../store/app'
import { GRAPH_STATS } from '../graph/graph'
import { LOCATION_RULES, locate } from '../content/mapping'
import { goItem } from '../nav'
import { CURRENCY_GAPS, CURRENCY_REVIEW } from '../content/currency'

export function About() {
  const set = useApp((s) => s.set)
  const c = DATA.meta.counts
  const g = GRAPH_STATS()
  const p145 = DATA.order.filter((id) => ITEMS[id].section !== 'LINKED')
  const mapped = p145.filter((id) => locate(ITEMS[id])).length
  const future = DATA.order.filter((id) => statusOf(ITEMS[id]) === 'future')
  const bySource = new Map<string, number>()
  for (const id of p145) bySource.set(ITEMS[id].source.document, (bySource.get(ITEMS[id].source.document) ?? 0) + 1)
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) set({ overlay: null }) }}>
      <div className="about" role="dialog" aria-modal="true" aria-label="Regulatory dataset">
        <button className="x" aria-label="Close" onClick={() => set({ overlay: null })}><X size={18} /></button>
        <p className="eyebrow">Regulatory dataset</p>
        <h2>{DATA.meta.sourceTitle}</h2>
        <dl className="source-dl about-dl">
          <dt>Publisher</dt><dd>European Union Aviation Safety Agency (EASA) — Easy Access Rules, machine-readable XML export</dd>
          <dt>Published</dt><dd>{fmtDate(DATA.meta.publishedAt.slice(0, 10))} <span className="mono">({DATA.meta.publishedAt})</span></dd>
          {DATA.meta.revision && <><dt>Revision</dt><dd>{DATA.meta.revision.label} — {DATA.meta.revision.changes.join(' ')}</dd></>}
          <dt>Integrity</dt><dd>{DATA.meta.integrity.exact} of {DATA.meta.integrity.checked} topics match the source export character for character (checked at ingestion){DATA.meta.integrity.failed.length ? ` — differing: ${DATA.meta.integrity.failed.join(', ')}` : ''}</dd>
          <dt>Document GUID</dt><dd className="mono">{DATA.meta.documentGuid}</dd>
          <dt>Ingested</dt><dd>{fmtDate(DATA.meta.ingestedAt.slice(0, 10))} from <span className="mono">{DATA.meta.sourceFile}</span></dd>
          <dt>Amendments</dt><dd>{DATA.meta.amendments.length ? `${DATA.meta.amendments.map((a) => a.short).join(', ')} — applied on top of the export, see below` : 'none applied'}</dd>
          <dt>Scope</dt><dd>Annex II (Part-145): {c.IR} implementing-rule topics, {c.AMC} AMC, {c.GM} GM, {c.APPENDIX + (c.AMC_APPENDIX ?? 0)} appendices, {DATA.definitions.length} definitions</dd>
          <dt>Spatial mapping</dt><dd>{mapped} of {p145.length} Part-145 items resolve to a location ({Object.keys(LOCATION_RULES).length} mapping rules){mapped < p145.length ? ' — the rest are marked “Spatial mapping pending”' : ''}</dd>
          <dt>Knowledge graph</dt><dd>{g.nodes.toLocaleString()} nodes · {g.edges.toLocaleString()} relationships</dd>
        </dl>
        {DATA.meta.amendments.length > 0 && (
          <div className="applied" role="note">
            <h3>Later amendments applied on top of the export</h3>
            <ul className="about-list">
              {DATA.meta.amendments.map((a) => (
                <li key={a.id}>
                  <b>{a.act}</b>{a.issue ? ` — ${a.issue}` : ''}. Published {fmtDate(a.published)}, applicable from {fmtDate(a.applicableFrom)}. Changes{' '}
                  {a.items.map((id, i) => <span key={id}>{i > 0 && ', '}<button className="linkish" onClick={() => { set({ overlay: null }); goItem(id) }}>{ITEMS[id].reference}</button>{ITEMS[id].deleted ? ' (deleted)' : ''}</span>)}.{' '}
                  {a.verified.exact} of {a.verified.checked} changes equal the act’s text character for character. <a href={a.url} target="_blank" rel="noreferrer">Official source</a>
                  {a.verified.notes.map((n) => <span key={n}> Note: {n}</span>)}
                </li>
              ))}
            </ul>
            <p>EASA’s {EXPORT_REVISION} Easy Access Rules do not contain these acts. Rule changes are read from the Official Journal text of the amending regulation; AMC and GM changes are checked against the change marks of EASA’s amendment document. Each amended item is flagged, and its earlier wording stays available next to it.</p>
            <p>Also reviewed on {fmtDate(CURRENCY_REVIEW.checked)}, with no change to this dataset: {CURRENCY_REVIEW.noChange.map((r) => <span key={r.act}><a href={r.url} target="_blank" rel="noreferrer">{r.act}</a> — {r.finding} </span>)}</p>
          </div>
        )}
        {CURRENCY_GAPS.length > 0 && (
          <div className="gaps" role="note">
            <h3>Not in this dataset — check before relying on it</h3>
            <ul className="about-list">
              {CURRENCY_GAPS.map((g) => <li key={g.act}><b>{g.act}</b> — {g.what} {g.status} <a href={g.url} target="_blank" rel="noreferrer">Official source</a> <span className="mono">(checked {g.checked})</span></li>)}
            </ul>
          </div>
        )}
        <h3>What is official and what is not</h3>
        <ul className="about-list">
          <li><b>Official text</b> — every rule, AMC, GM and appendix is extracted verbatim from the EASA export by a reproducible script. The only changes made to it are the later amendments listed above, taken from the amending acts themselves by the same script. Sub-headings such as “145.A.30(a) Accountable manager” are EASA’s Easy Access Rules headings, shown as published.</li>
          <li><b>Explanation, memory hooks, auditor considerations, locations and scenarios</b> — written for this application as a learning aid. They are always labelled and are not regulatory material.</li>
        </ul>
        <h3>Limitations to be aware of</h3>
        <ul className="about-list">
          <li>The dataset is the EASA publication dated above plus the later amendments listed. The list of amending acts was compared with EASA’s website on {fmtDate(CURRENCY_REVIEW.checked)}; anything adopted after that date is <b>not</b> included. The amended wording is this application’s consolidation, not EASA’s — check EUR-Lex and the EASA website before relying on it.</li>
          {CURRENCY_REVIEW.scope.map((x) => <li key={x}>{x}</li>)}
          <li>Applicability dates come from the export’s metadata. {future.length ? <>Items not yet applicable today are flagged: {future.map((id) => <button key={id} className="linkish" onClick={() => { set({ overlay: null }); goItem(id) }}>{ITEMS[id].reference}</button>)}</> : 'No item in the dataset has an applicability date in the future as of today.'}</li>
          <li>Cross-references to other annexes (Part-M, Part-ML, Part-66, Part-21, Part-IS…) are shown as external references and not reproduced, except where a Part-145 appendix consists only of such a pointer (EASA Form 1).</li>
          {DATA.meta.warnings.map((w) => <li key={w}>Ingestion note: {w}</li>)}
        </ul>
        <h3>Sources within Part-145</h3>
        <table className="about-table"><tbody>{[...bySource].sort((a, b) => b[1] - a[1]).map(([s, n]) => <tr key={s}><td>{s}</td><td>{n} items</td></tr>)}</tbody></table>
        <p className="disclaimer">Always verify the applicable current official regulatory text before making compliance decisions.</p>
      </div>
    </div>
  )
}
