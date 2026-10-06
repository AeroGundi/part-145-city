import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft, MapPin, Search } from 'lucide-react'
import { search, type SearchHit } from '../search/client'
import { useApp } from '../store/app'
import { go, goItem, goPlace, showInCity } from '../nav'
import { getRecents } from '../store/db'
import { ITEMS } from '../data/dataset'
import { placesOf } from '../graph/graph'
import { TypeBadge } from './bits'
import { placeLabel } from '../search/client'

const SUGGEST = ['maintenance data', 'certifying staff', 'occurrence reporting', 'stores', 'Form 1', 'information security', 'competence', 'contracted maintenance', 'airworthiness review staff', '145.A.35']

export function openHit(h: SearchHit, fly = false) {
  if (h.kind === 'item') { goItem(h.id); if (fly) showInCity(h.id) }
  else if (h.kind === 'place') { useApp.getState().set({ mode: 'explore' }); goPlace(h.id.slice(6)) }
  else go('/glossary/' + encodeURIComponent(h.reference))
}

export function Highlight({ text, q }: { text: string; q: string }) {
  const terms = q.trim().split(/\s+/).filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!terms.length) return <>{text}</>
  const parts = text.split(new RegExp(`(${terms.join('|')})`, 'ig'))
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>
}

export function CommandK() {
  const set = useApp((s) => s.set)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [sel, setSel] = useState(0)
  const [recents, setRecents] = useState<string[]>([])
  const [ms, setMs] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const close = () => set({ overlay: null })

  useEffect(() => { void getRecents().then((r) => setRecents(r.map((x) => x.id).filter((id) => ITEMS[id]))) }, [])
  useEffect(() => {
    let live = true
    const t0 = performance.now()
    if (!q.trim()) { setHits([]); setMs(null); return }
    void search(q, 40).then((h) => { if (live) { setHits(h); setSel(0); setMs(performance.now() - t0) } })
    return () => { live = false }
  }, [q])
  useEffect(() => { listRef.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' }) }, [sel])

  const choose = (h: SearchHit, fly = false) => { close(); openHit(h, fly) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); choose(hits[sel], e.metaKey || e.ctrlKey || e.shiftKey) }
    else if (e.key === 'Escape') close()
  }
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search Part-145">
        <div className="cmdk-in">
          <Search size={18} aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search reference, title, official text, AMC, GM, definitions…" aria-label="Search" role="combobox" aria-expanded aria-controls="cmdk-list" aria-activedescendant={hits[sel] ? 'hit-' + sel : undefined} />
          <kbd>esc</kbd>
        </div>
        {!q.trim() ? (
          <div className="cmdk-empty">
            {recents.length > 0 && (<><h4>Recently opened</h4><div className="cmdk-chips">{recents.map((id) => <button key={id} onClick={() => { close(); goItem(id) }}><b>{ITEMS[id].reference}</b> {ITEMS[id].title}</button>)}</div></>)}
            <h4>Try</h4>
            <div className="cmdk-chips">{SUGGEST.map((s) => <button key={s} onClick={() => setQ(s)}>{s}</button>)}</div>
          </div>
        ) : (
          <ul className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
            {hits.map((h, i) => (
              <li key={h.id} id={'hit-' + i} role="option" aria-selected={i === sel} className={i === sel ? 'sel' : ''} onMouseMove={() => sel !== i && setSel(i)} onClick={() => choose(h)}>
                <TypeBadge type={h.type as never} small />
                <div className="hit-main">
                  <div className="hit-top"><span className="hit-ref"><Highlight text={h.reference} q={q} /></span><span className="hit-title"><Highlight text={h.title} q={q} /></span></div>
                  <div className="hit-ctx"><Highlight text={h.context} q={q} /></div>
                </div>
                <div className="hit-loc"><MapPin size={11} aria-hidden />{h.kind === 'item' ? placeLabel(placesOf(h.id).primary) : h.location}</div>
              </li>
            ))}
            {!hits.length && <li className="cmdk-none">No match in the Part-145 dataset.</li>}
          </ul>
        )}
        <footer className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd><CornerDownLeft size={10} /></kbd> open</span><span><kbd>⇧</kbd><kbd><CornerDownLeft size={10} /></kbd> open and fly to location</span>
          {ms !== null && <span className="cmdk-ms">{hits.length} results · {ms.toFixed(0)} ms</span>}
        </footer>
      </div>
    </div>
  )
}
