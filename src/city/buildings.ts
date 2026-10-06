/**
 * District architecture, generated from the city model in `content/city.ts`.
 *
 * Each district is returned as four part lists:
 *   fixed    — never changes (pads, steps, outdoor objects)
 *   walls    — squashed to knee height when the building opens
 *   roof     — lifted and faded when the building opens
 *   interior — room floors, partitions and the props that stand for anchors
 *
 * "Front" is the -z façade: the side the default camera looks at.
 */
import { CATEGORY_COLOR, DISTRICTS, placePosition, roomRects, type District, type RoomRect } from '../content/city'
import { C, clamp, hash, mix, rng, shade, tint } from './world'
import { emblem } from './emblems'
import { place, type Part, type V3 } from './parts'
import { bench, bin, cone, cooler, cylinders, extinguisher, lockers, pallet, plant, platform, prop, toolChest, vehicle, workbench } from './prefabs'

export interface SignSpec {
  text: string
  sub?: string
  p: V3
  w: number
  h: number
  /** lies flat (roof / ground paint) instead of standing on a façade */
  flat?: boolean
  style?: 'plate' | 'paint' | 'form1' | 'form3' | 'scope'
  color?: string
}

export interface Built {
  fixed: Part[]
  walls: Part[]
  roof: Part[]
  interior: Part[]
  /** signs that fade with the roof */
  roofSigns: SignSpec[]
  /** signs that are always there */
  signs: SignSpec[]
  /** interior is visible even while the roof is on (apron, pavilion, hangar through its door) */
  alwaysOpen: boolean
  floorY: number
  /** wall height once opened */
  knee: number
}

interface Ctx { B: Built; d: District; cx: number; cz: number; w: number; dp: number; h: number; front: number; back: number; accent: string; r: () => number }

interface VolOpts { floors?: number; wall?: string; glass?: string; y0?: number; to?: Part[]; winH?: number; winY?: number; mull?: number; noFront?: boolean }

/** A box of four walls with ribbon windows. */
function volume(c: Ctx, x: number, z: number, w: number, dp: number, h: number, o: VolOpts = {}) {
  const t = 0.3, y0 = o.y0 ?? 0, wall = o.wall ?? C.wall, T = o.to ?? c.B.walls, glass = o.glass ?? C.glass
  if (!o.noFront) T.push({ p: [x, y0 + h / 2, z - dp / 2 + t / 2], s: [w, h, t], c: wall })
  T.push({ p: [x, y0 + h / 2, z + dp / 2 - t / 2], s: [w, h, t], c: wall })
  T.push({ p: [x - w / 2 + t / 2, y0 + h / 2, z], s: [t, h, dp - 2 * t], c: shade(wall, 0.06) })
  T.push({ p: [x + w / 2 - t / 2, y0 + h / 2, z], s: [t, h, dp - 2 * t], c: shade(wall, 0.06) })
  if ((o.winH ?? 0.44) < 0.01) return
  const floors = o.floors ?? Math.max(1, Math.round(h / 2.7))
  const fh = h / floors
  const mull = o.mull ?? 1.7
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * fh + fh * (o.winY ?? 0.56), gh = fh * (o.winH ?? 0.44)
    for (const s of [-1, 1]) {
      if (!(o.noFront && s === -1)) {
        T.push({ p: [x, y, z + s * (dp / 2 + 0.02)], s: [w - 1.2, gh, 0.06], c: glass, m: 'glass' })
        const n = Math.max(1, Math.round((w - 1.2) / mull))
        for (let i = 1; i < n; i++) T.push({ p: [x - (w - 1.2) / 2 + (i * (w - 1.2)) / n, y, z + s * (dp / 2 + 0.05)], s: [0.13, gh + 0.04, 0.1], c: wall })
      }
      T.push({ p: [x + s * (w / 2 + 0.02), y, z], s: [0.06, gh, dp - 1.2], c: glass, m: 'glass' })
      const n = Math.max(1, Math.round((dp - 1.2) / mull))
      for (let i = 1; i < n; i++) T.push({ p: [x + s * (w / 2 + 0.05), y, z - (dp - 1.2) / 2 + (i * (dp - 1.2)) / n], s: [0.1, gh + 0.04, 0.13], c: shade(wall, 0.06) })
    }
  }
}

/** Flat roof with parapet, a category-coloured deck and a little plant. */
function flatRoof(c: Ctx, x: number, z: number, w: number, dp: number, h: number, o: { plant?: number; to?: Part[]; color?: string } = {}) {
  const R = o.to ?? c.B.roof, col = o.color ?? c.accent
  R.push({ p: [x, h + 0.12, z], s: [w + 0.5, 0.24, dp + 0.5], c: C.roofEdge })
  R.push({ p: [x, h + 0.29, z], s: [w - 0.5, 0.1, dp - 0.5], c: tint(col, 0.12) })
  for (const s of [-1, 1]) {
    R.push({ p: [x, h + 0.5, z + s * (dp / 2 + 0.12)], s: [w + 0.5, 0.52, 0.26], c: C.wall })
    R.push({ p: [x + s * (w / 2 + 0.12), h + 0.5, z], s: [0.26, 0.52, dp], c: C.wallShade })
    R.push({ p: [x, h + 0.8, z + s * (dp / 2 + 0.12)], s: [w + 0.56, 0.1, 0.32], c: col })
    R.push({ p: [x + s * (w / 2 + 0.12), h + 0.8, z], s: [0.32, 0.1, dp + 0.56], c: col })
  }
  const n = o.plant ?? 3
  for (let i = 0; i < n; i++) {
    const px = x + (c.r() - 0.5) * (w - 4), pz = z + (0.1 + c.r() * 0.35) * (dp - 3)
    if (c.r() < 0.6) R.push({ p: [px, h + 0.68, pz], s: [1.3, 0.7, 0.9], c: C.steelLight }, { p: [px, h + 1.06, pz], s: [0.9, 0.06, 0.5], c: C.steel })
    else R.push({ p: [px, h + 0.6, pz], s: [0.6, 0.55, 0.6], c: C.steel, g: 'cyl' })
  }
}

function pad(c: Ctx, m = 1.6) {
  const { B, cx, cz, w, dp, back } = c
  B.fixed.push({ p: [cx, 0.06, cz], s: [w + m * 2, 0.12, dp + m * 2], c: C.pad })
  // building services on the back wall: condensers, a meter cabinet and a downpipe at each corner
  for (let i = 0; i < 2; i++) {
    const x = cx + w / 2 - 1.6 - i * 1.5
    B.fixed.push({ p: [x, 0.5, back + 0.55], s: [1.1, 0.76, 0.6], c: C.steelLight }, { p: [x, 0.5, back + 0.86], s: [0.7, 0.5, 0.02], c: C.dark, g: 'cyl', r: [Math.PI / 2, 0, 0] }, { p: [x, 0.09, back + 0.55], s: [1.2, 0.08, 0.7], c: C.curb })
  }
  B.fixed.push({ p: [cx - w / 2 + 1.2, 0.75, back + 0.2], s: [0.8, 1.3, 0.3], c: C.steel })
  for (const s of [-1, 1]) B.walls.push({ p: [cx + s * (w / 2 - 0.25), c.h / 2, back + 0.08], s: [0.12, c.h, 0.12], c: C.steel, g: 'cyl' })
}

function entrance(c: Ctx, x: number, y0 = 0, wide = 2.8) {
  const { B, front, accent } = c
  B.walls.push({ p: [x, y0 + 1.05, front - 0.04], s: [wide * 0.62, 2.1, 0.1], c: C.glassDark, m: 'glass' })
  B.walls.push({ p: [x, y0 + 2.45, front - 0.7], s: [wide, 0.14, 1.5], c: accent })
  for (const s of [-1, 1]) B.walls.push({ p: [x + s * (wide / 2 - 0.15), y0 + 1.2, front - 1.3], s: [0.12, 2.4, 0.12], c: C.steel })
  B.fixed.push({ p: [x, 0.09, front - 2.2], s: [wide, 0.18, 3.0], c: C.curb })
  // door mat, planters, a bench and a bin: a place people actually use
  B.fixed.push({ p: [x, 0.19, front - 1.0], s: [wide * 0.5, 0.02, 0.8], c: C.dark })
  for (const s of [-1, 1]) B.fixed.push({ p: [x + s * (wide / 2 + 0.55), 0.3, front - 0.75], s: [0.6, 0.48, 0.6], c: C.stone }, { p: [x + s * (wide / 2 + 0.55), 0.82, front - 0.75], s: [0.62, 0.66, 0.62], c: C.hedge, g: 'sphere' })
  B.fixed.push(...bench(x + wide / 2 + 2.2, front - 0.7, 1.5, Math.PI).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.12, p.p[2]] as V3 })), ...bin(x - wide / 2 - 1.5, front - 0.6, C.green).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.12, p.p[2]] as V3 })))
}

function rooftopSign(c: Ctx, text: string, x = c.cx, z = c.front + 0.5, y = c.h + 0.86) {
  const sw = Math.min(c.w - 1, 2.2 + text.length * 0.5)
  c.B.roof.push({ p: [x, y + 0.55, z + 0.08], s: [sw + 0.3, 1.02, 0.12], c: C.navy })
  for (const s of [-1, 1]) c.B.roof.push({ p: [x + s * (sw / 2 - 0.4), y - 0.05, z + 0.08], s: [0.1, 0.3, 0.1], c: C.steel })
  c.B.roofSigns.push({ text, p: [x, y + 0.55, z], w: sw, h: 0.82 })
}

function roofNumber(c: Ctx, x = c.cx + c.w / 2 - 2.3, z = c.back - 2.0, y = c.h + 0.36) {
  c.B.roofSigns.push({ text: String(c.d.n).padStart(2, '0'), p: [x, y, z], w: 3.4, h: 2.4, flat: true, style: 'paint' })
}

function rollerDoor(c: Ctx, x: number, w: number, h: number, col = C.steelLight) {
  c.B.walls.push({ p: [x, h / 2, c.front - 0.05], s: [w, h, 0.12], c: col })
  for (let y = 0.4; y < h; y += 0.42) c.B.walls.push({ p: [x, y, c.front - 0.12], s: [w - 0.1, 0.04, 0.03], c: shade(col, 0.2) })
  c.B.walls.push({ p: [x, h + 0.12, c.front - 0.1], s: [w + 0.3, 0.24, 0.24], c: C.steel })
}

function flagpole(B: Built, x: number, z: number, col: string, h = 7) {
  B.fixed.push({ p: [x, h / 2, z], s: [0.1, h, 0.1], c: C.steelLight, g: 'cyl' }, { p: [x, 0.1, z], s: [0.5, 0.2, 0.5], c: C.curb, g: 'cyl' })
  B.fixed.push({ p: [x - 0.7, h - 0.55, z], s: [1.3, 0.85, 0.04], c: col })
}

// ─────────────────────────────────── kinds ───────────────────────────────────

function office(c: Ctx) {
  const { B, d, cx, cz, w, dp, h, front, back, accent } = c
  pad(c)
  if (d.id === 'moe') return moe(c)
  volume(c, cx, cz, w, dp, h, { floors: h > 8 ? 4 : 2 })
  flatRoof(c, cx, cz, w, dp, h, { plant: d.id === 'hq' ? 2 : 3 })
  entrance(c, d.id === 'technical-library' ? cx - w / 2 + 2.4 : cx)
  rooftopSign(c, d.name.toUpperCase())
  roofNumber(c)

  if (d.id === 'hq') {
    // penthouse boardroom and mast: the tallest silhouette in the city
    const px = cx - 2, pz = cz + 1.5, pw = w * 0.46, pd = dp * 0.5
    volume(c, px, pz, pw, pd, 3.0, { y0: h + 0.3, floors: 1, to: B.roof, winH: 0.6, winY: 0.5, glass: C.glassDark })
    flatRoof(c, px, pz, pw, pd, h + 3.3, { plant: 0 })
    B.roof.push({ p: [px + 2, h + 6.4, pz], s: [0.12, 5, 0.12], c: C.steel, g: 'cyl' }, { p: [px + 2, h + 9.0, pz], s: [0.28, 0.28, 0.28], c: '#d3472f', g: 'sphere', m: 'glow' })
    B.walls.push({ p: [cx, 2.4, front - 0.06], s: [5.4, 4.6, 0.12], c: C.glassDark, m: 'glass' })
    flagpole(B, cx + 5.2, front - 3.2, C.navy)
    flagpole(B, cx + 6.6, front - 3.2, '#2f5fa8')
    flagpole(B, cx + 8.0, front - 3.2, C.white)
  }
  if (d.id === 'technical-library') {
    // book-spine fins: the façade reads as a shelf of manuals
    const spines = ['#3c5f8a', '#5a7fa8', '#2f4a6b', '#8aa3bd', '#3c5f8a', '#b7791f', '#2f4a6b', '#5a7fa8', '#7c93ab', '#3c5f8a', '#8a5a44', '#2f4a6b']
    const n = Math.floor((w - 6) / 0.95)
    for (let i = 0; i < n; i++) {
      const fh = h * (0.72 + ((i * 7) % 5) * 0.045)
      B.walls.push({ p: [cx + w / 2 - 1.0 - i * 0.95, fh / 2 + 0.15, front - 0.38], s: [0.62, fh, 0.7], c: spines[i % spines.length] })
      B.walls.push({ p: [cx + w / 2 - 1.0 - i * 0.95, fh * 0.78, front - 0.74], s: [0.64, 0.16, 0.03], c: C.paper })
    }
    B.roof.push({ p: [cx, h + 0.5, cz + 1], s: [w * 0.5, 0.36, dp * 0.34], c: C.glass, m: 'glass' })
  }
  if (d.id === 'production-control') {
    // control cab on the roof
    B.roof.push({ p: [cx, h + 0.9, cz + 0.8], s: [6.2, 1.2, 5.2], c: C.wall })
    B.roof.push({ p: [cx, h + 2.2, cz + 0.8], s: [6.6, 1.4, 5.6], c: C.glassDark, m: 'glass' })
    B.roof.push({ p: [cx, h + 3.02, cz + 0.8], s: [7.2, 0.24, 6.2], c: accent })
    B.roof.push({ p: [cx - 1.5, h + 4.6, cz + 1.4], s: [0.1, 3, 0.1], c: C.steel, g: 'cyl' }, { p: [cx + 1.6, h + 3.6, cz + 0.4], s: [1.3, 0.5, 1.3], c: C.steelLight, g: 'cone', r: [Math.PI, 0, 0] })
  }
  if (d.id === 'training') {
    for (let i = 0; i < 3; i++) {
      const sx = cx - w / 2 + 3.4 + i * 4.6
      B.roof.push({ p: [sx, h + 0.95, cz + 1.2], s: [3.4, 1.1, dp * 0.5], c: tint(accent, 0.25), g: 'wedge' })
      B.roof.push({ p: [sx - 1.72, h + 0.95, cz + 1.2], s: [0.05, 0.8, dp * 0.5 - 0.5], c: C.glass, m: 'glass' })
    }
  }
  if (d.id === 'safety') {
    // hazard-striped canopy and an amber beacon
    for (let i = 0; i < 7; i++) B.walls.push({ p: [cx - 1.2 + i * 0.4, 2.45, front - 1.46], s: [0.2, 0.16, 0.03], c: i % 2 ? C.dark : C.yellow })
    B.roof.push({ p: [cx + w / 2 - 1.6, h + 2.0, back - 1.6], s: [0.16, 3.2, 0.16], c: C.steel, g: 'cyl' }, { p: [cx + w / 2 - 1.6, h + 3.75, back - 1.6], s: [0.5, 0.5, 0.5], c: '#f0a030', g: 'sphere', m: 'glow' })
    B.roof.push({ p: [cx - 2, h + 0.36, cz + 1], s: [3.2, 0.04, 3.2], c: C.white, g: 'cyl' }, { p: [cx - 2, h + 0.38, cz + 1], s: [2.5, 0.04, 2.5], c: tint(accent, 0.12), g: 'cyl' })
  }
  if (d.id === 'compliance') {
    // a checklist grid on the roof
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const gx = cx - 4.2 + i * 2.8, gz = cz - 1.4 + j * 2.4
      B.roof.push({ p: [gx, h + 0.37, gz], s: [1.9, 0.05, 1.5], c: (i * 3 + j) % 4 === 1 ? C.white : tint(accent, 0.4) })
    }
  }
}

/** MOE / Document Control: the building is the book. */
function moe(c: Ctx) {
  const { B, cx, cz, w, dp, h, front } = c
  const cover = c.accent
  B.fixed.push({ p: [cx, 0.3, cz], s: [w + 0.9, 0.36, dp + 0.9], c: cover })
  volume(c, cx, cz, w, dp, h - 0.5, { y0: 0.48, floors: 1, wall: C.paper, winH: 0.001, noFront: false })
  for (let y = 1.0; y < h - 0.3; y += 0.42) {
    B.walls.push({ p: [cx, y, front - 0.02], s: [w - 0.1, 0.05, 0.05], c: C.trim })
    B.walls.push({ p: [cx + w / 2 + 0.02, y, cz], s: [0.05, 0.05, dp - 0.1], c: C.trim })
    B.walls.push({ p: [cx, y, c.back + 0.02], s: [w - 0.1, 0.05, 0.05], c: C.trim })
  }
  // spine on the -x side, with gilt bands
  B.walls.push({ p: [cx - w / 2 - 0.25, h / 2, cz], s: [0.7, h, dp + 0.9], c: cover })
  for (const y of [h * 0.26, h * 0.74]) B.walls.push({ p: [cx - w / 2 - 0.27, y, cz], s: [0.76, 0.22, dp + 0.92], c: '#d6b25e' })
  B.walls.push({ p: [cx + 1.5, 1.5, front - 0.05], s: [1.7, 2.0, 0.1], c: C.glassDark, m: 'glass' })
  B.fixed.push({ p: [cx + 1.5, 0.09, front - 2.0], s: [2.6, 0.18, 2.8], c: C.curb })
  // top cover + ribbon bookmark
  B.roof.push({ p: [cx, h + 0.16, cz], s: [w + 0.9, 0.36, dp + 0.9], c: cover })
  B.roof.push({ p: [cx, h + 0.36, cz], s: [w - 2.4, 0.04, dp - 2.6], c: tint(cover, 0.14) })
  B.roof.push({ p: [cx + 3.4, h - 0.9, front - 0.5], s: [0.6, 2.6, 0.06], c: C.red }, { p: [cx + 3.4, h + 0.36, cz - 1], s: [0.6, 0.05, dp - 1], c: C.red })
  c.B.roofSigns.push({ text: 'MOE', sub: 'MAINTENANCE ORGANISATION EXPOSITION', p: [cx - 0.6, h + 0.4, cz + 0.4], w: 7.4, h: 3.6, flat: true, style: 'paint', color: '#f1e3c0' })
  rooftopSign(c, 'MOE · DOCUMENT CONTROL', cx - 1, front + 0.3, h + 0.3)
}

function warehouse(c: Ctx) {
  const { B, d, cx, cz, w, dp, h, front, accent } = c
  pad(c, 2)
  volume(c, cx, cz, w, dp, h, { floors: 1, winH: 0.13, winY: 0.84, mull: 2.4 })
  if (d.id === 'stores') {
    flatRoof(c, cx, cz, w, dp, h, { plant: 2 })
    for (let i = 0; i < 4; i++) B.roof.push({ p: [cx - w / 2 + 4 + i * 6, h + 0.38, cz - 0.5], s: [1.2, 0.08, dp * 0.55], c: C.glass, m: 'glass' })
    // three dock doors under green / amber / red: segregation you can see from the road
    const cols = [C.green, C.amber, C.red]
    cols.forEach((col, i) => {
      const x = cx + 7.4 - i * 7.4
      rollerDoor(c, x, 3.4, 3.4)
      B.walls.push({ p: [x, h - 1.25, front - 0.08], s: [4.6, 1.3, 0.14], c: col })
    })
    B.fixed.push({ p: [cx, 0.3, front - 1.3], s: [w - 2, 0.6, 2.2], c: C.curb })
    B.fixed.push(...place(vehicle('truck', C.blue), cx + 7.4, front - 4.6, Math.PI))
    for (let i = 0; i < 3; i++) B.fixed.push({ p: [cx - 4 - i * 1.3, 0.95, front - 1.3], s: [0.9, 0.7, 0.9], c: C.wood })
    rooftopSign(c, 'STORES')
  } else {
    // records archive: three barrel vaults, slit windows
    B.roof.push({ p: [cx, h + 0.1, cz], s: [w + 0.5, 0.2, dp + 0.5], c: C.roofEdge })
    for (let i = 0; i < 3; i++) {
      const vw = w / 3
      B.roof.push({ p: [cx - w / 2 + vw * (i + 0.5), h + 0.2, cz], s: [vw - 0.25, 3.2, dp + 0.3], c: tint(accent, 0.1), g: 'arc' })
      B.roof.push({ p: [cx - w / 2 + vw * (i + 0.5), h + 0.2, front - 0.12], s: [vw - 1.6, 2.0, 0.1], c: C.glassDark, g: 'arc', m: 'glass' })
    }
    for (let i = 0; i < 9; i++) B.walls.push({ p: [cx - w / 2 + 1.6 + i * 1.72, h * 0.5, front - 0.03], s: [0.34, h * 0.52, 0.08], c: C.glassDark, m: 'glass' })
    entrance(c, cx)
    c.B.roofSigns.push({ text: 'RECORDS ARCHIVE', p: [cx, h - 0.55, front - 0.2], w: 8.4, h: 0.8 })
    B.roof.push({ p: [cx, h - 0.55, front - 0.1], s: [8.8, 1.0, 0.12], c: C.navy })
  }
}

function workshop(c: Ctx) {
  const { B, d, cx, cz, w, dp, h, front, accent } = c
  const ext = !!d.external
  const wall = ext ? C.stone : C.wall
  pad(c, 2)
  volume(c, cx, cz, w, dp, h - 1.4, { floors: 1, wall, winH: 0.2, winY: 0.76, mull: 2.2 })
  const hh = h - 1.4
  B.roof.push({ p: [cx, hh + 0.1, cz], s: [w + 0.5, 0.2, dp + 0.5], c: C.roofEdge })
  const n = Math.max(3, Math.round(w / 5.2)), tw = w / n
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + tw * (i + 0.5)
    B.roof.push({ p: [x, hh + 0.2 + 0.7, cz], s: [tw, 1.4, dp + 0.3], c: tint(accent, ext ? 0.3 : 0.12), g: 'wedge' })
    B.roof.push({ p: [x - tw / 2 - 0.03, hh + 0.95, cz], s: [0.06, 0.95, dp - 0.6], c: C.glass, m: 'glass' })
  }
  const doors = ext ? 2 : 4
  for (let i = 0; i < doors; i++) rollerDoor(c, cx - w / 2 + (w / doors) * (i + 0.5), Math.min(4.2, w / doors - 1.6), 3.2, ext ? C.steel : C.steelLight)
  if (!ext) {
    // engine test cell stack with warning bands
    const sx = cx - w / 2 + 2.2, sz = c.back - 2.4
    B.roof.push({ p: [sx, hh + 3.4, sz], s: [0.9, 6.4, 0.9], c: C.steelLight, g: 'cyl' })
    for (const y of [hh + 5.0, hh + 6.2]) B.roof.push({ p: [sx, y, sz], s: [0.94, 0.5, 0.94], c: C.red, g: 'cyl' })
    rooftopSign(c, 'COMPONENT WORKSHOPS', cx, front + 0.2, hh + 0.2)
  } else {
    rooftopSign(c, 'CONTRACTOR', cx, front + 0.2, hh + 0.2)
    // their own plot and fence: a different organisation
    for (let i = 0; i <= 10; i++) B.fixed.push({ p: [cx - w / 2 - 2 + i * ((w + 4) / 10), 0.6, c.back + 2], s: [0.08, 1.2, 0.08], c: C.steel })
    B.fixed.push({ p: [cx, 1.1, c.back + 2], s: [w + 4, 0.05, 0.05], c: C.steel })
    B.fixed.push(...place(vehicle('van', C.steelLight), cx + 5, front - 3.4, Math.PI / 2))
  }
}

function hangar(c: Ctx) {
  const { B, cx, cz, w, dp, front, back, accent } = c
  const wallH = 7.4, rise = 3.6, doorH = 6.4, pier = 2.6, t = 0.36
  B.fixed.push({ p: [cx, 0.06, cz], s: [w + 3, 0.12, dp + 3], c: C.pad })
  // back + sides, piers and header on the open front
  B.walls.push({ p: [cx, wallH / 2, back - t / 2], s: [w, wallH, t], c: C.wall })
  for (const s of [-1, 1]) {
    B.walls.push({ p: [cx + s * (w / 2 - t / 2), wallH / 2, cz], s: [t, wallH, dp - 2 * t], c: C.wallShade })
    B.walls.push({ p: [cx + s * (w / 2 + 0.02), wallH * 0.8, cz], s: [0.06, wallH * 0.14, dp - 3], c: C.glass, m: 'glass' })
    B.walls.push({ p: [cx + s * (w / 2 - pier / 2), wallH / 2, front + t / 2], s: [pier, wallH, t], c: C.wall })
    // sliding door leaves parked at the piers
    for (let k = 0; k < 2; k++) {
      B.walls.push({ p: [cx + s * (w / 2 - pier - 1.5 - k * 0.5), doorH / 2, front - 0.25 - k * 0.3], s: [3.0, doorH, 0.2], c: C.steelLight })
      B.walls.push({ p: [cx + s * (w / 2 - pier - 1.5 - k * 0.5), doorH * 0.62, front - 0.37 - k * 0.3], s: [2.5, 0.9, 0.04], c: C.glass, m: 'glass' })
    }
  }
  B.walls.push({ p: [cx, (wallH + doorH) / 2, front + t / 2], s: [w - 2 * pier, wallH - doorH, t], c: C.wall })
  B.walls.push({ p: [cx, doorH - 0.1, front - 0.05], s: [w - 2 * pier + 0.6, 0.2, 0.5], c: C.steel })
  // barrel roof with ribs and a ridge skylight
  B.roof.push({ p: [cx, wallH, cz], s: [w + 0.9, rise * 2, dp + 0.9], c: tint(accent, 0.08), g: 'arc' })
  for (let z = front + 0.4; z < back; z += 3.8) B.roof.push({ p: [cx, wallH, z], s: [w + 1.2, rise * 2 + 0.22, 0.3], c: shade(accent, 0.12), g: 'arc' })
  B.roof.push({ p: [cx, wallH + rise - 0.06, cz], s: [3.0, 0.2, dp * 0.84], c: C.glass, m: 'glass' })
  B.roof.push({ p: [cx, wallH + 0.05, front + 0.2], s: [w + 0.9, 0.3, 0.5], c: C.roofEdge }, { p: [cx, wallH + 0.05, back - 0.2], s: [w + 0.9, 0.3, 0.5], c: C.roofEdge })
  B.roof.push({ p: [cx, wallH - 0.52, front - 0.12], s: [15.4, 0.96, 0.1], c: C.navy })
  B.roofSigns.push({ text: 'BASE MAINTENANCE HANGAR', p: [cx, wallH - 0.52, front - 0.2], w: 15, h: 0.78 })
}

function hangarDressing(c: Ctx) {
  const { B, cx, cz, dp, accent } = c
  const az = cz - 0.14 * dp - 0.2 // aircraft bay centre; the aircraft itself is drawn by the aircraft layer, nose towards the door
  const I = B.interior
  // painted nose-in line and safety zone
  I.push({ p: [cx, 0.16, az], s: [0.14, 0.02, 15.5], c: C.taxi })
  for (const s of [-1, 1]) I.push({ p: [cx + s * 9.6, 0.16, az - 0.5], s: [0.1, 0.02, 13], c: C.yellow })
  // docking: nose, both wings, tail
  I.push(...place(platform(3.2, 1.5, 1.5), cx + 2.6, az - 5.6, Math.PI / 2))
  I.push(...place(platform(3.2, 1.5, 1.5), cx - 2.6, az - 5.6, -Math.PI / 2))
  I.push(...place(platform(4.4, 1.25, 1.4), cx + 4.9, az + 1.9, 0))
  I.push(...place(platform(4.4, 1.25, 1.4), cx - 4.9, az + 1.9, 0))
  I.push(...place(platform(2.6, 3.6, 1.8), cx + 1.9, az + 6.3, Math.PI))
  // wing jacks, tool trolleys, cones
  for (const s of [-1, 1]) {
    I.push({ p: [cx + s * 4.2, 0.5, az - 0.6], s: [0.5, 0.9, 0.5], c: C.yellow, g: 'cone' }, { p: [cx + s * 4.2, 1.02, az - 0.6], s: [0.1, 0.5, 0.1], c: C.steel, g: 'cyl' })
    I.push({ p: [cx + s * 7.6, 0.55, az - 3.4], s: [0.9, 0.8, 0.5], c: C.red }, { p: [cx + s * 7.6, 0.98, az - 3.4], s: [0.96, 0.05, 0.56], c: C.dark })
    I.push(...cone(cx + s * 8.3, az - 1.2), ...cone(cx + s * 8.3, az + 2.2), ...cone(cx + s * 1.6, az - 8.4))
  }
  I.push(...place(vehicle('gpu', C.yellow), cx - 6.6, az - 6.2, 0.4))
  // along the walls: parts racks, tool chests, lockers, extinguisher points and FOD bins
  const wx = c.w / 2 - 1.0
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) I.push(...place(toolChest(0, 0, k % 2 ? C.blue : C.red), cx + s * wx, az - 6 + k * 3.2, s * Math.PI / 2).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.12, p.p[2]] as V3 })))
    I.push(...extinguisher(cx + s * (wx + 0.2), az - 9.2).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.12, p.p[2]] as V3 })), ...bin(cx + s * (wx - 0.1), az + 4.6, C.yellow).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.12, p.p[2]] as V3 })))
    // a green walkway down each side, and a hose reel on the wall
    I.push({ p: [cx + s * (wx - 1.3), 0.158, az - 1], s: [0.9, 0.012, 15], c: '#8fb98a' })
    I.push({ p: [cx + s * (c.w / 2 - 0.5), 1.6, az + 2.5], s: [0.5, 0.5, 0.16], c: C.red, g: 'cyl', r: [0, 0, Math.PI / 2] })
    // wheel chocks and a drip tray under each engine
    I.push({ p: [cx + s * 2.5, 0.2, az - 0.7], s: [1.2, 0.05, 1.0], c: C.steel }, { p: [cx + s * 1.25, 0.2, az + 0.55], s: [0.45, 0.14, 0.16], c: C.yellow })
  }
  I.push(...place(pallet(0, 0, 7, accent), cx + 7.2, az + 4.4, 0.3).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.12, p.p[2]] as V3 })), ...place(pallet(0, 0, 11), cx - 8.6, az + 3.6, -0.2).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.12, p.p[2]] as V3 })))
  // an engine cowl opened for access: work in progress
  I.push({ p: [cx - 3.1, 0.95, az - 0.9], s: [0.06, 0.7, 1.4], c: C.white, r: [0, 0, 0.5] }, { p: [cx - 1.85, 0.95, az - 0.9], s: [0.06, 0.7, 1.4], c: C.white, r: [0, 0, -0.5] })
}

function institution(c: Ctx) {
  const { B, cx, cz, w, dp, h, front, accent } = c
  const base = 0.5
  B.fixed.push({ p: [cx, 0.06, cz - 3], s: [w + 8, 0.12, dp + 14], c: C.pad })
  B.fixed.push({ p: [cx, base / 2, cz], s: [w + 2.4, base, dp + 2.4], c: C.stoneShade })
  for (let i = 0; i < 3; i++) B.fixed.push({ p: [cx, base - 0.08 - i * 0.16, front - 1.6 - i * 0.55], s: [11 + i * 0.8, 0.16, 0.6], c: C.stone })
  volume(c, cx, cz, w, dp, h - base, { y0: base, floors: 3, wall: C.stone, winH: 0.56, winY: 0.52, mull: 1.05, glass: C.glassDark })
  // portico
  const colH = h - base - 1.7
  for (let i = 0; i < 6; i++) B.walls.push({ p: [cx - 5 + i * 2, base + colH / 2, front - 1.5], s: [0.62, colH, 0.62], c: C.white, g: 'cyl' })
  B.walls.push({ p: [cx, base + colH + 0.35, front - 1.3], s: [11.6, 0.7, 2.3], c: C.stone })
  B.roof.push({ p: [cx, h - 0.2 + 0.85, front - 1.3], s: [11.6, 1.7, 2.3], c: C.stone, g: 'gable' })
  B.walls.push({ p: [cx, base + 1.3, front - 0.05], s: [2.0, 2.6, 0.12], c: C.dark })
  flatRoof(c, cx, cz, w, dp, h, { plant: 0, color: accent })
  // drum and dome
  B.roof.push({ p: [cx, h + 0.9, cz + 1], s: [5.2, 1.3, 5.2], c: C.stone, g: 'cyl' })
  B.roof.push({ p: [cx, h + 1.5, cz + 1], s: [4.8, 3.4, 4.8], c: accent, g: 'sphere' })
  B.roof.push({ p: [cx, h + 3.5, cz + 1], s: [0.1, 1.4, 0.1], c: C.steel, g: 'cyl' })
  B.roofSigns.push({ text: 'COMPETENT AUTHORITY', p: [cx, base + colH + 0.35, front - 2.5], w: 10.6, h: 0.56, color: '#1b2a3d', style: 'paint' })
  flagpole(B, cx + 8, front - 4.5, '#2f5fa8', 8)
  flagpole(B, cx - 8, front - 4.5, accent, 8)
  for (let i = 0; i < 4; i++) B.fixed.push(...place(vehicle('car', [C.navy, C.steelLight, C.white, C.navy][i]), cx + 3.4 + i * 1.7, front - 9.5, 0))
  roofNumber(c, cx + w / 2 - 2.3, c.back - 1.8)
}

function pavilion(c: Ctx) {
  const { B, cx, cz, w, dp, h, front, accent } = c
  B.fixed.push({ p: [cx, 0.06, cz], s: [w + 4, 0.12, dp + 4], c: C.pad })
  B.fixed.push({ p: [cx, 0.2, cz], s: [w + 0.8, 0.28, dp + 0.8], c: C.stone })
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) B.walls.push({ p: [cx + sx * (w / 2 - 0.4), 0.3 + (h - 0.3) / 2, cz + sz * (dp / 2 - 0.4)], s: [0.34, h - 0.3, 0.34], c: C.white, g: 'cyl' })
  B.roof.push({ p: [cx, h + 0.15, cz], s: [w + 1.8, 0.3, dp + 1.8], c: C.white })
  B.roof.push({ p: [cx, h + 0.33, cz], s: [w + 0.6, 0.08, dp + 0.6], c: tint(accent, 0.2) })
  B.roof.push({ p: [cx, h + 0.4, cz], s: [w * 0.4, 0.1, dp * 0.4], c: C.glass, m: 'glass' })
  B.roofSigns.push({ text: 'REGULATORY DOCUMENTS', p: [cx, h + 0.15, front - 0.92], w: 9.6, h: 0.24 + 0.3, color: '#1b2a3d', style: 'paint' })
  roofNumber(c, cx + w / 2 - 1.6, c.back - 1.2, h + 0.39)
}

function apron(c: Ctx) {
  const { B, d } = c
  const rects = roomRects(d)
  const rect = (id: string) => rects.find((x) => x.room.id === id)!
  // scope sign: a billboard at the edge of the apron
  const sg = rect('scope-sign')
  B.fixed.push({ p: [sg.x - 2.2, 1.6, sg.z + 3.6], s: [0.16, 3.2, 0.16], c: C.steel }, { p: [sg.x + 2.2, 1.6, sg.z + 3.6], s: [0.16, 3.2, 0.16], c: C.steel })
  B.fixed.push({ p: [sg.x, 3.1, sg.z + 3.6], s: [6.4, 3.4, 0.18], c: C.navy })
  B.signs.push({ text: 'SCOPE OF WORK', p: [sg.x, 3.1, sg.z + 3.5], w: 6.0, h: 3.0, style: 'scope' })
  // line station: a small hut by the stands
  const ls = rect('line-station')
  B.fixed.push({ p: [ls.x + 3, 1.3, ls.z + 4], s: [5.4, 2.6, 3.0], c: C.wall }, { p: [ls.x + 3, 2.7, ls.z + 4], s: [5.9, 0.2, 3.5], c: CATEGORY_COLOR.aircraft })
  B.fixed.push({ p: [ls.x + 3, 1.5, ls.z + 2.48], s: [3.6, 1.0, 0.06], c: C.glass, m: 'glass' }, { p: [ls.x + 0.9, 1.0, ls.z + 2.48], s: [0.9, 2.0, 0.06], c: C.dark })
  B.signs.push({ text: 'LINE STATION', p: [ls.x + 3, 2.36, ls.z + 2.46], w: 4.2, h: 0.5 })
  // GSE park
  const gp = rect('gse-park')
  B.fixed.push(...place(vehicle('stairs', C.white), gp.x + 4.5, gp.z + 0.6, Math.PI), ...place(vehicle('gpu', C.yellow), gp.x + 2.2, gp.z + 1.6, Math.PI))
  B.fixed.push(...place(vehicle('cart', C.blue), gp.x - 3.0, gp.z + 1.8, Math.PI / 2), ...place(vehicle('cart', C.blue), gp.x - 5.0, gp.z + 1.8, Math.PI / 2))
  // occasional / remote location: a field shelter away from the base
  const rl = rect('remote-location')
  B.fixed.push({ p: [rl.x + 2.2, 1.1, rl.z + 2.6], s: [4.4, 2.2, 3.4], c: C.white, g: 'arc' }, { p: [rl.x + 2.2, 0.1, rl.z + 2.6], s: [4.6, 0.06, 3.6], c: C.curb })
  B.fixed.push(...cone(rl.x - 4, rl.z - 3), ...cone(rl.x + 5.5, rl.z - 3), ...cone(rl.x - 4, rl.z + 5), ...cone(rl.x + 5.5, rl.z + 5))
  // stand 1: line maintenance in progress
  const st = rect('stand')
  const sx = st.x - 0.253 * st.w
  B.fixed.push(...place(vehicle('stairs', C.white), sx - 2.6, st.z + 3.9, -Math.PI / 2), ...place(vehicle('gpu', C.yellow), sx + 3.2, st.z + 6.2, 0.5))
  B.fixed.push(...cone(sx - 8, st.z + 1), ...cone(sx + 8, st.z + 1), ...cone(sx, st.z + 8.2), ...cone(sx + 1.5, st.z - 7.6))
  for (const s of [-1, 1]) B.fixed.push({ p: [sx + s * 1.2, 0.12, st.z + 0.3], s: [0.5, 0.2, 0.2], c: C.yellow })
}

// ─────────────────────────────── interiors ───────────────────────────────

export interface AnchorSpot { place: string; x: number; y: number; z: number; role: boolean; scale: number }

/** World position of every anchor, with the scale its prop was drawn at. */
export function anchorSpots(d: District, floorY: number): AnchorSpot[] {
  const out: AnchorSpot[] = []
  for (const rc of roomRects(d)) {
    const n = rc.room.anchors.length
    const scale = d.kind === 'apron' || rc.room.id === 'aircraft-bay' ? 1 : clamp(Math.min(rc.w / (n * 2.5), rc.d / 2.5), 0.5, 1.05)
    for (const a of rc.room.anchors) {
      const pl = `${d.id}/${rc.room.id}/${a.id}`
      const [x, z] = placePosition(pl)
      out.push({ place: pl, x, y: floorY, z, role: a.type === 'role', scale })
    }
  }
  return out
}

function interior(c: Ctx) {
  const { B, d, accent } = c
  const rects = roomRects(d)
  const fy = B.floorY
  const spots = anchorSpots(d, fy)
  rects.forEach((rc, i) => {
    const open = d.kind === 'apron' || d.kind === 'pavilion' || rc.room.id === 'aircraft-bay'
    const zone = rc.room.anchors.find((a) => a.tint)?.tint
    if (d.kind === 'apron') {
      // painted room outline on the tarmac
      for (const s of [-1, 1]) {
        B.fixed.push({ p: [rc.x, 0.135, rc.z + s * rc.d / 2], s: [rc.w, 0.02, 0.12], c: C.mark })
        B.fixed.push({ p: [rc.x + s * rc.w / 2, 0.135, rc.z], s: [0.12, 0.02, rc.d], c: C.mark })
      }
    } else {
      B.interior.push({ p: [rc.x, fy + 0.03, rc.z], s: [rc.w, 0.06, rc.d], c: zone ? mix('#f4f0e7', zone, 0.34) : rc.room.id === 'aircraft-bay' ? '#dcdedc' : mix('#f4f0e7', accent, i % 2 ? 0.2 : 0.12) })
    }
    if (!open) {
      const ph = 0.7, door = Math.min(1.0, rc.w * 0.3), dx = rc.x - rc.w * 0.26
      const zf = rc.z - rc.d / 2 + 0.04, zb = rc.z + rc.d / 2 - 0.04
      // back and side walls, with a glazed screen along the back; the front wall has a doorway
      B.interior.push({ p: [rc.x, fy + ph / 2, zb], s: [rc.w, ph, 0.09], c: C.trim }, { p: [rc.x, fy + ph + 0.19, zb], s: [rc.w - 0.2, 0.38, 0.03], c: '#d4e6ee', m: 'glass' }, { p: [rc.x, fy + ph + 0.4, zb], s: [rc.w, 0.04, 0.06], c: C.steelLight })
      for (const s of [-1, 1]) {
        B.interior.push({ p: [rc.x + s * (rc.w / 2 - 0.04), fy + ph / 2, rc.z], s: [0.09, ph, rc.d], c: C.trim })
        B.interior.push({ p: [rc.x + s * (rc.w / 2 - 0.04), fy + 0.56, zb], s: [0.09, 1.12, 0.09], c: C.steelLight })
      }
      const l0 = rc.x - rc.w / 2, l1 = dx - door / 2, r0 = dx + door / 2, r1 = rc.x + rc.w / 2
      B.interior.push({ p: [(l0 + l1) / 2, fy + ph / 2, zf], s: [l1 - l0, ph, 0.09], c: C.trim }, { p: [(r0 + r1) / 2, fy + ph / 2, zf], s: [r1 - r0, ph, 0.09], c: C.trim })
      for (const x of [l1, r0]) B.interior.push({ p: [x, fy + 0.55, zf], s: [0.08, 1.1, 0.12], c: accent })
      B.interior.push({ p: [r0 + 0.03, fy + 0.5, zf + door * 0.42], s: [0.05, 1.0, door * 0.86], c: C.wood, r: [0, 0.35, 0] })
      B.interior.push({ p: [dx, fy + 0.065, zf + 0.45], s: [door * 0.8, 0.012, 0.5], c: shade(accent, 0.1) })
    }
    for (const a of rc.room.anchors) {
      if (a.prop === 'aircraft') continue
      const sp = spots.find((s) => s.place === `${d.id}/${rc.room.id}/${a.id}`)!
      const parts = place(prop(a.prop, hash(sp.place), a.tint), sp.x, sp.z + (a.type === 'role' ? 0.42 * sp.scale : 0), a.prop === 'vehicle' ? Math.PI / 2 : 0, sp.scale)
      for (const p of parts) p.p[1] += fy
      ;(d.kind === 'apron' ? B.fixed : B.interior).push(...parts)
    }
    if (!open) dress(c, rc, spots.filter((s) => s.place.startsWith(`${d.id}/${rc.room.id}/`)), zone)
  })
  // regulatory documents: the forms themselves, on display
  if (d.id === 'documents') {
    const at = (room: string) => rects.find((x) => x.room.id === room)!
    const f1 = at('form-1'), f3 = at('form-3'), cr = at('class-rating')
    B.signs.push({ text: 'EASA FORM 1', p: [f1.x, fy + 1.9, f1.z + 1.0], w: 2.6, h: 1.84, style: 'form1' })
    B.signs.push({ text: 'EASA FORM 3-145', p: [f3.x, fy + 1.9, f3.z + 1.0], w: 2.0, h: 2.6, style: 'form3' })
    for (const r of [f1, f3]) B.interior.push({ p: [r.x, fy + 1.9, r.z + 1.06], s: [r === f1 ? 2.8 : 2.2, r === f1 ? 2.04 : 2.8, 0.08], c: C.navy }, { p: [r.x, fy + 0.45, r.z + 1.06], s: [0.14, 0.9, 0.1], c: C.steel })
    void cr
  }
}

/**
 * Furnish a room around the things that carry requirements. Nothing here means
 * anything: it only makes the room read as the kind of place it is, and it never
 * takes the spot of an anchor.
 */
function dress(c: Ctx, rc: RoomRect, spots: AnchorSpot[], zone?: string) {
  const { B, d, accent } = c
  const fy = B.floorY
  const r = rng(hash(d.id + rc.room.id))
  const s = clamp(Math.min(rc.w, rc.d) / 4.6, 0.55, 1)
  const taken: [number, number, number][] = spots.flatMap((sp): [number, number, number][] => [[sp.x, sp.z + 0.4 * sp.scale, 1.45 * sp.scale], ...(sp.role ? [[sp.x - 0.75 * sp.scale, sp.z - 0.3 * sp.scale, 0.6] as [number, number, number]] : [])])
  // keep the doorway clear
  taken.push([rc.x - rc.w * 0.26, rc.z - rc.d / 2 + 0.5, 0.9])
  const put = (parts: Part[], x: number, z: number, rad: number, ry = 0) => {
    if (Math.abs(x - rc.x) > rc.w / 2 - 0.3 * s || Math.abs(z - rc.z) > rc.d / 2 - 0.3 * s) return false
    if (taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < tr + rad)) return false
    taken.push([x, z, rad])
    const placed = place(parts, x, z, ry, s)
    for (const p of placed) p.p[1] += fy
    B.interior.push(...placed)
    return true
  }
  const back = rc.z + rc.d / 2 - 0.42 * s, front = rc.z - rc.d / 2 + 0.45 * s, left = rc.x - rc.w / 2 + 0.45 * s, right = rc.x + rc.w / 2 - 0.45 * s
  const along = (n: number, i: number) => left + ((right - left) * (i + 0.5)) / n
  // the room's own emblem goes in first, in the best free spot facing the door
  const em = emblem(`${d.id}/${rc.room.id}`)
  if (em) {
    const er = 0.8 * s
    void (put(em, right - 0.45 * s, back - 0.25 * s, er) || put(em, left + 0.45 * s, back - 0.25 * s, er) || put(em, rc.x, back - 0.25 * s, er) || put(em, right - 0.4 * s, rc.z, er) || put(em, left + 0.4 * s, rc.z, er) || put(em, right - 0.5 * s, front + 0.5 * s, er * 0.8))
  }
  const industrial = d.kind === 'workshop' || d.kind === 'hangar'
  if (industrial) {
    // marked floor, a bench against the back wall, tools and gas, an extinguisher by the door
    B.interior.push({ p: [rc.x, fy + 0.064, rc.z], s: [rc.w - 0.7, 0.01, rc.d - 0.7], c: mix('#dcdedc', accent, 0.1) })
    for (const k of [-1, 1]) B.interior.push({ p: [rc.x, fy + 0.07, rc.z + k * (rc.d / 2 - 0.35)], s: [rc.w - 0.7, 0.012, 0.07], c: C.yellow }, { p: [rc.x + k * (rc.w / 2 - 0.35), fy + 0.07, rc.z], s: [0.07, 0.012, rc.d - 0.7], c: C.yellow })
    // a run of benches, racks and machines along the back wall, as many as the room takes
    const slots = Math.max(1, Math.floor(rc.w / (2.7 * s)))
    for (let i = 0; i < slots; i++) {
      const x = along(slots, i), k = (i + Math.floor(r() * 3)) % 3
      if (k === 0) put(workbench(0, 0, 2.2, accent), x, back - 0.1, 1.0 * s)
      else if (k === 1) put(prop('rack', hash(rc.room.id) + i, accent), x, back - 0.15, 1.05 * s)
      else put([{ p: [0, 0.55, 0], s: [1.5, 1.1, 0.8], c: tint(accent, 0.3) }, { p: [0.3, 1.25, 0], s: [0.6, 0.3, 0.5], c: C.steelLight }, { p: [-0.5, 1.2, -0.1], s: [0.26, 0.5, 0.26], c: C.steel, g: 'cyl' }, { p: [0.55, 0.8, -0.41], s: [0.3, 0.22, 0.02], c: '#9fd4f0', m: 'glow' }, { p: [0, 0.03, 0], s: [1.8, 0.02, 1.1], c: C.yellow }], x, back - 0.15, 0.95 * s)
    }
    // work in hand in the middle of the floor: a trolley of parts and a stool
    put([{ p: [0, 0.5, 0], s: [0.9, 0.05, 0.55], c: C.steelLight }, { p: [0, 0.18, 0], s: [0.9, 0.05, 0.55], c: C.steelLight }, { p: [-0.2, 0.62, 0], s: [0.3, 0.18, 0.3], c: C.wood }, { p: [0.22, 0.6, 0.05], s: [0.22, 0.14, 0.22], c: accent, g: 'cyl' }, ...[-1, 1].flatMap((sx): Part[] => [-1, 1].map((sz): Part => ({ p: [sx * 0.4, 0.26, sz * 0.24], s: [0.04, 0.52, 0.04], c: C.steel })))], rc.x + rc.w * 0.2, rc.z - rc.d * 0.05, 0.6 * s, 0.4)
    put(toolChest(0, 0, r() < 0.5 ? C.red : C.blue), r() < 0.5 ? left + 0.2 : right - 0.2, rc.z + rc.d * 0.12, 0.5 * s, Math.PI / 2)
    put(cylinders(0, 0), right - 0.3, back, 0.55 * s) || put(cylinders(0, 0), left + 0.3, back, 0.55 * s)
    put(lockers(0, 0, 2, C.steel), left + 0.3, back, 0.55 * s)
    put(extinguisher(0, 0), right, front, 0.25)
    put(pallet(0, 0, hash(rc.room.id), accent), right - 0.4, rc.z - rc.d * 0.2, 0.6 * s)
    put(bin(0, 0, C.yellow), left, front, 0.25)
  } else if (d.kind === 'warehouse') {
    // aisle lines, pallets waiting along the back wall, a hand truck's worth of boxes by the door
    for (const k of [-1, 1]) B.interior.push({ p: [rc.x + k * rc.w * 0.2, fy + 0.066, rc.z], s: [0.06, 0.012, rc.d - 0.9], c: zone ?? C.yellow })
    for (let i = 0; i < 4; i++) put(pallet(0, 0, hash(rc.room.id) + i, zone ?? accent), along(4, i), back - 0.1, 0.55 * s)
    put(pallet(0, 0, hash(rc.room.id) + 9, zone ?? accent), right - 0.2, rc.z - rc.d * 0.15, 0.55 * s, 0.3)
    put(extinguisher(0, 0), right, front, 0.25)
    put(bin(0, 0, zone ?? C.steel), left, front, 0.25)
  } else {
    // a rug, something green, storage along the back wall, water and a bin by the door
    const rug = d.kind === 'institution' ? C.navy : mix(accent, '#ffffff', 0.5)
    B.interior.push({ p: [rc.x, fy + 0.064, rc.z + rc.d * 0.04], s: [rc.w * 0.6, 0.012, rc.d * 0.5], c: rug }, { p: [rc.x, fy + 0.067, rc.z + rc.d * 0.04], s: [rc.w * 0.6 - 0.3, 0.012, rc.d * 0.5 - 0.3], c: mix(rug, '#ffffff', 0.25) })
    put(plant(0, 0, 1.1), r() < 0.5 ? left : right, back, 0.35 * s)
    // larger rooms get a meeting corner and more storage
    if (rc.w * rc.d > 34) {
      put([{ p: [0, 0.5, 0], s: [1.1, 0.06, 1.1], c: C.wood, g: 'cyl' }, { p: [0, 0.25, 0], s: [0.12, 0.5, 0.12], c: C.steel, g: 'cyl' }, { p: [0.15, 0.545, 0.1], s: [0.3, 0.012, 0.22], c: C.paper, r: [0, 0.4, 0] }], rc.x + rc.w * 0.24, rc.z + rc.d * 0.2, 0.75 * s)
      put(prop('shelf', hash(rc.room.id) + 5), rc.x - rc.w * 0.22, back, 1.15 * s)
      put(lockers(0, 0, 3, C.steelLight), rc.x + rc.w * 0.3, back, 0.7 * s)
    }
    put(prop('cabinet', hash(rc.room.id) + 3), rc.x + (r() - 0.5) * rc.w * 0.2, back + 0.05, 0.95 * s) || put(lockers(0, 0, 2, C.steelLight), rc.x, back, 0.5 * s)
    put(cooler(0, 0), right, front + 0.1, 0.3 * s) || put(cooler(0, 0), left, back, 0.3 * s)
    put(bin(0, 0), right - 0.5 * s, front, 0.22)
    put(plant(0, 0, 0.8), left, rc.z + rc.d * 0.1, 0.3 * s)
    if (rc.w > 5) put(bench(0, 0, 1.4, Math.PI / 2), right, rc.z + rc.d * 0.1, 0.7 * s)
  }
}

// ─────────────────────────────── entry point ───────────────────────────────

/** height of the walkable floor in each district */
export const FLOOR_Y: Record<string, number> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d.kind === 'institution' ? 0.5 : d.kind === 'pavilion' ? 0.34 : d.id === 'moe' ? 0.48 : d.kind === 'apron' ? 0.1 : 0.12]))

const BUILDERS: Record<District['kind'], (c: Ctx) => void> = { office, warehouse, workshop, hangar, institution, pavilion, apron }

export function buildDistrict(d: District): Built {
  const B: Built = {
    fixed: [], walls: [], roof: [], interior: [], roofSigns: [], signs: [],
    alwaysOpen: d.kind === 'apron' || d.kind === 'pavilion' || d.kind === 'hangar',
    floorY: FLOOR_Y[d.id],
    knee: 0.85,
  }
  const [cx, cz] = d.pos
  const [w, dp] = d.size
  const c: Ctx = { B, d, cx, cz, w, dp, h: d.height, front: cz - dp / 2, back: cz + dp / 2, accent: CATEGORY_COLOR[d.category], r: rng(hash(d.id)) }
  BUILDERS[d.kind](c)
  interior(c)
  if (d.kind === 'hangar') hangarDressing(c)
  return B
}
