/**
 * Audit Mode scenarios.
 *
 * EDITORIAL. A scenario is a realistic situation plus the areas of the organisation
 * a reviewer would walk to. Every area resolves to items that exist in the ingested
 * dataset (verified by `content.test.ts`); no requirement is created here.
 */
import type { Place } from './city'

export interface ScenarioArea {
  id: string
  label: string
  place: Place
  /** true when the area is genuinely relevant to the situation */
  relevant: boolean
  /** dataset item ids, optionally with a point path: "145.A.35(g)" */
  items: string[]
  /** why you would (or would not) go there — editorial */
  note: string
}

export interface Scenario {
  id: string
  title: string
  situation: string
  question: string
  areas: ScenarioArea[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'new-certifying-staff',
    title: 'A new certifying staff member is being authorised',
    situation: 'A B1 licensed engineer joined three months ago. The organisation wants to issue a certification authorisation for the fleet type next week.',
    question: 'Which areas of Part-145 would you examine?',
    areas: [
      { id: 'cs', label: 'Certifying staff', place: 'training/certifying-staff-office', relevant: true, items: ['145.A.35', '145.A.30(g)', '145.A.30(h)'], note: 'The authorisation itself: scope, prerequisites, and who issues it.' },
      { id: 'competence', label: 'Competence', place: 'training/competency-assessment', relevant: true, items: ['145.A.30(e)', '145.A.35(f)'], note: 'Competence has to be assessed before the authorisation is issued.' },
      { id: 'training', label: 'Training', place: 'training/classroom', relevant: true, items: ['145.A.35(d)', '145.A.35(e)'], note: 'Procedures, human factors and safety training, and the continuation training programme.' },
      { id: 'records', label: 'Records', place: 'training/personnel-records', relevant: true, items: ['145.A.35(j)', '145.A.55'], note: 'The record that proves the basis of the authorisation, and how long it is kept.' },
      { id: 'ms', label: 'Management system', place: 'hq/boardroom', relevant: true, items: ['145.A.200'], note: 'Trained and competent personnel is an element of the management system.' },
      { id: 'stores', label: 'Stores', place: 'stores', relevant: false, items: ['145.A.42'], note: 'Component control is not what is being decided here.' },
    ],
  },
  {
    id: 'incorrect-maintenance-data',
    title: 'Maintenance data used during a task is suspected to be incorrect',
    situation: 'During a landing gear task a mechanic notices that the torque value on the work card differs from the value in the current AMM revision.',
    question: 'Where would you look, and in what order?',
    areas: [
      { id: 'data', label: 'Maintenance data', place: 'technical-library/maintenance-data', relevant: true, items: ['145.A.45'], note: 'Is the data applicable and current? Was the work card transcribed accurately? Is the author informed of an inaccuracy?' },
      { id: 'performance', label: 'Performance of maintenance', place: 'hangar/aircraft-bay', relevant: true, items: ['145.A.48'], note: 'Maintenance may only proceed when the necessary data is available; what about tasks already completed?' },
      { id: 'procedures', label: 'Procedures', place: 'compliance/procedures', relevant: true, items: ['145.A.65'], note: 'What does the procedure tell the mechanic to do when data is ambiguous?' },
      { id: 'reporting', label: 'Internal safety reporting', place: 'safety/internal-reporting', relevant: true, items: ['145.A.202', '145.A.60'], note: 'Inaccurate data is recorded through the internal safety reporting scheme; consider whether it is externally reportable.' },
      { id: 'records', label: 'Records', place: 'records/maintenance-records', relevant: true, items: ['145.A.55'], note: 'Which earlier tasks used the same work card? The records answer that.' },
      { id: 'training', label: 'Training classroom', place: 'training/classroom', relevant: false, items: ['145.A.30(e)'], note: 'Possibly a contributing factor later, but not the first place to look.' },
    ],
  },
  {
    id: 'unserviceable-part-fitted',
    title: 'A component without a release document is found fitted',
    situation: 'At a post-check review, a hydraulic actuator fitted during the check cannot be matched to an EASA Form 1 in the work package.',
    question: 'Which requirements does this touch?',
    areas: [
      { id: 'stores', label: 'Stores — acceptance & segregation', place: 'stores/receiving', relevant: true, items: ['145.A.42'], note: 'Acceptance procedures, eligibility before installation, segregation.' },
      { id: 'crs', label: 'Certification of maintenance', place: 'hangar/certification-office', relevant: true, items: ['145.A.50'], note: 'Was a CRS issued with a known non-compliance?' },
      { id: 'records', label: 'Records', place: 'records/maintenance-records', relevant: true, items: ['145.A.55'], note: 'Traceability of the installed part.' },
      { id: 'occurrence', label: 'Occurrence reporting', place: 'safety/occurrence-reporting', relevant: true, items: ['145.A.60', '145.A.202'], note: 'Consider whether the condition is reportable, and capture it internally.' },
      { id: 'form1', label: 'EASA Form 1', place: 'documents/form-1', relevant: true, items: ['appendix-i', 'part-m/appendix-ii'], note: 'What an acceptable release document looks like.' },
      { id: 'library', label: 'Technical Library', place: 'technical-library', relevant: false, items: ['145.A.45'], note: 'Maintenance data is not the issue in this situation.' },
    ],
  },
  {
    id: 'night-shift-handover',
    title: 'A task is left open across a shift change',
    situation: 'The night shift disconnected a flight control cable to gain access. The day shift closes the panels. The cable is found disconnected at the next check.',
    question: 'What would you examine?',
    areas: [
      { id: 'planning', label: 'Production planning & handover', place: 'production-control/shift-handover', relevant: true, items: ['145.A.47'], note: 'Shift and task handover; fatigue and human performance in planning.' },
      { id: 'performance', label: 'Performance of maintenance', place: 'hangar/aircraft-bay', relevant: true, items: ['145.A.48'], note: 'Error-capturing method after critical maintenance tasks; general verification.' },
      { id: 'data', label: 'Work cards', place: 'technical-library/work-cards', relevant: true, items: ['145.A.45'], note: 'Were complex tasks staged so that an open step is visible?' },
      { id: 'crs', label: 'Certification', place: 'hangar/certification-office', relevant: true, items: ['145.A.50'], note: 'What was the CRS based on?' },
      { id: 'safety', label: 'Safety office', place: 'safety/hazard-risk', relevant: true, items: ['145.A.202', '145.A.200', '145.A.60'], note: 'Reporting, causes and contributing factors, risk management.' },
      { id: 'authority', label: 'Competent authority', place: 'authority', relevant: false, items: ['145.B.300'], note: 'Section B is addressed to the authority, not to the organisation’s own investigation.' },
    ],
  },
  {
    id: 'new-subcontractor',
    title: 'The organisation wants to subcontract wheel and brake overhaul',
    situation: 'A local, non-approved workshop is proposed to overhaul wheels and brakes under the organisation’s approval.',
    question: 'Which areas apply?',
    areas: [
      { id: 'contract', label: 'Contracting and subcontracting', place: 'contractor/contract-desk', relevant: true, items: ['145.A.205'], note: 'Conformity of the work and hazards considered in the management system; the subcontractor works under the organisation’s scope of approval.' },
      { id: 'privileges', label: 'Privileges', place: 'contractor/subcontracted-work', relevant: true, items: ['145.A.75'], note: 'The privilege to arrange maintenance at a subcontracted organisation, and its limits.' },
      { id: 'procedures', label: 'Procedures & MOE', place: 'moe/exposition', relevant: true, items: ['145.A.65', '145.A.70'], note: 'Control of subcontracted activities is a procedure; the subcontractor is listed in the MOE.' },
      { id: 'compliance', label: 'Compliance monitoring', place: 'compliance/audit-room', relevant: true, items: ['145.A.200'], note: 'The organisation’s own compliance monitoring extends to the subcontracted work.' },
      { id: 'access', label: 'Authority access', place: 'hq/reception', relevant: true, items: ['145.A.140'], note: 'The authority must have access to the subcontractor.' },
      { id: 'changes', label: 'Changes', place: 'hq/approval-desk', relevant: true, items: ['145.A.85'], note: 'Check whether the change needs prior approval.' },
    ],
  },
  {
    id: 'level-2-finding',
    title: 'The authority raises a level 2 finding on tool calibration',
    situation: 'During an oversight audit, two torque wrenches in use are found past their calibration due date.',
    question: 'What does the organisation have to do, and where?',
    areas: [
      { id: 'findings', label: 'Findings', place: 'compliance/findings', relevant: true, items: ['145.A.95'], note: 'Root cause, corrective action plan, demonstration of implementation within the agreed period.' },
      { id: 'tools', label: 'Tools & equipment', place: 'hangar/tool-crib', relevant: true, items: ['145.A.40'], note: 'The requirement that was not met.' },
      { id: 'authority', label: 'Authority findings office', place: 'authority/findings-office', relevant: true, items: ['145.B.350'], note: 'How the authority classifies findings and sets the period.' },
      { id: 'ms', label: 'Management system', place: 'hq/boardroom', relevant: true, items: ['145.A.200'], note: 'Why did the organisation’s own compliance monitoring not find it first?' },
      { id: 'records', label: 'Records', place: 'records/maintenance-records', relevant: true, items: ['145.A.55'], note: 'Which tasks used those wrenches since the due date?' },
      { id: 'library', label: 'Technical Library', place: 'technical-library', relevant: false, items: ['145.A.45'], note: 'Not involved in this finding.' },
    ],
  },
]
