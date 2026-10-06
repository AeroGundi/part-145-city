/**
 * Explanatory layer.
 *
 * EDITORIAL — NOT REGULATORY TEXT. Everything here is the application's own
 * plain-language summary, written against the ingested official text. It is always
 * rendered under an "Explanation" label, never mixed with the official wording.
 * `audit` entries are practical audit considerations, not requirements.
 */

export interface Editorial {
  /** "What this means" */
  means: string
  /** "Why it matters" */
  why: string
  /** memory hook — an image to attach the point to */
  hook?: string
  /** practical audit considerations (editorial, non-binding) */
  audit?: string[]
  /** semantic search tags */
  tags?: string[]
}

export const EDITORIAL: Record<string, Editorial> = {
  '145.1': {
    means: 'Says who the competent authority is: the authority designated by the Member State where the organisation has its principal place of business, or the Agency (EASA) for organisations based outside the Member States.',
    why: 'Every application, change, finding and report in Part-145 is addressed to “the competent authority”. This point tells you which one.',
    hook: 'The institutional building across the road from the organisation.',
    tags: ['competent authority', 'EASA', 'agency', 'member state'],
  },
  'annex-ii/gm/1': {
    means: 'The definitions used throughout the AMC and GM to Part-145 — audit, competency, hazard, just culture, line and base maintenance, and others.',
    why: 'Many disagreements in an audit are really disagreements about a word. These are the agreed meanings.',
    hook: 'The glossary lectern in the Regulatory Documents pavilion.',
    tags: ['definitions', 'glossary', 'terms'],
  },
  '145.A.10': {
    means: 'Opens Section A: it sets out what an organisation must meet to obtain, and keep, an approval to maintain aircraft and components. The AMC and GM explain line versus base maintenance.',
    why: 'It frames everything else — the approval is always for a defined scope of work at defined locations.',
    hook: 'The approval sign at the edge of the apron: this is what the organisation is approved to do.',
    audit: ['Is each maintenance location classified consistently (line / base) with how the work is actually done there?'],
    tags: ['scope', 'line maintenance', 'base maintenance', 'approval'],
  },
  '145.A.15': {
    means: 'How to apply for a certificate or for an amendment to it: in the form and manner set by the competent authority, with a pre-audit against the requirements and documentation showing how the organisation will comply.',
    why: 'The application is the first evidence the authority sees of whether the organisation understands its own compliance.',
    hook: 'The certificate desk in HQ, with an application form on its way to the authority.',
    audit: ['For a recent amendment: was a pre-audit performed and is its result on file?'],
    tags: ['application', 'EASA Form 2', 'certificate', 'pre-audit'],
  },
  '145.A.20': {
    means: 'The organisation’s scope of work is specified in its exposition, and the terms of approval attached to the certificate define its privileges, using the class and rating system of Appendix II.',
    why: 'Work outside the scope is work without an approval. Scope is the first thing to check before any task is accepted.',
    hook: 'The same approval sign — now read line by line: classes, ratings, limitations.',
    audit: ['Sample recent work orders against the capability list / scope of work in the MOE.', 'Are limitations on the certificate reflected in planning and in authorisations?'],
    tags: ['terms of approval', 'scope of work', 'capability list', 'class', 'rating'],
  },
  '145.A.25': {
    means: 'Facilities must suit the planned work: protection from weather, segregated workshops and bays, office accommodation, a working environment that does not impair effectiveness, and secure, segregated storage.',
    why: 'Facilities shape behaviour. Poor light, noise, dust or crowding turn routine tasks into error-prone ones.',
    hook: 'The hangar itself: doors, lighting, clean bays — and the stores next door.',
    audit: ['Is hangar space actually available for the planned checks (ownership or tenancy evidence)?', 'Observe lighting, temperature, contamination and noise at the point where work is done.', 'Is storage access restricted to authorised personnel?'],
    tags: ['facilities', 'hangar', 'working environment', 'storage', 'office accommodation'],
  },
  '145.A.30': {
    means: 'The people requirements: an accountable manager, nominated persons, managers for compliance monitoring and safety, enough competent staff (the man-hour plan), competence assessment, and the qualification rules for NDT, certifying, support and airworthiness review staff.',
    why: 'Almost every other requirement is delivered by a person. If the people are not there, not competent or not authorised, nothing else holds.',
    hook: 'A walk from HQ (accountable manager) through Compliance and Safety to the Training Centre.',
    audit: ['Start from the organisation chart: is every post in the MOE filled by an accepted person?', 'Does the man-hour plan reflect current workload and is it reviewed?', 'Sample competence assessments including human factors training.'],
    tags: ['personnel', 'competence', 'training', 'human factors', 'man-hour plan', 'accountable manager', 'nominated persons'],
  },
  '145.A.30(a)': {
    means: 'The organisation appoints an accountable manager with corporate authority to ensure all maintenance can be financed and carried out to the required standard — including making resources available and establishing and promoting the safety policy.',
    why: 'Accountability cannot be delegated. This is the person the authority holds responsible.',
    hook: 'The Accountable Manager’s corner office on the top floor of HQ.',
    tags: ['accountable manager', 'resources', 'safety policy'],
  },
  '145.A.30(b)': {
    means: 'The accountable manager nominates a person or group of persons responsible for ensuring the organisation works in accordance with the MOE and approved procedures.',
    why: 'These are the managers who turn the exposition into daily practice.',
    hook: 'The nominated persons’ office next to the Accountable Manager.',
    tags: ['nominated persons', 'post holders', 'EASA Form 4'],
  },
  '145.A.30(c)': {
    means: 'The accountable manager nominates a person or group of persons to manage the compliance monitoring function as part of the management system. (The sub-heading shown above the text is the Easy Access Rules heading as published.)',
    why: 'Compliance monitoring needs an owner who is independent enough to report what is found.',
    hook: 'The Compliance Monitoring Manager’s desk.',
    tags: ['compliance monitoring manager', 'quality manager', 'compliance monitoring'],
  },
  '145.A.30(ca)': {
    means: 'The accountable manager nominates a person or group of persons to manage the development, administration and maintenance of effective safety management processes. (The sub-heading shown above the text is the Easy Access Rules heading as published.)',
    why: 'Safety management needs a focal point — someone who facilitates hazard identification and keeps the processes running.',
    hook: 'The Safety Manager’s desk in the Safety Office.',
    tags: ['safety manager', 'safety management'],
  },
  '145.A.30(cb)': {
    means: 'The nominated persons are responsible to the accountable manager and have direct access to him or her, to keep him or her properly informed on compliance and safety matters.',
    why: 'Bad news has to be able to reach the top without being filtered.',
    hook: 'The reporting lines drawn on the organisation chart wall.',
    tags: ['reporting lines', 'direct access'],
  },
  '145.A.30(cc)': {
    means: 'Nominated persons must be able to demonstrate relevant knowledge, background and experience in aircraft or component maintenance, and a working knowledge of the Regulation.',
    why: 'A post holder who does not understand the work cannot be responsible for it.',
    tags: ['nominated persons', 'knowledge', 'experience'],
  },
  '145.A.30(d)': {
    means: 'The organisation has a maintenance man-hour plan showing it has enough appropriately qualified staff to plan, perform, supervise, inspect and monitor the work it is approved for.',
    why: 'Chronic under-resourcing is one of the most reliable precursors of maintenance error.',
    hook: 'The man-hour plan board in Production Control.',
    audit: ['Compare planned against actual hours for a recent period; what happened when the shortfall exceeded the MOE threshold?'],
    tags: ['man-hour plan', 'manpower', 'resources', 'contracted staff'],
  },
  '145.A.30(e)': {
    means: 'The organisation establishes and controls the competence of personnel involved in maintenance, airworthiness reviews, safety management and compliance monitoring — including an understanding of human factors and human performance issues appropriate to their function.',
    why: 'A licence or a course is not competence. The organisation has to assess it and keep it current.',
    hook: 'The competency assessor at the assessment desk in the Training Centre.',
    audit: ['Pick three people in different roles: is there an assessment against defined criteria before unsupervised work?', 'Is initial and recurrent human factors and safety training in date?'],
    tags: ['competence', 'competency assessment', 'human factors', 'training', 'safety training', 'fuel tank safety'],
  },
  '145.A.30(f)': {
    means: 'Personnel who carry out or control continued-airworthiness non-destructive testing must be appropriately qualified for the particular NDT method, in accordance with the recognised standard.',
    why: 'NDT finds what cannot be seen. An unqualified inspection gives false assurance.',
    hook: 'The NDT technician in the NDT laboratory.',
    tags: ['NDT', 'non-destructive testing', 'specialised services', 'EN 4179'],
  },
  '145.A.30(g)': {
    means: 'For line maintenance of aircraft, the organisation has appropriately rated certifying staff qualified under Part-66 (categories B1, B2, B2L, B3, L as appropriate), and may use task-trained category A staff for minor scheduled line maintenance and simple defect rectification.',
    why: 'It sets who may release an aircraft on the line.',
    hook: 'The line certifier at the line station on the apron.',
    tags: ['line maintenance', 'certifying staff', 'B1', 'B2', 'category A', 'Part-66'],
  },
  '145.A.30(h)': {
    means: 'For base maintenance, the organisation has category C certifying staff (for complex motor-powered aircraft) supported by B1/B2 support staff, or the appropriate B/L category certifying staff for other aircraft.',
    why: 'It sets who releases the aircraft after a base check, and who stands behind them.',
    hook: 'Certifying staff signing the CRS in the hangar’s certification office.',
    tags: ['base maintenance', 'category C', 'support staff', 'certifying staff'],
  },
  '145.A.30(i)': {
    means: 'Component certifying staff must be qualified in accordance with the applicable provisions for component release.',
    why: 'A component leaves the shop on an EASA Form 1 signed by someone the organisation has qualified to do so.',
    hook: 'The component certifier in the workshops.',
    tags: ['component certifying staff', 'EASA Form 1', 'workshop'],
  },
  '145.A.30(j)': {
    means: 'Lists the exceptions to the Part-66 qualification rules — for example facilities outside the Union territory, limited flight-crew authorisations, and one-off authorisations in unforeseen cases where an aircraft is grounded away from a supported location.',
    why: 'These are narrow doors. Each has conditions, and each use must be recorded and justified.',
    hook: 'The AOG kit at the remote location on the apron, and the Appendix IV plinth.',
    audit: ['For each one-off authorisation issued: was the case genuinely unforeseen, and was the authority informed within the stated time?'],
    tags: ['one-off authorisation', 'flight crew authorisation', 'exceptions', 'Appendix IV'],
  },
  '145.A.30(k)': {
    means: 'If the organisation performs airworthiness reviews and issues airworthiness review certificates, it must have airworthiness review staff qualified and authorised in accordance with 145.A.37.',
    why: 'The airworthiness review privilege brings its own staff requirements.',
    hook: 'The airworthiness review staff desk in the Training Centre.',
    tags: ['airworthiness review staff', 'ARC'],
  },
  '145.A.35': {
    means: 'How certifying staff and support staff are assessed, authorised and kept current: adequate understanding of the aircraft or component and of the procedures, recent experience, continuation training, a certification authorisation with a clear scope, and records of all of it.',
    why: 'The certification authorisation is the organisation’s own statement that this person may sign. It has to be earned, bounded and maintained.',
    hook: 'The authorisation desk in the Certifying Staff Office.',
    audit: ['Sample authorisations: does the scope match licence, type ratings and training?', 'Evidence of 6 months’ relevant experience in the last 2 years.', 'Is continuation training delivered within each 2-year period, and does it cover procedures and human factors?', 'Can staff produce their authorisation within a reasonable time?'],
    tags: ['certifying staff', 'support staff', 'certification authorisation', 'continuation training', 'recent experience', 'authorisation'],
  },
  '145.A.37': {
    means: 'Sets the experience, authorisation and knowledge that airworthiness review staff need, the supervised review they must complete before being authorised, and the records the organisation keeps of them.',
    why: 'An airworthiness review certificate is a formal statement about the whole aircraft, not one task.',
    hook: 'The airworthiness review staff desk — next door to the certifying staff office.',
    tags: ['airworthiness review staff', 'ARC', 'Part-ML'],
  },
  '145.A.40': {
    means: 'The organisation has, and uses, the equipment and tools needed for its scope of work, and controls and calibrates tools and equipment to a recognised standard at a frequency that ensures serviceability and accuracy.',
    why: 'A torque value is only as good as the wrench that applied it.',
    hook: 'The shadow board of controlled tools in the hangar’s tool crib.',
    audit: ['Pick tools in use on the floor: calibration label in date, register entry matches.', 'How are alternative tools accepted? How are personal tools controlled?', 'What happens to work already done when a tool is found out of calibration?'],
    tags: ['tools', 'equipment', 'calibration', 'tool control', 'tooling'],
  },
  '145.A.42': {
    means: 'Classifies components (serviceable, unserviceable, unsalvageable, standard parts, material), and requires procedures for accepting them, for installing only eligible ones, and for segregating unserviceable and unsalvageable components so they cannot re-enter the supply system.',
    why: 'An unapproved or mis-identified part defeats every other control. Stores is where it is stopped.',
    hook: 'The stores warehouse with green, amber and red zones.',
    audit: ['Follow one incoming part from receipt to shelf: release document, receiving inspection, identification.', 'Are unserviceable and unsalvageable items physically segregated and labelled?', 'How are unsalvageable parts mutilated or otherwise prevented from returning to service?', 'Shelf-life and storage conditions for material.'],
    tags: ['components', 'stores', 'parts', 'EASA Form 1', 'standard parts', 'material', 'unserviceable', 'unsalvageable', 'quarantine', 'receiving inspection', 'suspected unapproved parts', 'fabrication'],
  },
  '145.A.45': {
    means: 'The organisation holds and uses applicable, current maintenance data; reports inaccurate or ambiguous data to its author through the internal safety reporting scheme; modifies instructions only under an MOE procedure; uses a common work card system; keeps the data readily available; and keeps it up to date.',
    why: 'Maintenance done to the wrong revision is maintenance done wrong, however carefully.',
    hook: 'The Technical Librarian with the maintenance manual, at the maintenance-data terminal.',
    audit: ['At a task in progress: which data is being used, at which revision, and how does the mechanic know it is current?', 'For customer-supplied data: what evidence shows it is up to date?', 'Are complex tasks staged on the work cards?', 'Find a recent report of ambiguous data: was the author informed?'],
    tags: ['maintenance data', 'AMM', 'CMM', 'SRM', 'IPC', 'service bulletin', 'airworthiness directive', 'work cards', 'technical library', 'revision control', 'manuals'],
  },
  '145.A.47': {
    means: 'A planning system, proportionate to the work, that makes people, tools, equipment, material, data and facilities available when needed; takes human performance limits and fatigue into account; ensures proper shift and task handover; and considers hazards from external working teams.',
    why: 'Most maintenance errors are set up before the task starts — by the plan, the shift pattern or a poor handover.',
    hook: 'The planner at the aircraft status board in Production Control.',
    audit: ['Look at one work package: were parts, tools and data confirmed before start?', 'How does shift planning account for fatigue (limits, overtime, nights)?', 'Read an actual handover: is it written, and would the incoming shift know the open steps?'],
    tags: ['production planning', 'planning', 'shift handover', 'fatigue', 'human performance', 'work package', 'external working teams'],
  },
  '145.A.48': {
    means: 'Maintenance may only be performed when everything needed is available. The organisation is responsible for it and must ensure a general verification after completion, an error-capturing method after critical maintenance tasks, minimised risk of repeated errors, and proper assessment of damage and defects.',
    why: 'This is the last line of defence at the aircraft: closing up clean and catching the error before flight.',
    hook: 'The independent inspector checking the mechanic’s work in the aircraft bay.',
    audit: ['How are critical maintenance tasks identified, and what error-capturing method is applied to each?', 'How is the same person prevented from doing identical tasks on redundant systems in one visit?', 'Evidence of the general verification (tools, panels) before release.'],
    tags: ['performance of maintenance', 'critical maintenance task', 'independent inspection', 'error capturing', 'duplicate inspection', 'general verification', 'tool control'],
  },
  '145.A.50': {
    means: 'A certificate of release to service is issued by authorised certifying staff when all ordered maintenance has been properly carried out and there is no known non-compliance that endangers flight safety. It also covers incomplete maintenance, components (EASA Form 1), and the case of an aircraft grounded awaiting a part.',
    why: 'The CRS is the organisation’s formal statement to the operator. Everything upstream exists to make it true.',
    hook: 'Certifying staff signing the CRS in the certification office.',
    audit: ['For a sampled CRS: is every ordered task accounted for, and are deferred items communicated to the operator?', 'Does the certifier’s authorisation cover what was certified?', 'For a Form 1: block 12 content and data references.'],
    tags: ['certification of maintenance', 'CRS', 'certificate of release to service', 'release', 'EASA Form 1', 'certifying staff'],
  },
  '145.A.55': {
    means: 'What records are kept and for how long: maintenance records and CRS copies (3 years), airworthiness review records (3 years), management system and contract records (5 years), and personnel records — stored safely against damage, alteration and theft, and traceable.',
    why: 'If it is not recorded, it cannot be shown to have been done — and the next maintainer cannot rely on it.',
    hook: 'The archive receiving the completed work package.',
    audit: ['Retrieve a work package from around three years ago: complete, legible, traceable?', 'Backups of electronic records: where are they, and have they been restored in a test?', 'What happens to records if the organisation ceases?'],
    tags: ['record-keeping', 'records', 'retention', 'archive', 'traceability', 'personnel records', 'backup'],
  },
  '145.A.60': {
    means: 'As part of its management system the organisation runs an occurrence-reporting system (mandatory and voluntary) and reports safety-related events or conditions to the competent authority, the design organisation and the party responsible for the aircraft’s continuing airworthiness.',
    why: 'One organisation’s occurrence is the whole system’s warning.',
    hook: 'The occurrence reporting desk in the Safety Office.',
    audit: ['Take a recent reportable event: when was it identified, when was it reported, to whom?', 'How do staff know what is reportable?'],
    tags: ['occurrence reporting', 'mandatory reporting', 'voluntary reporting', 'Regulation 376/2014', 'incident'],
  },
  '145.A.65': {
    means: 'The organisation establishes maintenance procedures that take human factors and good maintenance practice into account — covering a clear work order or contract and all aspects of carrying out the maintenance, including specialised services and subcontracted activities.',
    why: 'Procedures are how an organisation makes good practice repeatable instead of personal.',
    hook: 'The controlled procedures binder — written in Compliance, lived in Production.',
    audit: ['Watch a task and compare it with the written procedure: do they match?', 'Is there a clear work order for the sampled task?', 'How are procedure deviations reported and resolved?'],
    tags: ['maintenance procedures', 'procedures', 'work order', 'human factors', 'good maintenance practices', 'specialised services', 'subcontracted'],
  },
  '145.A.70': {
    means: 'The maintenance organisation exposition: the document that sets out the scope of work and shows how the organisation complies — statement by the accountable manager, safety policy, management personnel, organisation chart, certifying staff list, facilities, procedures, and how the MOE itself is amended and approved.',
    why: 'The MOE is the contract between the organisation and its authority. Staff work to it; the authority audits against it.',
    hook: 'The MOE master copy on its plinth in Document Control.',
    audit: ['Is the MOE current and does it describe what actually happens?', 'Which amendments were made without prior approval, and were they within the approved procedure?', 'Do staff have access to the parts relevant to them?'],
    tags: ['MOE', 'exposition', 'maintenance organisation exposition', 'document control', 'amendment'],
  },
  '145.A.75': {
    means: 'What an approved organisation may do, in accordance with its MOE: maintain at the approved locations; arrange maintenance at a subcontractor working under its management system; maintain at any location when an aircraft is unserviceable or for occasional line maintenance; work at listed line stations; issue certificates of release to service; and, if approved, perform airworthiness reviews.',
    why: 'Privileges are the boundary of the approval — each has a condition attached.',
    hook: 'The apron and the road out to the contractor: where the approval may be exercised.',
    audit: ['For work done away from base: which privilege was used and were the MOE conditions met?', 'Is each subcontractor listed, controlled and audited?'],
    tags: ['privileges', 'subcontracting', 'line station', 'occasional line maintenance', 'locations'],
  },
  '145.A.85': {
    means: 'Lists the changes that need prior approval from the competent authority (certificate and terms of approval, key persons, reporting lines, additional locations, the change procedure itself) and requires other changes to be managed and notified as agreed.',
    why: 'The approval was granted to a specific organisation. Change it without telling the authority and the basis of the approval is gone.',
    hook: 'The certificate and changes desk in HQ.',
    audit: ['List the changes of the last year: which needed prior approval, and was it obtained before implementation?'],
    tags: ['changes', 'prior approval', 'change management', 'notification'],
  },
  '145.A.90': {
    means: 'The certificate stays valid as long as the organisation remains in compliance (taking the handling of findings into account), gives the authority access, and the certificate is not surrendered, suspended or revoked.',
    why: 'An unlimited-duration approval is continuously conditional.',
    hook: 'The certificate hanging in HQ.',
    tags: ['continued validity', 'certificate', 'surrender', 'revocation'],
  },
  '145.A.95': {
    means: 'After being notified of a finding, the organisation identifies the root cause(s) and contributing factors, defines a corrective action plan, and demonstrates implementation to the authority within the agreed period. Observations must be given due consideration and the decision recorded.',
    why: 'Fixing the symptom and missing the cause guarantees the finding returns.',
    hook: 'The findings tracker in the Compliance Monitoring Office.',
    audit: ['Take a closed finding: is the root cause convincing, and has the corrective action actually prevented recurrence?', 'Overdue findings and extensions.'],
    tags: ['findings', 'observations', 'root cause', 'corrective action', 'level 1', 'level 2'],
  },
  '145.A.120': {
    means: 'An organisation may use an alternative means of compliance, but must first give the authority a full description showing how compliance is achieved, and may use it only after approval.',
    why: 'AMC are one acceptable way to comply, not the only one — but the alternative has to be demonstrated, not assumed.',
    hook: 'The amendment desk in Document Control.',
    tags: ['means of compliance', 'AltMoC', 'alternative means of compliance', 'AMC'],
  },
  '145.A.140': {
    means: 'The organisation ensures that the competent authority has access to any facility, aircraft, document, record, data, procedure or other material relevant to its certified activity — whether subcontracted or not.',
    why: 'Oversight only works if nothing is off-limits, including at subcontractors.',
    hook: 'The reception desk where the authority inspector signs in.',
    tags: ['access', 'authority access', 'oversight'],
  },
  '145.A.155': {
    means: 'The organisation implements any safety measures mandated by the competent authority and any relevant mandatory safety information issued by the Agency.',
    why: 'When the system identifies an urgent safety problem, action cannot wait for the next audit.',
    hook: 'The Safety Manager acting on a mandatory safety notice.',
    tags: ['immediate reaction', 'safety problem', 'mandatory safety information', 'safety measures'],
  },
  '145.A.200': {
    means: 'The organisation establishes, implements and maintains a management system: clear accountability and lines of responsibility, a safety policy and objectives, hazard identification and risk management, trained and competent personnel, documented key processes, and a compliance monitoring function with feedback to the accountable manager — proportionate to the organisation’s size and complexity.',
    why: 'It is the framework that connects every other requirement: safety management and compliance monitoring working as one system.',
    hook: 'The boardroom in HQ, with lines running to Safety and Compliance.',
    audit: ['Can the accountable manager describe the top safety risks and what is being done about them?', 'Follow one hazard from report to risk assessment to action to review.', 'Audit programme: coverage, independence, and feedback reaching the accountable manager.', 'Is the system proportionate — neither missing nor paper-only?'],
    tags: ['management system', 'SMS', 'safety management', 'safety policy', 'hazard identification', 'risk management', 'compliance monitoring', 'audit', 'quality system', 'just culture', 'safety culture'],
  },
  '145.A.200A': {
    means: 'In addition to the management system, the organisation establishes, implements and maintains an information security management system in accordance with Regulation (EU) 2023/203 (Part-IS), to manage information security risks with a potential impact on aviation safety.',
    why: 'Maintenance data, planning and records are digital. A compromised system can become an airworthiness problem.',
    hook: 'The digital layer under the whole city — switch on the Information Security layer.',
    tags: ['information security', 'ISMS', 'Part-IS', 'cyber', 'cybersecurity', 'Regulation 2023/203'],
  },
  '145.A.202': {
    means: 'An internal safety reporting scheme, as part of the management system, to collect and evaluate occurrences, errors, near misses and hazards; identify causes and contributing factors; feed them into safety risk management; and circulate the information. It also covers safety issues from subcontracted activities.',
    why: 'The people doing the work see the hazards first. The scheme is how the organisation hears them.',
    hook: 'The internal safety report box in the Safety Office.',
    audit: ['Do reporters get feedback? Ask a mechanic.', 'Reporting rate and types over time — are near misses being reported or only events?', 'How are reports from subcontractors captured?'],
    tags: ['internal safety reporting', 'internal reporting', 'near miss', 'errors', 'hazards', 'just culture', 'feedback'],
  },
  '145.A.205': {
    means: 'When contracting or subcontracting any part of its maintenance, the organisation ensures the work conforms to the requirements and that the associated hazards are considered in its management system. A subcontracted organisation works under the scope of approval of the subcontracting organisation.',
    why: 'Work can be handed over; responsibility cannot.',
    hook: 'The contract on the desk of the external facility at the end of the road.',
    audit: ['For each subcontractor: contract, control procedure, audit, and inclusion in the organisation’s own compliance monitoring.', 'How does the authority get access?'],
    tags: ['contracting', 'subcontracting', 'contracted maintenance', 'subcontractor', 'contract'],
  },

  // ── Section B ───────────────────────────────────────────────────────────────
  '145.B.005': {
    means: 'Opens Section B: the conditions under which the competent authority carries out certification, oversight and enforcement, and the requirements for its own administration and management system.',
    why: 'Section B is addressed to the authority — it tells an organisation what to expect from its regulator.',
    hook: 'The authority building across the road.',
    tags: ['authority requirements', 'section B', 'scope'],
  },
  '145.B.115': {
    means: 'The authority provides its personnel with the legislative acts, standards, rules, technical publications and related documents they need to do their job.',
    why: 'Inspectors need the same current material the organisation is held to.',
    tags: ['oversight documentation'],
  },
  '145.B.120': {
    means: 'How the authority deals with means of compliance: AMC issued by the Agency, alternative means proposed by organisations, and alternative means the authority itself adopts — including evaluation and notification.',
    why: 'It is the counterpart of 145.A.120: who decides whether an alternative is acceptable, and how.',
    tags: ['means of compliance', 'AltMoC', 'alternative means of compliance'],
  },
  '145.B.125': {
    means: 'The authority informs the Agency of significant problems with implementation, of safety-significant information from occurrence reports, and (from the Part-IS amendment) of relevant information security matters.',
    why: 'It closes the loop from national oversight to the European level.',
    tags: ['information to the Agency', 'EASA', 'occurrence reports'],
  },
  '145.B.135': {
    means: 'The authority runs a system to collect, analyse and disseminate safety information, and takes adequate measures to address a safety problem when it receives such information.',
    why: 'It is the authority-side counterpart of 145.A.155.',
    tags: ['immediate reaction', 'safety problem', 'safety information'],
  },
  '145.B.135A': {
    means: 'The authority’s equivalent system for information security incidents and vulnerabilities with a potential impact on aviation safety (introduced by Regulation (EU) 2023/203).',
    why: 'Security events can spread across organisations faster than safety events.',
    tags: ['information security', 'incident', 'vulnerability', 'Part-IS'],
  },
  '145.B.200': {
    means: 'The authority’s own management system: documented policies and procedures, enough qualified personnel, adequate facilities, a compliance monitoring function, and coordination with other authorities.',
    why: 'The regulator is held to a management system standard too.',
    hook: 'The authority management system board.',
    tags: ['authority management system', 'inspector qualification', 'inspector training'],
  },
  '145.B.205': {
    means: 'Conditions under which the authority may allocate certification or oversight tasks to qualified entities, while keeping responsibility.',
    why: 'Delegated tasks remain the authority’s responsibility.',
    tags: ['allocation of tasks', 'qualified entities'],
  },
  '145.B.210': {
    means: 'The authority keeps its management system up to date when rules change and notifies the Agency of changes that affect its ability to perform its tasks.',
    why: 'Authority capability has to track regulatory change.',
    tags: ['changes in the management system'],
  },
  '145.B.220': {
    means: 'What the authority records and for how long: its management system, personnel qualification, task allocation, certification and oversight of each organisation, findings and enforcement, safety information and alternative means of compliance.',
    why: 'Oversight decisions must be traceable.',
    hook: 'The authority’s record cabinets.',
    tags: ['record-keeping', 'authority records'],
  },
  '145.B.300': {
    means: 'The principles of oversight: the authority verifies compliance before issuing a certificate and continuously afterwards, through audits, assessments and inspections (including unannounced ones), with scope based on past results and safety priorities.',
    why: 'It explains why oversight looks the way it does — risk-based rather than uniform.',
    hook: 'The inspector leaving the oversight office for the organisation.',
    tags: ['oversight', 'audit', 'inspection', 'unannounced inspection', 'risk-based oversight'],
  },
  '145.B.305': {
    means: 'The oversight programme and planning cycle: the oversight planning cycle shall not exceed 24 months, and may be extended to 36 months — and, under further conditions, to a maximum of 48 months — where the conditions listed in the point are met.',
    why: 'A mature management system earns a longer oversight cycle.',
    hook: 'The oversight programme board.',
    tags: ['oversight programme', 'oversight planning cycle', '24 months', 'audit cycle'],
  },
  '145.B.310': {
    means: 'How the authority handles an initial application: verifying compliance, meeting the accountable manager, recording and closing findings, approving the MOE and issuing the certificate (EASA Form 3-145).',
    why: 'It is the authority-side counterpart of 145.A.15.',
    hook: 'The certificate issue desk.',
    tags: ['initial certification', 'EASA Form 3-145', 'EASA Form 6', 'certificate'],
  },
  '145.B.330': {
    means: 'How the authority handles changes: verifying compliance before approving changes that need prior approval, prescribing operating conditions during the change, and dealing with changes implemented without approval.',
    why: 'Counterpart of 145.A.85.',
    tags: ['changes', 'prior approval', 'change approval'],
  },
  '145.B.330A': {
    means: 'How the authority handles changes to the information security management system (introduced by Regulation (EU) 2023/203).',
    why: 'ISMS changes get their own oversight route.',
    tags: ['information security', 'ISMS', 'changes', 'Part-IS'],
  },
  '145.B.350': {
    means: 'How the authority classifies and handles findings: level 1 (significant non-compliance that lowers safety or seriously endangers flight safety) requiring immediate action, level 2 with a corrective action period, and observations.',
    why: 'It defines the vocabulary and the clock for every finding an organisation receives.',
    hook: 'The findings desk in the authority building.',
    tags: ['findings', 'level 1 finding', 'level 2 finding', 'observations', 'corrective action period', 'enforcement'],
  },
  '145.B.355': {
    means: 'When and how the authority suspends, limits or revokes a certificate.',
    why: 'The end of the enforcement ladder.',
    tags: ['suspension', 'limitation', 'revocation', 'enforcement'],
  },

  // ── Appendices ──────────────────────────────────────────────────────────────
  'appendix-i': {
    means: 'Points to Appendix II to Annex I (Part-M), which contains the EASA Form 1 and its completion instructions. The linked text is shown alongside.',
    why: 'The EASA Form 1 is how a component’s maintenance release travels with it.',
    hook: 'The EASA Form 1 on its plinth in the Regulatory Documents pavilion.',
    tags: ['EASA Form 1', 'authorised release certificate', 'Form 1'],
  },
  'part-m/appendix-ii': {
    means: 'The EASA Form 1 for maintenance: purpose, format, block-by-block completion instructions and user/installer responsibilities. This is official text of Annex I (Part-M), included because Part-145 Appendix I refers to it.',
    why: 'Every block has a defined meaning; errors in block 11 or 12 are among the most common release findings.',
    hook: 'The EASA Form 1 on its plinth.',
    tags: ['EASA Form 1', 'authorised release certificate', 'Form 1', 'block 12'],
  },
  'appendix-ii': {
    means: 'The class and rating system used to state an organisation’s terms of approval: category A (aircraft), B (engines), C (components by ATA-based rating) and D (specialised services), with limitations.',
    why: 'It is the vocabulary of the scope of approval.',
    hook: 'The class and rating chart on the wall of the pavilion.',
    tags: ['class and rating', 'ratings', 'A1', 'B1', 'C rating', 'D1', 'terms of approval'],
  },
  'appendix-iii': {
    means: 'The format of the maintenance organisation certificate — EASA Form 3-145 — and its terms of approval.',
    why: 'It is the document that proves the approval and bounds it.',
    hook: 'The certificate on its plinth; a copy hangs in HQ.',
    tags: ['EASA Form 3-145', 'certificate', 'Form 3'],
  },
  'appendix-iv': {
    means: 'Conditions under which certifying and support staff not qualified to Part-66 may be used, for the cases referred to in 145.A.30(j)(1) and (2).',
    why: 'Mainly relevant to facilities outside the Union territory.',
    hook: 'The Appendix IV plinth.',
    tags: ['Appendix IV', 'not qualified Part-66', 'national licence', 'ICAO Annex 1'],
  },
  'amc-appendix-ii': { means: 'EASA Form 6 — the authority’s audit report format used when recommending approval.', why: 'It shows what the authority reviews, point by point.', tags: ['EASA Form 6', 'recommendation report'] },
  'amc-appendix-iii': { means: 'EASA Form 2 — the application form for a Part-145 approval.', why: 'The form an applicant actually fills in.', tags: ['EASA Form 2', 'application form'] },
  'amc-appendix-iv': { means: 'Guidance on fuel tank safety training: levels, content and continuation training.', why: 'Fuel tank safety training is a recurring competence item.', tags: ['fuel tank safety', 'FTS', 'CDCCL', 'training'] },
}

/** Editorial for an item, falling back to its parent point (AMC/GM inherit tags only). */
export function editorialFor(id: string, parent?: string): Editorial | undefined {
  return EDITORIAL[id] ?? (parent ? EDITORIAL[parent] : undefined)
}
