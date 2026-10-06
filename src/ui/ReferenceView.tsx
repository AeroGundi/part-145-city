import { ArrowRight } from 'lucide-react'
import { DATA, ITEMS, fmtDate, pointOf } from '../data/dataset'
import { useApp } from '../store/app'
import { connectionsOf, placesOf } from '../graph/graph'
import { goItem } from '../nav'
import { DetailPanel } from './DetailPanel'
import { MiniMap } from './MiniMap'
import { PlaceTrail } from './bits'

const START = ['145.A.30', '145.A.35', '145.A.42', '145.A.45', '145.A.48', '145.A.50', '145.A.55', '145.A.60', '145.A.65', '145.A.70', '145.A.200', '145.B.305']

/** Reference mode: the regulation is the interface; the city becomes a locator map. */
export function ReferenceView() {
  const { selectedId, selectedPath } = useApp()
  const item = selectedId ? ITEMS[selectedId] : null
  if (!item) {
    const c = DATA.meta.counts
    return (
      <main className="ref-home">
        <p className="eyebrow">Reference mode</p>
        <h1>EASA Part-145, point by point</h1>
        <p className="lead">The complete Annex II (Part-145) with its AMC and GM — {c.IR} rule topics, {c.AMC} AMC, {c.GM} GM — as published by EASA on {fmtDate(DATA.meta.publishedAt.slice(0, 10))}{DATA.meta.amendments.length ? `, with the ${DATA.meta.amendments.length} amending acts adopted since applied` : ''}. Pick a point in the tree, or press <kbd>⌘ K</kbd> to search.</p>
        <div className="ref-start">{START.filter((s) => ITEMS[s]).map((s) => <button key={s} onClick={() => goItem(s)}><b>{ITEMS[s].reference}</b><span>{ITEMS[s].title}</span><ArrowRight size={14} /></button>)}</div>
        <MiniMap highlight={[]} primary={null} large />
      </main>
    )
  }
  const pid = item.type === 'IR' ? pointOf(item.id).id : item.id
  const places = placesOf(pid, selectedPath)
  const con = connectionsOf(pid, selectedPath)
  return (
    <main className="ref-main">
      <div className="ref-text"><DetailPanel variant="page" /></div>
      <aside className="ref-side" aria-label="Location">
        <h4>Where it lives</h4>
        <MiniMap highlight={places.primary ? [places.primary, ...places.also] : []} primary={places.primary} large links={con.links} />
        <PlaceTrail place={places.primary} />
      </aside>
    </main>
  )
}
