import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { AMENDMENTS, DATA, ITEMS, itemUrl, pointOf, rootPoint, statusOf } from '../data/dataset'
import type { TocNode } from '../data/schema'
import { useApp } from '../store/app'
import { goItem } from '../nav'
import { placesOf } from '../graph/graph'
import { DISTRICT_BY_ID, CATEGORY_COLOR } from '../content/city'

const SHORT: Record<string, string> = { 'section:GENERAL': 'General', 'section:A': 'Section A — Organisation', 'section:B': 'Section B — Competent authority', 'section:APPENDICES': 'Appendices', 'section:AMC_APPENDICES': 'Appendices to AMC', 'section:LINKED': 'Linked from other annexes' }

function matches(n: TocNode, q: string): boolean {
  if (n.kind === 'item') { const it = ITEMS[n.id]; if ((it.reference + ' ' + it.title).toLowerCase().includes(q)) return true }
  return !!n.children?.some((c) => matches(c, q))
}

function Node({ n, depth, q, open, toggle, selected }: { n: TocNode; depth: number; q: string; open: Set<string>; toggle: (id: string) => void; selected: string | null }) {
  if (q && !matches(n, q)) return null
  const it = ITEMS[n.id]
  const isOpen = !!q || open.has(n.id)
  const kids = n.children ?? []
  const sub = kids.filter((c) => ITEMS[c.id].type === 'IR')
  const place = placesOf(n.id).primary
  const color = place ? CATEGORY_COLOR[DISTRICT_BY_ID[place.split('/')[0]].category] : 'transparent'
  return (
    <li>
      <div className={`toc-row toc-${it.type.toLowerCase()}${selected === n.id ? ' sel' : ''}`} style={{ paddingLeft: 8 + depth * 14 }}>
        {kids.length ? <button className="toc-tw" aria-label={isOpen ? 'Collapse' : 'Expand'} aria-expanded={isOpen} onClick={() => toggle(n.id)}><ChevronRight size={13} className={isOpen ? 'rot' : ''} /></button> : <span className="toc-tw" />}
        <a href={itemUrl(n.id)} onClick={(e) => { e.preventDefault(); goItem(n.id) }} aria-current={selected === n.id ? 'true' : undefined} title={`${it.reference} — ${it.title}`}>
          {depth === 0 && <i className="toc-dot" style={{ background: color }} aria-hidden />}
          <span className="toc-ref">{it.type === 'IR' || depth === 0 ? it.reference : it.reference.replace(/\s145\.[AB]\.\d+A?/, ' ')}</span>
          <span className="toc-title">{it.title}</span>
          {it.amendments && <span className={it.deleted ? 'toc-del' : 'toc-amd'} title={`${it.deleted ? 'Deleted' : 'Amended'} by ${it.amendments.map((x) => AMENDMENTS[x.by].short).join(', ')}`}>{it.deleted ? 'deleted' : 'amended'}</span>}
          {statusOf(it) === 'future' && <span className="toc-future" title="Not yet applicable">future</span>}
          {depth === 0 && !q && (it.amc.length + it.gm.length + sub.length > 0) && <span className="toc-count">{kids.length}</span>}
        </a>
      </div>
      {isOpen && kids.length > 0 && <ul>{kids.map((c) => <Node key={c.id} n={c} depth={depth + 1} q={q} open={open} toggle={toggle} selected={selected} />)}</ul>}
    </li>
  )
}

export function TocTree() {
  const selectedId = useApp((s) => s.selectedId)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set(['section:A', 'section:GENERAL']))
  const ref = useRef<HTMLDivElement>(null)
  const query = q.trim().toLowerCase()
  // reveal the selected item
  useEffect(() => {
    if (!selectedId || !ITEMS[selectedId]) return
    const chain = new Set(open)
    chain.add('section:' + ITEMS[selectedId].section)
    const p = pointOf(selectedId)
    if (p.id !== selectedId) chain.add(p.id)
    chain.add(rootPoint(selectedId).id)
    setOpen(chain)
    requestAnimationFrame(() => ref.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n })
  const total = useMemo(() => DATA.order.length, [])
  return (
    <nav className="toc" aria-label="Part-145 table of contents">
      <div className="toc-search">
        <Search size={14} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter the tree…" aria-label="Filter table of contents" />
      </div>
      <div className="toc-scroll" ref={ref}>
        <div className="toc-root">PART-145 <span>{total} items</span></div>
        {DATA.toc.map((s) => {
          if (query && !matches(s, query)) return null
          const isOpen = !!query || open.has(s.id)
          return (
            <div key={s.id} className="toc-section">
              <button className="toc-sec" onClick={() => toggle(s.id)} aria-expanded={isOpen} title={s.label}><ChevronRight size={13} className={isOpen ? 'rot' : ''} />{SHORT[s.id] ?? s.label}<span>{s.children?.length}</span></button>
              {isOpen && <ul>{s.children?.map((c) => <Node key={c.id} n={c} depth={0} q={query} open={open} toggle={toggle} selected={selectedId} />)}</ul>}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
