/**
 * What the city says back: where the selected requirement lives, how it connects
 * to others, and the information-security layer that runs under everything.
 * All of it is read from the knowledge graph — nothing is positioned by hand.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import { DISTRICT_BY_ID, placePosition, resolvePlace, type Place } from '../content/city'
import { ITEMS, pointOf } from '../data/dataset'
import { connectionsOf, infosecLinks, placesOf, type Link } from '../graph/graph'
import { useApp } from '../store/app'
import { FLOOR_Y } from './buildings'
import { world } from './world'

const AMBER = '#f2b233', BLUE = '#8fc7f2', CYAN = '#7fd6f5'

export interface Layer { kind: 'connections' | 'infosec' | null; places: Place[]; links: Link[]; districts: Set<string> }
const NONE: Layer = { kind: null, places: [], links: [], districts: new Set() }

/** The active relationship layer, if any. */
export function useLayer(): Layer {
  const selectedId = useApp((s) => s.selectedId)
  const selectedPath = useApp((s) => s.selectedPath)
  const connections = useApp((s) => s.connections)
  const infosec = useApp((s) => s.infosec)
  return useMemo(() => {
    if (infosec) { const l = infosecLinks(); return { kind: 'infosec' as const, ...l, districts: new Set(l.places.map((p) => p.split('/')[0])) } }
    if (connections && selectedId && ITEMS[selectedId]) {
      const it = ITEMS[selectedId]
      const l = connectionsOf(it.type === 'IR' ? pointOf(selectedId).id : selectedId, it.type === 'IR' ? selectedPath : '')
      const all = [...l.places, ...l.links.map((k) => k.from)]
      return { kind: 'connections' as const, ...l, districts: new Set(all.map((p) => p.split('/')[0])) }
    }
    return NONE
  }, [selectedId, selectedPath, connections, infosec])
}

/** The places the current selection lives at. */
export function useSelection(): { primary: Place | null; also: Place[]; ref: string | null } {
  const selectedId = useApp((s) => s.selectedId)
  const selectedPath = useApp((s) => s.selectedPath)
  const focus = useApp((s) => s.focus)
  return useMemo(() => {
    const it = selectedId ? ITEMS[selectedId] : null
    if (!it) return { primary: focus, also: [], ref: null }
    const p = placesOf(it.type === 'IR' ? pointOf(it.id).id : it.id, it.type === 'IR' ? selectedPath : '')
    return { primary: focus ?? p.primary, also: p.also.filter((a) => a !== focus), ref: it.type === 'IR' ? pointOf(it.id).reference + selectedPath : it.reference }
  }, [selectedId, selectedPath, focus])
}

export function at(place: Place): [number, number, number] {
  const [x, z] = placePosition(place)
  const r = resolvePlace(place)
  const d = r?.district
  // a whole district is marked above its roof; a room or anchor on its floor
  return [x, d && !r?.room ? d.height + 1 : d ? FLOOR_Y[d.id] : 0, z]
}

/** Pulsing ring + beam + pin over a place. */
function Marker({ place, color, strong }: { place: Place; color: string; strong?: boolean }) {
  const ring = useRef<THREE.Mesh>(null!)
  const pin = useRef<THREE.Mesh>(null!)
  const [x, y, z] = at(place)
  const size = strong ? 1 : 0.62
  useFrame(() => {
    const k = (world.t * 0.6 + x * 0.01) % 1
    ring.current.scale.setScalar(size * (0.6 + k * 2.6))
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85
    if (pin.current) pin.current.position.y = y + 3.3 + Math.sin(world.t * 2.2) * 0.22
  })
  return (
    <group>
      <mesh ref={ring} position={[x, y + 0.14, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={5}>
        <ringGeometry args={[0.82, 1, 40]} />
        <meshBasicMaterial color={color} transparent depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[x, y + 0.13, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={5}>
        <circleGeometry args={[0.34 * size, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} toneMapped={false} />
      </mesh>
      {strong && (
        <>
          <mesh position={[x, y + 1.7, z]} raycast={() => null} renderOrder={5}>
            <cylinderGeometry args={[0.035, 0.035, 3.2, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.75} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh ref={pin} position={[x, y + 3.3, z]} rotation={[Math.PI, 0, 0]} raycast={() => null} renderOrder={5}>
            <coneGeometry args={[0.34, 0.72, 4]} />
            <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Outline of a district footprint, so the building is findable from far away. */
function Footprint({ id, color }: { id: string; color: string }) {
  const d = DISTRICT_BY_ID[id]
  const pts = useMemo(() => {
    const [cx, cz] = d.pos, w = d.size[0] / 2 + 1.1, dp = d.size[1] / 2 + 1.1
    return [[cx - w, 0.3, cz - dp], [cx + w, 0.3, cz - dp], [cx + w, 0.3, cz + dp], [cx - w, 0.3, cz + dp], [cx - w, 0.3, cz - dp]] as [number, number, number][]
  }, [d])
  return <Line points={pts} color={color} lineWidth={2.4} transparent opacity={0.95} depthTest={false} renderOrder={4} toneMapped={false} raycast={() => null} />
}

type LineRef = { material: { dashOffset: number } }

function Arc({ link }: { link: Link }) {
  const ref = useRef<LineRef>(null)
  const a = at(link.from), b = at(link.to)
  const dist = Math.hypot(a[0] - b[0], a[2] - b[2])
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 9 + dist * 0.2, (a[2] + b[2]) / 2]
  const color = link.kind === 'self' ? AMBER : link.kind === 'process' ? BLUE : '#ffe0a0'
  useFrame((_, dt) => { if (ref.current) ref.current.material.dashOffset -= dt * 2.2 })
  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <QuadraticBezierLine ref={ref as any} start={[a[0], a[1] + 0.6, a[2]]} end={[b[0], b[1] + 0.6, b[2]]} mid={mid} color={color} lineWidth={link.kind === 'self' ? 2.6 : 1.8} dashed dashSize={1.5} gapSize={1.0} transparent opacity={0.95} toneMapped={false} raycast={() => null} />
      {link.kind !== 'self' && <Marker place={link.to} color={color} />}
    </>
  )
}

/** A cable of the digital layer: runs along the ground, through the buildings. */
function Cable({ link, i }: { link: Link; i: number }) {
  const ref = useRef<LineRef>(null)
  const pulse = useRef<THREE.Mesh>(null!)
  const [ax, , az] = at(link.from), [bx, , bz] = at(link.to)
  const pts = useMemo(() => [[ax, 0.5, az], [bx, 0.5, az], [bx, 0.5, bz]] as [number, number, number][], [ax, az, bx, bz])
  const l1 = Math.abs(bx - ax), l2 = Math.abs(bz - az)
  useFrame((_, dt) => {
    if (ref.current) ref.current.material.dashOffset -= dt * 3
    const k = ((world.t * 0.22 + i * 0.137) % 1) * (l1 + l2)
    pulse.current.position.set(k < l1 ? ax + Math.sign(bx - ax) * k : bx, 0.5, k < l1 ? az : az + Math.sign(bz - az) * (k - l1))
  })
  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Line ref={ref as any} points={pts} color={CYAN} lineWidth={link.label ? 2 : 1.1} dashed dashSize={0.9} gapSize={0.7} transparent opacity={link.label ? 0.95 : 0.5} depthTest={false} renderOrder={4} toneMapped={false} raycast={() => null} />
      <mesh ref={pulse} raycast={() => null} renderOrder={6}>
        <sphereGeometry args={[0.42, 10, 8]} />
        <meshBasicMaterial color="#e6faff" depthTest={false} toneMapped={false} />
      </mesh>
    </>
  )
}

export function Overlays() {
  const layer = useLayer()
  const sel = useSelection()
  const primaryDistrict = sel.primary?.split('/')[0]
  const r = sel.primary ? resolvePlace(sel.primary) : null
  return (
    <>
      {sel.primary && r && (
        <>
          <Footprint id={primaryDistrict!} color={AMBER} />
          {r.room && <Marker place={sel.primary} color={AMBER} strong />}
          {!layer.kind && sel.also.map((p) => <Marker key={p} place={p} color={BLUE} />)}
          {!layer.kind && [...new Set(sel.also.map((p) => p.split('/')[0]))].filter((id) => id !== primaryDistrict).map((id) => <Footprint key={id} id={id} color={BLUE} />)}
        </>
      )}
      {layer.kind === 'connections' && (
        <>
          {[...layer.districts].filter((id) => id !== primaryDistrict).map((id) => <Footprint key={id} id={id} color="#ffe0a0" />)}
          {layer.links.map((l, i) => <Arc key={i} link={l} />)}
        </>
      )}
      {layer.kind === 'infosec' && (
        <>
          {[...layer.districts].map((id) => <Footprint key={id} id={id} color={CYAN} />)}
          {layer.links.map((l, i) => <Cable key={i} link={l} i={i} />)}
        </>
      )}
    </>
  )
}
