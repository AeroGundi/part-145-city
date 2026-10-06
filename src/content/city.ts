/**
 * The city model: districts (domains) → rooms (sub-domains) → anchors (roles / objects).
 *
 * EDITORIAL. This is the application's spatial mnemonic, not regulatory content.
 * Districts depict the *possible* scope of a Part-145 organisation; no organisation
 * is required to have every facility shown.
 */

export type Category =
  | 'management' | 'aircraft' | 'maintenance' | 'components' | 'data' | 'personnel' | 'training'
  | 'safety' | 'compliance' | 'records' | 'planning' | 'moe' | 'authority' | 'contractor' | 'documents'

export type PropKind = 'desk' | 'shelf' | 'board' | 'terminal' | 'rack' | 'crate' | 'table' | 'cabinet' | 'aircraft' | 'plinth' | 'engine' | 'vehicle'

export interface Anchor {
  id: string
  name: string
  /** role = a person; object = a thing */
  type: 'role' | 'object'
  prop: PropKind
  /** tint for racks/zones, CSS colour */
  tint?: string
  /** explicit placement inside the room, in room fractions (-0.5…0.5); default: spread along the room */
  at?: [number, number]
}

export interface Room {
  id: string
  name: string
  anchors: Anchor[]
  /** optional explicit placement inside the footprint, in footprint fractions (-0.5…0.5) */
  at?: [number, number]
  size?: [number, number]
}

export interface District {
  id: string
  n: number
  name: string
  short: string
  category: Category
  kind: 'office' | 'hangar' | 'warehouse' | 'workshop' | 'apron' | 'pavilion' | 'institution'
  /** centre x, z */
  pos: [number, number]
  /** width (x), depth (z) */
  size: [number, number]
  height: number
  /** outside the organisation's perimeter */
  external?: boolean
  blurb: string
  rooms: Room[]
}

const role = (id: string, name: string, prop: PropKind = 'desk', at?: [number, number]): Anchor => ({ id, name, type: 'role', prop, ...(at ? { at } : {}) })
const obj = (id: string, name: string, prop: PropKind, tint?: string, at?: [number, number]): Anchor => ({ id, name, type: 'object', prop, ...(tint ? { tint } : {}), ...(at ? { at } : {}) })

export const DISTRICTS: District[] = [
  {
    id: 'apron', n: 1, name: 'Airport / Apron', short: 'Apron', category: 'aircraft', kind: 'apron',
    pos: [-11, -32], size: [118, 20], height: 0,
    blurb: 'Where the approval meets the aircraft: stands, line maintenance and the locations the organisation works at.',
    rooms: [
      { id: 'scope-sign', name: 'Approval & scope sign', at: [-0.42, 0.1], size: [0.12, 0.6], anchors: [obj('approval-sign', 'Certificate & scope of work sign', 'board')] },
      { id: 'line-station', name: 'Line station', at: [-0.27, 0.1], size: [0.14, 0.6], anchors: [role('line-certifier', 'Line certifying staff (B1/B2)'), obj('line-van', 'Line maintenance van', 'vehicle')] },
      { id: 'stand', name: 'Aircraft stands', at: [-0.03, 0], size: [0.3, 0.8], anchors: [obj('aircraft-on-stand', 'Aircraft on stand', 'aircraft', undefined, [-0.253, 0])] },
      { id: 'gse-park', name: 'GSE park', at: [0.22, 0.1], size: [0.14, 0.6], anchors: [obj('gse', 'Ground support equipment', 'vehicle')] },
      { id: 'remote-location', name: 'Occasional / remote location', at: [0.4, 0.1], size: [0.14, 0.6], anchors: [obj('aog-kit', 'AOG support kit', 'crate')] },
    ],
  },
  {
    id: 'hangar', n: 2, name: 'Base Maintenance Hangar', short: 'Hangar', category: 'maintenance', kind: 'hangar',
    pos: [-2, -7], size: [32, 24], height: 11,
    blurb: 'Where maintenance is performed, verified and released: people, tools, data and aircraft in one place.',
    rooms: [
      { id: 'aircraft-bay', name: 'Aircraft bay', at: [0, -0.14], size: [0.96, 0.62], anchors: [obj('aircraft-in-check', 'Aircraft in base maintenance', 'aircraft', undefined, [0, 0]), role('mechanic', 'Mechanic at work', 'table', [-0.2, 0.3]), role('independent-inspector', 'Independent inspector', 'table', [0.24, 0.3])] },
      { id: 'tool-crib', name: 'Tooling & equipment crib', at: [-0.36, 0.35], size: [0.24, 0.26], anchors: [obj('tool-board', 'Controlled & calibrated tools', 'board')] },
      { id: 'data-terminals', name: 'Maintenance data terminals', at: [-0.12, 0.35], size: [0.2, 0.26], anchors: [obj('hangar-terminal', 'Hangar-floor data terminal', 'terminal')] },
      { id: 'supervisor-desk', name: 'Shift supervisor', at: [0.1, 0.35], size: [0.2, 0.26], anchors: [role('shift-supervisor', 'Shift supervisor'), obj('handover-board', 'Shift handover board', 'board')] },
      { id: 'certification-office', name: 'Certification office', at: [0.34, 0.35], size: [0.26, 0.26], anchors: [role('certifying-staff', 'Certifying staff signing the CRS'), obj('crs-desk', 'Certificate of release to service', 'desk')] },
    ],
  },
  {
    id: 'workshops', n: 3, name: 'Component Workshops', short: 'Workshops', category: 'components', kind: 'workshop',
    pos: [36, -7], size: [26, 22], height: 6,
    blurb: 'Engine, component and specialised-service shops — the possible breadth of an approval, not a required set.',
    rooms: [
      { id: 'engine-shop', name: 'Engine / APU shop', anchors: [obj('engine-stand', 'Engine on stand', 'engine')] },
      { id: 'avionics-shop', name: 'Avionics shop', anchors: [obj('test-bench', 'Test bench', 'terminal')] },
      { id: 'hydraulics-shop', name: 'Hydraulic & mechanical shop', anchors: [obj('hydraulic-rig', 'Hydraulic test rig', 'table')] },
      { id: 'structures-shop', name: 'Structures shop', anchors: [obj('structures-bench', 'Structures bench', 'table')] },
      { id: 'ndt-lab', name: 'NDT laboratory', anchors: [role('ndt-technician', 'NDT personnel', 'table')] },
      { id: 'specialised-services', name: 'Specialised services', anchors: [role('specialist', 'Specialised services personnel', 'table'), role('component-certifier', 'Component certifying staff')] },
    ],
  },
  {
    id: 'stores', n: 4, name: 'Stores', short: 'Stores', category: 'components', kind: 'warehouse',
    pos: [36, 19], size: [26, 15], height: 6.5,
    blurb: 'Every component has a status and a place. Segregation you can see: green, amber, red.',
    rooms: [
      { id: 'receiving', name: 'Receiving & incoming inspection', anchors: [role('receiving-inspector', 'Receiving inspector', 'table'), obj('incoming-crate', 'Incoming component + release document', 'crate')] },
      { id: 'serviceable', name: 'Serviceable components', anchors: [obj('green-rack', 'Serviceable rack (released)', 'rack', '#5f8f5a')] },
      { id: 'unserviceable', name: 'Unserviceable components', anchors: [obj('amber-rack', 'Unserviceable rack', 'rack', '#c99a3c')] },
      { id: 'unsalvageable', name: 'Unsalvageable / quarantine', anchors: [obj('red-cage', 'Unsalvageable cage', 'rack', '#b5533f')] },
      { id: 'standard-parts', name: 'Standard parts & material', anchors: [obj('bins', 'Standard parts, raw material, consumables', 'shelf')] },
      { id: 'tool-store', name: 'Tool store & calibration', anchors: [obj('calibration-cabinet', 'Calibration-controlled tools', 'cabinet')] },
    ],
  },
  {
    id: 'production-control', n: 5, name: 'Production Control', short: 'Planning', category: 'planning', kind: 'office',
    pos: [-34, -7], size: [14, 14], height: 5.5,
    blurb: 'Plans people, tools, data and hangar slots — and hands the work over safely between shifts.',
    rooms: [
      { id: 'planning-office', name: 'Production planning', anchors: [role('planner', 'Production planner'), obj('work-package', 'Work package / work order', 'desk')] },
      { id: 'man-hour-plan', name: 'Man-hour plan', anchors: [obj('man-hour-board', 'Man-hour plan board', 'board')] },
      { id: 'status-board', name: 'Aircraft status', anchors: [obj('aircraft-status-board', 'Aircraft status board', 'board')] },
      { id: 'shift-handover', name: 'Shift planning & handover', anchors: [obj('shift-roster', 'Shift roster & handover log', 'board')] },
    ],
  },
  {
    id: 'technical-library', n: 6, name: 'Technical Library', short: 'Library', category: 'data', kind: 'office',
    pos: [-34, 19], size: [16, 13], height: 6,
    blurb: 'Applicable, current maintenance data — held, controlled and available to whoever needs it.',
    rooms: [
      { id: 'maintenance-data', name: 'Maintenance data', anchors: [role('technical-librarian', 'Technical Librarian'), obj('maintenance-data-terminal', 'Maintenance-data terminal', 'terminal'), obj('manuals', 'AMM · CMM · SRM · IPC', 'shelf')] },
      { id: 'revision-control', name: 'Revision control', anchors: [obj('revision-board', 'Amendment status board (SB · AD)', 'board')] },
      { id: 'work-cards', name: 'Work card system', anchors: [obj('work-card-desk', 'Work cards & worksheets', 'desk')] },
    ],
  },
  {
    id: 'training', n: 7, name: 'Personnel & Training Centre', short: 'Training', category: 'training', kind: 'office',
    pos: [-60, 19], size: [18, 13], height: 6,
    blurb: 'Who is competent, who is authorised, and how the organisation knows.',
    rooms: [
      { id: 'classroom', name: 'Training classroom', anchors: [role('instructor', 'Instructor (human factors, safety)', 'board')] },
      { id: 'competency-assessment', name: 'Competency assessment', anchors: [role('assessor', 'Competency assessor', 'table')] },
      { id: 'certifying-staff-office', name: 'Certifying staff office', anchors: [role('authorised-staff', 'Certifying & support staff'), obj('authorisation-desk', 'Certification authorisation desk', 'desk')] },
      { id: 'airworthiness-review', name: 'Airworthiness review staff', anchors: [role('arc-staff', 'Airworthiness review staff')] },
      { id: 'personnel-records', name: 'Personnel records', anchors: [obj('personnel-files', 'Qualification, training & authorisation files', 'cabinet')] },
      { id: 'practical-training', name: 'Practical training area', anchors: [obj('trainer-rig', 'Task training rig', 'table')] },
    ],
  },
  {
    id: 'hq', n: 8, name: 'Management HQ', short: 'HQ', category: 'management', kind: 'office',
    pos: [-2, 19], size: [20, 13], height: 9.5,
    blurb: 'Accountability starts here: the accountable manager, the nominated persons and the management system.',
    rooms: [
      { id: 'accountable-manager', name: 'Accountable Manager', anchors: [role('accountable-manager', 'Accountable Manager')] },
      { id: 'nominated-persons', name: 'Nominated persons', anchors: [role('nominated-person', 'Nominated person(s)')] },
      { id: 'boardroom', name: 'Boardroom · safety review board', anchors: [obj('board-table', 'Management system review', 'table')] },
      { id: 'org-chart', name: 'Organisation chart wall', anchors: [obj('org-chart-wall', 'Organisation chart & reporting lines', 'board')] },
      { id: 'approval-desk', name: 'Certificate & changes desk', anchors: [obj('certificate', 'Organisation certificate & terms of approval', 'desk')] },
      { id: 'reception', name: 'Reception · authority access', anchors: [obj('visitor-desk', 'Access for the competent authority', 'desk')] },
      { id: 'information-security', name: 'Information security', anchors: [obj('isms-rack', 'Information assets & controls (ISMS)', 'rack', '#4b6a8f')] },
    ],
  },
  {
    id: 'safety', n: 9, name: 'Safety Office', short: 'Safety', category: 'safety', kind: 'office',
    pos: [-34, 41], size: [15, 11], height: 5.5,
    blurb: 'Hazards identified, risks managed, reports received and acted on.',
    rooms: [
      { id: 'safety-manager', name: 'Safety Manager', anchors: [role('safety-manager', 'Safety Manager')] },
      { id: 'hazard-risk', name: 'Hazards & risk', anchors: [obj('risk-matrix', 'Hazard log & risk matrix', 'board')] },
      { id: 'occurrence-reporting', name: 'Occurrence reporting', anchors: [obj('reporting-desk', 'Occurrence reporting desk', 'desk')] },
      { id: 'internal-reporting', name: 'Internal safety reporting', anchors: [obj('report-box', 'Internal safety reports', 'cabinet')] },
    ],
  },
  {
    id: 'compliance', n: 10, name: 'Compliance Monitoring Office', short: 'Compliance', category: 'compliance', kind: 'office',
    pos: [-12, 41], size: [15, 11], height: 5.5,
    blurb: 'Independent eyes on the whole organisation — audits, findings, root cause, follow-up.',
    rooms: [
      { id: 'cm-manager', name: 'Compliance Monitoring Manager', anchors: [role('cm-manager', 'Compliance Monitoring Manager')] },
      { id: 'audit-room', name: 'Audit room', anchors: [role('auditor', 'Auditor', 'table'), obj('audit-programme', 'Audit programme & plan', 'board')] },
      { id: 'findings', name: 'Findings & corrective action', anchors: [obj('findings-tracker', 'Findings · root cause · corrective action', 'board')] },
      { id: 'procedures', name: 'Maintenance procedures', anchors: [obj('procedures-binder', 'Controlled maintenance procedures', 'shelf')] },
    ],
  },
  {
    id: 'moe', n: 11, name: 'MOE / Document Control', short: 'MOE', category: 'moe', kind: 'office',
    pos: [6, 41], size: [13, 11], height: 5.5,
    blurb: 'The exposition: how this organisation says it complies — controlled, amended, approved.',
    rooms: [
      { id: 'exposition', name: 'Exposition', anchors: [obj('moe-master', 'MOE master copy', 'plinth')] },
      { id: 'amendment', name: 'Amendment & approval', anchors: [role('document-controller', 'Document controller'), obj('amendment-desk', 'MOE amendment desk', 'desk')] },
      { id: 'distribution', name: 'Distribution', anchors: [obj('distribution-shelf', 'Controlled copies', 'shelf')] },
    ],
  },
  {
    id: 'records', n: 12, name: 'Records Archive', short: 'Records', category: 'records', kind: 'warehouse',
    pos: [31, 41], size: [17, 11], height: 5.5,
    blurb: 'Completed work packages arrive, stay traceable, and are kept for as long as the rule says.',
    rooms: [
      { id: 'maintenance-records', name: 'Maintenance records', anchors: [role('records-clerk', 'Records clerk', 'table'), obj('archive-racks', 'Work packages & CRS copies', 'rack', '#b58b3a')] },
      { id: 'arc-records', name: 'Airworthiness review records', anchors: [obj('arc-files', 'ARC copies & supporting documents', 'cabinet')] },
      { id: 'system-records', name: 'Management system & contract records', anchors: [obj('system-files', 'Management system · contracts', 'cabinet')] },
      { id: 'personnel-archive', name: 'Personnel record archive', anchors: [obj('personnel-archive-files', 'Personnel records', 'cabinet')] },
    ],
  },
  {
    id: 'contractor', n: 13, name: 'External Contractor / Subcontractor', short: 'Contractor', category: 'contractor', kind: 'workshop',
    pos: [80, 19], size: [16, 13], height: 5.5, external: true,
    blurb: 'Work done elsewhere, on a contract — the approved organisation keeps the responsibility.',
    rooms: [
      { id: 'contract-desk', name: 'Contract & interface', anchors: [obj('contract', 'Contract · interface agreement', 'desk')] },
      { id: 'subcontracted-work', name: 'Subcontracted work', anchors: [role('subcontractor', 'Subcontractor under the organisation’s management system', 'table')] },
      { id: 'contracted-organisation', name: 'Contracted approved organisation', anchors: [obj('contracted-approval', 'Their own approval', 'plinth')] },
    ],
  },
  {
    id: 'authority', n: 14, name: 'Competent Authority', short: 'Authority', category: 'authority', kind: 'institution',
    pos: [-96, 30], size: [18, 16], height: 8.5, external: true,
    blurb: 'Section B lives across the road: certification, oversight, findings and enforcement.',
    rooms: [
      { id: 'certification-office', name: 'Certification office', anchors: [role('certification-officer', 'Certification officer'), obj('certificate-issue', 'Certificate issue desk', 'desk')] },
      { id: 'oversight-office', name: 'Oversight office', anchors: [role('inspector', 'Authority inspector'), obj('oversight-programme', 'Oversight programme', 'board')] },
      { id: 'findings-office', name: 'Findings & enforcement', anchors: [obj('findings-desk', 'Findings · corrective action · enforcement', 'desk')] },
      { id: 'authority-management', name: 'Authority management system', anchors: [obj('authority-ms', 'Authority management system', 'board')] },
      { id: 'authority-records', name: 'Authority records', anchors: [obj('authority-files', 'Oversight records', 'cabinet')] },
      { id: 'agency-liaison', name: 'Agency liaison', anchors: [obj('agency-desk', 'Information to the Agency', 'terminal')] },
    ],
  },
  {
    id: 'documents', n: 15, name: 'Regulatory Documents', short: 'Documents', category: 'documents', kind: 'pavilion',
    pos: [-60, 41], size: [14, 11], height: 4.5,
    blurb: 'The appendices and forms, on display: EASA Form 1, class & rating system, EASA Form 3-145.',
    rooms: [
      { id: 'form-1', name: 'EASA Form 1', anchors: [obj('form-1-plinth', 'Authorised Release Certificate', 'plinth')] },
      { id: 'class-rating', name: 'Class & rating system', anchors: [obj('class-rating-chart', 'Class and rating chart', 'board')] },
      { id: 'form-3', name: 'EASA Form 3-145', anchors: [obj('form-3-plinth', 'Maintenance organisation certificate', 'plinth')] },
      { id: 'appendix-iv', name: 'Staff not qualified to Part-66', anchors: [obj('appendix-iv-plinth', 'Appendix IV conditions', 'plinth')] },
      { id: 'forms-desk', name: 'Application & audit forms', anchors: [obj('forms', 'EASA Form 2 · Form 6', 'desk')] },
      { id: 'glossary', name: 'Definitions', anchors: [obj('glossary-lectern', 'Glossary lectern', 'plinth')] },
    ],
  },
]

export const DISTRICT_BY_ID: Record<string, District> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]))

/** A place in the city: "district", "district/room" or "district/room/anchor". */
export type Place = string

export interface ResolvedPlace { district: District; room?: Room; anchor?: Anchor; path: string }

export function resolvePlace(place: Place): ResolvedPlace | null {
  const [d, r, a] = place.split('/')
  const district = DISTRICT_BY_ID[d]
  if (!district) return null
  const room = r ? district.rooms.find((x) => x.id === r) : undefined
  const anchor = a && room ? room.anchors.find((x) => x.id === a) : undefined
  return { district, room, anchor, path: place }
}

// ─────────────────────────── geometry shared by 3D city and 2D map ───────────────────────────

export interface RoomRect { room: Room; x: number; z: number; w: number; d: number }

/** Room rectangles in world coordinates. Explicit `at/size` wins; otherwise an even grid. */
export function roomRects(d: District): RoomRect[] {
  const [cx, cz] = d.pos
  const [w, dp] = d.size
  if (d.rooms.every((r) => r.at && r.size)) {
    return d.rooms.map((room) => ({ room, x: cx + room.at![0] * w, z: cz + room.at![1] * dp, w: room.size![0] * w, d: room.size![1] * dp }))
  }
  const n = d.rooms.length
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * w) / dp))))
  const rows = Math.ceil(n / cols)
  const m = 0.6
  const cw = (w - m * 2) / cols
  const cd = (dp - m * 2) / rows
  return d.rooms.map((room, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols
    const rowW = (w - m * 2) / inRow
    return { room, x: cx - w / 2 + m + rowW * (c + 0.5), z: cz - dp / 2 + m + cd * (r + 0.5), w: (r === rows - 1 ? rowW : cw) - 0.3, d: cd - 0.3 }
  })
}

/** World position of an anchor (or room centre, or district centre). */
export function placePosition(place: Place): [number, number] {
  const r = resolvePlace(place)
  if (!r) return [0, 0]
  if (!r.room) return r.district.pos
  const rect = roomRects(r.district).find((x) => x.room.id === r.room!.id)!
  if (!r.anchor) return [rect.x, rect.z]
  if (r.anchor.at) return [rect.x + r.anchor.at[0] * rect.w, rect.z + r.anchor.at[1] * rect.d]
  const i = r.room.anchors.indexOf(r.anchor)
  const n = r.room.anchors.length
  return [rect.x + (n === 1 ? 0 : ((i / (n - 1)) - 0.5) * rect.w * 0.56), rect.z + (i % 2 === 0 ? -0.08 : 0.14) * rect.d]
}

export const CATEGORY_LABEL: Record<Category, string> = {
  management: 'Management', aircraft: 'Aircraft maintenance', maintenance: 'Maintenance', components: 'Components',
  data: 'Maintenance data', personnel: 'Personnel', training: 'Personnel & training', safety: 'Safety', compliance: 'Compliance',
  records: 'Records', planning: 'Planning', moe: 'MOE', authority: 'Authority', contractor: 'Contracted organisations', documents: 'Regulatory documents',
}

export const CATEGORY_COLOR: Record<Category, string> = {
  management: '#34495e', aircraft: '#5d7f9c', maintenance: '#8794a0', components: '#7c8a4e', data: '#3c5f8a',
  personnel: '#7a5c86', training: '#7a5c86', safety: '#c0624a', compliance: '#3e7c76', records: '#b58b3a',
  planning: '#4f6d7a', moe: '#8a5a44', authority: '#2f3e63', contractor: '#8a8170', documents: '#6b6f7a',
}

/** Ground network shared by the 3D city, the ambient traffic and the 2D map. Segments are axis-aligned. */
export interface Road { id: string; a: [number, number]; b: [number, number]; w: number; kind: 'public' | 'internal' | 'service' }
export const ROADS: Road[] = [
  { id: 'H1', a: [-112, 8], b: [98, 8], w: 3.4, kind: 'public' },
  { id: 'H2', a: [-86, 30], b: [53, 30], w: 3, kind: 'internal' },
  { id: 'V1', a: [-46.5, -21], b: [-46.5, 30], w: 3, kind: 'internal' },
  { id: 'V2', a: [-21.5, -21], b: [-21.5, 30], w: 3, kind: 'internal' },
  { id: 'V3', a: [18.5, -21], b: [18.5, 30], w: 3, kind: 'internal' },
  { id: 'V4', a: [53, -21], b: [53, 30], w: 3, kind: 'internal' },
  { id: 'S', a: [-46.5, -21], b: [53, -21], w: 2.6, kind: 'service' },
]
export const RUNWAY = { x0: -104, x1: 92, z: -62, w: 8 }
export const TAXIWAY = { x0: -100, x1: 90, z: -50, w: 5 }

/** World bounds used by camera limits and the 2D map. */
export const WORLD = { minX: -112, maxX: 98, minZ: -72, maxZ: 58 }
export const PERIMETER = { minX: -74, maxX: 58, minZ: -44, maxZ: 52 }
