/**
 * Ambient traffic: vehicles and pedestrians that see each other.
 *
 * Everyone still follows a fixed route, but how far they get along it is simulated
 * with a fixed time step, so the result is deterministic and nobody drives through
 * anybody else:
 *
 *   • a vehicle looks ahead along its own route, as far as it needs to stop;
 *   • a vehicle already in that corridor is followed at a distance;
 *   • where two corridors cross or merge, the one that gets there first goes and
 *     the other waits before the conflict point — the decision is kept until the
 *     two are clear of each other, so they never both go or both wait;
 *   • vehicles give way to anyone on foot who is, or is about to be, in front of
 *     them, and to aircraft; people do not step in front of a moving vehicle.
 */
import { CATEGORY_COLOR, DISTRICT_BY_ID, ROADS, type Category } from '../content/city'
import { C, mix, rng } from './world'
import { JUNCTIONS, makePath, PAVE, poseAt, ROUTES, walkRoute, WORK_LOOPS, type P2, type Path, type Pose } from './layout'
import type { VehicleKind } from './prefabs'
import { AIRSIDE_DOORS, lookOfDistrict, type Look } from './looks'

export interface Circle { x: number; z: number; r: number }

/** length and width of each vehicle, and where its middle sits relative to the model origin */
export const VEHICLE_DIM: Record<VehicleKind, { len: number; wid: number; mid: number }> = {
  car: { len: 2.2, wid: 1.0, mid: 0 }, van: { len: 2.6, wid: 1.14, mid: 0.02 }, bus: { len: 3.62, wid: 1.22, mid: 0 },
  truck: { len: 3.6, wid: 1.3, mid: 0.02 }, tug: { len: 1.9, wid: 1.2, mid: 0 }, cart: { len: 1.9, wid: 0.95, mid: 0.22 },
  forklift: { len: 2.3, wid: 0.8, mid: 0.3 }, fuel: { len: 3.8, wid: 1.27, mid: 0.1 }, stairs: { len: 2.2, wid: 1.0, mid: 0 }, gpu: { len: 1.7, wid: 0.9, mid: 0.1 },
}

export interface Unit { kind: VehicleKind; color: string; /** distance behind the lead vehicle along the route */ behind: number; pose: Pose }
export interface Car {
  id: number
  units: Unit[]
  path: Path
  /** return route of a shuttle */
  back?: Path
  mode: 'loop' | 'through' | 'shuttle'
  vmax: number
  dwell: number
  /** distance along the current route */
  s: number
  v: number
  /** shuttle: 0 out, 1 turning at the far end, 2 back, 3 turning at home */
  leg: number
  timer: number
  /** extra heading while a shuttle turns round on the spot */
  turn: number
  /** seconds spent standing still while wanting to move */
  stuck: number
  /** the bus halts at its stops */
  stops?: number[]
  halt: number
  nextStop: number
  /** what is holding this vehicle back, for diagnostics */
  why?: string
}

export interface Walker {
  path: Path
  speed: number
  /** people working in the open stay visible when they stop; commuters go indoors */
  stay: boolean
  closed: boolean
  night: boolean
  color: string
  skin: string
  look: Look
  /** goes beyond the airside boundary, so wears hi-vis */
  airside: boolean
  dwellA: number
  dwellB: number
  d: number
  dir: 1 | -1
  /** time left at the current end of the route */
  wait: number
  moving: boolean
  pose: Pose
  /** 0 while indoors */
  scale: number
  why?: string
}

const DEC = 4, ACC = 1.6, STEP = 0.5, GAP = 0.9, MARGIN = 0.18, PED_R = 0.3
const wrap = (p: Path, d: number) => (p.closed ? d : Math.max(0, Math.min(p.len, d)))

interface Sample { x: number; z: number; d: number }
interface Scan { car: Car; r: number; body: Circle[]; ahead: Sample[]; limit: number; active: boolean; /** already inside a junction box: committed to driving through */ inBox: boolean }

const _p: Pose = { x: 0, z: 0, h: 0 }

function unitCircles(u: Unit, out: Circle[]) {
  const { len, wid, mid } = VEHICLE_DIM[u.kind]
  const r = wid / 2
  const half = Math.max(0, len / 2 - r)
  const n = Math.max(1, Math.ceil((2 * half) / (1.3 * r)) + 1)
  for (let i = 0; i < n; i++) {
    const o = mid + (n === 1 ? 0 : -half + (2 * half * i) / (n - 1))
    out.push({ x: u.pose.x + Math.sin(u.pose.h) * o, z: u.pose.z + Math.cos(u.pose.h) * o, r })
  }
}

export class Traffic {
  cars: Car[] = []
  walkers: Walker[] = []
  /** things nobody argues with: aircraft on the ground and the pushback tug, now and a few seconds ahead */
  obstacles: Circle[] = []
  time = 0
  /** 0 by day, 1 late at night, when most people have gone home */
  quiet = 0
  private acc = 0
  private winner = new Map<number, number>()

  constructor(cars: Car[], walkers: Walker[]) {
    this.cars = cars
    this.walkers = walkers
    for (const c of cars) this.place(c)
    for (const w of walkers) this.placeWalker(w)
    // anyone who would start out in the road next to a vehicle starts indoors instead
    const bodies = cars.flatMap((c) => this.bodies(c))
    for (const w of walkers) {
      if (w.wait > 0 || !bodies.some((b) => Math.hypot(b.x - w.pose.x, b.z - w.pose.z) < b.r + 3.2)) continue
      if (w.closed) { w.d += 9; this.placeWalker(w); continue }
      w.d = w.d > w.path.len / 2 ? w.path.len : 0
      w.wait = 2 + (w.dwellA % 7); w.moving = false; w.scale = w.stay ? 1 : 0
      this.placeWalker(w)
    }
  }

  /** Advance by `dt` seconds of world time, in fixed steps. */
  advance(dt: number, obstacles?: (t: number) => Circle[]) {
    this.acc += Math.min(dt, 0.25)
    const h = 1 / 30
    while (this.acc >= h) {
      this.acc -= h
      this.time += h
      if (obstacles) this.obstacles = obstacles(this.time)
      this.step(h)
    }
  }

  private route(c: Car) { return c.leg >= 2 && c.back ? c.back : c.path }

  private place(c: Car) {
    const p = this.route(c)
    for (const u of c.units) {
      const d = c.s - u.behind
      poseAt(p, p.closed ? d : c.mode === 'through' ? ((d % p.len) + p.len) % p.len : wrap(p, d), u.pose)
      u.pose.h += c.turn
    }
  }
  private placeWalker(w: Walker) {
    poseAt(w.path, w.closed ? w.d : wrap(w.path, w.d), w.pose)
    if (w.dir < 0) w.pose.h += Math.PI
  }

  /** Bodies of everything on wheels, for rendering checks and tests. */
  bodies(c: Car): Circle[] { const out: Circle[] = []; for (const u of c.units) unitCircles(u, out); return out }

  private scan(c: Car): Scan {
    const lead = c.units[0]
    const dim = VEHICLE_DIM[lead.kind]
    const r = dim.wid / 2
    const p = this.route(c)
    const body = this.bodies(c)
    const ahead: Sample[] = []
    let inBox = false
    const active = c.leg === 0 || c.leg === 2
    if (active) {
      const front = dim.mid + dim.len / 2 - r
      const back = dim.mid - dim.len / 2 + r
      let reach = Math.max(4.5, (c.v * c.v) / (2 * DEC) + 3) + 1
      // look right through the junction ahead, so nobody drives in on a conflict they have not seen
      const here = p.closed || c.mode === 'through' ? ((c.s % p.len) + p.len) % p.len : c.s
      const nose = here + dim.mid + dim.len / 2, tail = here - c.units[c.units.length - 1].behind + dim.mid - dim.len / 2
      for (const [a, b] of boxesOn(p)) for (const turn of p.closed || c.mode === 'through' ? [-p.len, 0, p.len] : [0]) {
        if (nose > a + turn && tail < b + turn) inBox = true
        if (a + turn - nose < reach && b + turn > nose) reach = Math.max(reach, b + turn - nose + 2)
      }
      for (let d = STEP; d <= reach; d += STEP) {
        const at = c.s + d
        if (!p.closed && c.mode !== 'through' && at > p.len) break
        // the vehicle is rigid: on a bend its nose swings wide of the route, so place the nose from the pose
        poseAt(p, p.closed ? at : c.mode === 'through' ? ((at % p.len) + p.len) % p.len : Math.min(p.len, at), _p)
        ahead.push({ x: _p.x + Math.sin(_p.h) * front, z: _p.z + Math.cos(_p.h) * front, d })
        // …and its tail cuts the corner; a short vehicle is covered by its nose alone
        if (back < -0.6 * r) ahead.push({ x: _p.x + Math.sin(_p.h) * back, z: _p.z + Math.cos(_p.h) * back, d })
      }
    }
    return { car: c, r, body, ahead, limit: Infinity, active, inBox }
  }

  private step(h: number) {
    const scans = this.cars.map((c) => { c.why = undefined; return this.scan(c) })
    const n = scans.length

    // vehicle against vehicle
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = scans[i], B = scans[j]
      const a0 = A.body[0], b0 = B.body[0]
      if (Math.abs(a0.x - b0.x) + Math.abs(a0.z - b0.z) > 46) continue
      const key = i * 1024 + j
      const aBody = firstHit(A, B.body), bBody = firstHit(B, A.body)
      const fut = crossing(A, B)
      if (aBody === Infinity && bBody === Infinity && !fut) { this.winner.delete(key); continue }
      let win = this.winner.get(key)
      if (win === undefined) {
        if (fut) {
          const ta = fut.a / Math.max(A.car.v, 1.5), tb = fut.b / Math.max(B.car.v, 1.5)
          win = !B.active ? j : !A.active ? i : ta <= tb ? i : j
        } else win = aBody >= bBody ? i : j
        this.winner.set(key, win)
      }
      // three or more vehicles can end up each waiting for the next: once both of a pair stand still
      // with nothing but an agreement between them, the one nearer the conflict goes (lower number on a tie)
      if (fut && A.car.stuck > 1 && B.car.stuck > 1) win = fut.a < fut.b - 0.6 ? i : fut.b < fut.a - 0.6 ? j : i
      // whoever is already in the junction finishes crossing it
      if (fut && A.inBox !== B.inBox) win = A.inBox ? i : j
      // a vehicle with the other one in its way cannot be the one to go first
      if (aBody !== Infinity && bBody === Infinity) win = j
      else if (bBody !== Infinity && aBody === Infinity) win = i
      this.winner.set(key, win)
      // whatever was agreed, nobody advances into a vehicle that is physically in the way
      if (aBody - GAP < A.limit) { A.limit = aBody - GAP; A.car.why = `car#${B.car.id}` }
      if (bBody - GAP < B.limit) { B.limit = bBody - GAP; B.car.why = `car#${A.car.id}` }
      const L = win === i ? B : A
      const dist = (L === A ? fut?.a : fut?.b) ?? Infinity
      if (dist - GAP < L.limit) { L.limit = dist - GAP; L.car.why = `car#${(L === A ? B : A).car.id}` }
    }

    // vehicle against people and aircraft
    const feet: Circle[] = []
    for (const w of this.walkers) {
      if (w.scale < 0.3 || (!w.night && this.quiet > 0.7)) continue
      feet.push({ x: w.pose.x, z: w.pose.z, r: PED_R })
      // where they will be over the next few seconds — long enough to finish a crossing they have started
      if (w.moving) for (const t of [0.6, 1.2, 1.8, 2.4, 3.0]) {
        const d = w.d + w.dir * w.speed * t
        poseAt(w.path, w.closed ? d : wrap(w.path, d), _p)
        feet.push({ x: _p.x, z: _p.z, r: PED_R })
      }
    }
    for (const S of scans) {
      if (!S.active) continue
      const a = firstFoot(S, feet), b = firstHit(S, this.obstacles)
      if (a < S.limit) { S.limit = a; S.car.why = `person ${lastFoot!.x.toFixed(2)},${lastFoot!.z.toFixed(2)} lim ${a.toFixed(2)}` }
      if (b - GAP < S.limit) { S.limit = b - GAP; S.car.why = 'aircraft' }
    }

    // move the vehicles
    for (const S of scans) {
      const c = S.car, p = this.route(c)
      if (c.leg === 1 || c.leg === 3) {
        c.timer += h
        c.turn = Math.PI * ease(Math.min(1, c.timer / 3))
        if (c.timer >= c.dwell) { c.leg = (c.leg + 1) % 4; c.timer = 0; c.s = 0; c.turn = 0 }
        this.place(c)
        continue
      }
      if (c.halt > 0) { c.halt -= h; c.v = 0; this.place(c); continue }
      // ease off for bends, the end of the line and bus stops
      poseAt(p, wrapS(c, p, c.s), _p)
      const h0 = _p.h
      poseAt(p, wrapS(c, p, c.s + 2.4), _p)
      let dh = Math.abs(_p.h - h0); if (dh > Math.PI) dh = 2 * Math.PI - dh
      let target = c.vmax * (1 - 0.55 * Math.min(1, dh / 0.9))
      let limit = S.limit
      if (c.mode === 'shuttle') limit = Math.min(limit, p.len - c.s)
      if (c.stops) {
        const to = (((c.stops[c.nextStop] - c.s) % p.len) + p.len) % p.len
        if (to < 12) limit = Math.min(limit, to)
        if (to < 0.2) { c.halt = 7; c.nextStop = (c.nextStop + 1) % c.stops.length }
      }
      // keep junctions and crossings clear: only drive in if there is room to drive out again
      if (limit < 40) {
        const dim = VEHICLE_DIM[c.units[0].kind]
        const tail = (c.units[c.units.length - 1].behind) + dim.len / 2 - dim.mid + 0.3, nose = dim.mid + dim.len / 2 + 0.3
        const here = p.closed || c.mode === 'through' ? ((c.s % p.len) + p.len) % p.len : c.s
        for (const [a, b] of boxesOn(p)) for (const turn of p.closed || c.mode === 'through' ? [-p.len, 0, p.len] : [0]) {
          const lo = a + turn - nose, hi = b + turn + tail
          if (here < lo && here + Math.max(0, limit) > lo && here + Math.max(0, limit) < hi) limit = Math.min(limit, lo - here)
        }
      }
      target = Math.min(target, Math.sqrt(2 * DEC * Math.max(0, limit)))
      c.v = Math.min(c.v + ACC * h, target)
      c.stuck = c.v < 0.05 ? c.stuck + h : 0
      c.s += c.v * h
      if (c.mode === 'shuttle' && c.s >= p.len - 0.02) { c.s = p.len; c.v = 0; c.leg++; c.timer = 0 }
      this.place(c)
    }

    // people
    const bodies: { c: Circle; moving: boolean }[] = []
    for (const S of scans) {
      for (const b of S.body) bodies.push({ c: b, moving: false })
      // where each vehicle is about to be: nobody steps off the kerb into that
      for (const a of S.ahead) { if (!S.inBox && a.d > Math.max(2.5, S.car.v * 1.6 + 0.8)) break; bodies.push({ c: { x: a.x, z: a.z, r: S.r }, moving: true }) }
    }
    for (const o of this.obstacles) bodies.push({ c: o, moving: false })
    for (const w of this.walkers) {
      if (w.wait > 0) {
        w.wait -= h; w.moving = false
        w.scale = w.stay ? 1 : 0
        if (w.wait <= 0 && !w.closed) w.dir = w.d > w.path.len / 2 ? -1 : 1
        continue
      }
      let blocked = false
      // once on the road, keep going: only the kerb is a place to wait for traffic
      const onRoad = inCarriageway(w.pose.x, w.pose.z)
      // from the kerb, look across the whole crossing before stepping off
      for (let k = 1; k <= (onRoad ? 1 : 8) && !blocked; k++) {
        const next = w.d + w.dir * 0.7 * k
        poseAt(w.path, w.closed ? next : wrap(w.path, next), _p)
        if (k > 1 && !inCarriageway(_p.x, _p.z)) continue
        for (const b of bodies) {
          if (b.moving && onRoad) continue
          const reach = b.c.r + PED_R + (b.moving ? 0.12 : 0.05)
          const dx = _p.x - b.c.x, dz = _p.z - b.c.z
          if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue
          const dn = dx * dx + dz * dz
          if (dn >= reach * reach) continue
          // stepping away from something is always allowed
          const cx = w.pose.x - b.c.x, cz = w.pose.z - b.c.z
          if (k > 1 || dn < cx * cx + cz * cz) { blocked = true; w.why = `${b.moving ? 'path' : 'body'} ${b.c.x.toFixed(1)},${b.c.z.toFixed(1)}`; break }
        }
      }
      w.moving = !blocked
      if (!blocked) w.d += w.dir * w.speed * h
      if (!w.closed) {
        if (w.dir > 0 && w.d >= w.path.len) { w.d = w.path.len; w.wait = w.dwellB; w.moving = false }
        else if (w.dir < 0 && w.d <= 0) { w.d = 0; w.wait = w.dwellA; w.moving = false }
        w.scale = w.stay ? 1 : Math.max(0, Math.min(1, w.d / 0.8, (w.path.len - w.d) / 0.8))
      } else w.scale = 1
      this.placeWalker(w)
    }
  }
}

/** half-size of the box a vehicle must not stop in: the junction and the crossings around it */
const BOX = PAVE + 0.8
const boxCache = new WeakMap<Path, [number, number][]>()
/** Stretches of a route that lie inside a junction box, as [in, out] distances. */
function boxesOn(p: Path): [number, number][] {
  let out = boxCache.get(p)
  if (out) return out
  out = []
  let from = -1
  for (let i = 0; i <= p.n; i++) {
    const inside = i < p.n && JUNCTIONS.some((j) => Math.abs(p.xs[i] - j[0]) < BOX && Math.abs(p.zs[i] - j[1]) < BOX)
    if (inside && from < 0) from = i
    if (!inside && from >= 0) { out.push([from * p.step, (i - 1) * p.step]); from = -1 }
  }
  // a box that straddles the start of a closed route is one box, not two
  if (p.closed && out.length > 1 && out[0][0] === 0 && out[out.length - 1][1] >= (p.n - 1) * p.step - 0.01) { const last = out.pop()!; out[0] = [last[0] - p.len, out[0][1]] }
  boxCache.set(p, out)
  return out
}

function inCarriageway(x: number, z: number): boolean {
  for (const r of ROADS) {
    // a little beyond the kerb line: whoever is this close has started to cross
    const h = r.a[1] === r.b[1], half = r.w / 2 + 0.45
    if (h ? Math.abs(z - r.a[1]) < half && x > Math.min(r.a[0], r.b[0]) - 150 && x < Math.max(r.a[0], r.b[0]) + 150 : Math.abs(x - r.a[0]) < half && z > Math.min(r.a[1], r.b[1]) - half && z < Math.max(r.a[1], r.b[1]) + half) return true
  }
  return false
}

const ease = (t: number) => t * t * (3 - 2 * t)
const wrapS = (c: Car, p: Path, s: number) => (p.closed ? s : c.mode === 'through' ? ((s % p.len) + p.len) % p.len : Math.min(p.len, s))

/** Distance along a vehicle's corridor to the first of `circles` it would touch. */
function firstHit(S: Scan, circles: Circle[], margin = MARGIN): number {
  if (!circles.length) return Infinity
  for (const a of S.ahead) {
    for (const c of circles) {
      const reach = S.r + c.r + margin
      const dx = a.x - c.x, dz = a.z - c.z
      if (dx < reach && dx > -reach && dz < reach && dz > -reach && dx * dx + dz * dz < reach * reach) return a.d
    }
  }
  return Infinity
}

/**
 * How far a vehicle may go before someone on foot: anyone its body would brush past
 * is given a full metre of room in front, so they can keep walking across.
 */
let lastFoot: Circle | null = null
function firstFoot(S: Scan, feet: Circle[]): number {
  let best = Infinity
  for (const f of feet) {
    const touch = S.r + f.r + 0.1, room = touch + 1.0
    let inPath = false, first = Infinity
    for (const a of S.ahead) {
      if (a.d >= best) break
      const dx = a.x - f.x, dz = a.z - f.z
      if (dx > room || dx < -room || dz > room || dz < -room) continue
      const d2 = dx * dx + dz * dz
      if (d2 < room * room && first === Infinity) first = a.d - STEP
      if (d2 < touch * touch) { inPath = true; break }
    }
    if (inPath && first < best) { best = first; lastFoot = f }
  }
  return best
}

/** Where two corridors meet: how far each vehicle is from the first point they would both occupy. */
function crossing(A: Scan, B: Scan): { a: number; b: number } | null {
  const reach = A.r + B.r + MARGIN, r2 = reach * reach
  for (const a of A.ahead) for (const b of B.ahead) {
    const dx = a.x - b.x, dz = a.z - b.z
    if (dx < reach && dx > -reach && dz < reach && dz > -reach && dx * dx + dz * dz < r2) {
      // the earliest point of B's corridor that touches A's corridor at all
      let bd = b.d
      for (const b2 of B.ahead) {
        if (b2.d >= bd) break
        for (const a2 of A.ahead) { const ex = a2.x - b2.x, ez = a2.z - b2.z; if (ex * ex + ez * ez < r2) { bd = b2.d; break } }
        if (bd === b2.d) break
      }
      return { a: a.d, b: bd }
    }
  }
  return null
}

// ───────────────────────────── who is out there ─────────────────────────────

const pose = (): Pose => ({ x: 0, z: 0, h: 0 })

export function ambientCars(low: boolean): Car[] {
  const r = rng(2014)
  const cars: Car[] = []
  const taken: Circle[] = []
  const add = (kind: VehicleKind, color: string, path: Path, vmax: number, s: number, o: Partial<Pick<Car, 'mode' | 'dwell' | 'back' | 'stops'>> & { train?: [VehicleKind, string, number][] } = {}) => {
    const car: Car = {
      id: cars.length, units: [{ kind, color, behind: 0, pose: pose() }, ...(o.train ?? []).map(([k, c, behind]) => ({ kind: k, color: c, behind, pose: pose() }))],
      path, back: o.back, mode: o.mode ?? 'loop', vmax, dwell: o.dwell ?? 0, s, v: 0, leg: 0, timer: 0, turn: 0, stuck: 0, stops: o.stops, halt: 0, nextStop: 0,
    }
    // nobody starts inside anybody else
    const probe = new Traffic([car], [])
    for (let tries = 0; tries < 400; tries++) {
      const body = probe.bodies(car)
      if (!body.some((b) => taken.some((t) => Math.hypot(b.x - t.x, b.z - t.z) < b.r + t.r + 2.2))) { taken.push(...body); break }
      car.s += 3.1
      new Traffic([car], [])
    }
    cars.push(car)
  }
  const cols = ['#c9ced3', C.navy, '#8a3f34', '#e9e5da', '#5d7f9c', '#3b4652', '#b7c2ab']
  const col = () => cols[Math.floor(r() * cols.length)]
  const nPublic = low ? 2 : 4
  for (let i = 0; i < nPublic; i++) {
    add(i === 1 ? 'truck' : 'car', col(), ROUTES.publicEast, 5 + r() * 2, (i / nPublic) * ROUTES.publicEast.len + r() * 30, { mode: 'through' })
    add(i === 2 ? 'van' : 'car', col(), ROUTES.publicWest, 5 + r() * 2, (i / nPublic) * ROUTES.publicWest.len + r() * 30, { mode: 'through' })
  }
  add('bus', C.white, ROUTES.campusCw, 3.6, 20, { stops: [ROUTES.campusCw.len * 0.22, ROUTES.campusCw.len * 0.71] })
  add('van', C.white, ROUTES.campusCcw, 4.2, 90)
  add('forklift', C.orange, ROUTES.hangarBlock, 2.4, 0)
  add('forklift', C.yellow, ROUTES.workshopBlock, 2.2, 55)
  if (!low) { add('car', '#e9e5da', ROUTES.campusCw, 4.6, 140); add('forklift', C.orange, ROUTES.hangarBlock, 2.6, 70) }
  // baggage / parts train and the bowser, on the apron service loop
  add('tug', C.yellow, ROUTES.apronLoop, 3.0, 4, { train: [['cart', C.blue, 2.5], ['cart', C.blue, 4.4]] })
  add('fuel', C.white, ROUTES.apronLoop, 2.2, 34)
  add('van', C.white, ROUTES.lineVan, 2.6, 0, { mode: 'shuttle', dwell: 22, back: ROUTES.lineVanBack })
  return cars
}

/** who walks where — the colour of a walker is the colour of the district they belong to */
const TRIPS: [string, string[], number][] = [
  ['compliance', ['hangar', 'stores', 'workshops', 'technical-library', 'training', 'production-control', 'records', 'moe', 'contractor', 'apron'], 1],
  ['hangar', ['stores', 'technical-library', 'production-control', 'training', 'workshops', 'apron', 'records'], 3],
  ['safety', ['hangar', 'apron', 'hq', 'workshops', 'training'], 1],
  ['authority', ['hq', 'hangar', 'compliance', 'moe', 'stores'], 1],
  ['hq', ['hangar', 'safety', 'compliance', 'production-control', 'training', 'moe'], 1],
  ['stores', ['hangar', 'workshops', 'apron'], 2],
  ['production-control', ['hangar', 'hq', 'technical-library', 'stores'], 1],
  ['technical-library', ['hangar', 'workshops', 'production-control'], 1],
  ['training', ['hangar', 'workshops', 'hq', 'technical-library', 'documents'], 2],
  ['records', ['hangar', 'hq', 'training'], 1],
  ['moe', ['hq', 'compliance', 'authority'], 1],
  ['contractor', ['hangar', 'workshops', 'hq'], 1],
  ['workshops', ['stores', 'hangar', 'technical-library'], 2],
]
export const HIVIS: Partial<Record<Category, string>> = { maintenance: C.orange, aircraft: C.yellow, components: '#93a35a' }

export function ambientWalkers(count: number): Walker[] {
  const r = rng(1321)
  const list: Walker[] = []
  const cat = (id: string) => DISTRICT_BY_ID[id].category
  const tone = (id: string) => mix(HIVIS[cat(id)] ?? CATEGORY_COLOR[cat(id)], '#ffffff', 0.08 + r() * 0.12)
  const skin = () => C.skin[Math.floor(r() * C.skin.length)]
  const start = (w: Omit<Walker, 'd' | 'dir' | 'wait' | 'moving' | 'pose' | 'scale'>, off: number): Walker => {
    const out: Walker = { ...w, d: 0, dir: 1, wait: 0, moving: true, pose: pose(), scale: w.stay ? 1 : 0 }
    if (w.closed) { out.d = off * w.speed; return out }
    // start somewhere in the round trip, as if the world had been running for a while
    const travel = w.path.len / w.speed, period = 2 * travel + w.dwellA + w.dwellB
    const u = off % period
    if (u < travel) out.d = u * w.speed
    else if (u < travel + w.dwellB) { out.d = w.path.len; out.wait = travel + w.dwellB - u; out.moving = false }
    else if (u < 2 * travel + w.dwellB) { out.d = w.path.len - (u - travel - w.dwellB) * w.speed; out.dir = -1 }
    else { out.wait = period - u; out.moving = false }
    return out
  }
  // people working in the open, around the aircraft
  for (const w of WORK_LOOPS) {
    list.push(start({ path: makePath(w.path as P2[], { radius: 0.6, step: 0.3, closed: !!w.closed }), speed: 0.7 + r() * 0.4, dwellA: 4 + r() * 6, dwellB: 4 + r() * 7, color: w.color, skin: skin(), look: w.color === '#d9a72c' ? 'certifier' : w.color === '#3e7c76' ? 'auditor' : 'mechanic', airside: true, stay: true, closed: !!w.closed, night: true }, r() * 60))
  }
  const trips: [string, string][] = []
  for (const [from, tos, weight] of TRIPS) for (let k = 0; k < weight; k++) for (const to of tos) trips.push([from, to])
  for (let i = 0; list.length < count; i++) {
    const [a, b] = trips[(i * 7) % trips.length]
    list.push(start({ path: walkRoute(a, b, (r() - 0.5) * 0.5), speed: 1.45 + r() * 0.7, dwellA: 5 + r() * 34, dwellB: 6 + r() * 30, color: tone(a), skin: skin(), look: lookOfDistrict(a, r), airside: AIRSIDE_DOORS.has(a) || AIRSIDE_DOORS.has(b), stay: false, closed: false, night: i % 3 === 0 }, r() * 400))
  }
  return list
}
