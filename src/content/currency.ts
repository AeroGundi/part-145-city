/**
 * How current the dataset is, beyond what the ingestion can state by itself.
 *
 * EDITORIAL, and deliberately conservative: each entry records only what an official
 * page or act states, with the date it was checked.
 *
 * The acts that DO change Part-145 after the ingested export are not listed here —
 * they are applied by `scripts/ingest/amend.ts` and described in `DATA.meta.amendments`.
 */
export interface CurrencyGap { act: string; what: string; status: string; url: string; checked: string }

/** Acts known to change Part-145 that are NOT reflected in the dataset. Empty when there are none. */
export const CURRENCY_GAPS: CurrencyGap[] = []

export interface ReviewedAct { act: string; finding: string; url: string }

/** When and against what the list of amending acts was last compared. */
export const CURRENCY_REVIEW: { checked: string; basis: { label: string; url: string }[]; noChange: ReviewedAct[]; scope: string[] } = {
  checked: '2026-10-06',
  basis: [
    { label: 'EASA — Continuing airworthiness: regulation, amending regulations, AMC & GM', url: 'https://www.easa.europa.eu/en/regulations/continuing-airworthiness' },
    { label: 'EASA — AMC & GM to Part-145 (all issues and amendments)', url: 'https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/group/part-145---maintenance-organisation-approvals' },
    { label: 'EASA — Easy Access Rules for Continuing Airworthiness (latest revision: September 2025)', url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-continuing-airworthiness' },
  ],
  noChange: [
    {
      act: 'Commission Implementing Regulation (EU) 2026/100',
      finding: 'Amends Regulation (EU) No 1321/2014 as from 7 August 2026, but only its Article 3 and Annexes I (Part-M), Vb (Part-ML), Vc (Part-CAMO) and Vd (Part-CAO). It contains no amendment to Annex II (Part-145). Points of those annexes that Part-145 refers to may have changed; they are external references here.',
      url: 'https://eur-lex.europa.eu/eli/reg_impl/2026/100/oj',
    },
    {
      act: 'ED Decisions 2026/002/R and 2026/005/R — AMC & GM to Part-M, Issue 2, Amendments 9 and 10',
      finding: 'Neither amends the AMC or GM to Appendix II to Part-M (EASA Form 1), the only Part-M material reproduced in this dataset.',
      url: 'https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2026005r',
    },
  ],
  scope: [
    'Only Annex II (Part-145) is reproduced. The articles of Regulation (EU) No 1321/2014 itself, which Regulations (EU) 2025/111 and 2026/100 also amend, are outside the dataset.',
    'The amended wording was applied by this application, not by EASA. When EASA publishes the next Easy Access Rules revision, ingest it and remove the amendments it incorporates.',
  ],
}
