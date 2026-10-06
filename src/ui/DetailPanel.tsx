import { useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Link2, MapPin, Network, X, Lightbulb, ClipboardCheck, Info } from 'lucide-react'
import type { RegItem } from '../data/schema'
import { AMENDMENTS, DATA, EXPORT_REVISION, ITEMS, TYPE_LONG, amcOf, fmtDate, gmOf, itemUrl, pointOf, rootPoint, statusOf, topParas, withParts } from '../data/dataset'
import { runsText } from '../data/schema'
import { EDITORIAL } from '../content/editorial'
import { externalRefsOf, placesOf, relatedOf, scenariosFor, itemsAt } from '../graph/graph'
import { resolvePlace } from '../content/city'
import { useApp, type Tab } from '../store/app'
import { getBookmarks, toggleBookmark } from '../store/db'
import { go, goHome, goItem, goPlace, showInCity } from '../nav'
import { PlainBlocks, RegText } from './RegText'
import { PlaceTrail, Section, StatusChip, TypeBadge } from './bits'
import { CatIcon } from './icons'

function SourceLine({ item }: { item: RegItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="source">
      <button className="source-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="source-k">Source</span>{item.source.document || 'not stated'}{item.amendments && <em className="source-amd">{item.deleted ? 'deleted' : 'amended'} by {[...new Set(item.amendments.map((x) => AMENDMENTS[x.by].short))].join(', ')}</em>}<ChevronDown size={13} className={open ? 'flip' : ''} aria-hidden />
      </button>
      {open && (
        <dl className="source-dl">
          <dt>Type</dt><dd>{TYPE_LONG[item.type]}{item.family ? ` · ${item.family}` : ''}</dd>
          <dt>{item.type === 'AMC' || item.type === 'GM' || item.type === 'AMC_APPENDIX' ? 'Decision' : 'Regulation'}</dt><dd>{item.source.document || '—'}</dd>
          {item.amendments?.map((x) => <span key={x.by} style={{ display: 'contents' }}><dt>{item.deleted === x.by ? 'Deleted by' : 'Amended by'}</dt><dd>{AMENDMENTS[x.by].short}, applicable from {fmtDate(AMENDMENTS[x.by].applicableFrom)}</dd></span>)}
          <dt>Entry into force</dt><dd>{fmtDate(item.entryIntoForceDate)}</dd>
          <dt>Applicability</dt><dd>{fmtDate(item.applicabilityDate)}{statusOf(item) === 'future' ? ' — not yet applicable' : ''}</dd>
          <dt>Publication</dt><dd>{DATA.meta.sourceTitle}, EASA eRules export published {fmtDate(DATA.meta.publishedAt.slice(0, 10))}</dd>
          <dt>eRules ID</dt><dd className="mono">{item.source.eRulesId}</dd>
        </dl>
      )}
    </div>
  )
}

/** Says, next to the text itself, that a later act changed it — and keeps the earlier wording one click away. */
function AmendmentNote({ item }: { item: RegItem }) {
  if (!item.amendments?.length) return null
  return (
    <div className={`amd${item.deleted ? ' amd-del' : ''}`} role="note">
      {item.amendments.map((x) => {
        const a = AMENDMENTS[x.by]
        return (
          <p key={x.by}>
            <b>{item.deleted === x.by ? 'Deleted' : 'Amended'} by {a.short}</b>{a.issue ? ` (${a.issue})` : ''} — applicable from {fmtDate(a.applicableFrom)}.{' '}
            {x.instruction ? <>The act reads: <q>{x.instruction.replace(/:$/, '')}</q>.</> : x.presentation}{' '}
            <a href={a.url} target="_blank" rel="noreferrer">Official source <ExternalLink size={11} aria-hidden /></a>
          </p>
        )
      })}
      <p className="amd-how">
        {item.deleted ? 'This item no longer exists in the applicable text.' : 'The passages changed are marked with a green bar.'} EASA has not yet re-published its Easy Access Rules with {item.amendments.length > 1 ? 'these acts' : 'this act'}, so the change was applied here from the act’s own text and checked against it.
      </p>
      {item.previous && item.previous.length > 0 && (
        <details>
          <summary>Text before the amendment — Easy Access Rules, {EXPORT_REVISION}</summary>
          <PlainBlocks blocks={item.previous} />
        </details>
      )}
    </div>
  )
}

function OfficialText({ point, path }: { point: RegItem; path: string }) {
  const parts = withParts(point)
  const linked = point.references.map((r) => r.target && ITEMS[r.target]).filter((t): t is RegItem => !!t && t.section === 'LINKED' && t.type === 'APPENDIX')
  return (
    <div className="official">
      <div className="official-tag"><span>Official text</span><span className="official-src">verbatim · EASA Easy Access Rules</span></div>
      {parts.map((p) => (
        <div key={p.id} className={p.id !== point.id ? 'official-part' : undefined}>
          {p.id !== point.id && (
            <header className="part-h">
              <a href={itemUrl(p.id)} onClick={(e) => { e.preventDefault(); goItem(p.id) }}>{p.reference}</a>
              <span>{p.title}</span>
              {p.source.document !== point.source.document && <em>{p.source.document}</em>}
            </header>
          )}
          <AmendmentNote item={p} />
          <RegText item={p} active={path.startsWith(p.id.slice(point.id.length)) || p.id === point.id ? path : undefined} />
        </div>
      ))}
      {linked.map((l) => (
        <div key={l.id} className="official-linked">
          <header className="part-h"><a href={itemUrl(l.id)} onClick={(e) => { e.preventDefault(); goItem(l.id) }}>{l.reference}</a><span>{l.title}</span><em>{l.source.document}</em></header>
          <p className="linked-note"><Info size={13} aria-hidden /> Official text of {l.family}, shown because this appendix refers to it.</p>
          <RegText item={l} />
        </div>
      ))}
    </div>
  )
}

function SubItem({ item, open, onToggle }: { item: RegItem; open: boolean; onToggle: () => void }) {
  return (
    <article className={`sub sub-${item.type.toLowerCase()}${open ? ' open' : ''}`} id={'sub-' + item.id}>
      <button className="sub-h" onClick={onToggle} aria-expanded={open}>
        <TypeBadge type={item.type} small />
        <span className="sub-ref">{item.reference}</span>
        <span className="sub-title">{item.title}</span>
        {item.amendments && <span className={item.deleted ? 'toc-del' : 'toc-amd'}>{item.deleted ? 'deleted' : 'amended'}</span>}
        <ChevronDown size={15} className={open ? 'flip' : ''} aria-hidden />
      </button>
      {open && (
        <div className="sub-body">
          <div className="sub-meta"><SourceLine item={item} /><StatusChip item={item} /></div>
          <div className="official"><div className="official-tag"><span>Official text</span><span className="official-src">{TYPE_LONG[item.type]} · verbatim</span></div><AmendmentNote item={item} /><RegText item={item} /></div>
        </div>
      )}
    </article>
  )
}

function SubList({ items, selectedId, kind }: { items: RegItem[]; selectedId: string; kind: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  useEffect(() => {
    setOpen(new Set(items.some((i) => i.id === selectedId) ? [selectedId] : items.length === 1 ? [items[0].id] : []))
    const el = document.getElementById('sub-' + selectedId)
    el?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, items.map((i) => i.id).join()])
  if (!items.length) return <p className="empty">No {kind} is published for this point in the current dataset.</p>
  const toggle = (id: string) => {
    const n = new Set(open)
    if (n.has(id)) n.delete(id)
    else { n.add(id); go(itemUrl(id), true) }
    setOpen(n)
  }
  return (
    <div className="sublist">
      <div className="sublist-tools"><span>{items.length} {kind}</span><button onClick={() => setOpen(open.size ? new Set() : new Set(items.map((i) => i.id)))}>{open.size ? 'Collapse all' : 'Expand all'}</button></div>
      {items.map((i) => <SubItem key={i.id} item={i} open={open.has(i.id)} onToggle={() => toggle(i.id)} />)}
    </div>
  )
}

function AuditorView({ point }: { point: RegItem }) {
  const ed = EDITORIAL[point.id]
  const paras = topParas(point)
  const amc = amcOf(point).filter((a) => !a.deleted)
  const gm = gmOf(point).filter((a) => !a.deleted)
  const scen = scenariosFor(point.id)
  return (
    <div className="auditor">
      <p className="auditor-q">What would you look for?</p>
      {paras.length > 0 && (
        <div className="aud-group aud-ir">
          <h4><span className="dot" />Explicit requirement <em>implementing rule</em></h4>
          <ul>{paras.slice(0, 14).map(({ owner, block }) => {
            const text = runsText(block.runs)
            return <li key={owner.id + block.path}><a href={itemUrl(rootPoint(owner.id).id, block.path)} onClick={(e) => { e.preventDefault(); goItem(rootPoint(owner.id).id, block.path) }}>{block.path}</a> {text.length > 150 ? text.slice(0, 150).trimEnd() + '…' : text}</li>
          })}</ul>
        </div>
      )}
      {amc.length > 0 && (
        <div className="aud-group aud-amc">
          <h4><span className="dot" />AMC expectation <em>one acceptable way to comply</em></h4>
          <ul>{amc.map((a) => <li key={a.id}><a href={itemUrl(a.id)} onClick={(e) => { e.preventDefault(); goItem(a.id) }}>{a.reference}</a> {a.title}</li>)}</ul>
        </div>
      )}
      {gm.length > 0 && (
        <div className="aud-group aud-gm">
          <h4><span className="dot" />GM guidance <em>explanatory, non-binding</em></h4>
          <ul>{gm.map((a) => <li key={a.id}><a href={itemUrl(a.id)} onClick={(e) => { e.preventDefault(); goItem(a.id) }}>{a.reference}</a> {a.title}</li>)}</ul>
        </div>
      )}
      {ed?.audit && (
        <div className="aud-group aud-practical">
          <h4><span className="dot" />Practical audit consideration <em>editorial — not a requirement</em></h4>
          <ul>{ed.audit.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      {scen.length > 0 && <p className="aud-scen">Practise: {scen.map((s) => <button key={s.id} onClick={() => go('/audit/' + s.id)}>{s.title}</button>)}</p>}
    </div>
  )
}

export function DetailPanel({ variant = 'panel' }: { variant?: 'panel' | 'page' }) {
  const { selectedId, selectedPath, tab, set, connections, mode } = useApp()
  const [marked, setMarked] = useState(false)
  const [audOpen, setAudOpen] = useState(false)
  useEffect(() => { void getBookmarks().then((b) => setMarked(b.some((x) => x.id === selectedId))) }, [selectedId])
  if (!selectedId || !ITEMS[selectedId]) return null
  const item = ITEMS[selectedId]
  const point = pointOf(selectedId)
  const amc = amcOf(point)
  const gm = gmOf(point)
  const ed = EDITORIAL[point.id] ?? (point.parent ? undefined : undefined)
  const places = placesOf(item.type === 'IR' ? point.id : item.id, item.type === 'IR' ? selectedPath : '')
  const related = relatedOf(point.id)
  const ext = externalRefsOf(point.id)
  const root = rootPoint(point.id)
  const setTab = (t: Tab) => { set({ tab: t }); if (t === 'IR' && item.id !== point.id) go(itemUrl(point.id), true) }

  return (
    <aside className={`detail detail-${variant}`} aria-label={`${point.reference} ${point.title}`}>
      <header className="detail-h">
        <div className="detail-top">
          <span className="detail-sec">{point.section === 'A' ? 'Section A · Organisation' : point.section === 'B' ? 'Section B · Competent authority' : point.section === 'LINKED' ? `Linked · ${point.family}` : point.section === 'GENERAL' ? 'General' : 'Appendices'}</span>
          <div className="detail-actions">
            <button title="Copy link" aria-label="Copy link" onClick={() => void navigator.clipboard?.writeText(location.origin + itemUrl(item.id, selectedPath))}><Link2 size={15} /></button>
            <button title={marked ? 'Remove bookmark' : 'Bookmark'} aria-label="Bookmark" aria-pressed={marked} onClick={() => void toggleBookmark(selectedId).then(() => setMarked(!marked))}>{marked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}</button>
            {variant === 'panel' && <button title="Close" aria-label="Close panel" onClick={goHome}><X size={16} /></button>}
          </div>
        </div>
        <h1><span className="detail-ref">{point.reference}{point.id === selectedId && selectedPath ? <b>{selectedPath}</b> : null}</span><span className="detail-title">{point.title}</span></h1>
        {root.id !== point.id && <button className="detail-up" onClick={() => goItem(root.id)}>Part of {root.reference} {root.title}</button>}
        <div className="detail-meta"><SourceLine item={point} /><StatusChip item={point} /></div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'IR'} className="tab tab-ir" onClick={() => setTab('IR')}>{point.type === 'IR' ? 'IR' : 'Text'}</button>
          <button role="tab" aria-selected={tab === 'AMC'} className="tab tab-amc" onClick={() => setTab('AMC')} disabled={!amc.length}>AMC<i>{amc.length}</i></button>
          <button role="tab" aria-selected={tab === 'GM'} className="tab tab-gm" onClick={() => setTab('GM')} disabled={!gm.length}>GM<i>{gm.length}</i></button>
        </div>
      </header>

      <div className="detail-body" key={point.id + tab}>
        {tab === 'IR' && (
          <>
            <OfficialText point={point} path={selectedPath} />
            {ed && (
              <div className="explain">
                <div className="explain-tag">Explanation <span>written for this application — not regulatory text</span></div>
                <h3>What this means</h3><p>{ed.means}</p>
                <h3>Why it matters</h3><p>{ed.why}</p>
                {ed.hook && <p className="hook"><Lightbulb size={14} aria-hidden /><span><b>Memory hook</b>{ed.hook}</span></p>}
              </div>
            )}
          </>
        )}
        {tab === 'AMC' && <SubList items={amc} selectedId={selectedId} kind="AMC" />}
        {tab === 'GM' && <SubList items={gm} selectedId={selectedId} kind="GM" />}

        <Section label="Where it lives" className="where">
          <PlaceTrail place={places.primary} tail={<span className="trail-seg trail-ref">{item.type === 'IR' ? point.reference + selectedPath : item.reference}</span>} />
          {places.also.length > 0 && (
            <div className="also">
              <span>Also touches</span>
              {places.also.map((p) => { const r = resolvePlace(p); return r && <button key={p} className="place-chip" onClick={() => { set({ mode: 'explore' }); goPlace(p) }}><CatIcon cat={r.district.category} size={12} />{r.room ? r.room.name : r.district.short}</button> })}
            </div>
          )}
          {places.primary && (
            <div className="where-actions">
              <button className="btn btn-primary" onClick={() => showInCity(item.type === 'IR' ? point.id : item.id, selectedPath)}><MapPin size={14} />{mode === 'explore' ? 'Show me' : 'Show in city'}</button>
              <button className={`btn${connections ? ' btn-on' : ''}`} aria-pressed={connections} onClick={() => set({ connections: !connections, mode: 'explore', infosec: false })}><Network size={14} />{connections ? 'Hide connections' : 'Show connections'}</button>
            </div>
          )}
        </Section>

        {(related.length > 0 || ext.length > 0) && (
          <Section label="Related">
            {related.length > 0 && (
              <ul className="related">
                {related.slice(0, 14).map(({ item: r, why }) => (
                  <li key={r.id}><a href={itemUrl(r.id)} onClick={(e) => { e.preventDefault(); goItem(r.id) }}><TypeBadge type={r.type} small /><span className="rel-ref">{r.reference}</span><span className="rel-title">{r.title}</span><span className="rel-why">{why}</span></a></li>
                ))}
              </ul>
            )}
            {ext.length > 0 && (
              <div className="external">
                <h4>External reference <span>outside Part-145 — not reproduced here</span></h4>
                {ext.map((e) => <div key={e.family} className="ext-row"><span className="ext-fam"><ExternalLink size={12} aria-hidden />{e.family}</span><span className="ext-labels">{e.labels.join(' · ')}</span></div>)}
              </div>
            )}
          </Section>
        )}

        {point.type === 'IR' && (
          <section className="sec">
            <button className="sec-toggle" onClick={() => setAudOpen(!audOpen)} aria-expanded={audOpen}><ClipboardCheck size={15} aria-hidden /><h3>Auditor view</h3><ChevronDown size={15} className={audOpen ? 'flip' : ''} aria-hidden /></button>
            {audOpen && <AuditorView point={point} />}
          </section>
        )}
        <p className="disclaimer">Always verify the applicable current official regulatory text before making compliance decisions. This application is a learning and reference tool, not an authority.</p>
      </div>
    </aside>
  )
}

/** Panel shown when a place — not a requirement — is selected. */
export function PlacePanel() {
  const focus = useApp((s) => s.focus)
  const r = focus ? resolvePlace(focus) : null
  if (!r) return null
  const here = itemsAt(focus!, { primaryOnly: true }).filter((i) => i.type === 'IR' || i.type === 'APPENDIX' || i.type === 'AMC_APPENDIX')
  const also = itemsAt(focus!).filter((i) => (i.type === 'IR' || i.type === 'APPENDIX') && !here.includes(i))
  const amcgm = itemsAt(focus!, { primaryOnly: true }).filter((i) => i.type === 'AMC' || i.type === 'GM')
  const row = (i: RegItem) => (
    <li key={i.id}><a href={itemUrl(i.id)} onClick={(e) => { e.preventDefault(); goItem(i.id) }}><TypeBadge type={i.type} small /><span className="rel-ref">{i.reference}</span><span className="rel-title">{i.title}</span></a></li>
  )
  return (
    <aside className="detail detail-panel place-panel" aria-label={r.district.name}>
      <header className="detail-h">
        <div className="detail-top">
          <span className="detail-sec">{r.district.external ? 'Outside the organisation' : `District ${r.district.n}`} · {r.district.category}</span>
          <div className="detail-actions"><button title="Close" aria-label="Close panel" onClick={goHome}><X size={16} /></button></div>
        </div>
        <h1><span className="detail-title place-title"><CatIcon cat={r.district.category} size={20} />{r.room ? r.room.name : r.district.name}</span></h1>
        {r.room && <button className="detail-up" onClick={() => goPlace(r.district.id)}>In {r.district.name}</button>}
        <p className="place-blurb">{r.district.blurb}</p>
      </header>
      <div className="detail-body">
        {!r.room && (
          <Section label="Rooms" note="sub-domains">
            <div className="rooms">{r.district.rooms.map((room) => (
              <button key={room.id} className="room-card" onClick={() => goPlace(`${r.district.id}/${room.id}`)}>
                <b>{room.name}</b><span>{room.anchors.map((a) => a.name).join(' · ')}</span>
              </button>
            ))}</div>
          </Section>
        )}
        {r.room && <Section label="In this room" note="roles and objects"><ul className="anchors">{r.room.anchors.map((a) => <li key={a.id}><i className={a.type} />{a.name}<em>{a.type}</em></li>)}</ul></Section>}
        <Section label="Lives here" note={`${here.length} point${here.length === 1 ? '' : 's'}`}>
          {here.length ? <ul className="related">{here.map(row)}</ul> : <p className="empty">No point has its primary location here.</p>}
        </Section>
        {also.length > 0 && <Section label="Also touches this place"><ul className="related">{also.map(row)}</ul></Section>}
        {amcgm.length > 0 && <Section label="AMC & GM anchored here" note={String(amcgm.length)}><ul className="related">{amcgm.slice(0, 40).map(row)}</ul></Section>}
        <p className="disclaimer">Locations are a learning aid created for this application. They are not part of the regulation.</p>
      </div>
    </aside>
  )
}
