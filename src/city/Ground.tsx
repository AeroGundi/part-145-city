/**
 * Everything that lies flat or stands outside the buildings: terrain, roads,
 * runway and apron markings, the perimeter fence, trees, lamps and car parks.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DISTRICTS, PERIMETER, ROADS, RUNWAY, TAXIWAY } from '../content/city'
import { C, rng, world } from './world'
import { build, disposeGroup, GEO, place, type Part } from './parts'
import { lamp, tree, vehicle } from './prefabs'
import { APRON_LOOP, STAND1, STAND2, DOORS, FEET, PAVE, ZEBRAS } from './layout'
import { Sign } from './Signs'
import type { SignSpec } from './buildings'

interface Pool { x: number; z: number; r: number; warm: boolean }

function groundParts(): { parts: Part[]; pools: Pool[]; signs: SignSpec[] } {
  const P: Part[] = []
  const pools: Pool[] = []
  const signs: SignSpec[] = []
  const r = rng(145)
  const flat = (x0: number, x1: number, z0: number, z1: number, y: number, c: string, t = 0.04) => P.push({ p: [(x0 + x1) / 2, y - t / 2, (z0 + z1) / 2], s: [x1 - x0, t, z1 - z0], c })

  // campus slab and lawns
  flat(PERIMETER.minX, PERIMETER.maxX, -22, PERIMETER.maxZ, 0.04, C.concrete)
  const lawns: [number, number, number, number, number?][] = [
    [-73, -49.5, -19.5, 4.5, 11], [-72.5, 56.5, 48.2, 51.3, 16], [41.5, 51, 35.5, 46.5, 5], [14.5, 20.5, 36, 46], [-51.5, -43.5, 36, 46, 3], [-25, -21, 36, 46, 2],
    [-73, -70.5, 12.5, 46.5, 4], [-26.5, -23.4, -15, 3, 2], [14.6, 16.6, -18, 4, 0], [50.4, 51.2, -18, 26, 0],
  ]
  for (const [x0, x1, z0, z1] of lawns) flat(x0, x1, z0, z1, 0.07, C.lawn, 0.03)

  // apron, taxiway, runway
  flat(-70, 48, -42, -22, 0.1, C.apron, 0.1)
  for (let x = -64; x < 48; x += 6) flat(x - 0.03, x + 0.03, -42, -22, 0.104, C.apron2, 0.004)
  for (let z = -37; z < -22; z += 5) flat(-70, 48, z - 0.03, z + 0.03, 0.104, C.apron2, 0.004)
  const tzw = TAXIWAY.w / 2, rzw = RUNWAY.w / 2
  for (const sx of [STAND1[0], STAND2[0]]) flat(sx - 4.5, sx + 4.5, TAXIWAY.z + tzw, -42, 0.08, C.asphalt, 0.08)
  flat(-150, 150, TAXIWAY.z - tzw, TAXIWAY.z + tzw, 0.08, C.asphalt, 0.08)
  flat(-150, 150, TAXIWAY.z - 0.1, TAXIWAY.z + 0.1, 0.085, C.taxi, 0.005)
  flat(-260, 260, RUNWAY.z - rzw, RUNWAY.z + rzw, 0.08, C.runway, 0.08)
  for (const cx of [-43, 81]) flat(cx - 3.5, cx + 3.5, RUNWAY.z + rzw, TAXIWAY.z - tzw, 0.08, C.asphalt, 0.08)
  for (let x = -240; x < 240; x += 9) flat(x, x + 4.5, RUNWAY.z - 0.14, RUNWAY.z + 0.14, 0.086, C.mark, 0.004)
  for (const s of [-1, 1]) {
    flat(-250, 250, RUNWAY.z + s * (rzw - 0.3) - 0.08, RUNWAY.z + s * (rzw - 0.3) + 0.08, 0.086, C.mark, 0.004)
    for (let k = 0; k < 6; k++) flat(s * 96 - 3, s * 96 + 3, RUNWAY.z - 3.3 + k * 1.2, RUNWAY.z - 2.7 + k * 1.2, 0.086, C.mark, 0.004)
    for (const dx of [70, 55]) for (const dz of [-1.8, 1.8]) flat(s * dx - 2.4, s * dx + 2.4, RUNWAY.z + dz - 0.5, RUNWAY.z + dz + 0.5, 0.086, C.mark, 0.004)
  }
  signs.push({ text: '27', p: [86, 0.09, RUNWAY.z], w: 5, h: 5, flat: true, style: 'paint' }, { text: '09', p: [-86, 0.09, RUNWAY.z], w: 5, h: 5, flat: true, style: 'paint' })
  // stand lead-in lines and stop bars
  ;[STAND1, STAND2].forEach(([sx, sz], i) => {
    flat(sx - 0.1, sx + 0.1, TAXIWAY.z, sz + 5.4, 0.106, C.taxi, 0.004)
    flat(sx - 1.4, sx + 1.4, sz + 5.3, sz + 5.5, 0.106, C.taxi, 0.004)
    signs.push({ text: `STAND ${i + 1}`, p: [sx - 4.6, 0.11, sz + 7.2], w: 4.4, h: 0.9, flat: true, style: 'paint', color: 'rgba(240,235,221,.85)' })
  })
  // apron service road
  {
    const [[x0, z1], [x1], [, z0]] = APRON_LOOP
    for (const k of [-1, 1]) {
      for (let x = x0 + 1.5; x < x1 - 1.5; x += 2.4) { flat(x, x + 1.2, z1 - k * 1.0 - 0.05, z1 - k * 1.0 + 0.05, 0.106, C.mark, 0.004); flat(x, x + 1.2, z0 + k * 1.0 - 0.05, z0 + k * 1.0 + 0.05, 0.106, C.mark, 0.004) }
      for (let z = z0 + 1.5; z < z1 - 1.5; z += 2.4) { flat(x0 + k * 1.0 - 0.05, x0 + k * 1.0 + 0.05, z, z + 1.2, 0.106, C.mark, 0.004); flat(x1 - k * 1.0 - 0.05, x1 - k * 1.0 + 0.05, z, z + 1.2, 0.106, C.mark, 0.004) }
    }
  }

  // roads, with a centre line on public and internal ones
  for (const rd of ROADS) {
    const h = rd.a[1] === rd.b[1]
    const ext = rd.id === 'H1' ? 150 : 0
    const x0 = Math.min(rd.a[0], rd.b[0]) - (h ? ext : rd.w / 2), x1 = Math.max(rd.a[0], rd.b[0]) + (h ? ext : rd.w / 2)
    const z0 = Math.min(rd.a[1], rd.b[1]) - (h ? rd.w / 2 : 0), z1 = Math.max(rd.a[1], rd.b[1]) + (h ? rd.w / 2 : 0)
    flat(x0, x1, z0, z1, rd.kind === 'service' ? 0.066 : 0.07, rd.kind === 'service' ? '#6c737a' : C.asphalt, 0.03)
    if (rd.kind === 'service') continue
    if (h) for (let x = x0 + 1; x < x1 - 1; x += 3) flat(x, x + 1.3, rd.a[1] - 0.05, rd.a[1] + 0.05, 0.074, C.mark, 0.004)
    else for (let z = z0 + 1; z < z1 - 1; z += 3) flat(rd.a[0] - 0.05, rd.a[0] + 0.05, z, z + 1.3, 0.074, C.mark, 0.004)
  }
  // pavements along both sides of every road, and zebra crossings at the junctions
  for (const rd of ROADS) {
    const h = rd.a[1] === rd.b[1]
    const t0 = Math.min(h ? rd.a[0] : rd.a[1], h ? rd.b[0] : rd.b[1]), t1 = Math.max(h ? rd.a[0] : rd.a[1], h ? rd.b[0] : rd.b[1])
    for (const s of [-1, 1]) {
      const cc = (h ? rd.a[1] : rd.a[0]) + s * PAVE
      if (h) flat(t0 - PAVE - 0.7, t1 + PAVE + 0.7, cc - 0.7, cc + 0.7, 0.078, rd.kind === 'service' ? C.curb : C.pad, 0.035)
      else flat(cc - 0.7, cc + 0.7, t0 - PAVE - 0.7, t1 + PAVE + 0.7, 0.078, C.pad, 0.035)
    }
  }
  for (const zb of ZEBRAS) {
    const n = Math.max(3, Math.round(zb.w / 0.62))
    for (let i = 0; i < n; i++) {
      const o = -zb.w / 2 + (zb.w * (i + 0.5)) / n
      if (zb.acrossV) flat(zb.x + o - 0.15, zb.x + o + 0.15, zb.z - 0.65, zb.z + 0.65, 0.076, C.mark, 0.004)
      else flat(zb.x - 0.65, zb.x + 0.65, zb.z + o - 0.15, zb.z + o + 0.15, 0.076, C.mark, 0.004)
    }
  }
  // paths from every door to its pavement
  for (const d of DISTRICTS) {
    const door = DOORS[d.id], foot = FEET[d.id]
    if (d.kind === 'apron' || d.kind === 'hangar') continue
    flat(door[0] - 1.1, door[0] + 1.1, Math.min(door[1], foot[1]), Math.max(door[1], foot[1]), 0.075, C.curb, 0.03)
  }

  // staff car park beside HQ
  flat(9.3, 16.6, 11.6, 26.4, 0.072, '#6a7178', 0.03)
  const carCols = ['#c9ced3', C.navy, '#8a3f34', '#e9e5da', '#5d7f9c', '#3b4652', '#b7c2ab', '#d9d3c2']
  for (let i = 0; i < 6; i++) {
    flat(9.5, 12.5, 12.6 + i * 2.2 - 0.04, 12.6 + i * 2.2 + 0.04, 0.076, C.mark, 0.004)
    flat(13.5, 16.4, 12.6 + i * 2.2 - 0.04, 12.6 + i * 2.2 + 0.04, 0.076, C.mark, 0.004)
    if (r() < 0.85) P.push(...place(vehicle('car', carCols[Math.floor(r() * carCols.length)]), 11.0, 13.7 + i * 2.2, Math.PI / 2))
    if (r() < 0.7) P.push(...place(vehicle('car', carCols[Math.floor(r() * carCols.length)]), 15.0, 13.7 + i * 2.2, -Math.PI / 2))
  }

  // perimeter fence — Section A lives inside it — with gates where the roads cross
  const post = (x: number, z: number) => P.push({ p: [x, 0.8, z], s: [0.09, 1.6, 0.09], c: C.steel })
  const run = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 3.4))
    for (let i = 0; i <= n; i++) post(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n)
    for (const y of [1.55, 0.95, 0.35]) P.push({ p: [(x0 + x1) / 2, y, (z0 + z1) / 2], s: [Math.abs(x1 - x0) + 0.05, 0.04, Math.abs(z1 - z0) + 0.05], c: C.steelLight })
  }
  const { minX, maxX, minZ, maxZ } = PERIMETER
  run(minX, maxZ, maxX, maxZ)
  run(minX, minZ, minX, 5.6); run(minX, 10.4, minX, 27.8); run(minX, 32.2, minX, maxZ)
  run(maxX, minZ, maxX, 5.6); run(maxX, 10.4, maxX, maxZ)
  run(minX, minZ, -70, minZ); run(48, minZ, maxX, minZ)
  for (const [gx, gz, s] of [[minX, 8, -1], [maxX, 8, 1], [minX, 30, -1]] as [number, number, number][]) {
    P.push({ p: [gx + s * 0.2, 1.1, gz + 3.5], s: [1.8, 2.2, 1.8], c: C.wall }, { p: [gx + s * 0.2, 2.3, gz + 3.5], s: [2.3, 0.16, 2.3], c: C.navy })
    P.push({ p: [gx + s * 0.2, 1.4, gz + 2.58], s: [1.2, 0.7, 0.05], c: C.glass, m: 'glass' })
    P.push({ p: [gx, 0.6, gz + 2.1], s: [0.2, 1.2, 0.2], c: C.steel }, { p: [gx, 2.3, gz + 1.5], s: [0.1, 2.4, 0.1], c: C.red, r: [0.55, 0, 0] })
  }

  // lamps along the roads, floodlights over the apron
  for (let x = -100; x <= 92; x += 16) { P.push(...lamp(x, 8 + (Math.round(x / 16) % 2 ? 3.7 : -3.7))); pools.push({ x, z: 8, r: 9, warm: true }) }
  for (let x = -66; x <= 50; x += 16) { P.push(...lamp(x + 5, 30 + (Math.round(x / 16) % 2 ? 3.7 : -3.7))); pools.push({ x: x + 5, z: 30, r: 8, warm: true }) }
  for (const x of [-21.5, 18.5, -46.5, 53]) for (const z of [-8, 19]) { P.push(...lamp(x + 3.7, z)); pools.push({ x, z, r: 7, warm: true }) }
  for (const x of [-64, -40, 20, 44]) {
    P.push({ p: [x, 5.5, -22.6], s: [0.22, 11, 0.22], c: C.steel, g: 'cyl' }, { p: [x, 11, -22.8], s: [2.4, 0.5, 0.4], c: C.steel }, { p: [x, 10.9, -23.02], s: [2.1, 0.34, 0.06], c: '#f4f7ff', m: 'glass' })
    pools.push({ x, z: -31, r: 17, warm: false })
  }
  pools.push({ x: -2, z: -22, r: 16, warm: true }, { x: STAND1[0], z: STAND1[1], r: 15, warm: false }, { x: STAND2[0], z: STAND2[1], r: 15, warm: false })

  // trees: on the lawns and scattered outside the fence
  const blocked = (x: number, z: number) => {
    if (z < -44.5 || (x > -74 && x < 58 && z > -44 && z < -21)) return true
    for (const rd of ROADS) {
      const h = rd.a[1] === rd.b[1]
      if (h ? Math.abs(z - rd.a[1]) < 3.2 && x > Math.min(rd.a[0], rd.b[0]) - 160 && x < Math.max(rd.a[0], rd.b[0]) + 160 : Math.abs(x - rd.a[0]) < 3.2 && z > rd.a[1] - 2 && z < rd.b[1] + 2) return true
    }
    for (const d of DISTRICTS) if (Math.abs(x - d.pos[0]) < d.size[0] / 2 + (d.external ? 6 : 2.6) && Math.abs(z - d.pos[1]) < d.size[1] / 2 + (d.id === 'authority' ? 14 : 2.6)) return true
    return false
  }
  const scatter = (x0: number, x1: number, z0: number, z1: number, n: number) => {
    for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0)
      if (blocked(x, z)) continue
      P.push(...tree(x, z, 0.85 + r() * 0.6, r() < 0.45 ? 0 : 1)); i++
    }
  }
  for (const [x0, x1, z0, z1, n] of lawns) if (n) scatter(x0 + 1, x1 - 1, z0 + 1, z1 - 1, n)
  scatter(-135, 120, 55, 82, 70); scatter(-135, -77, -40, 52, 34); scatter(61, 120, -40, 52, 30); scatter(-135, -80, 60, 95, 14)
  for (let x = -70; x < 56; x += 7) if (!blocked(x, 50)) P.push({ p: [x, 0.45, 50.6], s: [4.4, 0.8, 0.9], c: C.hedge })

  // windsock
  P.push({ p: [56, 2.2, -46.5], s: [0.1, 4.4, 0.1], c: C.steel, g: 'cyl' })
  return { parts: P, pools, signs }
}

/** Fake light pools: additive discs that fade in at night. Far cheaper than real lights. */
function LightPools({ pools }: { pools: Pool[] }) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    const g = GEO.disc.clone()
    // radial falloff via vertex colours: bright centre, black rim
    const pos = g.getAttribute('position'), col = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) { const k = 1 - Math.min(1, Math.hypot(pos.getX(i), pos.getZ(i)) * 2); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k * k }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    mat.vertexColors = true
    const m = new THREE.InstancedMesh(g, mat, pools.length)
    const o = new THREE.Object3D(), c = new THREE.Color()
    pools.forEach((p, i) => {
      o.position.set(p.x, 0.16 + i * 0.0004, p.z); o.scale.set(p.r * 2, 1, p.r * 2); o.updateMatrix()
      m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(p.warm ? '#ffcf8f' : '#cfe0ff'))
    })
    m.raycast = () => {}
    m.renderOrder = 2
    return m
  }, [pools])
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose() }, [mesh])
  useFrame(() => {
    const mat = mesh.material as THREE.MeshBasicMaterial
    mat.opacity = world.night * 0.3 * (1 - world.dim * 0.5)
    mesh.visible = mat.opacity > 0.01
  })
  return <primitive object={mesh} />
}

function Windsock() {
  const ref = useRef<THREE.Group>(null!)
  useFrame(() => {
    const t = world.t
    ref.current.rotation.y = -0.5 + Math.sin(t * 0.5) * 0.25 + Math.sin(t * 1.7) * 0.08
    ref.current.rotation.z = -0.12 + Math.sin(t * 2.3) * 0.05
  })
  return (
    <group ref={ref} position={[56, 4.3, -46.5]}>
      <mesh position={[1.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} raycast={() => null}>
        <coneGeometry args={[0.36, 2.2, 10, 1, true]} />
        <meshStandardMaterial color={C.orange} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function Ground() {
  const { group, pools, signs } = useMemo(() => { const g = groundParts(); return { group: build(g.parts), pools: g.pools, signs: g.signs } }, [])
  useEffect(() => () => disposeGroup(group), [group])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow raycast={() => null}>
        <planeGeometry args={[1600, 1200]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      <primitive object={group} />
      {signs.map((s, i) => <Sign key={i} spec={s} />)}
      <LightPools pools={pools} />
      <Windsock />
    </>
  )
}
