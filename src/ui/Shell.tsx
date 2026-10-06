import { lazy, Suspense, useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useApp } from '../store/app'
import { go, goHome, syncFromPath } from '../nav'
import { TopBar } from './TopBar'
import { TocTree } from './TocTree'
import { DetailPanel, PlacePanel } from './DetailPanel'
import { CommandK } from './CommandK'
import { FindMode } from './FindMode'
import { AuditMode } from './AuditMode'
import { Glossary } from './Glossary'
import { About } from './About'
import { Breadcrumbs, DatasetBadge, LayerBanner, Legend } from './Chrome'
import { ReferenceView } from './ReferenceView'
import { MiniMap } from './MiniMap'
import { connectionsOf, infosecLinks, placesOf } from '../graph/graph'
import { pointOf, ITEMS } from '../data/dataset'

const CityCanvas = lazy(() => import('../city/CityCanvas'))

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

/** 2D stand-in for the city: small screens and browsers without WebGL. */
function FlatCity({ reason }: { reason: string }) {
  const { selectedId, selectedPath, focus, connections, infosec } = useApp()
  const pid = selectedId ? (ITEMS[selectedId].type === 'IR' ? pointOf(selectedId).id : selectedId) : null
  const places = pid ? placesOf(pid, selectedPath) : { primary: focus, also: [] as string[] }
  const layer = infosec ? infosecLinks() : connections && pid ? connectionsOf(pid, selectedPath) : null
  return (
    <div className="flat-city">
      <MiniMap large highlight={layer ? layer.places : places.primary ? [places.primary, ...places.also] : []} primary={places.primary} links={layer?.links ?? []} />
      <p className="flat-note">{reason}</p>
    </div>
  )
}

export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { mode, overlay, set, selectedId, focus, panelOpen, settings, webgl } = useApp()
  const [notFound, setNotFound] = useState<string | null>(null)
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 760px)').matches)

  useEffect(() => { setNotFound(syncFromPath(pathname).notFound ?? null) }, [pathname])
  useEffect(() => { set({ webgl: hasWebGL() }) }, [set])
  useEffect(() => {
    const mq = matchMedia('(max-width: 760px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName ?? '')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); set({ overlay: useApp.getState().overlay === 'search' ? null : 'search' }) }
      else if (e.key === '/' && !typing) { e.preventDefault(); set({ overlay: 'search' }) }
      else if (e.key === 'Escape' && !typing) {
        const s = useApp.getState()
        if (s.overlay === 'search' || s.overlay === 'about') s.set({ overlay: null })
        else if (s.overlay) goHome()
        else if (s.connections || s.infosec) s.set({ connections: false, infosec: false })
        else if (s.panelOpen) goHome()
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'e') set({ mode: 'explore' })
        else if (e.key === 'r') set({ mode: 'reference' })
        else if (e.key === 'f') go('/find')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  const explore = mode === 'explore'
  const use3d = webgl && !narrow
  const showPanel = explore && panelOpen && (selectedId || focus)
  return (
    <div className={`app mode-${mode}${settings.tocOpen ? ' toc-open' : ''}${showPanel ? ' panel-open' : ''}`}>
      <a className="skip" href="#content">Skip to content</a>
      <TopBar />
      <Breadcrumbs />
      <div className="stage" id="content">
        {/* The city stays mounted in Reference mode so switching back is instant; its render loop pauses. */}
        {use3d && <div className="city-layer" aria-hidden={!explore} style={{ visibility: explore ? 'visible' : 'hidden' }}><Suspense fallback={<div className="city-loading">Building the city…</div>}><CityCanvas active={explore} /></Suspense></div>}
        {explore && !use3d && <FlatCity reason={!webgl ? 'WebGL is not available in this browser, so the city is shown as a plan. All regulatory content remains fully accessible.' : 'On small screens the city is shown as a plan. Tap a district to browse it, or use search.'} />}
        {settings.tocOpen && <div className="left-rail"><TocTree /></div>}
        {explore ? (
          <>
            <LayerBanner />
            {showPanel && (selectedId ? <DetailPanel /> : <PlacePanel />)}
            {!showPanel && use3d && <div className="hint">Drag to pan · right-drag or <kbd>⇧</kbd>+drag to rotate · scroll to zoom · click a building to open it · <kbd>0</kbd> overview</div>}
            <Legend />
            <DatasetBadge />
          </>
        ) : <ReferenceView />}
        {notFound && <div className="toast" role="alert">“{notFound}” is not in the Part-145 dataset. <button onClick={() => { setNotFound(null); goHome() }}>Dismiss</button></div>}
      </div>
      {overlay === 'search' && <CommandK />}
      {overlay === 'find' && <FindMode />}
      {overlay === 'audit' && <AuditMode />}
      {overlay === 'glossary' && <Glossary />}
      {overlay === 'about' && <About />}
    </div>
  )
}
