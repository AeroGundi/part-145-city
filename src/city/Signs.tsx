/**
 * Text in the 3D world: façade plates, roof and ground paint, and the schematic
 * forms on display in the Regulatory Documents pavilion. Drawn to canvas textures
 * with the application's own fonts, so nothing is fetched at runtime.
 */
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { SignSpec } from './buildings'

const SANS = '"IBM Plex Sans", system-ui, sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, monospace'

let fontsReady = false
const waiters = new Set<() => void>()
if (typeof document !== 'undefined' && document.fonts) {
  void Promise.all([document.fonts.load(`600 32px ${SANS}`), document.fonts.load(`500 32px ${MONO}`)])
    .catch(() => undefined)
    .then(() => { fontsReady = true; waiters.forEach((w) => w()); waiters.clear() })
} else fontsReady = true

function useFonts() {
  const [ok, setOk] = useState(fontsReady)
  useEffect(() => {
    if (fontsReady) { setOk(true); return }
    const w = () => setOk(true)
    waiters.add(w)
    return () => { waiters.delete(w) }
  }, [])
  return ok
}

function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, maxW: number) {
  ctx.font = font(px)
  const w = ctx.measureText(text).width
  if (w > maxW) { px *= maxW / w; ctx.font = font(px) }
  return px
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  // canvas letterSpacing is not universal; lay the glyphs out by hand
  const widths = [...text].map((ch) => ctx.measureText(ch).width + tracking)
  let cx = x - (widths.reduce((a, b) => a + b, 0) - tracking) / 2
  ctx.textAlign = 'left'
  ;[...text].forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i] })
}

function draw(spec: SignSpec): THREE.CanvasTexture {
  const ppu = Math.min(150, 1400 / Math.max(spec.w, spec.h))
  const W = Math.round(spec.w * ppu), H = Math.round(spec.h * ppu)
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.textBaseline = 'middle'
  const style = spec.style ?? 'plate'

  if (style === 'plate' || style === 'paint') {
    ctx.fillStyle = spec.color ?? (style === 'paint' ? 'rgba(255,255,255,.9)' : '#f6f2e7')
    const hasSub = !!spec.sub
    const base = hasSub ? H * 0.5 : H * 0.72
    const sans = (px: number) => `600 ${px}px ${SANS}`
    const tracking = base * 0.09
    let px = base
    ctx.font = sans(px)
    const tw = ctx.measureText(spec.text).width + tracking * (spec.text.length - 1)
    if (tw > W * 0.94) px *= (W * 0.94) / tw
    ctx.font = sans(px)
    spaced(ctx, spec.text, W / 2, hasSub ? H * 0.4 : H * 0.53, px * 0.09)
    if (spec.sub) {
      const sp = fit(ctx, spec.sub, (p) => `500 ${p}px ${MONO}`, H * 0.11, W * 0.9)
      spaced(ctx, spec.sub, W / 2, H * 0.8, sp * 0.06)
    }
  } else if (style === 'scope') {
    ctx.fillStyle = '#1b2a3d'; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#9fb0c3'
    ctx.font = `500 ${H * 0.062}px ${MONO}`
    spaced(ctx, 'PART-145 APPROVAL', W / 2, H * 0.11, H * 0.012)
    ctx.fillStyle = '#f6f2e7'
    ctx.font = `600 ${H * 0.13}px ${SANS}`
    spaced(ctx, 'SCOPE OF WORK', W / 2, H * 0.27, H * 0.012)
    // the four classes of Appendix II
    const rows: [string, string][] = [['A', 'AIRCRAFT'], ['B', 'ENGINES'], ['C', 'COMPONENTS'], ['D', 'SPECIALISED SERVICES']]
    rows.forEach(([k, label], i) => {
      const y = H * (0.44 + i * 0.135)
      ctx.fillStyle = '#b7791f'; ctx.fillRect(W * 0.1, y - H * 0.048, H * 0.096, H * 0.096)
      ctx.fillStyle = '#1b2a3d'; ctx.font = `600 ${H * 0.075}px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText(k, W * 0.1 + H * 0.048, y + H * 0.004)
      ctx.fillStyle = '#e9e4d8'; ctx.font = `500 ${H * 0.062}px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText(label, W * 0.1 + H * 0.14, y + H * 0.004)
    })
  } else {
    // schematic of the form: recognisable layout, not a reproduction
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#17212e'; ctx.lineWidth = Math.max(2, W * 0.004)
    const m = W * 0.045
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
    ctx.fillStyle = '#17212e'
    const box = (x: number, y: number, w: number, h: number, n?: string) => {
      ctx.strokeRect(m + x * (W - 2 * m), m + y * (H - 2 * m), w * (W - 2 * m), h * (H - 2 * m))
      if (n) { ctx.font = `500 ${H * 0.032}px ${MONO}`; ctx.textAlign = 'left'; ctx.fillText(n, m + x * (W - 2 * m) + W * 0.012, m + y * (H - 2 * m) + H * 0.032) }
    }
    const line = (x: number, y: number, w: number) => { ctx.fillStyle = '#b9bfc5'; ctx.fillRect(m + x * (W - 2 * m), m + y * (H - 2 * m), w * (W - 2 * m), Math.max(2, H * 0.008)); ctx.fillStyle = '#17212e' }
    if (style === 'form1') {
      box(0, 0, 0.3, 0.17, '1'); box(0.3, 0, 0.42, 0.17, '2'); box(0.72, 0, 0.28, 0.17, '3')
      ctx.font = `600 ${H * 0.048}px ${SANS}`; ctx.textAlign = 'center'
      ctx.fillText('AUTHORISED RELEASE CERTIFICATE', m + 0.51 * (W - 2 * m), m + 0.075 * (H - 2 * m), 0.4 * (W - 2 * m))
      ctx.font = `600 ${H * 0.058}px ${SANS}`; ctx.fillText('EASA FORM 1', m + 0.51 * (W - 2 * m), m + 0.13 * (H - 2 * m))
      box(0, 0.17, 0.72, 0.11, '4'); box(0.72, 0.17, 0.28, 0.11, '5')
      const cols = [0, 0.09, 0.4, 0.58, 0.67, 0.84, 1]
      for (let i = 0; i < 6; i++) { box(cols[i], 0.28, cols[i + 1] - cols[i], 0.07, String(6 + i)); box(cols[i], 0.35, cols[i + 1] - cols[i], 0.17) }
      for (let r = 0; r < 3; r++) { line(0.11, 0.39 + r * 0.045, 0.26); line(0.42, 0.39 + r * 0.045, 0.13); line(0.86, 0.39 + r * 0.045, 0.11) }
      box(0, 0.52, 1, 0.16, '12'); line(0.05, 0.6, 0.7); line(0.05, 0.64, 0.5)
      box(0, 0.68, 0.5, 0.32, '13a–13e'); box(0.5, 0.68, 0.5, 0.32, '14a–14e')
      for (let r = 0; r < 3; r++) { line(0.04, 0.8 + r * 0.055, 0.4); line(0.54, 0.8 + r * 0.055, 0.4) }
    } else {
      ctx.font = `500 ${H * 0.026}px ${MONO}`; ctx.textAlign = 'center'
      ctx.fillText('[MEMBER STATE] · EUROPEAN UNION', W / 2, H * 0.11)
      ctx.font = `600 ${H * 0.04}px ${SANS}`
      ctx.fillText('MAINTENANCE ORGANISATION', W / 2, H * 0.19); ctx.fillText('CERTIFICATE', W / 2, H * 0.24)
      ctx.font = `500 ${H * 0.026}px ${MONO}`; ctx.fillText('Reference: [XX].145.[XXXX]', W / 2, H * 0.31)
      for (let r = 0; r < 4; r++) line(0.1, 0.36 + r * 0.045, 0.8)
      for (let r = 0; r < 4; r++) { ctx.font = `500 ${H * 0.024}px ${MONO}`; ctx.textAlign = 'left'; ctx.fillText(String(r + 1) + '.', m + 0.08 * (W - 2 * m), m + (0.56 + r * 0.07) * (H - 2 * m)); line(0.16, 0.565 + r * 0.07, 0.74) }
      line(0.1, 0.86, 0.3); line(0.6, 0.86, 0.3)
      ctx.font = `600 ${H * 0.03}px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText('EASA FORM 3-145', W / 2, H * 0.935)
    }
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

const STAND: [number, number, number] = [0, Math.PI, 0]
const FLAT: [number, number, number] = [-Math.PI / 2, 0, Math.PI]

/** A textured plane. Standing signs face the default camera (-z); flat ones read from it. */
export function Sign({ spec }: { spec: SignSpec }) {
  const ok = useFonts()
  const tex = useMemo(() => (ok ? draw(spec) : null), [ok, spec])
  useEffect(() => () => tex?.dispose(), [tex])
  if (!tex) return null
  const opaque = spec.style === 'scope' || spec.style === 'form1' || spec.style === 'form3'
  return (
    <mesh position={spec.p} rotation={spec.flat ? FLAT : STAND} raycast={() => null}>
      <planeGeometry args={[spec.w, spec.h]} />
      <meshBasicMaterial map={tex} transparent={!opaque} depthWrite={opaque} toneMapped={false} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
    </mesh>
  )
}
