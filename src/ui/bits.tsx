import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { RegItem } from '../data/schema'
import { fmtDate, statusOf } from '../data/dataset'
import { resolvePlace, type Place } from '../content/city'
import { CatIcon } from './icons'
import { goPlace } from '../nav'

export function TypeBadge({ type, small }: { type: RegItem['type'] | 'DEF' | 'PLACE'; small?: boolean }) {
  const label = type === 'APPENDIX' ? 'APP' : type === 'AMC_APPENDIX' ? 'APP·AMC' : type
  return <span className={`badge badge-${type.toLowerCase()}${small ? ' badge-s' : ''}`}>{label}</span>
}

export function StatusChip({ item }: { item: RegItem }) {
  const st = statusOf(item)
  if (st === 'future') return <span className="chip chip-future" title="This text is not yet applicable">Not yet applicable · from {fmtDate(item.applicabilityDate)}</span>
  if (st === 'unstated') return <span className="chip chip-muted" title="The source export does not state an applicability date for this item">Applicability date not stated in source</span>
  return <span className="chip chip-ok">Applicable since {fmtDate(item.applicabilityDate)}</span>
}

/** PART-145 → district → room → anchor trail. */
export function PlaceTrail({ place, tail, compact }: { place: Place | null; tail?: ReactNode; compact?: boolean }) {
  const r = place ? resolvePlace(place) : null
  if (!r) return <span className="trail trail-pending">Spatial mapping pending</span>
  const d = r.district.id
  return (
    <nav className={`trail${compact ? ' trail-compact' : ''}`} aria-label="Location">
      <button className="trail-seg" onClick={() => goPlace(d)}><CatIcon cat={r.district.category} size={13} />{r.district.name}</button>
      {r.room && <><ChevronRight size={12} aria-hidden /><button className="trail-seg" onClick={() => goPlace(`${d}/${r.room!.id}`)}>{r.room.name}</button></>}
      {r.anchor && !compact && <><ChevronRight size={12} aria-hidden /><span className="trail-seg trail-anchor">{r.anchor.name}</span></>}
      {tail && <><ChevronRight size={12} aria-hidden />{tail}</>}
    </nav>
  )
}

export const Section = ({ label, note, children, className = '' }: { label: string; note?: string; children: ReactNode; className?: string }) => (
  <section className={`sec ${className}`}>
    <header className="sec-h"><h3>{label}</h3>{note && <span className="sec-note">{note}</span>}</header>
    {children}
  </section>
)
