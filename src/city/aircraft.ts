/**
 * A stylised narrow-body twin, built once as a single vertex-coloured geometry.
 * Local frame: nose towards +z, wheels on y = 0. Length 14.5, span 15.
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RUNWAY, TAXIWAY } from '../content/city'
import { STAND2 } from './layout'

const WHITE = '#f6f5f1', DARK = '#27303b', GREY = '#d7dbde', GEAR = '#8b9299'

function paint(g: THREE.BufferGeometry, color: string) {
  const geo = g.index ? g.toNonIndexed() : g
  geo.deleteAttribute('uv')
  const c = new THREE.Color(color)
  const n = geo.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

function planform(pts: [number, number][], thickness: number) {
  // shape drawn as (x, z); extruded downwards by `thickness`
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))), { depth: thickness, bevelEnabled: false })
  g.rotateX(Math.PI / 2)
  return g
}

const cache = new Map<string, THREE.BufferGeometry>()

export function aircraftGeometry(accent: string): THREE.BufferGeometry {
  const hit = cache.get(accent)
  if (hit) return hit
  const parts: THREE.BufferGeometry[] = []
  const Y = 1.75 // fuselage centreline

  // fuselage: revolved profile (radius, station)
  const prof: [number, number][] = [[0.04, -7.25], [0.2, -7.0], [0.48, -6.0], [0.72, -4.4], [0.84, -2.5], [0.84, 4.9], [0.78, 5.8], [0.6, 6.5], [0.34, 7.0], [0.02, 7.25]]
  const fus = new THREE.LatheGeometry(prof.map(([r, s]) => new THREE.Vector2(r, s)), 20)
  fus.rotateX(Math.PI / 2)
  fus.translate(0, Y, 0)
  // the tail cone sweeps upwards
  const pos = fus.getAttribute('position')
  for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); if (z < -2.5) pos.setY(i, pos.getY(i) + ((-2.5 - z) / 4.75) ** 1.6 * 0.55) }
  fus.computeVertexNormals()
  parts.push(paint(fus, WHITE))

  // wings, stabilisers, fin
  for (const s of [-1, 1]) {
    const wing = planform([[s * 0.5, 1.75], [s * 7.5, -0.85], [s * 7.5, -1.6], [s * 2.6, -1.2], [s * 0.5, -1.35]], 0.17)
    wing.rotateZ(s * 0.07)
    wing.translate(0, Y - 0.38, 0.35)
    parts.push(paint(wing, GREY))
    const let_ = new THREE.BoxGeometry(0.08, 0.95, 0.75)
    let_.rotateX(-0.35)
    let_.rotateZ(-s * 0.18)
    let_.translate(s * 7.5, Y + 0.56, -0.95)
    parts.push(paint(let_, accent))
    const stab = planform([[s * 0.25, -5.1], [s * 2.9, -6.5], [s * 2.9, -7.05], [s * 0.25, -6.6]], 0.12)
    stab.translate(0, Y + 0.6, 0)
    parts.push(paint(stab, GREY))
    // engines
    const nac = new THREE.CylinderGeometry(0.56, 0.47, 1.95, 18)
    nac.rotateX(Math.PI / 2)
    nac.translate(s * 2.55, 1.0, 1.25)
    parts.push(paint(nac, WHITE))
    const lip = new THREE.CylinderGeometry(0.585, 0.585, 0.42, 18)
    lip.rotateX(Math.PI / 2)
    lip.translate(s * 2.55, 1.0, 2.06)
    parts.push(paint(lip, accent))
    const fan = new THREE.CylinderGeometry(0.47, 0.47, 0.04, 18)
    fan.rotateX(Math.PI / 2)
    fan.translate(s * 2.55, 1.0, 2.28)
    parts.push(paint(fan, DARK))
    const pylon = new THREE.BoxGeometry(0.16, 0.34, 1.3)
    pylon.translate(s * 2.55, 1.42, 1.0)
    parts.push(paint(pylon, GREY))
    // window line and main gear
    const win = new THREE.BoxGeometry(0.03, 0.15, 8.8)
    win.translate(s * 0.832, Y + 0.2, 0.7)
    parts.push(paint(win, DARK))
    const leg = new THREE.CylinderGeometry(0.07, 0.07, 0.75, 8)
    leg.translate(s * 1.25, 0.62, -0.25)
    parts.push(paint(leg, GEAR))
    const wheel = new THREE.CylinderGeometry(0.26, 0.26, 0.42, 14)
    wheel.rotateZ(Math.PI / 2)
    wheel.translate(s * 1.25, 0.26, -0.25)
    parts.push(paint(wheel, DARK))
  }
  const fin = new THREE.ExtrudeGeometry(new THREE.Shape([[-4.5, 2.5], [-6.5, 5.25], [-7.3, 5.25], [-6.95, 2.5]].map(([z, y]) => new THREE.Vector2(z, y))), { depth: 0.14, bevelEnabled: false })
  fin.rotateY(-Math.PI / 2)
  fin.translate(0.07, 0, 0)
  parts.push(paint(fin, accent))
  const cockpit = new THREE.BoxGeometry(1.02, 0.2, 0.5)
  cockpit.rotateX(0.52)
  cockpit.translate(0, Y + 0.52, 6.02)
  parts.push(paint(cockpit, DARK))
  const noseLeg = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8)
  noseLeg.translate(0, 0.62, 5.3)
  parts.push(paint(noseLeg, GEAR))
  const noseWheel = new THREE.CylinderGeometry(0.2, 0.2, 0.34, 14)
  noseWheel.rotateZ(Math.PI / 2)
  noseWheel.translate(0, 0.2, 5.3)
  parts.push(paint(noseWheel, DARK))

  const merged = mergeGeometries(parts.map((p) => { if (!p.getAttribute('normal')) p.computeVertexNormals(); return p }))
  merged.computeBoundingSphere()
  cache.set(accent, merged)
  return merged
}

export const AIRCRAFT_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 })

// ───────────────────────────── the visiting aircraft ─────────────────────────────

/**
 * One arrival, turn-round and departure, as keyframes:
 * [time s, x, y, z, heading rad, pitch rad, easing of the segment that starts here].
 * Easing: 0 linear · 1 accelerate · 2 decelerate · 3 both.
 */
type Key = [number, number, number, number, number, number, number]
const W = -Math.PI / 2, E = Math.PI / 2, N = 0, S = Math.PI
const rz = RUNWAY.z, tz = TAXIWAY.z, [sx, sz] = STAND2
export const FLIGHT_PERIOD = 176
const KEYS: Key[] = [
  // approach and landing, towards -x
  [0, 300, 44, rz, W, -0.05, 0],
  [13, 64, 0.0, rz, W, -0.07, 0],
  [14.5, 40, 0, rz, W, 0, 2],
  [23, -28, 0, rz, W, 0, 3],
  // vacate onto the taxiway and come back east
  [28, -38, 0, rz + 2, W + 0.9, 0, 0],
  [31, -43, 0, (rz + tz) / 2, N, 0, 0],
  [34, -38, 0, tz - 1, N + 0.83, 0, 0],
  [37, -30, 0, tz, E, 0, 0],
  [46, sx - 7, 0, tz, E, 0, 0],
  [50, sx - 1.6, 0, tz + 2.6, E - 1.0, 0, 0],
  [53, sx, 0, tz + 7, N, 0, 2],
  // on stand 2
  [59, sx, 0, sz, N, 0, 0],
  // pushback, tail first, along the way it came in
  [108, sx, 0, sz, N, 0, 1],
  [116, sx, 0, tz + 7, N, 0, 0],
  [120, sx - 1.6, 0, tz + 2.6, E - 1.0, 0, 0],
  [124, sx - 7, 0, tz, E, 0, 0],
  [129, sx - 7, 0, tz, E, 0, 3],
  [149, 66, 0, tz, E, 0, 0],
  // line up
  [152, 76, 0, tz - 1, E + 0.8, 0, 0],
  [155, 81, 0, (rz + tz) / 2, S, 0, 0],
  [158, 76, 0, rz + 1.6, E + 2.5, 0, 0],
  [161, 68, 0, rz, W + 2 * Math.PI, 0, 0],
  // take-off
  [163, 66, 0, rz, W + 2 * Math.PI, 0, 1],
  [169, -8, 0, rz, W + 2 * Math.PI, 0, 0],
  [171, -56, 3.2, rz, W + 2 * Math.PI, -0.17, 0],
  [FLIGHT_PERIOD, -200, 36, rz, W + 2 * Math.PI, -0.2, 0],
]

export interface FlightPose { x: number; y: number; z: number; h: number; pitch: number; phase: 'air' | 'runway' | 'taxi' | 'parked' | 'push'; t: number }

export function flightPose(time: number, out: FlightPose): FlightPose {
  const t = ((time % FLIGHT_PERIOD) + FLIGHT_PERIOD) % FLIGHT_PERIOD
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++
  const a = KEYS[i], b = KEYS[i + 1]
  let f = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])))
  if (a[6] === 1) f = f * f
  else if (a[6] === 2) f = 1 - (1 - f) * (1 - f)
  else if (a[6] === 3) f = f * f * (3 - 2 * f)
  out.x = a[1] + (b[1] - a[1]) * f
  out.y = a[2] + (b[2] - a[2]) * f
  out.z = a[3] + (b[3] - a[3]) * f
  out.h = a[4] + (b[4] - a[4]) * f
  out.pitch = a[5] + (b[5] - a[5]) * f
  out.t = t
  out.phase = t < 13 || t >= 169 ? 'air' : t < 23 || t >= 161 ? 'runway' : t >= 59 && t < 108 ? 'parked' : t >= 108 && t < 129 ? 'push' : 'taxi'
  return out
}
