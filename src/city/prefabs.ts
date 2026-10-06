/**
 * Prefabs: small objects described as parts in local space (origin on the floor,
 * "front" towards -z, which is the side the default camera looks from).
 */
import type { PropKind } from '../content/city'
import { C, mix, rng, shade, tint } from './world'
import type { Part } from './parts'

const BOOKS = ['#3c5f8a', '#5a7fa8', '#2f4a6b', '#7c93ab', '#b7791f', '#8a5a44', '#4f6d7a', '#c9c3b4']

export function prop(kind: PropKind, seed: number, tintC?: string): Part[] {
  const r = rng(seed)
  const P: Part[] = []
  switch (kind) {
    case 'desk': {
      P.push({ p: [0, 0.62, 0], s: [1.5, 0.07, 0.75], c: C.wood })
      P.push({ p: [-0.68, 0.3, 0], s: [0.07, 0.6, 0.68], c: C.steel }, { p: [0.68, 0.3, 0], s: [0.07, 0.6, 0.68], c: C.steel })
      P.push({ p: [0.3, 0.9, 0.18], s: [0.5, 0.34, 0.04], c: C.dark }, { p: [0.3, 0.7, 0.2], s: [0.08, 0.1, 0.08], c: C.steel })
      P.push({ p: [-0.35, 0.665, -0.05], s: [0.3, 0.015, 0.4], c: C.paper, r: [0, 0.2, 0] })
      break
    }
    case 'shelf': {
      P.push({ p: [0, 0.9, 0.24], s: [2.3, 1.8, 0.06], c: C.trim })
      P.push({ p: [-1.15, 0.9, 0], s: [0.07, 1.8, 0.5], c: C.wood }, { p: [1.15, 0.9, 0], s: [0.07, 1.8, 0.5], c: C.wood })
      for (let row = 0; row < 3; row++) {
        const y = 0.12 + row * 0.6
        P.push({ p: [0, y - 0.06, 0], s: [2.3, 0.06, 0.5], c: C.wood })
        let x = -1.05
        while (x < 1.0) {
          const w = 0.1 + r() * 0.16, h = 0.34 + r() * 0.16
          P.push({ p: [x + w / 2, y + h / 2, -0.02], s: [w, h, 0.36], c: tintC ? mix(tintC, BOOKS[Math.floor(r() * BOOKS.length)], 0.45) : BOOKS[Math.floor(r() * BOOKS.length)] })
          x += w + 0.015 + (r() < 0.12 ? 0.18 : 0)
        }
      }
      P.push({ p: [0, 1.83, 0], s: [2.4, 0.07, 0.54], c: C.wood })
      break
    }
    case 'board': {
      P.push({ p: [-0.85, 0.55, 0], s: [0.07, 1.1, 0.07], c: C.steel }, { p: [0.85, 0.55, 0], s: [0.07, 1.1, 0.07], c: C.steel })
      P.push({ p: [0, 1.3, 0], s: [2.2, 1.25, 0.07], c: C.steelLight }, { p: [0, 1.3, -0.04], s: [2.06, 1.11, 0.02], c: C.paper })
      const cols = ['#c0624a', '#3e7c76', '#b7791f', '#3c5f8a', '#7c8a4e']
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        if (r() < 0.2) continue
        P.push({ p: [-0.75 + i * 0.5, 1.62 - j * 0.32, -0.055], s: [0.36 * (0.5 + r() * 0.5), 0.16, 0.012], c: tintC ?? cols[Math.floor(r() * cols.length)] })
      }
      break
    }
    case 'terminal': {
      P.push({ p: [0, 0.5, 0], s: [0.55, 1.0, 0.42], c: C.steelLight })
      P.push({ p: [0, 1.22, -0.05], s: [0.82, 0.56, 0.06], c: C.dark, r: [0.32, 0, 0] })
      P.push({ p: [0, 1.22, -0.085], s: [0.72, 0.46, 0.012], c: '#9fd4f0', r: [0.32, 0, 0], m: 'glow' })
      P.push({ p: [0, 0.95, -0.28], s: [0.6, 0.04, 0.24], c: C.dark, r: [0.2, 0, 0] })
      break
    }
    case 'rack': {
      const t = tintC ?? C.steel
      for (const x of [-1.15, 1.15]) for (const z of [-0.36, 0.36]) P.push({ p: [x, 1.05, z], s: [0.08, 2.1, 0.08], c: shade(t, 0.15) })
      for (let l = 0; l < 3; l++) {
        const y = 0.2 + l * 0.68
        P.push({ p: [0, y, 0], s: [2.38, 0.06, 0.8], c: shade(t, 0.05) })
        let x = -1.02
        while (x < 0.85) {
          const w = 0.3 + r() * 0.32, h = 0.24 + r() * 0.26
          P.push({ p: [x + w / 2, y + 0.03 + h / 2, 0], s: [w, h, 0.56], c: r() < 0.7 ? tint(t, 0.18 + r() * 0.25) : C.wood })
          x += w + 0.06
        }
      }
      P.push({ p: [0, 2.14, -0.4], s: [2.3, 0.26, 0.04], c: t })
      break
    }
    case 'crate': {
      P.push({ p: [0, 0.07, 0], s: [1.1, 0.14, 1.1], c: shade(C.wood, 0.25) })
      P.push({ p: [0, 0.59, 0], s: [0.95, 0.9, 0.95], c: C.wood }, { p: [0.12, 1.24, 0.05], s: [0.5, 0.4, 0.5], c: tint(C.wood, 0.15), r: [0, 0.4, 0] })
      P.push({ p: [-0.1, 0.7, -0.485], s: [0.42, 0.3, 0.012], c: C.paper }, { p: [-0.1, 0.78, -0.492], s: [0.3, 0.04, 0.01], c: tintC ?? C.green })
      break
    }
    case 'table': {
      P.push({ p: [0, 0.7, 0], s: [1.8, 0.09, 0.8], c: C.steelLight })
      for (const x of [-0.82, 0.82]) for (const z of [-0.33, 0.33]) P.push({ p: [x, 0.33, z], s: [0.07, 0.66, 0.07], c: C.steel })
      P.push({ p: [0, 0.2, 0], s: [1.6, 0.05, 0.64], c: C.steel })
      P.push({ p: [-0.45, 0.86, 0], s: [0.36, 0.24, 0.3], c: '#4b6a8f' }, { p: [0.4, 0.82, 0.05], s: [0.3, 0.3, 0.16], c: C.steel, g: 'cyl', r: [0, 0, Math.PI / 2] })
      P.push({ p: [0.05, 0.76, -0.2], s: [0.4, 0.02, 0.28], c: C.paper, r: [0, -0.25, 0] })
      break
    }
    case 'cabinet': {
      for (let i = -1; i <= 1; i++) {
        P.push({ p: [i * 0.6, 0.68, 0], s: [0.56, 1.36, 0.62], c: i === 0 ? C.steelLight : tint(C.steel, 0.2) })
        for (let dy = 0; dy < 4; dy++) P.push({ p: [i * 0.6, 0.22 + dy * 0.32, -0.315], s: [0.2, 0.035, 0.012], c: C.dark })
      }
      break
    }
    case 'plinth': {
      P.push({ p: [0, 0.45, 0], s: [0.85, 0.9, 0.85], c: C.white }, { p: [0, 0.03, 0], s: [1.0, 0.06, 1.0], c: C.trim })
      P.push({ p: [0, 1.02, -0.02], s: [0.64, 0.03, 0.82], c: tintC ?? C.paper, r: [0.5, 0, 0] })
      break
    }
    case 'engine': {
      P.push({ p: [0, 0.16, 0], s: [2.2, 0.1, 1.0], c: C.yellow })
      for (const x of [-0.9, 0.9]) P.push({ p: [x, 0.5, 0], s: [0.1, 0.7, 0.9], c: C.yellow })
      P.push({ p: [0, 1.0, 0], s: [1.1, 2.0, 1.1], c: C.steelLight, g: 'cyl', r: [0, 0, Math.PI / 2], m: 'metal' })
      P.push({ p: [-0.75, 1.0, 0], s: [1.3, 0.55, 1.3], c: C.white, g: 'cyl', r: [0, 0, Math.PI / 2] })
      P.push({ p: [-1.03, 1.0, 0], s: [1.08, 0.02, 1.08], c: C.dark, g: 'cyl', r: [0, 0, Math.PI / 2] })
      P.push({ p: [1.1, 1.0, 0], s: [0.6, 0.4, 0.6], c: C.steel, g: 'cone', r: [0, 0, -Math.PI / 2] })
      break
    }
    case 'vehicle': return vehicle('van', tintC ?? C.white)
    case 'aircraft': break // drawn by the aircraft layer
  }
  return P
}

export type VehicleKind = 'car' | 'van' | 'tug' | 'cart' | 'forklift' | 'fuel' | 'bus' | 'truck' | 'stairs' | 'gpu'

/** Vehicles: local +z is forward. */
export function vehicle(kind: VehicleKind, color: string): Part[] {
  const wheels = (z: number[], w = 1.0, rad = 0.34): Part[] => z.map((zz) => ({ p: [0, rad / 2, zz], s: [w + 0.06, rad, rad], c: C.dark }))
  switch (kind) {
    case 'car': return [
      { p: [0, 0.4, 0], s: [1.0, 0.42, 2.2], c: color }, { p: [0, 0.76, -0.12], s: [0.9, 0.34, 1.15], c: C.glassDark },
      { p: [0, 0.94, -0.12], s: [0.86, 0.04, 1.0], c: color }, ...wheels([0.68, -0.68]),
    ]
    case 'van': return [
      { p: [0, 0.68, -0.25], s: [1.12, 0.95, 2.0], c: color }, { p: [0, 0.5, 1.02], s: [1.12, 0.6, 0.56], c: color },
      { p: [0, 0.92, 0.82], s: [1.06, 0.4, 0.3], c: C.glassDark, r: [-0.35, 0, 0] }, { p: [0, 0.52, -0.25], s: [1.14, 0.14, 2.02], c: C.orange },
      { p: [0, 1.2, 0.2], s: [0.5, 0.1, 0.24], c: C.yellow }, ...wheels([0.85, -0.85]),
    ]
    case 'bus': return [
      { p: [0, 0.78, 0], s: [1.2, 1.1, 3.6], c: color }, { p: [0, 0.95, 0], s: [1.22, 0.42, 3.3], c: C.glassDark },
      { p: [0, 0.4, 0], s: [1.22, 0.12, 3.62], c: C.navy }, ...wheels([1.2, -1.2], 1.1),
    ]
    case 'truck': return [
      { p: [0, 0.72, 1.35], s: [1.2, 1.0, 0.9], c: color }, { p: [0, 0.98, 1.72], s: [1.1, 0.4, 0.2], c: C.glassDark },
      { p: [0, 0.98, -0.45], s: [1.3, 1.5, 2.6], c: C.white }, { p: [0, 0.3, 0.2], s: [1.0, 0.16, 3.6], c: C.dark }, ...wheels([1.35, -0.6, -1.3], 1.15),
    ]
    case 'tug': return [
      { p: [0, 0.34, 0], s: [1.2, 0.36, 1.9], c: color }, { p: [0, 0.68, -0.35], s: [0.9, 0.36, 0.7], c: C.glassDark },
      { p: [0, 0.88, -0.35], s: [0.94, 0.05, 0.74], c: color }, { p: [0, 1.0, -0.35], s: [0.16, 0.14, 0.16], c: C.yellow, m: 'glow' }, ...wheels([0.55, -0.55], 1.14, 0.4),
    ]
    case 'cart': return [
      { p: [0, 0.3, 0], s: [0.95, 0.1, 1.5], c: C.steel }, { p: [0, 0.58, 0], s: [0.85, 0.46, 1.3], c: color },
      { p: [0, 0.3, 0.95], s: [0.06, 0.06, 0.5], c: C.dark }, ...wheels([0.5, -0.5], 0.9, 0.22),
    ]
    case 'forklift': return [
      { p: [0, 0.42, -0.2], s: [0.8, 0.5, 1.2], c: color }, { p: [0, 0.98, -0.3], s: [0.74, 0.62, 0.7], c: C.dark }, { p: [0, 1.32, -0.3], s: [0.8, 0.06, 0.8], c: color },
      { p: [-0.26, 0.9, 0.46], s: [0.08, 1.7, 0.08], c: C.dark }, { p: [0.26, 0.9, 0.46], s: [0.08, 1.7, 0.08], c: C.dark },
      { p: [0, 0.3, 0.98], s: [0.7, 0.05, 0.9], c: C.steel }, { p: [0, 0.62, 1.0], s: [0.72, 0.58, 0.72], c: C.wood }, ...wheels([0.3, -0.62], 0.8, 0.3),
    ]
    case 'fuel': return [
      { p: [0, 0.7, 1.55], s: [1.2, 0.95, 0.9], c: color }, { p: [0, 0.95, 1.92], s: [1.1, 0.36, 0.2], c: C.glassDark },
      { p: [0, 0.98, -0.3], s: [1.25, 2.9, 1.25], c: C.steelLight, g: 'cyl', r: [Math.PI / 2, 0, 0], m: 'metal' },
      { p: [0, 0.98, -0.3], s: [1.27, 0.5, 1.27], c: C.orange, g: 'cyl', r: [Math.PI / 2, 0, 0] }, { p: [0, 0.3, 0.2], s: [1.0, 0.16, 3.8], c: C.dark }, ...wheels([1.5, -0.7, -1.4], 1.15),
    ]
    case 'stairs': return [
      { p: [0, 0.3, 0], s: [1.0, 0.3, 2.2], c: color }, ...wheels([0.7, -0.7], 0.95, 0.26),
      ...[0, 1, 2, 3, 4].map((i): Part => ({ p: [0, 0.6 + i * 0.26, -0.8 + i * 0.36], s: [0.8, 0.07, 0.38], c: C.steelLight })),
      { p: [0, 1.75, 0.95], s: [0.84, 0.07, 0.6], c: C.steelLight }, { p: [0.42, 1.25, 0.1], s: [0.04, 0.9, 2.1], c: C.yellow, r: [-0.62, 0, 0] }, { p: [-0.42, 1.25, 0.1], s: [0.04, 0.9, 2.1], c: C.yellow, r: [-0.62, 0, 0] },
    ]
    case 'gpu': return [
      { p: [0, 0.48, 0], s: [0.9, 0.62, 1.5], c: color }, { p: [0, 0.82, 0.3], s: [0.6, 0.08, 0.5], c: C.dark }, { p: [0, 0.3, 0.95], s: [0.06, 0.06, 0.5], c: C.dark }, ...wheels([0.45, -0.45], 0.85, 0.22),
    ]
  }
}

/** A work platform / docking stand used around aircraft. */
export function platform(w: number, h: number, d: number): Part[] {
  const P: Part[] = [{ p: [0, h, 0], s: [w, 0.08, d], c: C.steelLight }]
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) P.push({ p: [x, h / 2, z], s: [0.07, h, 0.07], c: C.yellow })
  P.push({ p: [0, h + 0.42, d / 2 - 0.03], s: [w, 0.05, 0.05], c: C.yellow }, { p: [-w / 2 + 0.03, h + 0.42, 0], s: [0.05, 0.05, d], c: C.yellow }, { p: [w / 2 - 0.03, h + 0.42, 0], s: [0.05, 0.05, d], c: C.yellow })
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) P.push({ p: [x, h + 0.22, d / 2 - 0.03], s: [0.05, 0.44, 0.05], c: C.yellow })
  const steps = Math.max(2, Math.round(h / 0.3))
  for (let i = 0; i < steps; i++) P.push({ p: [w / 2 + 0.3, (h * (i + 0.5)) / steps, d / 2 - 0.3 - (i * (d - 0.4)) / steps], s: [0.55, 0.05, 0.3], c: C.steel })
  return P
}

export const cone = (x: number, z: number): Part[] => [
  { p: [x, 0.02, z], s: [0.3, 0.04, 0.3], c: C.dark }, { p: [x, 0.24, z], s: [0.22, 0.44, 0.22], c: C.orange, g: 'cone' }, { p: [x, 0.26, z], s: [0.15, 0.07, 0.15], c: C.white, g: 'cyl' },
]

export function tree(x: number, z: number, s: number, kind: number): Part[] {
  return kind === 0
    ? [{ p: [x, 0.5 * s, z], s: [0.22 * s, 1.0 * s, 0.22 * s], c: C.trunk, g: 'cyl' }, { p: [x, 1.9 * s, z], s: [1.5 * s, 2.3 * s, 1.5 * s], c: C.tree, g: 'cone' }, { p: [x, 2.7 * s, z], s: [1.05 * s, 1.5 * s, 1.05 * s], c: C.tree2, g: 'cone' }]
    : [{ p: [x, 0.6 * s, z], s: [0.24 * s, 1.2 * s, 0.24 * s], c: C.trunk, g: 'cyl' }, { p: [x, 1.95 * s, z], s: [1.9 * s, 1.7 * s, 1.9 * s], c: C.tree2, g: 'sphere' }, { p: [x + 0.4 * s, 2.5 * s, z - 0.2 * s], s: [1.2 * s, 1.1 * s, 1.2 * s], c: C.tree, g: 'sphere' }]
}

export function lamp(x: number, z: number, h = 3.4): Part[] {
  return [
    { p: [x, h / 2, z], s: [0.1, h, 0.1], c: C.steel, g: 'cyl' }, { p: [x, h, z], s: [0.7, 0.08, 0.22], c: C.steel },
    { p: [x, h - 0.06, z], s: [0.5, 0.05, 0.16], c: '#ffe6b0', m: 'glass' },
  ]
}
