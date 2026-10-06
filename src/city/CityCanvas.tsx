/**
 * The city: canvas, light and time of day, and the camera that flies to wherever
 * a requirement lives. Lazy-loaded by the shell, so the regulatory interface never
 * waits for three.js.
 */
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { WORLD, placePosition, resolvePlace, roomRects, type Place } from '../content/city'
import { useApp } from '../store/app'
import { clamp, damp, DAY_LENGTH, lerp, smooth, world } from './world'
import { NIGHT_GLASS } from './parts'
import { Ground } from './Ground'
import { Districts } from './Districts'
import { Life } from './Life'
import { Overlays } from './Overlays'
import { CityLabels, LabelProjector } from './Labels'

interface View { tx: number; tz: number; dist: number; pol: number; az: number }
const AZ0 = Math.PI + 0.2
const HOME: View = { tx: -14, tz: -2, dist: 318, pol: 0.9, az: AZ0 }
/** width of the floating panels that cover the canvas, px */
const LEFT_RAIL = 308
const rightPanel = (w: number) => Math.min(500, w - 340) + 12

/** Overview distance that fits the whole world — authority to contractor — in the free part of the canvas. */
function homeView(): View {
  const s = useApp.getState()
  const w = innerWidth - (s.settings.tocOpen ? LEFT_RAIL : 0), h = Math.max(320, innerHeight - 82)
  return { ...HOME, dist: clamp(104 / (Math.tan((13 * Math.PI) / 180) * (w / h)), 240, 410) }
}

function viewFor(place: Place | null): Omit<View, 'az'> {
  const r = place ? resolvePlace(place) : null
  if (!r) return homeView()
  const d = r.district
  if (!r.room) return { tx: d.pos[0], tz: d.pos[1] - (d.kind === 'apron' ? 0 : 1), dist: clamp(Math.max(d.size[0], d.size[1] * 1.5) * 2.9 + 24, 62, 190), pol: 0.74 }
  const rect = roomRects(d).find((x) => x.room.id === r.room!.id)!
  if (!r.anchor) return { tx: rect.x, tz: rect.z, dist: clamp(Math.max(rect.w, rect.d * 1.4) * 2.6 + 26, 40, 112), pol: 0.68 }
  const [x, z] = placePosition(place!)
  return { tx: x, tz: z + 0.6, dist: clamp(Math.max(rect.w, rect.d) * 2.3 + 30, 46, 92), pol: 0.66 }
}

type Controls = { target: THREE.Vector3; enabled: boolean; update: () => void; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void }

function Rig() {
  const controls = useRef<Controls | null>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const focusTick = useApp((s) => s.focusTick)
  const tween = useRef<gsap.core.Tween | null>(null)
  const first = useRef(true)
  const offset = useRef({ cur: 0, applied: NaN, w: 0, h: 0 })

  const api = useMemo(() => {
    const read = (): View => {
      const t = controls.current!.target
      const o = camera.position.clone().sub(t)
      const dist = o.length()
      return { tx: t.x, tz: t.z, dist, pol: Math.acos(clamp(o.y / dist, -1, 1)), az: Math.atan2(o.x, o.z) }
    }
    const apply = (v: View) => {
      const c = controls.current!
      const sp = Math.sin(v.pol)
      c.target.set(clamp(v.tx, WORLD.minX, WORLD.maxX), 0, clamp(v.tz, WORLD.minZ, WORLD.maxZ))
      camera.position.set(c.target.x + v.dist * sp * Math.sin(v.az), v.dist * Math.cos(v.pol), c.target.z + v.dist * sp * Math.cos(v.az))
      camera.lookAt(c.target)
      invalidate()
    }
    const stop = () => { if (tween.current) { tween.current.kill(); tween.current = null } if (controls.current) controls.current.enabled = true }
    const fly = (goal: View, instant: boolean, from?: View) => {
      const c = controls.current!
      stop()
      const cur = from ?? read()
      if (from) apply(from)
      if (instant) { apply(goal); c.update(); return }
      let daz = goal.az - cur.az
      while (daz > Math.PI) daz -= 2 * Math.PI
      while (daz < -Math.PI) daz += 2 * Math.PI
      const travel = Math.hypot(goal.tx - cur.tx, goal.tz - cur.tz)
      // long hops pull back first, so the user sees where in the city they are going
      const hop = Math.min(80, travel * 0.6) * (Math.max(cur.dist, goal.dist) < 170 ? 1 : 0.25)
      const st = { k: 0 }
      c.enabled = false
      tween.current = gsap.to(st, {
        k: 1, duration: clamp(0.7 + travel / 130, 0.7, 1.7), ease: 'power2.inOut',
        onUpdate: () => apply({ tx: lerp(cur.tx, goal.tx, st.k), tz: lerp(cur.tz, goal.tz, st.k), dist: lerp(cur.dist, goal.dist, st.k) + hop * Math.sin(Math.PI * st.k), pol: lerp(cur.pol, goal.pol, st.k), az: cur.az + daz * st.k }),
        onComplete: () => { tween.current = null; c.enabled = true; c.update() },
      })
    }
    return { read, apply, stop, fly }
  }, [camera, invalidate])
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __city?: unknown }).__city = { ...api, controls, world, gl, useApp } }, [api, gl])

  // fly to wherever the application is focused
  useEffect(() => {
    if (!controls.current) return
    const s = useApp.getState()
    const cinematic = s.settings.cinematic
    if (first.current) {
      first.current = false
      // a deep link starts from the overview, so the flight shows where the place is
      if (s.focus && cinematic) api.fly({ ...viewFor(s.focus), az: AZ0 }, false, homeView())
      else api.fly({ ...viewFor(s.focus), az: AZ0 }, true)
      return
    }
    api.fly({ ...viewFor(s.focus), az: s.focus ? api.read().az : AZ0 }, !cinematic)
  }, [focusTick, api])

  // any direct manipulation cancels a flight; keep the target inside the world
  useEffect(() => {
    const el = gl.domElement.parentElement ?? gl.domElement
    const c = controls.current
    const onDown = () => api.stop()
    const bound = () => {
      if (!c) return
      const x = clamp(c.target.x, WORLD.minX, WORLD.maxX), z = clamp(c.target.z, WORLD.minZ, WORLD.maxZ)
      if (x !== c.target.x || z !== c.target.z) { camera.position.x += x - c.target.x; camera.position.z += z - c.target.z; c.target.x = x; c.target.z = z }
      if (c.target.y !== 0) { camera.position.y -= c.target.y; c.target.y = 0 }
    }
    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('wheel', onDown, { capture: true, passive: true })
    c?.addEventListener('change', bound)
    return () => { el.removeEventListener('pointerdown', onDown, true); el.removeEventListener('wheel', onDown, true); c?.removeEventListener('change', bound) }
  }, [gl, camera, api])

  // keyboard: arrows pan, +/- zoom, [ ] rotate, 0 home
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState()
      if (s.mode !== 'explore' || s.overlay || e.metaKey || e.ctrlKey || e.altKey || !controls.current) return
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName ?? '') || (e.target as HTMLElement)?.closest?.('.detail, .toc')) return
      const v = api.read()
      const step = v.dist * 0.09
      const fx = -Math.sin(v.az), fz = -Math.cos(v.az)
      if (e.key === 'ArrowUp') { v.tx += fx * step; v.tz += fz * step }
      else if (e.key === 'ArrowDown') { v.tx -= fx * step; v.tz -= fz * step }
      else if (e.key === 'ArrowRight') { v.tx += -fz * step; v.tz += fx * step }
      else if (e.key === 'ArrowLeft') { v.tx -= -fz * step; v.tz -= fx * step }
      else if (e.key === '+' || e.key === '=') v.dist = Math.max(26, v.dist * 0.84)
      else if (e.key === '-' || e.key === '_') v.dist = Math.min(400, v.dist / 0.84)
      else if (e.key === '[') v.az -= 0.2
      else if (e.key === ']') v.az += 0.2
      else if (e.key === '0') Object.assign(v, homeView())
      else return
      e.preventDefault()
      api.stop()
      api.apply(v)
      controls.current.update()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api])

  // shift the optical centre so the focus sits in the part of the canvas the panels leave free
  useFrame((st, dt) => {
    const s = useApp.getState()
    const o = offset.current
    const left = s.settings.tocOpen ? LEFT_RAIL : 0
    const right = s.panelOpen && (s.selectedId || s.focus) ? rightPanel(size.width) : 0
    const target = (right - left) / 2
    o.cur = Math.abs(o.cur - target) < 0.5 ? target : damp(o.cur, target, 7, Math.min(dt, 0.05))
    if (o.cur !== o.applied || o.w !== size.width || o.h !== size.height) {
      camera.setViewOffset(size.width, size.height, o.cur, 0, size.width, size.height)
      o.applied = o.cur; o.w = size.width; o.h = size.height
      if (o.cur !== target) st.invalidate()
    }
  })

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <MapControls ref={controls as any} makeDefault enableDamping dampingFactor={0.1} screenSpacePanning={false} zoomToCursor
      minDistance={26} maxDistance={430} minPolarAngle={0.18} maxPolarAngle={1.3} rotateSpeed={0.5} zoomSpeed={0.9} panSpeed={1.1} />
  )
}

const DAY = { sky: new THREE.Color('#f6f8fb'), ground: new THREE.Color('#cbc5b2'), sun: new THREE.Color('#fff2dc'), bg: new THREE.Color('#cfdbe6') }
const NIGHT = { sky: new THREE.Color('#8298c8'), ground: new THREE.Color('#2f3748'), sun: new THREE.Color('#b4c6ee'), bg: new THREE.Color('#121b2b') }
const DUSK = new THREE.Color('#ffae6e')
const SUN_DIR = new THREE.Vector3(0.56, 0.72, -0.42).normalize()

function Atmosphere() {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const sun = useRef<THREE.DirectionalLight>(null!)
  const aim = useRef<THREE.Object3D>(null!)
  const half = useRef(0)
  const bg = useMemo(() => new THREE.Color(DAY.bg), [])
  useEffect(() => {
    const fog = new THREE.Fog(bg.getHex(), 330, 980)
    scene.background = bg
    scene.fog = fog
    sun.current.target = aim.current
    return () => { scene.background = null; scene.fog = null }
  }, [scene, bg])

  useFrame((st, dt) => {
    const s = useApp.getState()
    const step = Math.min(dt, 0.1)
    if (s.settings.animation) world.t += step
    let target = s.settings.timeMode === 'night' ? 1 : 0
    if (s.settings.timeMode === 'auto') { const ph = (world.t % DAY_LENGTH) / DAY_LENGTH; target = smooth(0.52, 0.62, ph) - smooth(0.9, 0.99, ph) }
    const dimTarget = s.infosec || (s.connections && s.selectedId) ? 1 : 0
    const moving = Math.abs(world.night - target) > 0.002 || Math.abs(world.dim - dimTarget) > 0.002
    world.night = moving ? damp(world.night, target, 2.2, step) : target
    world.dim = moving ? damp(world.dim, dimTarget, 5, step) : dimTarget
    const n = world.night, k = 1 - 0.46 * world.dim
    const dusk = Math.sin(Math.PI * n) * 0.55

    hemi.current.color.lerpColors(DAY.sky, NIGHT.sky, n)
    hemi.current.groundColor.lerpColors(DAY.ground, NIGHT.ground, n)
    hemi.current.intensity = lerp(1.35, 0.95, n) * k
    sun.current.color.lerpColors(DAY.sun, NIGHT.sun, n).lerp(DUSK, dusk)
    sun.current.intensity = lerp(2.5, 0.85, n) * k
    bg.lerpColors(DAY.bg, NIGHT.bg, n).lerp(DUSK, dusk * 0.25).multiplyScalar(1 - 0.3 * world.dim)
    ;(scene.fog as THREE.Fog).color.copy(bg)
    for (const m of NIGHT_GLASS) m.emissiveIntensity = n * 1.15

    // the shadow frustum follows the view and tightens as the camera comes closer
    const ctl = st.controls as unknown as { target: THREE.Vector3 } | null
    const tg = ctl?.target
    if (tg) {
      const d = camera.position.distanceTo(tg)
      const h = d < 95 ? 60 : d < 180 ? 110 : 185
      const cam = sun.current.shadow.camera
      if (h !== half.current) { half.current = h; cam.left = -h; cam.right = h; cam.top = h; cam.bottom = -h; cam.near = 40; cam.far = 620; cam.updateProjectionMatrix() }
      const grid = h / 6
      aim.current.position.set(Math.round(tg.x / grid) * grid, 0, Math.round(tg.z / grid) * grid)
      sun.current.position.copy(aim.current.position).addScaledVector(SUN_DIR, 300)
    }
    if (moving) st.invalidate()
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffffff', '#cbc5b2', 1.35]} />
      <directionalLight ref={sun} castShadow intensity={2.5} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.06} />
      <object3D ref={aim} />
    </>
  )
}

/** With the render loop on demand (animation off), redraw whenever application state changes. */
function Invalidator() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => useApp.subscribe(() => invalidate()), [invalidate])
  return null
}

export default function CityCanvas({ active }: { active: boolean }) {
  const animation = useApp((s) => s.settings.animation)
  const lowPower = useApp((s) => s.settings.lowPower)
  return (
    <div className="city-wrap">
      <Canvas
        shadows={lowPower ? false : 'soft'} dpr={lowPower ? 1 : [1, 1.75]} frameloop={!active ? 'never' : animation ? 'always' : 'demand'}
        camera={{ fov: 26, near: 6, far: 1500, position: [-90, 150, -180] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1 }}
        aria-label="Part-145 City — interactive 3D map. All content is also available through search and the table of contents."
      >
        <Atmosphere />
        <Rig />
        <Ground />
        <Districts />
        <Life />
        <Overlays />
        <LabelProjector />
        <Invalidator />
      </Canvas>
      {active && <CityLabels />}
    </div>
  )
}
