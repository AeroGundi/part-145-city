/**
 * What people wear — so that who someone is can be read at a glance.
 *
 * EDITORIAL, a memory aid. The colours are this application's convention, not a
 * requirement: Part-145 does not prescribe clothing.
 *
 *   yellow vest, white helmet, green stamp   certifying staff — the ones who sign the release
 *   orange vest, yellow helmet               support staff and mechanics — the ones who do the work
 *   yellow vest and a clipboard              independent inspection, airworthiness review
 *   white coat                               NDT and specialised services
 *   dark suit and tie                        accountable manager and nominated persons
 *   teal jacket and a clipboard              compliance monitoring — the auditors
 *   coral jacket                             safety
 *   navy uniform, peaked cap, gold badge     the competent authority
 *   grey overalls, blue helmet               the contracted / subcontracted organisation
 *   lime vest over ordinary clothes          anyone else who is airside: no vest, no entry
 *
 * Hi-vis is for the airside: people walking put it on at the gate and take it off
 * again when they come back landside.
 */
import { C } from './world'

export type Look = 'certifier' | 'support' | 'mechanic' | 'inspector' | 'labcoat' | 'stores' | 'manager' | 'boss' | 'office' | 'auditor' | 'safety' | 'instructor' | 'authority' | 'contractor'

export interface Outfit {
  top: string
  legs: string
  vest?: string
  /** hard hat colour; without it the figure has hair */
  helmet?: string
  /** something carried or worn on the chest */
  item?: { kind: 'clipboard' | 'tie' | 'stamp'; color: string }
  badge?: string
  /** peaked cap */
  brim?: string
}

export const VEST = { certifier: '#e6e62a', support: '#f26a1b', visitor: '#b6e03a' }
const SHIRTS = ['#dfe3e8', '#c9d6e6', '#e8dccb', '#cfd8cf', '#e6d3d3', '#d9d3e6']
const TROUSERS = ['#2f3a4a', '#3b4652', '#4a4f57', '#27303c', '#5a5348']

export function outfit(look: Look, airside: boolean, r: () => number): Outfit {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const o: Outfit = (() => {
    switch (look) {
      case 'certifier': return { top: '#2f4f86', legs: '#27375c', vest: VEST.certifier, helmet: C.white, item: { kind: 'stamp' as const, color: '#2e9e55' }, badge: '#2e9e55' }
      case 'support': return { top: '#2f4f86', legs: '#27375c', vest: VEST.support, helmet: C.yellow }
      case 'mechanic': return { top: '#3a5fa0', legs: '#2c467a', vest: VEST.support, helmet: r() < 0.5 ? C.yellow : undefined }
      case 'inspector': return { top: '#2f4f86', legs: '#27375c', vest: VEST.certifier, helmet: C.white, item: { kind: 'clipboard' as const, color: C.paper } }
      case 'labcoat': return { top: '#f4f4f0', legs: '#3b4652', item: { kind: 'clipboard' as const, color: '#9fd4f0' } }
      case 'stores': return { top: '#a98455', legs: '#4a4f57', badge: '#f0e9d6' }
      case 'boss': return { top: '#1f2733', legs: '#1f2733', item: { kind: 'tie' as const, color: '#c0392b' }, badge: '#d6b25e' }
      case 'manager': return { top: '#2b3442', legs: '#2b3442', item: { kind: 'tie' as const, color: pick(['#3c5f8a', '#7a5c86', '#3e7c76']) } }
      case 'auditor': return { top: '#3e7c76', legs: '#2f3a4a', item: { kind: 'clipboard' as const, color: C.paper } }
      case 'safety': return { top: '#d2573f', legs: '#2f3a4a', item: { kind: 'clipboard' as const, color: '#f6d7a0' } }
      case 'instructor': return { top: '#7a5c86', legs: '#3b4652' }
      case 'authority': return { top: '#1b2a4d', legs: '#1b2a4d', helmet: '#1b2a4d', brim: '#101a33', badge: '#e3c15a', item: { kind: 'clipboard' as const, color: C.paper } }
      case 'contractor': return { top: '#8d8a84', legs: '#6f6c66', vest: VEST.support, helmet: '#3c6fb5' }
      default: return { top: pick(SHIRTS), legs: pick(TROUSERS) }
    }
  })()
  // nobody is airside without hi-vis
  if (airside && !o.vest) o.vest = VEST.visitor
  return o
}

/** the look of the figure standing at each role anchor */
export const LOOK_OF_ROLE: Record<string, Look> = {
  'line-certifier': 'certifier', 'certifying-staff': 'certifier', 'component-certifier': 'certifier', 'authorised-staff': 'certifier',
  mechanic: 'mechanic', 'shift-supervisor': 'support', 'independent-inspector': 'inspector', 'arc-staff': 'inspector',
  'ndt-technician': 'labcoat', specialist: 'labcoat', 'receiving-inspector': 'stores',
  'accountable-manager': 'boss', 'nominated-person': 'manager', planner: 'office', 'technical-librarian': 'office', 'document-controller': 'office', 'records-clerk': 'office',
  'safety-manager': 'safety', 'cm-manager': 'auditor', auditor: 'auditor', instructor: 'instructor', assessor: 'instructor',
  subcontractor: 'contractor', 'certification-officer': 'authority', inspector: 'authority',
}

/** who you meet walking out of each district */
export function lookOfDistrict(id: string, r: () => number): Look {
  const k = r()
  switch (id) {
    case 'hangar': return k < 0.3 ? 'certifier' : k < 0.6 ? 'support' : 'mechanic'
    case 'workshops': return k < 0.25 ? 'certifier' : k < 0.4 ? 'labcoat' : 'mechanic'
    case 'stores': return 'stores'
    case 'compliance': return 'auditor'
    case 'safety': return 'safety'
    case 'hq': return k < 0.15 ? 'boss' : k < 0.55 ? 'manager' : 'office'
    case 'authority': return 'authority'
    case 'training': return k < 0.35 ? 'instructor' : 'office'
    case 'contractor': return 'contractor'
    default: return 'office'
  }
}

/** the airside boundary: south of this line is the service road, the hangar doors and the apron */
export const AIRSIDE_Z = -16.4
/** districts whose door opens onto the airside */
export const AIRSIDE_DOORS = new Set(['hangar', 'apron'])
