/**
 * Movement layout: paths with rounded corners, the pedestrian network derived
 * from the shared road model, and the routes ambient traffic follows.
 * Everything is a pure function of the city model, so the world is deterministic.
 */
import { DISTRICTS, DISTRICT_BY_ID, ROADS, roomRects, type District } from '../content/city'

export type P2 = [number, number]

export interface Path { xs: Float32Array; zs: Float32Array; hs: Float32Array; n: number; len: number; step: number; closed: boolean }
export interface Pose { x: number; z: number; h: number }

const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1])

function roundCorners(pts: P2[], radius: number, closed: boolean): P2[] {
  const out: P2[] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const B = pts[i]
    if (!closed && (i === 0 || i === n - 1)) { out.push(B); continue }
    const A = pts[(i - 1 + n) % n], D = pts[(i + 1) % n]
    const ab = dist(A, B), bd = dist(B, D)
    if (ab < 1e-4 || bd < 1e-4) { out.push(B); continue }
    const r = Math.min(radius, ab / 2, bd / 2)
    const p1: P2 = [B[0] + ((A[0] - B[0]) / ab) * r, B[1] + ((A[1] - B[1]) / ab) * r]
    const p2: P2 = [B[0] + ((D[0] - B[0]) / bd) * r, B[1] + ((D[1] - B[1]) / bd) * r]
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, u = 1 - t
      out.push([u * u * p1[0] + 2 * u * t * B[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * B[1] + t * t * p2[1]])
    }
  }
  return out
}

export interface PathOpts { radius?: number; lane?: number; step?: number; closed?: boolean; taper?: number }

/** Polyline → evenly resampled path. `lane` shifts it to the right of travel (right-hand traffic, pavements). */
export function makePath(points: P2[], o: PathOpts = {}): Path {
  const closed = !!o.closed, step = o.step ?? 0.5, lane = o.lane ?? 0
  const pts = roundCorners(points.filter((p, i) => i === 0 || dist(p, points[i - 1]) > 1e-4), o.radius ?? 1.2, closed)
  if (closed) pts.push(pts[0])
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i], pts[i - 1]))
  const len = cum[cum.length - 1]
  const n = Math.max(2, Math.ceil(len / step) + (closed ? 0 : 1))
  const real = closed ? len / n : len / (n - 1)
  const xs = new Float32Array(n), zs = new Float32Array(n), hs = new Float32Array(n)
  let seg = 1
  for (let i = 0; i < n; i++) {
    const s = Math.min(len, i * real)
    while (seg < pts.length - 1 && cum[seg] < s) seg++
    const a = pts[seg - 1], b = pts[seg]
    const f = cum[seg] - cum[seg - 1] > 1e-6 ? (s - cum[seg - 1]) / (cum[seg] - cum[seg - 1]) : 0
    let x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f
    if (lane) {
      const dl = dist(a, b) || 1
      const k = o.taper && !closed ? Math.min(1, s / o.taper, (len - s) / o.taper) : 1
      x += (-(b[1] - a[1]) / dl) * lane * k
      z += ((b[0] - a[0]) / dl) * lane * k
    }
    xs[i] = x; zs[i] = z
  }
  for (let i = 0; i < n; i++) {
    const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1), b = closed ? (i + 1) % n : Math.min(n - 1, i + 1)
    hs[i] = Math.atan2(xs[b] - xs[a], zs[b] - zs[a])
  }
  return { xs, zs, hs, n, len, step: real, closed }
}

const lerpAngle = (a: number, b: number, t: number) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t }

/** Pose at a distance along the path. Closed paths wrap; open paths clamp. */
export function poseAt(p: Path, d: number, out: Pose): Pose {
  let s = p.closed ? ((d % p.len) + p.len) % p.len : Math.max(0, Math.min(p.len, d))
  s /= p.step
  const i = Math.min(p.n - 1, Math.floor(s)), f = s - i
  const j = p.closed ? (i + 1) % p.n : Math.min(p.n - 1, i + 1)
  out.x = p.xs[i] + (p.xs[j] - p.xs[i]) * f
  out.z = p.zs[i] + (p.zs[j] - p.zs[i]) * f
  out.h = lerpAngle(p.hs[i], p.hs[j], f)
  return out
}

// ───────────────────────────── doors ─────────────────────────────

function doorOf(d: District): P2 {
  const [cx, cz] = d.pos, [w, dp] = d.size, front = cz - dp / 2
  switch (d.id) {
    case 'apron': { const ls = roomRects(d).find((r) => r.room.id === 'line-station')!; return [ls.x + 0.9, ls.z + 1.9] }
    case 'hangar': return [cx + 9.5, front - 0.6]
    case 'technical-library': return [cx - w / 2 + 2.4, front - 0.5]
    case 'moe': return [cx + 1.5, front - 0.5]
    case 'stores': return [cx - w / 2 - 0.6, front + 2]
    case 'authority': return [cx, front - 3.6]
    case 'documents': return [cx, front - 1.0]
    default: return [cx, front - 0.5]
  }
}
export const DOORS: Record<string, P2> = Object.fromEntries(DISTRICTS.map((d) => [d.id, doorOf(d)]))

// ───────────────────────────── pedestrian network ─────────────────────────────

const key = (p: P2) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`
const horizontal = (r: (typeof ROADS)[number]) => r.a[1] === r.b[1]

function footOf(door: P2): P2 {
  let best: P2 = door, bd = Infinity
  for (const r of ROADS) {
    if (!horizontal(r)) continue
    const x0 = Math.min(r.a[0], r.b[0]), x1 = Math.max(r.a[0], r.b[0])
    if (door[0] < x0 || door[0] > x1) continue
    const d = Math.abs(door[1] - r.a[1])
    if (d < bd) { bd = d; best = [door[0], r.a[1]] }
  }
  return best
}
export const FEET: Record<string, P2> = Object.fromEntries(Object.entries(DOORS).map(([id, d]) => [id, footOf(d)]))

const nodes = new Map<string, P2>()
const adj = new Map<string, { to: string; w: number }[]>()
for (const r of ROADS) {
  const h = horizontal(r)
  const on: P2[] = [r.a, r.b]
  for (const o of ROADS) {
    if (o === r || horizontal(o) === h) continue
    const p: P2 = h ? [o.a[0], r.a[1]] : [r.a[0], o.a[1]]
    const [rv, r0, r1] = h ? [p[0], Math.min(r.a[0], r.b[0]), Math.max(r.a[0], r.b[0])] : [p[1], Math.min(r.a[1], r.b[1]), Math.max(r.a[1], r.b[1])]
    const [ov, o0, o1] = h ? [p[1], Math.min(o.a[1], o.b[1]), Math.max(o.a[1], o.b[1])] : [p[0], Math.min(o.a[0], o.b[0]), Math.max(o.a[0], o.b[0])]
    if (rv >= r0 && rv <= r1 && ov >= o0 && ov <= o1) on.push(p)
  }
  if (h) for (const f of Object.values(FEET)) if (f[1] === r.a[1]) on.push(f)
  on.sort((a, b) => (h ? a[0] - b[0] : a[1] - b[1]))
  for (let i = 0; i < on.length; i++) {
    nodes.set(key(on[i]), on[i])
    if (i === 0) continue
    const a = key(on[i - 1]), b = key(on[i]), w = dist(on[i - 1], on[i])
    if (a === b) continue
    ;(adj.get(a) ?? adj.set(a, []).get(a)!).push({ to: b, w })
    ;(adj.get(b) ?? adj.set(b, []).get(b)!).push({ to: a, w })
  }
}

function shortest(from: P2, to: P2): P2[] {
  const src = key(from), dst = key(to)
  const best = new Map<string, number>([[src, 0]])
  const prev = new Map<string, string>()
  const done = new Set<string>()
  for (;;) {
    let cur: string | null = null, cd = Infinity
    for (const [k, d] of best) if (!done.has(k) && d < cd) { cd = d; cur = k }
    if (cur === null || cur === dst) break
    done.add(cur)
    for (const e of adj.get(cur) ?? []) {
      const nd = cd + e.w
      if (nd < (best.get(e.to) ?? Infinity)) { best.set(e.to, nd); prev.set(e.to, cur) }
    }
  }
  if (!best.has(dst)) return [from, to]
  const out: P2[] = []
  for (let k: string | undefined = dst; k; k = prev.get(k)) out.unshift(nodes.get(k)!)
  return out
}

/** Walking route between two districts: door → pavement → along the roads → door. */
export function walkRoute(from: string, to: string): Path {
  const pts: P2[] = [DOORS[from], ...shortest(FEET[from], FEET[to]), DOORS[to]]
  return makePath(pts, { radius: 0.9, lane: 2.0, taper: 2.4, step: 0.4 })
}

// ───────────────────────────── fixed routes ─────────────────────────────

const hg = DISTRICT_BY_ID.hangar
/** centre of the aircraft in the hangar bay */
export const HANGAR_AC: P2 = [hg.pos[0], hg.pos[1] - 0.14 * hg.size[1] - 0.2]
const stand = roomRects(DISTRICT_BY_ID.apron).find((r) => r.room.id === 'stand')!
/** stand 1: line-maintenance aircraft, parked; stand 2: the visiting aircraft */
export const STAND1: P2 = [stand.x - 0.253 * stand.w, stand.z]
export const STAND2: P2 = [STAND1[0] + 17.5, stand.z]

export const ROUTES = {
  publicEast: makePath([[-230, 8], [230, 8]], { lane: 0.82 }),
  publicWest: makePath([[230, 8], [-230, 8]], { lane: 0.82 }),
  campusCw: makePath([[-46.5, 8], [53, 8], [53, 30], [-46.5, 30]], { closed: true, lane: 0.75, radius: 2.4 }),
  campusCcw: makePath([[-46.5, 30], [53, 30], [53, 8], [-46.5, 8]], { closed: true, lane: 0.75, radius: 2.4 }),
  hangarBlock: makePath([[18.5, 8], [18.5, -21], [-21.5, -21], [-21.5, 8]], { closed: true, lane: 0.62, radius: 2 }),
  workshopBlock: makePath([[18.5, 8], [53, 8], [53, -21], [18.5, -21]], { closed: true, lane: 0.62, radius: 2 }),
  apronLoop: makePath([[STAND1[0] - 11.5, -23.7], [STAND2[0] + 10.5, -23.7], [STAND2[0] + 10.5, -40.8], [STAND1[0] - 11.5, -40.8]], { closed: true, radius: 2.2 }),
  lineVan: makePath([[DOORS.apron[0] + 3.4, DOORS.apron[1] - 1.6], [STAND1[0] - 9.6, DOORS.apron[1] - 1.6], [STAND1[0] - 9.6, STAND1[1] + 4.6]], { radius: 2 }),
}

/** short loops for people who work in the open: around the aircraft, on the apron */
export const WORK_LOOPS: { path: P2[]; closed?: boolean; color: string }[] = (() => {
  const [hx, hz] = HANGAR_AC, [sx, sz] = STAND1
  return [
    { path: [[hx - 7.6, hz - 4.0], [hx - 4.6, hz - 2.6]], color: '#e2812f' },
    { path: [[hx + 7.6, hz - 4.0], [hx + 4.4, hz - 2.7], [hx + 3.0, hz - 6.4]], color: '#e2812f' },
    { path: [[hx - 1.3, hz - 8.6], [hx - 6.2, hz - 7.4]], color: '#d9a72c' },
    { path: [[hx - 9.0, hz - 8.8], [hx + 9.0, hz - 8.8], [hx + 9.0, hz + 4.2], [hx - 9.0, hz + 4.2]], closed: true, color: '#3e7c76' },
    { path: [[hx + 6.2, hz + 3.4], [hx + 3.4, hz + 3.6]], color: '#e2812f' },
    { path: [[sx - 3.6, sz + 5.0], [sx - 1.4, sz + 8.4], [sx + 2.6, sz + 7.0]], color: '#d9a72c' },
    { path: [[sx + 3.0, sz - 0.8], [sx + 6.4, sz + 1.2]], color: '#e2812f' },
    { path: [[sx - 8.4, sz - 8.4], [sx + 8.4, sz - 8.4], [sx + 8.4, sz + 8.6], [sx - 8.4, sz + 8.6]], closed: true, color: '#e2812f' },
  ]
})()
