/**
 * The living world: people, vehicles, aircraft and clouds.
 *
 * Nothing here is simulated. Every position is a closed-form function of the
 * ambient clock (`world.t`) and a seeded PRNG, so the world is deterministic,
 * costs a few hundred matrix writes per frame, and freezes cleanly when the
 * user turns animation off.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CATEGORY_COLOR, DISTRICTS, DISTRICT_BY_ID, type Category } from '../content/city'
import { useApp } from '../store/app'
import { C, lerp, mix, rng, smooth, world } from './world'
import { GEO, MAT, type Part } from './parts'
import { vehicle, type VehicleKind } from './prefabs'
import { anchorSpots, FLOOR_Y } from './buildings'
import { HANGAR_AC, makePath, poseAt, ROUTES, STAND1, STAND2, walkRoute, WORK_LOOPS, type Path, type Pose } from './layout'
import { AIRCRAFT_MAT, aircraftGeometry, flightPose, type FlightPose } from './aircraft'

const BODY = new THREE.CapsuleGeometry(0.17, 0.4, 3, 8).translate(0, 0.39, 0)
const HEAD = new THREE.SphereGeometry(0.135, 10, 8).translate(0, 0.9, 0)
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const _o = new THREE.Object3D()
const _c = new THREE.Color()
const _pose: Pose = { x: 0, z: 0, h: 0 }

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
const HIVIS: Partial<Record<Category, string>> = { maintenance: C.orange, aircraft: C.yellow, components: '#93a35a' }

interface Walker { path: Path; speed: number; dwellA: number; dwellB: number; off: number; color: string; skin: string; stay: boolean; closed: boolean; night: boolean }

function makeWalkers(count: number): Walker[] {
  const r = rng(1321)
  const list: Walker[] = []
  const cat = (id: string) => DISTRICT_BY_ID[id].category
  const tone = (id: string) => mix(HIVIS[cat(id)] ?? CATEGORY_COLOR[cat(id)], '#ffffff', 0.08 + r() * 0.12)
  // people working in the open, around the aircraft
  for (const w of WORK_LOOPS) {
    list.push({ path: makePath(w.path, { radius: 0.6, step: 0.3, closed: !!w.closed }), speed: 0.7 + r() * 0.4, dwellA: 4 + r() * 6, dwellB: 4 + r() * 7, off: r() * 60, color: w.color, skin: C.skin[Math.floor(r() * C.skin.length)], stay: true, closed: !!w.closed, night: true })
  }
  const trips: [string, string][] = []
  for (const [from, tos, weight] of TRIPS) for (let k = 0; k < weight; k++) for (const to of tos) trips.push([from, to])
  for (let i = 0; list.length < count; i++) {
    const [a, b] = trips[(i * 7) % trips.length]
    list.push({ path: walkRoute(a, b), speed: 1.45 + r() * 0.7, dwellA: 5 + r() * 34, dwellB: 6 + r() * 30, off: r() * 400, color: tone(a), skin: C.skin[Math.floor(r() * C.skin.length)], stay: false, closed: false, night: i % 3 === 0 })
  }
  return list
}

function People({ count }: { count: number }) {
  const { walkers, spots, bodies, heads } = useMemo(() => {
    const walkers = makeWalkers(count)
    // the characters: one figure for every role anchor in the city
    const spots = DISTRICTS.flatMap((d) => anchorSpots(d, FLOOR_Y[d.id]).filter((s) => s.role).map((s) => ({ ...s, color: mix(HIVIS[d.category] ?? CATEGORY_COLOR[d.category], '#ffffff', 0.1) })))
    const n = walkers.length + spots.length
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 })
    const bodies = new THREE.InstancedMesh(BODY, mat, n)
    const heads = new THREE.InstancedMesh(HEAD, mat, n)
    const r = rng(66)
    walkers.forEach((w, i) => { bodies.setColorAt(i, _c.set(w.color)); heads.setColorAt(i, _c.set(w.skin)) })
    spots.forEach((s, k) => { bodies.setColorAt(walkers.length + k, _c.set(s.color)); heads.setColorAt(walkers.length + k, _c.set(C.skin[Math.floor(r() * C.skin.length)])) })
    for (const m of [bodies, heads]) { m.castShadow = true; m.frustumCulled = false; m.raycast = () => {}; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage) }
    return { walkers, spots, bodies, heads }
  }, [count])
  useEffect(() => () => { bodies.dispose(); heads.dispose(); (bodies.material as THREE.Material).dispose() }, [bodies, heads])
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const t = world.t
    const quiet = smooth(0.35, 0.75, world.night)
    const focus = useApp.getState().focus
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i]
      let scale = 1, d = 0, moving = true, flip = false
      if (w.closed) d = (w.off + t) * w.speed
      else {
        const travel = w.path.len / w.speed
        const period = 2 * travel + w.dwellA + w.dwellB
        const u = (t + w.off) % period
        if (u < travel) d = u * w.speed
        else if (u < travel + w.dwellB) { d = w.path.len; moving = false; scale = w.stay ? 1 : 0 }
        else if (u < 2 * travel + w.dwellB) { d = w.path.len - (u - travel - w.dwellB) * w.speed; flip = true }
        else { d = 0; moving = false; scale = w.stay ? 1 : 0 }
        if (!w.stay && scale) scale = Math.min(1, d / 0.8, (w.path.len - d) / 0.8)
      }
      if (!w.night) scale *= 1 - quiet
      if (scale <= 0.01) { bodies.setMatrixAt(i, ZERO); heads.setMatrixAt(i, ZERO); continue }
      poseAt(w.path, d, _pose)
      _o.position.set(_pose.x, moving ? Math.abs(Math.sin(t * 7 + i)) * 0.045 : 0, _pose.z)
      _o.rotation.set(0, _pose.h + (flip ? Math.PI : 0) + (moving ? 0 : Math.sin(t * 0.6 + i) * 0.5), moving ? Math.sin(t * 7 + i) * 0.05 : 0)
      _o.scale.setScalar(scale)
      _o.updateMatrix()
      bodies.setMatrixAt(i, _o.matrix); heads.setMatrixAt(i, _o.matrix)
    }
    for (let k = 0; k < spots.length; k++) {
      const s = spots[k], i = walkers.length + k
      const hot = focus === s.place
      // the role a requirement lives with turns to face the viewer
      const face = hot ? Math.atan2(camera.position.x - s.x, camera.position.z - s.z) : Math.PI + Math.sin(k * 12.9) * 0.5 + Math.sin(t * 0.4 + k) * 0.25
      _o.position.set(s.x - 0.75 * s.scale, s.y + (hot ? Math.abs(Math.sin(t * 3)) * 0.06 : 0), s.z - 0.3 * s.scale)
      _o.rotation.set(0, face, 0)
      _o.scale.setScalar(Math.max(0.8, s.scale) * (hot ? 1.25 : 1))
      _o.updateMatrix()
      bodies.setMatrixAt(i, _o.matrix); heads.setMatrixAt(i, _o.matrix)
    }
    bodies.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true
  })
  return <><primitive object={bodies} /><primitive object={heads} /></>
}

// ───────────────────────────── vehicles ─────────────────────────────

interface Mover { parts: Part[]; path: Path; speed: number; off: number; mode: 'loop' | 'through' | 'shuttle'; dwell?: number; first: number }

function makeMovers(low: boolean): { movers: Mover[]; total: number } {
  const r = rng(2014)
  const movers: Mover[] = []
  let total = 0
  const add = (kind: VehicleKind, color: string, path: Path, speed: number, off: number, mode: Mover['mode'] = 'loop', dwell?: number) => {
    const parts = vehicle(kind, color)
    movers.push({ parts, path, speed, off, mode, dwell, first: total })
    total += parts.length
  }
  const cols = ['#c9ced3', C.navy, '#8a3f34', '#e9e5da', '#5d7f9c', '#3b4652', '#b7c2ab']
  const nPublic = low ? 2 : 4
  for (let i = 0; i < nPublic; i++) {
    add(i === 1 ? 'truck' : 'car', cols[Math.floor(r() * cols.length)], ROUTES.publicEast, 5 + r() * 2, (i / nPublic) * ROUTES.publicEast.len + r() * 30, 'through')
    add(i === 2 ? 'van' : 'car', cols[Math.floor(r() * cols.length)], ROUTES.publicWest, 5 + r() * 2, (i / nPublic) * ROUTES.publicWest.len + r() * 30, 'through')
  }
  add('bus', C.white, ROUTES.campusCw, 3.6, 20)
  add('van', C.white, ROUTES.campusCcw, 4.2, 90)
  add('forklift', C.orange, ROUTES.hangarBlock, 2.4, 0)
  add('forklift', C.yellow, ROUTES.workshopBlock, 2.2, 55)
  if (!low) { add('car', '#e9e5da', ROUTES.campusCw, 4.6, 140); add('forklift', C.orange, ROUTES.hangarBlock, 2.6, 70) }
  // baggage / parts train on the apron
  add('tug', C.yellow, ROUTES.apronLoop, 3.0, 0)
  add('cart', C.blue, ROUTES.apronLoop, 3.0, -2.5)
  add('cart', C.blue, ROUTES.apronLoop, 3.0, -4.4)
  add('fuel', C.white, ROUTES.apronLoop, 2.2, 60)
  add('van', C.white, ROUTES.lineVan, 2.6, 4, 'shuttle', 22)
  return { movers, total }
}

function Vehicles({ low }: { low: boolean }) {
  const { movers, mesh } = useMemo(() => {
    const { movers, total } = makeMovers(low)
    const mesh = new THREE.InstancedMesh(GEO.box, MAT.solid, total)
    for (const m of movers) m.parts.forEach((p, k) => mesh.setColorAt(m.first + k, _c.set(p.c)))
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.raycast = () => {}
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    return { movers, mesh }
  }, [low])
  useEffect(() => () => { mesh.dispose() }, [mesh])
  const root = useMemo(() => new THREE.Object3D(), [])
  const child = useMemo(() => { const c = new THREE.Object3D(); root.add(c); return c }, [root])

  useFrame(() => {
    const t = world.t
    for (const m of movers) {
      let d: number, turn = 0
      if (m.mode === 'shuttle') {
        const travel = m.path.len / m.speed, dwell = m.dwell ?? 10, period = 2 * (travel + dwell)
        const u = (t + m.off) % period
        if (u < travel) d = u * m.speed
        else if (u < travel + dwell) { d = m.path.len; turn = smooth(0, 3, u - travel) * Math.PI }
        else if (u < 2 * travel + dwell) { d = m.path.len - (u - travel - dwell) * m.speed; turn = Math.PI }
        else { d = 0; turn = Math.PI + smooth(0, 3, u - 2 * travel - dwell) * Math.PI }
      } else d = m.off + t * m.speed
      poseAt(m.path, m.mode === 'through' ? ((d % m.path.len) + m.path.len) % m.path.len : d, _pose)
      root.position.set(_pose.x, 0.07, _pose.z)
      root.rotation.set(0, _pose.h + turn, 0)
      root.updateMatrixWorld()
      for (let k = 0; k < m.parts.length; k++) {
        const p = m.parts[k]
        child.position.set(p.p[0], p.p[1], p.p[2])
        child.rotation.set(p.r?.[0] ?? 0, p.r?.[1] ?? 0, p.r?.[2] ?? 0, 'YXZ')
        child.scale.set(p.s[0], p.s[1], p.s[2])
        child.updateMatrix()
        child.matrixWorld.multiplyMatrices(root.matrixWorld, child.matrix)
        mesh.setMatrixAt(m.first + k, child.matrixWorld)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

// ───────────────────────────── aircraft ─────────────────────────────

const glow = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false })
const LIGHT = { red: glow('#ff4a3a'), green: glow('#3fe08a'), white: glow('#ffffff'), amber: glow('#ffb347') }
const DOT = new THREE.SphereGeometry(0.11, 8, 6)

function Lights({ refs }: { refs: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={refs}>
      <mesh name="beacon" geometry={DOT} material={LIGHT.red} position={[0, 2.68, 0.5]} scale={1.5} />
      <mesh name="beacon" geometry={DOT} material={LIGHT.red} position={[0, 0.88, 0.2]} scale={1.5} />
      <mesh name="nav" geometry={DOT} material={LIGHT.red} position={[7.55, 2.05, -1.2]} />
      <mesh name="nav" geometry={DOT} material={LIGHT.green} position={[-7.55, 2.05, -1.2]} />
      <mesh name="strobe" geometry={DOT} material={LIGHT.white} position={[7.55, 2.3, -1.5]} scale={1.6} />
      <mesh name="strobe" geometry={DOT} material={LIGHT.white} position={[-7.55, 2.3, -1.5]} scale={1.6} />
      <mesh name="landing" geometry={DOT} material={LIGHT.white} position={[0, 1.0, 5.4]} scale={2.2} />
    </group>
  )
}

function Aircraft() {
  const geoHangar = useMemo(() => aircraftGeometry('#2f4a6b'), [])
  const geoStand = useMemo(() => aircraftGeometry('#d9742b'), [])
  const geoVisit = useMemo(() => aircraftGeometry('#3e7c76'), [])
  const visitor = useRef<THREE.Group>(null!)
  const visitorLights = useRef<THREE.Group>(null)
  const standLights = useRef<THREE.Group>(null)
  const tug = useRef<THREE.Group>(null!)
  const tugParts = useMemo(() => vehicle('tug', C.white), [])
  const pose = useMemo<FlightPose>(() => ({ x: 0, y: 0, z: 0, h: 0, pitch: 0, phase: 'air', t: 0 }), [])
  const park: [number, number] = [STAND2[0] + 8.6, STAND2[1] + 7.6]

  useFrame(() => {
    const t = world.t + 30
    const p = flightPose(t, pose)
    const g = visitor.current
    g.position.set(p.x, p.y + 0.1, p.z)
    g.rotation.set(p.pitch, p.h, 0, 'YXZ')
    const engines = p.phase !== 'parked' || p.t < 63 || p.t > 104
    const blink = (world.t * 1.1) % 1 < 0.14
    const strobe = (world.t * 1.1 + 0.5) % 1 < 0.06 || (world.t * 1.1 + 0.62) % 1 < 0.06
    visitorLights.current?.children.forEach((c) => {
      c.visible = c.name === 'beacon' ? engines && blink : c.name === 'strobe' ? (p.phase === 'air' || p.phase === 'runway') && strobe : c.name === 'landing' ? p.phase === 'air' || p.phase === 'runway' : true
    })
    standLights.current?.children.forEach((c) => { c.visible = c.name === 'nav' && world.night > 0.4 })
    // the pushback tug meets the nose, pushes, and returns to its bay
    const k = p.t < 100 ? 0 : p.t < 108 ? smooth(100, 108, p.t) : p.t < 124 ? 1 : p.t < 131 ? 1 - smooth(124, 131, p.t) : 0
    const nx = p.x + Math.sin(p.h) * 8.4, nz = p.z + Math.cos(p.h) * 8.4
    tug.current.position.set(park[0] + (nx - park[0]) * k, 0.1, park[1] + (nz - park[1]) * k)
    tug.current.rotation.y = k > 0.5 ? p.h + Math.PI : -Math.PI / 2
  })

  return (
    <>
      <mesh geometry={geoHangar} material={AIRCRAFT_MAT} position={[HANGAR_AC[0], 0.14, HANGAR_AC[1]]} rotation={[0, Math.PI, 0]} castShadow receiveShadow raycast={() => null} />
      <group position={[STAND1[0], 0.1, STAND1[1]]}>
        <mesh geometry={geoStand} material={AIRCRAFT_MAT} castShadow receiveShadow raycast={() => null} />
        <Lights refs={standLights} />
      </group>
      <group ref={visitor}>
        <mesh geometry={geoVisit} material={AIRCRAFT_MAT} castShadow receiveShadow raycast={() => null} frustumCulled={false} />
        <Lights refs={visitorLights} />
      </group>
      <group ref={tug}>
        {tugParts.map((p, i) => (
          <mesh key={i} geometry={GEO.box} position={p.p} scale={p.s} castShadow raycast={() => null}>
            <meshStandardMaterial color={p.c} roughness={0.85} />
          </mesh>
        ))}
      </group>
    </>
  )
}

// ───────────────────────────── clouds ─────────────────────────────

const PUFF = new THREE.IcosahedronGeometry(0.5, 1)

/** A few low, stylised clouds. They cast real shadows that drift across the city. */
function Clouds() {
  const { mesh, puffs } = useMemo(() => {
    const r = rng(77)
    const puffs: { x: number; y: number; z: number; sx: number; sy: number; sz: number; v: number }[] = []
    for (let c = 0; c < 7; c++) {
      const cx = -300 + (c / 7) * 600 + r() * 40, cz = -70 + r() * 150, cy = 64 + r() * 14, v = 1.3 + r() * 0.8
      const n = 3 + Math.floor(r() * 3)
      for (let k = 0; k < n; k++) {
        const big = 1 - Math.abs(k - (n - 1) / 2) / n
        puffs.push({ x: cx + (k - (n - 1) / 2) * 6.5 + r() * 2, y: cy + big * 1.6, z: cz + r() * 4 - 2, sx: 9 + big * 7, sy: 3.4 + big * 3.2, sz: 7 + big * 4, v })
      }
    }
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#aab6c4', emissiveIntensity: 0.55, roughness: 1, flatShading: true, transparent: true, fog: false })
    const mesh = new THREE.InstancedMesh(PUFF, mat, puffs.length)
    mesh.frustumCulled = false; mesh.raycast = () => {}; mesh.castShadow = true; mesh.renderOrder = 3
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    return { mesh, puffs }
  }, [])
  useEffect(() => () => { (mesh.material as THREE.Material).dispose(); mesh.dispose() }, [mesh])
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    const t = world.t
    puffs.forEach((p, i) => {
      _o.position.set(((((p.x + t * p.v + 300) % 600) + 600) % 600) - 300, p.y, p.z)
      _o.rotation.set(0, i * 1.3, 0)
      _o.scale.set(p.sx, p.sy, p.sz)
      _o.updateMatrix()
      mesh.setMatrixAt(i, _o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    // clouds clear as the camera comes down to read the city
    const mat = mesh.material as THREE.MeshStandardMaterial
    mat.opacity = 0.94 * smooth(84, 118, camera.position.y) * (1 - world.dim * 0.75)
    mat.emissiveIntensity = lerp(0.55, 0.12, world.night)
    mesh.visible = mat.opacity > 0.02
  })
  return <primitive object={mesh} />
}

export function Life() {
  const low = useApp((s) => s.settings.lowPower)
  return (
    <>
      <People count={low ? 46 : 150} />
      <Vehicles low={low} />
      <Aircraft />
      {!low && <Clouds />}
    </>
  )
}
