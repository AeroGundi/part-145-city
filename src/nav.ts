/**
 * Navigation: the URL is the source of truth for what is selected.
 * `syncFromPath` turns a pathname into application state; `go*` helpers push URLs.
 */
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { ITEMS, itemUrl, resolveSlug } from './data/dataset'
import { placesOf } from './graph/graph'
import { resolvePlace } from './content/city'
import { useApp, type Tab } from './store/app'
import { addRecent } from './store/db'
import { Shell } from './ui/Shell'

const rootRoute = createRootRoute({ component: Shell })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' })
const splatRoute = createRoute({ getParentRoute: () => rootRoute, path: '$' })
export const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, splatRoute]), defaultPreload: false })
declare module '@tanstack/react-router' { interface Register { router: typeof router } }

export const go = (to: string, replace = false) => void router.navigate({ to, replace })
export const goItem = (id: string, path = '') => go(itemUrl(id, path))
export const goPlace = (place: string) => go('/place/' + place)
export const goHome = () => go('/')

/** Fly the city to an item's primary location (switching to Explore if needed). */
export function showInCity(id: string, path = '') {
  const p = placesOf(id, path).primary
  const s = useApp.getState()
  s.set({ mode: 'explore', connections: false })
  if (p) s.focusOn(p)
}

export function syncFromPath(pathname: string) {
  const s = useApp.getState()
  const path = decodeURIComponent(pathname)
  let m: RegExpMatchArray | null
  if ((m = path.match(/^\/part-145\/(.+)$/))) {
    const r = resolveSlug(m[1])
    if (!r) { s.set({ selectedId: null, selectedPath: '', panelOpen: false, overlay: null }); return { notFound: m[1] } }
    const it = ITEMS[r.id]
    const tab: Tab = it.type === 'AMC' ? 'AMC' : it.type === 'GM' ? 'GM' : 'IR'
    const changed = s.selectedId !== r.id || s.selectedPath !== r.path
    s.set({ selectedId: r.id, selectedPath: r.path, tab, panelOpen: true, overlay: null })
    if (changed) {
      void addRecent(r.id)
      const p = placesOf(r.id, r.path).primary
      if (p) s.focusOn(p)
      else s.set({ focus: null })
    }
    return {}
  }
  if ((m = path.match(/^\/place\/(.+)$/)) && resolvePlace(m[1])) {
    s.set({ selectedId: null, selectedPath: '', panelOpen: true, overlay: null })
    if (s.focus !== m[1]) s.focusOn(m[1])
    return {}
  }
  if (/^\/(glossary|audit|find)(\/|$)/.test(path)) { s.set({ overlay: path.split('/')[1] as 'glossary' | 'audit' | 'find' }); return {} }
  s.set({ selectedId: null, selectedPath: '', panelOpen: false, overlay: s.overlay === 'search' ? 'search' : null })
  if (path === '/' && s.focus) s.focusOn(null)
  return {}
}
