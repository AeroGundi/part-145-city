/**
 * The districts: architecture, cut-away opening, click targets and labels.
 * A building opens (roof lifts, walls drop to knee height) while the city is
 * focused on a place inside it.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { DISTRICTS, roomRects, type District } from '../content/city'
import { useApp } from '../store/app'
import { goPlace } from '../nav'
import { buildDistrict } from './buildings'
import { build, disposeGroup, MAT, NIGHT_GLASS } from './parts'
import { damp, lerp } from './world'
import { Sign } from './Signs'

const setCursor = (on: boolean) => { document.body.style.cursor = on ? 'pointer' : '' }

function DistrictNode({ d }: { d: District }) {
  const built = useMemo(() => {
    const B = buildDistrict(d)
    const roofMats = { solid: MAT.solid.clone(), glass: MAT.glass.clone(), metal: MAT.metal.clone(), glow: MAT.glow.clone() }
    return {
      B, roofMats,
      fixed: build(B.fixed), walls: build(B.walls), roof: build(B.roof, { mats: roofMats }), interior: build(B.interior, { cast: false }),
      rects: roomRects(d),
    }
  }, [d])
  useEffect(() => {
    NIGHT_GLASS.push(built.roofMats.glass)
    return () => {
      NIGHT_GLASS.splice(NIGHT_GLASS.indexOf(built.roofMats.glass), 1)
      for (const g of [built.fixed, built.walls, built.roof, built.interior]) disposeGroup(g)
      Object.values(built.roofMats).forEach((m) => m.dispose())
    }
  }, [built])

  const focused = useApp((s) => !!s.focus && s.focus.split('/')[0] === d.id)

  const roofRef = useRef<THREE.Group>(null!)
  const open = useRef(-1)
  const [cx, cz] = d.pos
  const [w, dp] = d.size
  const h = d.height
  const opens = d.kind !== 'apron'

  useFrame((st, dt) => {
    const target = focused && opens ? 1 : 0
    if (open.current === target) return
    const first = open.current < 0
    let o = first ? target : damp(open.current, target, 5.5, Math.min(dt, 0.05))
    if (Math.abs(o - target) < 0.002) o = target
    open.current = o
    const e = o * o * (3 - 2 * o)
    if (h > 0) built.walls.scale.y = lerp(1, built.B.knee / h, e)
    const roof = roofRef.current
    roof.position.y = e * (h * 0.4 + 5)
    roof.visible = e < 0.985
    roof.traverse((ob) => {
      const m = (ob as THREE.Mesh).material as THREE.Material | undefined
      if (!m) return
      const fading = e > 0.001
      if (m.transparent !== fading && !(m as THREE.MeshBasicMaterial).map) { m.transparent = fading; m.needsUpdate = true }
      m.opacity = 1 - e
      ;(ob as THREE.Mesh).castShadow = e < 0.35 && !(m as THREE.MeshBasicMaterial).map
    })
    built.interior.visible = built.B.alwaysOpen || e > 0.01
    if (o !== target) st.invalidate()
  })

  const click = (place: string) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 6) return; setCursor(false); goPlace(place) }
  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); useApp.getState().set({ hover: d.id }); setCursor(true) }
  const out = () => { if (useApp.getState().hover === d.id) useApp.getState().set({ hover: null }); setCursor(false) }
  const fy = built.B.floorY

  return (
    <group>
      <primitive object={built.fixed} />
      <primitive object={built.walls} />
      <primitive object={built.interior} />
      {built.B.signs.map((s, i) => <Sign key={i} spec={s} />)}
      <group ref={roofRef}>
        <primitive object={built.roof} />
        {built.B.roofSigns.map((s, i) => <Sign key={i} spec={s} />)}
      </group>

      {!focused && (
        <mesh visible={false} position={[cx, Math.max(h, 0.4) / 2, cz]} onClick={click(d.id)} onPointerOver={over} onPointerOut={out}>
          <boxGeometry args={[w, Math.max(h, 0.4), dp]} />
        </mesh>
      )}
      {focused && built.rects.map((rc) => (
        <mesh key={rc.room.id} visible={false} position={[rc.x, fy + 0.5, rc.z]} onClick={click(`${d.id}/${rc.room.id}`)} onPointerOver={(e) => { e.stopPropagation(); setCursor(true) }} onPointerOut={() => setCursor(false)}>
          <boxGeometry args={[rc.w, 1, rc.d]} />
        </mesh>
      ))}

    </group>
  )
}

export function Districts() {
  return <>{DISTRICTS.map((d) => <DistrictNode key={d.id} d={d} />)}</>
}
