import { useEffect, useState } from 'react'
import { ArrowRight, MapPin, X } from 'lucide-react'
import { search, type SearchHit } from '../search/client'
import { ITEMS, itemUrl, pointOf } from '../data/dataset'
import { EDITORIAL } from '../content/editorial'
import { placesOf, relatedOf } from '../graph/graph'
import { goHome, goItem, showInCity } from '../nav'
import { PlaceTrail, TypeBadge } from './bits'
import { MiniMap } from './MiniMap'

const EXAMPLES = ['maintenance data', 'tool calibration', 'shift handover', 'unsalvageable parts', 'certification authorisation', 'root cause', 'subcontractor', 'man-hour plan', 'records retention', 'occurrence reporting']

export function FindMode() {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [pick, setPick] = useState(0)
  useEffect(() => {
    let live = true
    if (!q.trim()) { setHits([]); return }
    void search(q, 12).then((h) => { if (live) { setHits(h.filter((x) => x.kind === 'item')); setPick(0) } })
    return () => { live = false }
  }, [q])
  const hit = hits[pick]
  const item = hit ? ITEMS[hit.id] : null
  const point = item ? pointOf(item.id) : null
  const ed = point ? EDITORIAL[point.id] ?? (point.parent ? EDITORIAL[point.parent] : undefined) : undefined
  const places = item ? placesOf(item.id) : null
  const related = point ? relatedOf(point.id).slice(0, 6) : []
  return (
    <div className="overlay overlay-solid">
      <div className="find" role="dialog" aria-modal="true" aria-label="Find a requirement">
        <button className="x" aria-label="Close" onClick={goHome}><X size={18} /></button>
        <p className="eyebrow">Find a requirement</p>
        <input className="find-in" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a concept — “maintenance data”, “tool calibration”…" aria-label="Concept" onKeyDown={(e) => { if (e.key === 'Enter' && item) { goItem(item.id); showInCity(item.id) } if (e.key === 'Escape') goHome() }} />
        {!q.trim() && <div className="cmdk-chips find-ex">{EXAMPLES.map((s) => <button key={s} onClick={() => setQ(s)}>{s}</button>)}</div>}
        {q.trim() && !item && <p className="empty">Nothing in the Part-145 dataset matches that concept.</p>}
        {item && point && places && (
          <div className="find-grid">
            <div className="find-answer">
              <div className="find-q"><span>Where?</span><div><PlaceTrail place={places.primary} /></div></div>
              <div className="find-q"><span>What?</span><div><b className="find-ref"><TypeBadge type={item.type} small /> {item.reference}</b> {item.title}<p className="find-ctx">“{hit.context}”</p></div></div>
              <div className="find-q"><span>Why?</span><div>{ed ? <><p>{ed.why}</p><em className="find-note">Explanation — not regulatory text</em></> : <p className="empty">No explanation written for this item yet.</p>}</div></div>
              <div className="find-q"><span>Related?</span><div className="find-rel">{related.length ? related.map((r) => <a key={r.item.id} href={itemUrl(r.item.id)} onClick={(e) => { e.preventDefault(); goItem(r.item.id) }}>{r.item.reference}</a>) : '—'}</div></div>
              <div className="find-actions">
                <button className="btn btn-primary btn-lg" disabled={!places.primary} onClick={() => { goItem(item.id); showInCity(item.id) }}><MapPin size={15} />Show me</button>
                <button className="btn btn-lg" onClick={() => goItem(item.id)}>Read the text<ArrowRight size={15} /></button>
              </div>
            </div>
            <div className="find-side">
              <MiniMap highlight={places.primary ? [places.primary, ...places.also] : []} primary={places.primary} />
              {hits.length > 1 && (<><h4>Other matches</h4><ul className="find-others">{hits.map((h, i) => i !== pick && <li key={h.id}><button onClick={() => setPick(i)}><TypeBadge type={h.type as never} small /><b>{h.reference}</b><span>{h.title}</span></button></li>)}</ul></>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
