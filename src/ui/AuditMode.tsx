import { useEffect, useState } from 'react'
import { Check, ChevronLeft, MapPin, X } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { SCENARIOS } from '../content/scenarios'
import { ITEMS, resolveSlug } from '../data/dataset'
import { go, goHome, goItem, goPlace } from '../nav'
import { useApp } from '../store/app'
import { PlaceTrail, TypeBadge } from './bits'
import { MiniMap } from './MiniMap'

export function AuditMode() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const id = decodeURIComponent(path.split('/')[2] ?? '')
  const sc = SCENARIOS.find((s) => s.id === id)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [revealed, setRevealed] = useState(false)
  useEffect(() => { setChosen(new Set()); setRevealed(false) }, [id])
  const set = useApp((s) => s.set)

  if (!sc) {
    return (
      <div className="overlay overlay-solid">
        <div className="audit" role="dialog" aria-modal="true" aria-label="Audit mode">
          <button className="x" aria-label="Close" onClick={goHome}><X size={18} /></button>
          <p className="eyebrow">Audit mode</p>
          <h2>Practise locating and applying requirements</h2>
          <p className="lead">Each scenario is a situation in a maintenance organisation. Decide where you would look, then compare with the points of Part-145 that apply. No scores — every answer leads to the official text.</p>
          <ul className="scen-list">{SCENARIOS.map((s, i) => <li key={s.id}><button onClick={() => go('/audit/' + s.id)}><span className="scen-n">{String(i + 1).padStart(2, '0')}</span><span><b>{s.title}</b><em>{s.situation}</em></span></button></li>)}</ul>
        </div>
      </div>
    )
  }
  const toggle = (a: string) => setChosen((c) => { const n = new Set(c); n.has(a) ? n.delete(a) : n.add(a); return n })
  const relevant = sc.areas.filter((a) => a.relevant)
  return (
    <div className="overlay overlay-solid">
      <div className="audit" role="dialog" aria-modal="true" aria-label={sc.title}>
        <button className="x" aria-label="Close" onClick={goHome}><X size={18} /></button>
        <button className="back" onClick={() => go('/audit')}><ChevronLeft size={14} />All scenarios</button>
        <p className="eyebrow">Audit mode · scenario</p>
        <h2>{sc.title}</h2>
        <p className="lead">{sc.situation}</p>
        <div className="audit-grid">
          <div>
            <h3 className="audit-q">{sc.question}</h3>
            <div className="areas">
              {sc.areas.map((a) => {
                const on = chosen.has(a.id)
                return (
                  <div key={a.id} className={`area${on ? ' on' : ''}${revealed ? (a.relevant ? ' rel' : ' irrel') : ''}`}>
                    <button className="area-h" aria-pressed={on} disabled={revealed} onClick={() => toggle(a.id)}><span className="area-check">{on && <Check size={13} />}</span>{a.label}{revealed && <em>{a.relevant ? 'relevant' : 'not the first place to look'}</em>}</button>
                    {revealed && (
                      <div className="area-body">
                        <p>{a.note}</p>
                        {a.relevant && <div className="area-items">{a.items.map((ref) => { const r = resolveSlug(ref); const it = r && ITEMS[r.id]; return it && <button key={ref} onClick={() => goItem(r!.id, r!.path)}><TypeBadge type={it.type} small /><b>{it.reference}{r!.path}</b><span>{it.title}</span></button> })}</div>}
                        <div className="area-loc"><PlaceTrail place={a.place} compact /><button className="linkish" onClick={() => { set({ mode: 'explore' }); goPlace(a.place) }}><MapPin size={12} />Go there</button></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {!revealed
              ? <button className="btn btn-primary btn-lg" onClick={() => setRevealed(true)}>Reveal the relevant requirements</button>
              : <p className="audit-sum">You selected {[...chosen].filter((c) => relevant.some((r) => r.id === c)).length} of {relevant.length} relevant areas. Open any point above to read the official text. <button className="linkish" onClick={() => { setRevealed(false); setChosen(new Set()) }}>Try again</button></p>}
          </div>
          <div className="audit-side">
            <MiniMap highlight={revealed ? relevant.map((a) => a.place) : sc.areas.filter((a) => chosen.has(a.id)).map((a) => a.place)} primary={null} />
            <p className="disclaimer">Scenarios are editorial learning material. They point to requirements; they do not create any.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
