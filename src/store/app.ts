import { create } from 'zustand'
import type { Place } from '../content/city'

export type Mode = 'explore' | 'reference'
export type Tab = 'IR' | 'AMC' | 'GM'
export type Overlay = null | 'search' | 'find' | 'audit' | 'glossary' | 'source' | 'settings' | 'about'
export type TimeMode = 'auto' | 'day' | 'night'

export interface Settings {
  /** ambient animation: people, vehicles, aircraft, clouds */
  animation: boolean
  /** cinematic camera flights; off = instant navigation */
  cinematic: boolean
  timeMode: TimeMode
  /** fewer instances, no shadows */
  lowPower: boolean
  tocOpen: boolean
  legendOpen: boolean
}

const narrow = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches
const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const DEFAULT_SETTINGS: Settings = {
  animation: !prefersReduced, cinematic: !prefersReduced, timeMode: 'day', lowPower: false, tocOpen: !narrow, legendOpen: false,
}

interface AppState {
  mode: Mode
  /** selected dataset item + optional point path */
  selectedId: string | null
  selectedPath: string
  tab: Tab
  /** place the city is focused on; drives camera, open building and highlight */
  focus: Place | null
  /** bump to re-run the camera flight even when focus is unchanged */
  focusTick: number
  hover: Place | null
  connections: boolean
  infosec: boolean
  overlay: Overlay
  settings: Settings
  webgl: boolean
  panelOpen: boolean
  set: (p: Partial<AppState>) => void
  setSettings: (p: Partial<Settings>) => void
  focusOn: (place: Place | null) => void
}

export const useApp = create<AppState>((set) => ({
  mode: 'explore', selectedId: null, selectedPath: '', tab: 'IR', focus: null, focusTick: 0, hover: null,
  connections: false, infosec: false, overlay: null, settings: DEFAULT_SETTINGS, webgl: true, panelOpen: false,
  set: (p) => set(p),
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  focusOn: (place) => set((s) => ({ focus: place, focusTick: s.focusTick + 1 })),
}))
