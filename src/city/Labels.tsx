/**
 * Labels are ordinary DOM, drawn in an overlay beside the canvas and positioned
 * once per frame by projecting their world position. One loop for all of them,
 * crisp text at any zoom, and they belong to the application's own React tree.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CATEGORY_COLOR, DISTRICTS, DISTRICT_BY_ID, resolvePlace, roomRects } from '../content/city'
import { ITEMS } from '../data/dataset'
import { INFOSEC_ITEMS } from '../graph/graph'
import { INFOSEC_NODES } from '../content/mapping'
import { useApp } from '../store/app'
import { goPlace } from '../nav'
import { CatIcon } from '../ui/icons'
import { FLOOR_Y } from './buildings'
import { at, useLayer, useSelection } from './Overlays'

interface Entry { p: THREE.Vector3; el: HTMLElement | null }
const registry = new Map<string, Entry>()
let requestFrame: (() => void) | null = null
let canvasEl: HTMLCanvasElement | null = null

/** Runs inside the canvas: writes screen positions to every registered label. */
export function LabelProjector() {
  const v = useRef(new THREE.Vector3()).current
  useFrame(({ camera, size, invalidate, gl }) => {
    requestFrame = invalidate
    canvasEl = gl.domElement
    camera.updateMatrixWorld()
    for (const l of registry.values()) {
      if (!l.el) continue
      v.copy(l.p).project(camera)
      const off = v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.25 || Math.abs(v.y) > 1.25
      l.el.style.visibility = off ? 'hidden' : 'visible'
      if (!off) l.el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px,0) translate(-50%,-50%)`
    }
  })
  return null
}

export function WorldLabel({ id, pos, z = 1, children }: { id: string; pos: [number, number, number]; z?: number; children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null)
  const [x, y, zz] = pos
  useEffect(() => {
    registry.set(id, { p: new THREE.Vector3(x, y, zz), el: el.current })
    requestFrame?.()
    return () => { registry.delete(id) }
  }, [id, x, y, zz])
  // scrolling over a label should still zoom the city
  const wheel = (e: React.WheelEvent) => canvasEl?.dispatchEvent(new WheelEvent('wheel', { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, clientX: e.clientX, clientY: e.clientY, ctrlKey: e.ctrlKey, bubbles: true, cancelable: true }))
  return <div ref={el} className="wl" style={{ zIndex: z, visibility: 'hidden' }} onWheel={wheel}>{children}</div>
}

/** Every label of the city. Rendered as a sibling of the canvas. */
export function CityLabels() {
  const focus = useApp((s) => s.focus)
  const hover = useApp((s) => s.hover)
  const set = useApp((s) => s.set)
  const layer = useLayer()
  const sel = useSelection()
  const fd = focus?.split('/')[0] ?? null
  const fr = focus?.split('/')[1] ?? null
  const open = fd ? DISTRICT_BY_ID[fd] : null
  const r = sel.primary ? resolvePlace(sel.primary) : null

  return (
    <div className="city-labels">
      {DISTRICTS.filter((d) => d.id !== fd).map((d) => (
        <WorldLabel key={d.id} id={'d:' + d.id} pos={[d.pos[0], d.height + (d.kind === 'apron' ? 4.5 : d.kind === 'hangar' ? 2.4 : 3.6), d.pos[1]]}>
          <button className={`clabel${hover === d.id ? ' on' : ''}${layer.kind && !layer.districts.has(d.id) ? ' dim' : ''}`} tabIndex={-1} aria-label={`${d.name} — district ${d.n}`}
            onClick={() => goPlace(d.id)} onMouseEnter={() => set({ hover: d.id })} onMouseLeave={() => set({ hover: null })}>
            <i style={{ background: CATEGORY_COLOR[d.category] }}><CatIcon cat={d.category} size={12} /></i>{d.short}<em>{String(d.n).padStart(2, '0')}</em>
          </button>
        </WorldLabel>
      ))}
      {open && roomRects(open).map((rc) => (
        <WorldLabel key={rc.room.id} id={`r:${open.id}/${rc.room.id}`} pos={[rc.x, FLOOR_Y[open.id] + (open.kind === 'apron' ? 2.6 : 2.2), rc.z + rc.d * 0.36]}>
          <button className={`rlabel${fr === rc.room.id ? ' on' : ''}`} tabIndex={-1} onClick={() => goPlace(`${open.id}/${rc.room.id}`)}>{rc.room.name}</button>
        </WorldLabel>
      ))}
      {sel.primary && r?.room && (
        <WorldLabel id="pin" z={3} pos={[at(sel.primary)[0], at(sel.primary)[1] + 4.6, at(sel.primary)[2]]}>
          <div className="alabel">{sel.ref && <b>{sel.ref}</b>}{r.anchor?.name ?? r.room.name}</div>
        </WorldLabel>
      )}
      {layer.kind === 'connections' && layer.links.filter((l) => l.kind !== 'self' && l.label).map((l) => (
        <WorldLabel key={l.to} id={'l:' + l.to} z={2} pos={[at(l.to)[0], at(l.to)[1] + 1.8, at(l.to)[2]]}>
          <div className={`llabel ${l.kind === 'process' ? '' : 'ref'}`}>{l.label}</div>
        </WorldLabel>
      ))}
      {layer.kind === 'infosec' && (
        <>
          {layer.links.filter((l) => l.label).map((l) => (
            <WorldLabel key={l.to} id={'i:' + l.to} z={2} pos={[at(l.to)[0], DISTRICT_BY_ID[l.to.split('/')[0]].height + 1.6, at(l.to)[2]]}><div className="llabel">{l.label}</div></WorldLabel>
          ))}
          <WorldLabel id="i:hub" z={3} pos={[at(layer.places[0])[0], DISTRICT_BY_ID[layer.places[0].split('/')[0]].height + 2.2, at(layer.places[0])[2]]}>
            <div className="alabel"><b>{ITEMS[INFOSEC_ITEMS[0]]?.reference}</b>{INFOSEC_NODES[0].label}</div>
          </WorldLabel>
        </>
      )}
    </div>
  )
}
