/**
 * Instanced "parts" — the whole static city is described as lists of coloured
 * primitives and drawn with one InstancedMesh per (geometry, material) pair, so
 * a district with several hundred pieces costs a handful of draw calls.
 */
import * as THREE from 'three'

export type V3 = [number, number, number]
export type Geo = 'box' | 'cyl' | 'cone' | 'sphere' | 'wedge' | 'gable' | 'arc' | 'disc'
export type Mat = 'solid' | 'glass' | 'glow' | 'metal'

export interface Part {
  /** centre */
  p: V3
  /** size */
  s: V3
  c: string
  /** Euler rotation, radians (XYZ) */
  r?: V3
  g?: Geo
  m?: Mat
}

function prism(points: [number, number][]) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false })
  g.translate(0, 0, -0.5)
  return g
}
function arc() {
  // half cylinder lying along z, bulging towards +y: x ∈ [-.5,.5], y ∈ [0,.5], z ∈ [-.5,.5]
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 28, 1, false, 0, Math.PI)
  g.rotateZ(Math.PI / 2)
  g.rotateY(Math.PI / 2)
  return g
}

export const GEO: Record<Geo, THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  sphere: new THREE.SphereGeometry(0.5, 14, 10),
  /** right-angled prism, tall edge at -x */
  wedge: prism([[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]]),
  /** symmetric gable */
  gable: prism([[-0.5, -0.5], [0.5, -0.5], [0, 0.5]]),
  arc: arc(),
  disc: new THREE.CircleGeometry(0.5, 28).rotateX(-Math.PI / 2),
}

export const MAT = {
  solid: new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }),
  glass: new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.25, emissive: new THREE.Color('#ffc778'), emissiveIntensity: 0 }),
  glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
  metal: new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.5 }),
}
/** materials whose emissive follows the night factor (windows) */
export const NIGHT_GLASS: THREE.MeshStandardMaterial[] = [MAT.glass]

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
// yaw is applied last, so prefabs with tilted pieces can be turned as a whole
const _e = new THREE.Euler(0, 0, 0, 'YXZ')
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _c = new THREE.Color()

export function partMatrix(part: Part, out = _m) {
  _e.set(part.r?.[0] ?? 0, part.r?.[1] ?? 0, part.r?.[2] ?? 0)
  return out.compose(_p.set(part.p[0], part.p[1], part.p[2]), _q.setFromEuler(_e), _s.set(part.s[0], part.s[1], part.s[2]))
}

export interface BuildOpts {
  cast?: boolean
  receive?: boolean
  /** material overrides, e.g. per-district clones that can fade */
  mats?: Partial<Record<Mat, THREE.Material>>
}

/** Turn a list of parts into a group of InstancedMeshes. */
export function build(parts: Part[], opts: BuildOpts = {}): THREE.Group {
  const group = new THREE.Group()
  const buckets = new Map<string, Part[]>()
  for (const p of parts) {
    const k = (p.g ?? 'box') + '|' + (p.m ?? 'solid')
    ;(buckets.get(k) ?? buckets.set(k, []).get(k)!).push(p)
  }
  for (const [k, list] of buckets) {
    const [g, m] = k.split('|') as [Geo, Mat]
    const mesh = new THREE.InstancedMesh(GEO[g], opts.mats?.[m] ?? MAT[m], list.length)
    list.forEach((part, i) => { mesh.setMatrixAt(i, partMatrix(part)); mesh.setColorAt(i, _c.set(part.c)) })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.castShadow = (opts.cast ?? true) && m !== 'glow'
    mesh.receiveShadow = (opts.receive ?? true) && m !== 'glow'
    mesh.computeBoundingSphere()
    mesh.raycast = () => {}
    group.add(mesh)
  }
  return group
}

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => { if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose() })
}

/** Rotate a set of parts around a pivot (y axis) and translate — used to place prefabs. */
export function place(parts: Part[], x: number, z: number, ry = 0, scale = 1): Part[] {
  const cos = Math.cos(ry), sin = Math.sin(ry)
  return parts.map((p) => ({
    ...p,
    p: [x + (p.p[0] * cos + p.p[2] * sin) * scale, p.p[1] * scale, z + (-p.p[0] * sin + p.p[2] * cos) * scale] as V3,
    s: [p.s[0] * scale, p.s[1] * scale, p.s[2] * scale] as V3,
    r: [p.r?.[0] ?? 0, (p.r?.[1] ?? 0) + ry, p.r?.[2] ?? 0] as V3,
  }))
}
