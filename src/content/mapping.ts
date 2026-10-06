/**
 * Requirement → location mapping.
 *
 * EDITORIAL. Keys are point references as published ("145.A.30(e)") or item ids
 * for appendices. An item resolves to the rule with the longest matching key, so
 * AMC1 145.A.30(e) inherits the place of 145.A.30(e), and 145.A.55(d)(1)(i) the
 * place of 145.A.55(d). Anything without a rule is reported as
 * "Spatial mapping pending" — never guessed.
 */
import type { RegItem } from '../data/schema'
import type { Place } from './city'

export interface LocationRule { primary: Place; also?: Place[] }

const R = (primary: Place, ...also: Place[]): LocationRule => ({ primary, also })

export const LOCATION_RULES: Record<string, LocationRule> = {
  // ── General
  '145.1': R('authority/certification-office/certification-officer'),
  'annex-ii': R('documents/glossary/glossary-lectern'),

  // ── Section A
  '145.A.10': R('apron/scope-sign/approval-sign', 'hq/approval-desk/certificate', 'hangar', 'apron/line-station'),
  '145.A.15': R('hq/approval-desk/certificate', 'authority/certification-office/certificate-issue', 'documents/forms-desk/forms'),
  '145.A.20': R('apron/scope-sign/approval-sign', 'hq/approval-desk/certificate', 'documents/class-rating/class-rating-chart', 'workshops/engine-shop/engine-stand', 'workshops/avionics-shop/test-bench', 'workshops/hydraulics-shop/hydraulic-rig', 'workshops/structures-shop/structures-bench'),
  '145.A.25': R('hangar/aircraft-bay', 'workshops', 'stores', 'production-control/planning-office', 'apron/line-station'),
  '145.A.25(a)': R('hangar/aircraft-bay', 'workshops', 'apron/line-station'),
  '145.A.25(b)': R('production-control/planning-office', 'compliance/cm-manager', 'training/certifying-staff-office'),
  '145.A.25(c)': R('hangar/aircraft-bay', 'workshops'),
  '145.A.25(d)': R('stores/serviceable/green-rack', 'stores/unserviceable/amber-rack', 'stores/standard-parts/bins'),
  '145.A.30': R('training/competency-assessment/assessor', 'hq/accountable-manager/accountable-manager', 'compliance/cm-manager/cm-manager', 'safety/safety-manager/safety-manager', 'production-control/man-hour-plan/man-hour-board', 'hangar/certification-office/certifying-staff', 'workshops/ndt-lab/ndt-technician'),
  '145.A.30(a)': R('hq/accountable-manager/accountable-manager'),
  '145.A.30(b)': R('hq/nominated-persons/nominated-person'),
  '145.A.30(c)': R('compliance/cm-manager/cm-manager', 'hq/accountable-manager/accountable-manager'),
  '145.A.30(ca)': R('safety/safety-manager/safety-manager', 'hq/accountable-manager/accountable-manager'),
  '145.A.30(cb)': R('hq/org-chart/org-chart-wall', 'hq/accountable-manager/accountable-manager', 'compliance/cm-manager/cm-manager', 'safety/safety-manager/safety-manager'),
  '145.A.30(cc)': R('hq/nominated-persons/nominated-person', 'compliance/cm-manager/cm-manager', 'safety/safety-manager/safety-manager'),
  '145.A.30(d)': R('production-control/man-hour-plan/man-hour-board', 'compliance/audit-room'),
  '145.A.30(e)': R('training/competency-assessment/assessor', 'training/classroom/instructor', 'training/practical-training/trainer-rig', 'training/personnel-records/personnel-files'),
  '145.A.30(f)': R('workshops/ndt-lab/ndt-technician'),
  '145.A.30(g)': R('apron/line-station/line-certifier', 'training/certifying-staff-office/authorisation-desk'),
  '145.A.30(h)': R('hangar/certification-office/certifying-staff', 'training/certifying-staff-office/authorisation-desk'),
  '145.A.30(i)': R('workshops/specialised-services/component-certifier', 'training/certifying-staff-office/authorisation-desk'),
  '145.A.30(j)': R('training/certifying-staff-office/authorisation-desk', 'apron/remote-location/aog-kit', 'documents/appendix-iv/appendix-iv-plinth'),
  '145.A.30(k)': R('training/airworthiness-review/arc-staff'),
  '145.A.35': R('training/certifying-staff-office/authorised-staff', 'hangar/certification-office/certifying-staff', 'training/personnel-records/personnel-files', 'training/classroom/instructor'),
  '145.A.35(d)': R('training/classroom/instructor', 'training/certifying-staff-office/authorised-staff'),
  '145.A.35(e)': R('training/classroom/instructor', 'training/certifying-staff-office/authorised-staff'),
  '145.A.35(f)': R('training/competency-assessment/assessor', 'training/certifying-staff-office/authorised-staff'),
  '145.A.35(j)': R('training/personnel-records/personnel-files', 'records/personnel-archive/personnel-archive-files'),
  '145.A.37': R('training/airworthiness-review/arc-staff', 'records/arc-records/arc-files'),
  '145.A.40': R('hangar/tool-crib/tool-board', 'stores/tool-store/calibration-cabinet', 'workshops/avionics-shop/test-bench', 'workshops/hydraulics-shop/hydraulic-rig', 'apron/gse-park/gse'),
  '145.A.40(a)': R('hangar/tool-crib/tool-board', 'workshops/avionics-shop/test-bench', 'workshops/hydraulics-shop/hydraulic-rig', 'workshops/structures-shop/structures-bench', 'apron/gse-park/gse'),
  '145.A.40(b)': R('stores/tool-store/calibration-cabinet', 'hangar/tool-crib/tool-board'),
  '145.A.42': R('stores/receiving/receiving-inspector', 'stores/serviceable/green-rack', 'stores/unserviceable/amber-rack', 'stores/unsalvageable/red-cage', 'stores/standard-parts/bins'),
  '145.A.42(a)': R('stores/serviceable/green-rack', 'stores/unserviceable/amber-rack', 'stores/unsalvageable/red-cage', 'stores/standard-parts/bins'),
  '145.A.42(b)': R('stores/receiving/receiving-inspector', 'stores/receiving/incoming-crate', 'workshops'),
  '145.A.42(c)': R('stores/unsalvageable/red-cage', 'stores/unserviceable/amber-rack'),
  '145.A.45': R('technical-library/maintenance-data/technical-librarian', 'technical-library/maintenance-data/maintenance-data-terminal', 'hangar/data-terminals/hangar-terminal', 'technical-library/revision-control/revision-board', 'technical-library/work-cards/work-card-desk', 'technical-library/maintenance-data/manuals'),
  '145.A.45(a)': R('technical-library/maintenance-data/manuals', 'technical-library/maintenance-data/technical-librarian', 'technical-library/maintenance-data/maintenance-data-terminal'),
  '145.A.45(c)': R('technical-library/maintenance-data/technical-librarian', 'safety/internal-reporting/report-box'),
  '145.A.45(e)': R('technical-library/work-cards/work-card-desk', 'production-control/planning-office/work-package'),
  '145.A.45(f)': R('hangar/data-terminals/hangar-terminal', 'technical-library/maintenance-data/maintenance-data-terminal'),
  '145.A.45(g)': R('technical-library/revision-control/revision-board'),
  '145.A.47': R('production-control/planning-office/planner', 'production-control/shift-handover/shift-roster', 'hangar/supervisor-desk/handover-board'),
  '145.A.47(a)': R('production-control/planning-office/planner', 'production-control/status-board/aircraft-status-board'),
  '145.A.47(b)': R('production-control/shift-handover/shift-roster', 'safety/hazard-risk/risk-matrix'),
  '145.A.47(c)': R('hangar/supervisor-desk/handover-board', 'hangar/supervisor-desk/shift-supervisor', 'production-control/shift-handover/shift-roster'),
  '145.A.47(d)': R('production-control/planning-office/planner', 'contractor/subcontracted-work/subcontractor', 'safety/hazard-risk/risk-matrix'),
  '145.A.48': R('hangar/aircraft-bay/mechanic', 'hangar/aircraft-bay/independent-inspector', 'workshops', 'apron/stand/aircraft-on-stand'),
  '145.A.48(a)': R('hangar/aircraft-bay/aircraft-in-check', 'workshops/engine-shop/engine-stand', 'workshops/structures-shop/structures-bench', 'apron/stand/aircraft-on-stand'),
  '145.A.48(c)(2)': R('hangar/aircraft-bay/independent-inspector', 'hangar/aircraft-bay/mechanic'),
  '145.A.50': R('hangar/certification-office/certifying-staff', 'hangar/certification-office/crs-desk', 'apron/line-station/line-certifier', 'workshops/specialised-services/component-certifier', 'documents/form-1/form-1-plinth'),
  '145.A.50(d)': R('workshops/specialised-services/component-certifier', 'documents/form-1/form-1-plinth'),
  '145.A.55': R('records/maintenance-records/archive-racks', 'records/arc-records/arc-files', 'records/system-records/system-files', 'records/personnel-archive/personnel-archive-files', 'training/personnel-records/personnel-files'),
  '145.A.55(a)': R('records/maintenance-records/archive-racks', 'records/maintenance-records/records-clerk'),
  '145.A.55(b)': R('records/arc-records/arc-files'),
  '145.A.55(c)': R('records/system-records/system-files', 'contractor/contract-desk/contract'),
  '145.A.55(d)': R('records/personnel-archive/personnel-archive-files', 'training/personnel-records/personnel-files'),
  '145.A.60': R('safety/occurrence-reporting/reporting-desk', 'authority/oversight-office/inspector', 'safety/internal-reporting/report-box'),
  '145.A.65': R('compliance/procedures/procedures-binder', 'production-control/planning-office/work-package', 'hangar', 'moe/exposition/moe-master', 'contractor/subcontracted-work'),
  '145.A.70': R('moe/exposition/moe-master', 'moe/amendment/amendment-desk', 'moe/distribution/distribution-shelf', 'hq/accountable-manager/accountable-manager', 'authority/certification-office/certification-officer', 'moe/amendment/document-controller'),
  '145.A.70(b)': R('moe/amendment/amendment-desk', 'moe/amendment/document-controller', 'authority/certification-office/certification-officer'),
  '145.A.70(c)': R('moe/amendment/amendment-desk', 'moe/amendment/document-controller', 'authority/certification-office/certification-officer'),
  '145.A.75': R('apron/scope-sign/approval-sign', 'contractor/subcontracted-work/subcontractor', 'apron/remote-location/aog-kit', 'apron/line-station/line-certifier', 'hangar/certification-office/certifying-staff', 'training/airworthiness-review/arc-staff', 'apron/line-station/line-van'),
  '145.A.75(a)': R('apron/scope-sign/approval-sign', 'hangar/aircraft-bay/aircraft-in-check'),
  '145.A.75(b)': R('contractor/subcontracted-work/subcontractor', 'compliance/audit-room/auditor'),
  '145.A.75(c)': R('apron/remote-location/aog-kit'),
  '145.A.75(d)': R('apron/line-station/line-certifier', 'apron/line-station/line-van'),
  '145.A.75(e)': R('hangar/certification-office/certifying-staff'),
  '145.A.75(f)': R('training/airworthiness-review/arc-staff', 'records/arc-records/arc-files'),
  '145.A.85': R('hq/approval-desk/certificate', 'authority/certification-office/certification-officer', 'moe/amendment/amendment-desk', 'hq/org-chart/org-chart-wall'),
  '145.A.90': R('hq/approval-desk/certificate', 'authority/findings-office/findings-desk', 'hq/reception/visitor-desk'),
  '145.A.95': R('compliance/findings/findings-tracker', 'authority/findings-office/findings-desk', 'hq/accountable-manager/accountable-manager'),
  '145.A.120': R('moe/amendment/amendment-desk', 'authority/certification-office/certification-officer'),
  '145.A.140': R('hq/reception/visitor-desk', 'authority/oversight-office/inspector', 'contractor'),
  '145.A.155': R('safety/safety-manager/safety-manager', 'technical-library/revision-control/revision-board', 'authority/oversight-office/inspector'),
  '145.A.200': R('hq/boardroom/board-table', 'hq/accountable-manager/accountable-manager', 'safety/hazard-risk/risk-matrix', 'compliance/audit-room/audit-programme', 'production-control', 'training/classroom/instructor', 'records/system-records/system-files', 'contractor/contract-desk/contract'),
  '145.A.200(a)(1)': R('hq/org-chart/org-chart-wall', 'hq/accountable-manager/accountable-manager'),
  '145.A.200(a)(2)': R('hq/accountable-manager/accountable-manager', 'hq/boardroom/board-table'),
  '145.A.200(a)(3)': R('safety/hazard-risk/risk-matrix', 'safety/safety-manager/safety-manager'),
  '145.A.200(a)(4)': R('training/classroom/instructor', 'training/competency-assessment/assessor'),
  '145.A.200(a)(5)': R('moe/exposition/moe-master', 'compliance/procedures/procedures-binder'),
  '145.A.200(a)(6)': R('compliance/audit-room/audit-programme', 'compliance/findings/findings-tracker', 'hq/accountable-manager/accountable-manager'),
  '145.A.200A': R('hq/information-security/isms-rack', 'production-control', 'technical-library/maintenance-data/maintenance-data-terminal', 'stores', 'safety', 'compliance', 'records', 'authority/agency-liaison'),
  '145.A.202': R('safety/internal-reporting/report-box', 'hangar/aircraft-bay/mechanic', 'safety/hazard-risk/risk-matrix', 'contractor/subcontracted-work'),
  '145.A.205': R('contractor/contract-desk/contract', 'contractor/subcontracted-work/subcontractor', 'contractor/contracted-organisation/contracted-approval', 'compliance/audit-room/auditor', 'hq/boardroom/board-table', 'records/system-records/system-files'),

  // ── Section B — the competent authority
  '145.B.005': R('authority/authority-management/authority-ms'),
  '145.B.115': R('authority/authority-management/authority-ms', 'authority/oversight-office/inspector'),
  '145.B.120': R('authority/certification-office/certification-officer', 'authority/agency-liaison/agency-desk'),
  '145.B.125': R('authority/agency-liaison/agency-desk'),
  '145.B.135': R('authority/oversight-office/inspector', 'authority/agency-liaison/agency-desk', 'safety/safety-manager'),
  '145.B.135A': R('authority/agency-liaison/agency-desk', 'hq/information-security/isms-rack'),
  '145.B.200': R('authority/authority-management/authority-ms', 'authority/oversight-office/inspector', 'authority/authority-records/authority-files'),
  '145.B.205': R('authority/authority-management/authority-ms'),
  '145.B.210': R('authority/authority-management/authority-ms'),
  '145.B.220': R('authority/authority-records/authority-files'),
  '145.B.300': R('authority/oversight-office/inspector', 'hq/reception/visitor-desk', 'contractor'),
  '145.B.305': R('authority/oversight-office/oversight-programme', 'authority/oversight-office/inspector'),
  '145.B.310': R('authority/certification-office/certificate-issue', 'documents/form-3/form-3-plinth', 'documents/forms-desk/forms', 'hq/approval-desk/certificate'),
  '145.B.330': R('authority/certification-office/certification-officer', 'hq/approval-desk/certificate'),
  '145.B.330A': R('authority/certification-office/certification-officer', 'hq/information-security/isms-rack'),
  '145.B.350': R('authority/findings-office/findings-desk', 'compliance/findings/findings-tracker'),
  '145.B.355': R('authority/findings-office/findings-desk', 'hq/approval-desk/certificate'),

  // ── Appendices
  'appendix-i': R('documents/form-1/form-1-plinth', 'workshops/specialised-services/component-certifier'),
  'part-m/appendix-ii': R('documents/form-1/form-1-plinth', 'workshops/specialised-services/component-certifier', 'stores/receiving/incoming-crate'),
  'appendix-ii': R('documents/class-rating/class-rating-chart', 'apron/scope-sign/approval-sign', 'workshops/engine-shop/engine-stand', 'workshops/avionics-shop/test-bench', 'workshops/hydraulics-shop/hydraulic-rig', 'workshops/structures-shop/structures-bench', 'workshops/specialised-services/specialist'),
  'appendix-iii': R('documents/form-3/form-3-plinth', 'hq/approval-desk/certificate', 'authority/certification-office/certificate-issue'),
  'appendix-iv': R('documents/appendix-iv/appendix-iv-plinth', 'training/certifying-staff-office/authorisation-desk'),
  'amc-appendix-ii': R('documents/forms-desk/forms', 'authority/certification-office/certificate-issue'),
  'amc-appendix-iii': R('documents/forms-desk/forms', 'hq/approval-desk/certificate'),
  'amc-appendix-iv': R('training/classroom/instructor'),
}

/** The key an item is looked up by: its point reference, or its base id. */
export function pointKey(item: Pick<RegItem, 'id' | 'type' | 'reference' | 'targets'>, path = ''): string {
  if (item.type === 'IR') return item.reference + path
  if ((item.type === 'AMC' || item.type === 'GM') && item.targets?.startsWith('145.')) return item.targets.split(';')[0]
  return item.id.split('/').slice(0, item.id.startsWith('part-') ? 2 : 1).join('/')
}

const trimPoint = (k: string) => k.replace(/\([a-z0-9]+\)$/i, '')

export function locate(item: Pick<RegItem, 'id' | 'type' | 'reference' | 'targets'>, path = ''): (LocationRule & { key: string }) | null {
  let k = pointKey(item, path)
  for (;;) {
    if (LOCATION_RULES[k]) return { ...LOCATION_RULES[k], key: k }
    const next = trimPoint(k)
    if (next === k) return null
    k = next
  }
}

/**
 * Information-security layer (145.A.200A / Part-IS): the digital infrastructure
 * that runs under the whole organisation rather than in one building.
 */
export const INFOSEC_NODES: { place: Place; label: string }[] = [
  { place: 'hq/information-security', label: 'ISMS · governance' },
  { place: 'production-control', label: 'Planning systems' },
  { place: 'technical-library/maintenance-data', label: 'Maintenance data' },
  { place: 'stores', label: 'Inventory systems' },
  { place: 'safety', label: 'Incident reporting' },
  { place: 'compliance', label: 'Controls & audit' },
  { place: 'records', label: 'Electronic records' },
  { place: 'authority/agency-liaison', label: 'External reporting interface' },
]
export const INFOSEC_ITEMS = ['145.A.200A', '145.B.135A', '145.B.330A']
