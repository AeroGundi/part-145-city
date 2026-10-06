import { ChevronRight, Layers, X } from 'lucide-react'
import { CATEGORY_COLOR, CATEGORY_LABEL, DISTRICTS, resolvePlace, type Category } from '../content/city'
import { ITEMS, pointOf, DATASET_LABEL } from '../data/dataset'
import { placesOf, INFOSEC_ITEMS } from '../graph/graph'
import { useApp } from '../store/app'
import { goHome, goItem, goPlace } from '../nav'
import { CatIcon } from './icons'
import { CURRENCY_GAPS } from '../content/currency'

export function Breadcrumbs() {
  const { selectedId, selectedPath, focus, mode } = useApp()
  const item = selectedId ? ITEMS[selectedId] : null
  const place = item ? placesOf(item.type === 'IR' ? pointOf(item.id).id : item.id, selectedPath).primary : focus
  const r = place ? resolvePlace(place) : null
  const sec = item ? ({ A: 'Section A', B: 'Section B', GENERAL: 'General', APPENDICES: 'Appendices', AMC_APPENDICES: 'Appendices to AMC', LINKED: 'Linked' } as const)[item.section] : null
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <button onClick={goHome}>PART-145</button>
      {mode === 'reference' && sec && <><ChevronRight size={12} aria-hidden /><span>{sec}</span></>}
      {r && <><ChevronRight size={12} aria-hidden /><button onClick={() => goPlace(r.district.id)}>{r.district.name.toUpperCase()}</button></>}
      {r?.room && <><ChevronRight size={12} aria-hidden /><button onClick={() => goPlace(`${r.district.id}/${r.room!.id}`)}>{r.room.name.toUpperCase()}</button></>}
      {item && !r && <><ChevronRight size={12} aria-hidden /><span className="pending">SPATIAL MAPPING PENDING</span></>}
      {item && <><ChevronRight size={12} aria-hidden /><button className="crumb-ref" onClick={() => goItem(item.id)}>{item.reference}{item.type === 'IR' ? selectedPath : ''}</button></>}
    </nav>
  )
}

const LEGEND: Category[] = ['management', 'aircraft', 'maintenance', 'components', 'data', 'training', 'safety', 'compliance', 'records', 'planning', 'moe', 'authority']

export function Legend() {
  const { settings, setSettings } = useApp()
  if (!settings.legendOpen) return <button className="legend-toggle" onClick={() => setSettings({ legendOpen: true })}><Layers size={14} />Legend</button>
  return (
    <div className="legend" role="region" aria-label="Legend">
      <header><span>Legend</span><button aria-label="Close legend" onClick={() => setSettings({ legendOpen: false })}><X size={13} /></button></header>
      <ul>{LEGEND.map((c) => {
        const d = DISTRICTS.find((x) => x.category === c)
        return <li key={c}><button onClick={() => d && goPlace(d.id)}><i style={{ background: CATEGORY_COLOR[c] }}><CatIcon cat={c} size={11} /></i>{CATEGORY_LABEL[c]}</button></li>
      })}</ul>
      <p><b>Section A</b> inside the fence — the organisation.<br /><b>Section B</b> across the road — the competent authority.</p>
    </div>
  )
}

export function DatasetBadge() {
  const set = useApp((s) => s.set)
  return <button className="dataset-badge" onClick={() => set({ overlay: 'about' })} title="Regulatory dataset & sources"><span>Regulatory dataset</span>{DATASET_LABEL}{CURRENCY_GAPS.length > 0 && <em className="badge-warn">{CURRENCY_GAPS.length} later amendment{CURRENCY_GAPS.length === 1 ? '' : 's'} not included</em>}</button>
}

export function LayerBanner() {
  const { infosec, connections, selectedId, set } = useApp()
  if (infosec) return (
    <div className="layer-banner layer-infosec" role="status">
      <b>Information security layer</b><span>The digital infrastructure under the organisation — information assets, systems, interfaces, reporting and controls.</span>
      {INFOSEC_ITEMS.filter((i) => ITEMS[i]).map((i) => <button key={i} onClick={() => goItem(i)}>{ITEMS[i].reference}</button>)}
      <button className="layer-x" aria-label="Hide layer" onClick={() => set({ infosec: false })}><X size={14} /></button>
    </div>
  )
  if (connections && selectedId) return (
    <div className="layer-banner" role="status">
      <b>Connections of {pointOf(selectedId).reference}</b><span>Its own locations, and the points it refers to or shares a process with.</span>
      <button className="layer-x" aria-label="Hide connections" onClick={() => set({ connections: false })}><X size={14} /></button>
    </div>
  )
  return null
}
