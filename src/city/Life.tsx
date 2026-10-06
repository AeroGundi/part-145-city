/**
 * The living world: people, vehicles, aircraft and clouds.
 *
 * Aircraft and clouds are closed-form functions of the ambient clock; people and
 * vehicles are stepped by `traffic.ts` (fixed time step, seeded), so the world is deterministic,
 * costs a few hundred matrix writes per frame, and freezes cleanly when the
 * user turns animation off.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DISTRICTS } from '../content/city'
import { useApp } from '../store/app'
import { C, lerp, mix, rng, smooth, world } from './world'
import { GEO, MAT } from './parts'
import { vehicle } from './prefabs'
import { anchorSpots, FLOOR_Y } from './buildings'
import { HANGAR_AC, STAND1 } from './layout'
import { ambientCars, ambientWalkers, Traffic } from './traffic'
import { AIRSIDE_Z, LOOK_OF_ROLE, outfit, type Look, type Outfit } from './looks'
import { AIRCRAFT_MAT, aircraftGeometry, flightPose, groundObstacles, pushTug, type FlightPose } from './aircraft'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const _o = new THREE.Object3D()
const _c = new THREE.Color()

// ───────────────────────────── people ─────────────────────────────
// A figure is a torso, two legs and two arms that swing with the stride, a head and
// either hair or a hard hat; people who work around aircraft wear a hi-vis band.

/** unit box hanging from its top face, so a limb rotates about the hip or shoulder */
const LIMB = new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0)
const HEAD = new THREE.SphereGeometry(0.5, 12, 9)
const CAP = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.52)
const HAIR = ['#2b2118', '#4a3524', '#7a5a3a', '#1c1c1e', '#b9b2a6', '#8c4a2f']
/** box instances per figure: torso, vest, reflective band, carried item, badge or cap peak */
const SLOTS = 5

interface Figure { o: Outfit; skin: string; hair: string; tall: number }

function People({ traffic }: { traffic: Traffic }) {
  const { spots, figures, limbs, boxes, heads, caps } = useMemo(() => {
    const walkers = traffic.walkers
    // the characters: one figure for every role anchor in the city
    const spots = DISTRICTS.flatMap((d) => anchorSpots(d, FLOOR_Y[d.id]).filter((s) => s.role).map((s) => ({ ...s, look: LOOK_OF_ROLE[s.place.split('/')[2]] ?? 'office', airside: d.kind === 'apron' })))
    const n = walkers.length + spots.length
    const r = rng(66)
    const fig = (look: Look, airside: boolean, skin: string): Figure => ({ o: outfit(look, airside, r), skin, hair: HAIR[Math.floor(r() * HAIR.length)], tall: 0.94 + r() * 0.14 })
    const figures: Figure[] = [
      ...walkers.map((w) => fig(w.look, w.airside, w.skin)),
      ...spots.map((s) => fig(s.look, s.airside, C.skin[Math.floor(r() * C.skin.length)])),
    ]
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 })
    const limbs = new THREE.InstancedMesh(LIMB, mat, n * 4)
    const boxes = new THREE.InstancedMesh(GEO.box, mat, n * SLOTS)
    const heads = new THREE.InstancedMesh(HEAD, mat, n)
    const caps = new THREE.InstancedMesh(CAP, mat, n)
    figures.forEach(({ o, skin, hair }, i) => {
      limbs.setColorAt(i * 4, _c.set(o.legs)); limbs.setColorAt(i * 4 + 1, _c.set(o.legs))
      limbs.setColorAt(i * 4 + 2, _c.set(o.top)); limbs.setColorAt(i * 4 + 3, _c.set(o.top))
      boxes.setColorAt(i * SLOTS, _c.set(o.top)); boxes.setColorAt(i * SLOTS + 1, _c.set(o.vest ?? o.top)); boxes.setColorAt(i * SLOTS + 2, _c.set('#f1f3ea'))
      boxes.setColorAt(i * SLOTS + 3, _c.set(o.item?.color ?? o.top)); boxes.setColorAt(i * SLOTS + 4, _c.set(o.brim ?? o.badge ?? o.top))
      heads.setColorAt(i, _c.set(skin)); caps.setColorAt(i, _c.set(o.helmet ?? hair))
    })
    for (const m of [limbs, boxes, heads, caps]) { m.castShadow = true; m.frustumCulled = false; m.raycast = () => {}; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage) }
    return { spots, figures, limbs, boxes, heads, caps }
  }, [traffic])
  useEffect(() => () => { limbs.dispose(); boxes.dispose(); heads.dispose(); caps.dispose(); (limbs.material as THREE.Material).dispose() }, [limbs, boxes, heads, caps])
  const camera = useThree((s) => s.camera)
  const root = useMemo(() => new THREE.Object3D(), [])
  const part = useMemo(() => { const c = new THREE.Object3D(); root.add(c); return c }, [root])

  useFrame(() => {
    const t = world.t
    const walkers = traffic.walkers
    const quiet = traffic.quiet
    const focus = useApp.getState().focus
    const put = (mesh: THREE.InstancedMesh, k: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0) => {
      part.position.set(x, y, z); part.rotation.set(rx, 0, 0); part.scale.set(sx, sy, sz); part.updateMatrix()
      part.matrixWorld.multiplyMatrices(root.matrixWorld, part.matrix)
      mesh.setMatrixAt(k, part.matrixWorld)
    }
    const draw = (i: number, x: number, y: number, z: number, h: number, scale: number, stride: number, sway: number, hiVis = true) => {
      const f = figures[i]
      if (scale <= 0.01) {
        for (let k = 0; k < 4; k++) limbs.setMatrixAt(i * 4 + k, ZERO)
        for (let k = 0; k < SLOTS; k++) boxes.setMatrixAt(i * SLOTS + k, ZERO)
        heads.setMatrixAt(i, ZERO); caps.setMatrixAt(i, ZERO)
        return
      }
      const o = f.o
      root.position.set(x, y + Math.abs(stride) * 0.03, z)
      root.rotation.set(0, h, sway)
      root.scale.setScalar(scale * f.tall)
      root.updateMatrixWorld()
      // someone holding a clipboard or a stamp keeps that arm bent in front
      const holds = o.item && o.item.kind !== 'tie'
      put(limbs, i * 4, -0.085, 0.46, 0, 0.13, 0.46, 0.15, stride * 0.7)
      put(limbs, i * 4 + 1, 0.085, 0.46, 0, 0.13, 0.46, 0.15, -stride * 0.7)
      put(limbs, i * 4 + 2, -0.225, 0.8, 0, 0.09, 0.36, 0.11, -stride * 0.55)
      put(limbs, i * 4 + 3, 0.225, 0.8, 0, 0.09, 0.36, 0.11, holds ? -1.15 : stride * 0.55)
      const b = i * SLOTS
      put(boxes, b, 0, 0.635, 0, 0.36, 0.37, 0.2)
      if (o.vest && hiVis) { put(boxes, b + 1, 0, 0.65, 0, 0.385, 0.31, 0.225); put(boxes, b + 2, 0, 0.58, 0, 0.395, 0.055, 0.235) }
      else { boxes.setMatrixAt(b + 1, ZERO); boxes.setMatrixAt(b + 2, ZERO) }
      if (o.item?.kind === 'tie') put(boxes, b + 3, 0, 0.67, 0.106, 0.05, 0.24, 0.012)
      else if (o.item?.kind === 'clipboard') put(boxes, b + 3, 0.2, 0.62, 0.3, 0.2, 0.26, 0.02, -0.5)
      else if (o.item?.kind === 'stamp') put(boxes, b + 3, 0.225, 0.6, 0.33, 0.1, 0.14, 0.1)
      else boxes.setMatrixAt(b + 3, ZERO)
      if (o.brim) put(boxes, b + 4, 0, 1.0, 0.13, 0.22, 0.025, 0.14)
      else if (o.badge) put(boxes, b + 4, -0.09, 0.72, 0.118, 0.07, 0.07, 0.012)
      else boxes.setMatrixAt(b + 4, ZERO)
      const hat = !!o.helmet
      put(heads, i, 0, 0.945, 0, 0.23, 0.25, 0.23)
      put(caps, i, 0, hat ? 0.975 : 0.955, hat ? 0.01 : -0.012, hat ? 0.3 : 0.25, hat ? 0.22 : 0.26, hat ? 0.32 : 0.25)
    }
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i]
      const scale = w.scale * (w.night ? 1 : 1 - quiet)
      // the stride follows the distance walked, so feet do not slide
      const stride = w.moving ? Math.sin(w.d * 4.4 + i) : 0
      draw(i, w.pose.x, 0.07, w.pose.z, w.pose.h + (w.moving ? 0 : Math.sin(t * 0.6 + i) * 0.4), scale, stride, 0, w.pose.z < AIRSIDE_Z + 0.6)
    }
    for (let k = 0; k < spots.length; k++) {
      const s = spots[k], i = walkers.length + k
      const hot = focus === s.place
      // the role a requirement lives with turns to face the viewer
      const face = hot ? Math.atan2(camera.position.x - s.x, camera.position.z - s.z) : Math.PI + Math.sin(k * 12.9) * 0.5 + Math.sin(t * 0.4 + k) * 0.25
      draw(i, s.x - 0.75 * s.scale, s.y + (hot ? Math.abs(Math.sin(t * 3)) * 0.06 : 0), s.z - 0.3 * s.scale, face, Math.max(0.8, s.scale) * (hot ? 1.25 : 1), Math.sin(t * 1.3 + k) * 0.12, 0)
    }
    for (const m of [limbs, boxes, heads, caps]) m.instanceMatrix.needsUpdate = true
  })
  return <><primitive object={limbs} /><primitive object={boxes} /><primitive object={heads} /><primitive object={caps} /></>
}

// ───────────────────────────── vehicles ─────────────────────────────

function Vehicles({ traffic }: { traffic: Traffic }) {
  const { units, mesh } = useMemo(() => {
    const units = traffic.cars.flatMap((c) => c.units.map((u) => ({ u, parts: vehicle(u.kind, u.color), first: 0 })))
    let total = 0
    for (const x of units) { x.first = total; total += x.parts.length }
    const mesh = new THREE.InstancedMesh(GEO.box, MAT.solid, total)
    for (const x of units) x.parts.forEach((p, k) => mesh.setColorAt(x.first + k, _c.set(p.c)))
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.raycast = () => {}
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    return { units, mesh }
  }, [traffic])
  useEffect(() => () => { mesh.dispose() }, [mesh])
  const root = useMemo(() => new THREE.Object3D(), [])
  const child = useMemo(() => { const c = new THREE.Object3D(); root.add(c); return c }, [root])

  useFrame(() => {
    for (const x of units) {
      root.position.set(x.u.pose.x, 0.07, x.u.pose.z)
      root.rotation.set(0, x.u.pose.h, 0)
      root.updateMatrixWorld()
      for (let k = 0; k < x.parts.length; k++) {
        const p = x.parts[k]
        child.position.set(p.p[0], p.p[1], p.p[2])
        child.rotation.set(p.r?.[0] ?? 0, p.r?.[1] ?? 0, p.r?.[2] ?? 0, 'YXZ')
        child.scale.set(p.s[0], p.s[1], p.s[2])
        child.updateMatrix()
        child.matrixWorld.multiplyMatrices(root.matrixWorld, child.matrix)
        mesh.setMatrixAt(x.first + k, child.matrixWorld)
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
  const tugPose = useMemo(() => ({ x: 0, z: 0, h: 0 }), [])

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
    const tg = pushTug(t, tugPose)
    tug.current.position.set(tg.x, 0.1, tg.z)
    tug.current.rotation.y = tg.h
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
  const traffic = useMemo(() => {
    const T = new Traffic(ambientCars(low), ambientWalkers(low ? 46 : 150))
    // let everyone get up to speed before the first frame
    for (let i = 0; i < 40; i++) T.advance(0.25, () => groundObstacles(world.t + 30))
    return T
  }, [low])
  const last = useRef(world.t)
  useFrame(() => {
    const dt = world.t - last.current
    last.current = world.t
    traffic.quiet = smooth(0.35, 0.75, world.night)
    if (dt > 0) traffic.advance(dt, () => groundObstacles(world.t + 30))
  })
  return (
    <>
      <People traffic={traffic} />
      <Vehicles traffic={traffic} />
      <Aircraft />
      {!low && <Clouds />}
    </>
  )
}
