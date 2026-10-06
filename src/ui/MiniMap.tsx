/**
 * 2D plan of the city. Used as the spatial reference in Reference mode, in Find and
 * Audit, on small screens, and as the complete fallback when WebGL is unavailable.
 */
import { DISTRICTS, CATEGORY_COLOR, PERIMETER, ROADS, RUNWAY, TAXIWAY, WORLD, placePosition, roomRects, type Place } from '../content/city'
import { useApp } from '../store/app'
import { goPlace } from '../nav'

export function MiniMap({ highlight, primary, interactive = true, large = false, links = [] }: { highlight: Place[]; primary: Place | null; interactive?: boolean; large?: boolean; links?: { from: Place; to: Place }[] }) {
  const set = useApp((s) => s.set)
  const hi = new Set(highlight.map((p) => p.split('/')[0]))
  const prim = primary?.split('/')[0]
  const W = WORLD.maxX - WORLD.minX
  const H = WORLD.maxZ - WORLD.minZ
  // the 3D default view looks from the north; flip so the apron is at the bottom like in the city
  const fx = (x: number) => WORLD.maxX - x
  const fz = (z: number) => WORLD.maxZ - z
  const pp = primary ? placePosition(primary) : null
  return (
    <svg className={`minimap${large ? ' minimap-lg' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={primary ? `Map: located in ${DISTRICTS.find((d) => d.id === prim)?.name}` : 'Map of Part-145 City'}>
      <rect x="0" y="0" width={W} height={H} rx="4" className="mm-ground" />
      <rect x={fx(PERIMETER.maxX)} y={fz(PERIMETER.maxZ)} width={PERIMETER.maxX - PERIMETER.minX} height={PERIMETER.maxZ - PERIMETER.minZ} className="mm-perimeter" rx="2" />
      {[RUNWAY, TAXIWAY].map((r, i) => <rect key={i} x={fx(r.x1)} y={fz(r.z + r.w / 2)} width={r.x1 - r.x0} height={r.w} className={i ? 'mm-road' : 'mm-runway'} rx="1" />)}
      {ROADS.map((r) => {
        const x0 = Math.min(r.a[0], r.b[0]), x1 = Math.max(r.a[0], r.b[0]), z0 = Math.min(r.a[1], r.b[1]), z1 = Math.max(r.a[1], r.b[1])
        const h = x1 > x0
        return <rect key={r.id} className="mm-road" x={fx(x1) - (h ? 0 : r.w / 2)} y={fz(z1) - (h ? r.w / 2 : 0)} width={h ? x1 - x0 : r.w} height={h ? r.w : z1 - z0} />
      })}
      {DISTRICTS.map((d) => {
        const [x, z] = d.pos
        const [w, dp] = d.size
        const on = hi.has(d.id)
        return (
          <g key={d.id} className={`mm-d${on ? ' on' : ''}${d.id === prim ? ' prim' : ''}${d.kind === 'apron' ? ' apron' : ''}`} onClick={interactive ? () => { set({ mode: 'explore' }); goPlace(d.id) } : undefined} tabIndex={interactive ? 0 : undefined} role={interactive ? 'button' : undefined} aria-label={d.name}
            onKeyDown={(e) => { if (interactive && e.key === 'Enter') goPlace(d.id) }}>
            <title>{d.name}</title>
            <rect x={fx(x + w / 2)} y={fz(z + dp / 2)} width={w} height={dp} rx="1.2" style={{ fill: on ? CATEGORY_COLOR[d.category] : undefined }} />
            {large && d.id === prim && roomRects(d).map((r) => <rect key={r.room.id} className="mm-room" x={fx(r.x + r.w / 2)} y={fz(r.z + r.d / 2)} width={r.w} height={r.d} rx=".5" />)}
            <text x={fx(x)} y={fz(z) + (d.kind === 'apron' ? 1.5 : 1.6)} textAnchor="middle">{d.short}</text>
          </g>
        )
      })}
      {links.map((l, i) => { const a = placePosition(l.from); const b = placePosition(l.to); return <line key={i} className="mm-link" x1={fx(a[0])} y1={fz(a[1])} x2={fx(b[0])} y2={fz(b[1])} /> })}
      {pp && <g className="mm-pin" transform={`translate(${fx(pp[0])} ${fz(pp[1])})`}><circle r="5.5" className="mm-pulse" /><circle r="2.4" /></g>}
    </svg>
  )
}
