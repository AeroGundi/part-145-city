/**
 * Processes — relationships that cut across buildings. EDITORIAL.
 * Each process names existing dataset items and the places it passes through.
 */
import type { Place } from './city'

export interface Process { id: string; name: string; items: string[]; places: Place[] }

export const PROCESSES: Process[] = [
  { id: 'release-to-service', name: 'Release to service', items: ['145.A.48', '145.A.50', '145.A.35', '145.A.55'], places: ['hangar/aircraft-bay', 'hangar/certification-office', 'records/maintenance-records'] },
  { id: 'component-control', name: 'Component control', items: ['145.A.42', '145.A.40', '145.A.25', '145.A.50'], places: ['stores/receiving', 'stores/serviceable', 'workshops'] },
  { id: 'maintenance-data-control', name: 'Maintenance data control', items: ['145.A.45', '145.A.48', '145.A.65', '145.A.202'], places: ['technical-library/maintenance-data', 'hangar/data-terminals'] },
  { id: 'competence', name: 'Competence & authorisation', items: ['145.A.30', '145.A.35', '145.A.37', '145.A.200'], places: ['training/competency-assessment', 'training/certifying-staff-office', 'training/personnel-records'] },
  { id: 'safety-reporting', name: 'Safety reporting', items: ['145.A.60', '145.A.202', '145.A.200', '145.A.155'], places: ['safety/occurrence-reporting', 'safety/internal-reporting', 'safety/hazard-risk'] },
  { id: 'compliance-monitoring', name: 'Compliance monitoring', items: ['145.A.200', '145.A.65', '145.A.95', '145.A.205'], places: ['compliance/audit-room', 'compliance/findings', 'hq/accountable-manager'] },
  { id: 'approval-lifecycle', name: 'Approval life-cycle', items: ['145.A.15', '145.A.20', '145.A.70', '145.A.85', '145.A.90', '145.B.310', '145.B.330'], places: ['hq/approval-desk', 'moe/exposition', 'authority/certification-office'] },
  { id: 'findings-handling', name: 'Findings handling', items: ['145.A.95', '145.B.350', '145.B.355', '145.A.90'], places: ['compliance/findings', 'authority/findings-office'] },
  { id: 'oversight', name: 'Oversight', items: ['145.B.300', '145.B.305', '145.A.140', '145.B.200'], places: ['authority/oversight-office', 'hq/reception'] },
  { id: 'planning', name: 'Planning & handover', items: ['145.A.47', '145.A.30', '145.A.48'], places: ['production-control/planning-office', 'production-control/shift-handover', 'hangar/supervisor-desk'] },
  { id: 'contracting', name: 'Contracting & subcontracting', items: ['145.A.205', '145.A.75', '145.A.65', '145.A.140'], places: ['contractor/contract-desk', 'contractor/subcontracted-work'] },
  { id: 'information-security', name: 'Information security', items: ['145.A.200A', '145.B.135A', '145.B.330A', '145.A.200'], places: ['hq/information-security'] },
]

/** Where a defined term is most at home in the city. Terms without an entry stay at the glossary lectern. */
export const DEFINITION_PLACES: Record<string, Place> = {
  'Audit': 'compliance/audit-room/auditor',
  'Assessment': 'compliance/audit-room/audit-programme',
  'Base maintenance': 'hangar/aircraft-bay',
  'Base maintenance hangar': 'hangar/aircraft-bay',
  'Competency': 'training/competency-assessment/assessor',
  'Correction': 'compliance/findings/findings-tracker',
  'Corrective action': 'compliance/findings/findings-tracker',
  'Error': 'safety/internal-reporting/report-box',
  'Fatigue': 'production-control/shift-handover/shift-roster',
  'Hazard': 'safety/hazard-risk/risk-matrix',
  'Human factors': 'training/classroom/instructor',
  'Human performance': 'training/classroom/instructor',
  'Inspection': 'hangar/aircraft-bay/independent-inspector',
  'Just culture': 'safety/internal-reporting/report-box',
  'Line maintenance': 'apron/line-station/line-certifier',
  'Near miss': 'safety/internal-reporting/report-box',
  'Organisational factor': 'safety/hazard-risk/risk-matrix',
  'Oversight planning cycle': 'authority/oversight-office/oversight-programme',
  'Oversight programme': 'authority/oversight-office/oversight-programme',
  'Preventive action': 'compliance/findings/findings-tracker',
  'Risk assessment': 'safety/hazard-risk/risk-matrix',
  'Safety culture': 'safety/safety-manager/safety-manager',
  'Safety risk': 'safety/hazard-risk/risk-matrix',
  'Safety training': 'training/classroom/instructor',
}
