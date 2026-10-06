import { useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { DATA, ITEMS } from '../data/dataset'
import { blocksText } from '../data/schema'
import { DEFINITION_PLACES } from '../content/processes'
import { goHome, goItem, goPlace } from '../nav'
import { useApp } from '../store/app'
import { PlainBlocks } from './RegText'
import { PlaceTrail } from './bits'

export function Glossary() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const target = decodeURIComponent(path.split('/')[2] ?? '')
  const [q, setQ] = useState(target)
  const set = useApp((s) => s.set)
  const src = DATA.definitions[0] && ITEMS[DATA.definitions[0].source]
  const list = DATA.definitions.filter((d) => !q.trim() || (d.term + ' ' + blocksText(d.blocks)).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="overlay overlay-solid">
      <div className="glossary" role="dialog" aria-modal="true" aria-label="Definitions">
        <button className="x" aria-label="Close" onClick={goHome}><X size={18} /></button>
        <p className="eyebrow">Definitions</p>
        <h2>Glossary</h2>
        {src && <p className="lead">The {DATA.definitions.length} terms defined in <button className="linkish" onClick={() => goItem(src.id)}>{src.reference}</button> ({src.source.document}). Definitions are official GM text, shown verbatim.</p>}
        <div className="toc-search gloss-search"><Search size={14} aria-hidden /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter terms…" aria-label="Filter terms" /></div>
        <dl className="gloss-list">
          {list.map((d) => {
            const place = DEFINITION_PLACES[d.term] ?? 'documents/glossary/glossary-lectern'
            return (
              <div key={d.term} className="gloss-row">
                <dt>{d.term}</dt>
                <dd>
                  <PlainBlocks blocks={d.blocks} />
                  <div className="gloss-loc"><PlaceTrail place={place} compact /><button className="linkish" onClick={() => { set({ mode: 'explore' }); goPlace(place) }}><MapPin size={12} />Show</button></div>
                </dd>
              </div>
            )
          })}
          {!list.length && <p className="empty">No defined term matches.</p>}
        </dl>
      </div>
    </div>
  )
}
