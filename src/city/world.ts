/**
 * Shared, non-React state of the 3D world plus small math helpers.
 * `world` is mutated once per frame by <Atmosphere/> and read by everything that animates.
 */
import * as THREE from 'three'

export const world = {
  /** ambient clock in seconds; stops when "Living world animation" is off */
  t: 0,
  /** 0 = day, 1 = night */
  night: 0,
  /** 0 = normal, 1 = city dimmed behind a relationship layer */
  dim: 0,
}

/** seconds for a full day when the time of day is set to "Cycle" */
export const DAY_LENGTH = 300

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt))
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

/** Deterministic PRNG (mulberry32): the ambient world is identical on every load. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Restrained palette: warm whites, slate glass, grey tarmac, sage green; colour comes from the category roofs. */
export const C = {
  grass: '#b7c7a1', lawn: '#a8bd92', hedge: '#7f9c73', tree: '#6f9467', tree2: '#86a878', trunk: '#8a7458',
  concrete: '#d8d4c8', pad: '#e5e1d6', curb: '#c6c1b4',
  asphalt: '#5e656d', apron: '#a2a8ad', apron2: '#abb1b5', runway: '#4e545c', mark: '#f0ebdd', taxi: '#d9a72c',
  wall: '#efeadf', wallShade: '#e3ddd0', trim: '#cdc7b9', stone: '#dfe2e3', stoneShade: '#d0d4d6',
  roof: '#d2d6d9', roofEdge: '#bcc2c7', glass: '#7ba6c2', glassDark: '#4b6c84', dark: '#2a323d',
  steel: '#9aa2aa', steelLight: '#c5cacf', wood: '#b99a6a', paper: '#f8f6ef', white: '#f6f5f1',
  yellow: '#e0a92b', orange: '#e2812f', red: '#b5533f', green: '#5f8f5a', amber: '#c99a3c', navy: '#1b2a3d', blue: '#3c5f8a',
  skin: ['#ecc9a6', '#cf9d78', '#96664a', '#f3d7ba', '#b98660'],
}

const _a = new THREE.Color()
const _b = new THREE.Color()
/** Mix two CSS colours; t = 0 → a, 1 → b. */
export function mix(a: string, b: string, t: number) { return '#' + _a.set(a).lerp(_b.set(b), t).getHexString() }
export const shade = (c: string, t = 0.1) => mix(c, '#3a3f46', t)
export const tint = (c: string, t = 0.25) => mix(c, '#ffffff', t)
