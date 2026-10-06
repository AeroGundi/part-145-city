/**
 * Known gaps between the ingested EASA export and the law as it stands.
 *
 * EDITORIAL, and deliberately conservative: each entry records only what an official
 * page states, with the date it was checked. The affected points are NOT listed
 * because they were not verified — read the amending act itself.
 * Remove an entry once an export that incorporates it has been ingested.
 */
export interface CurrencyGap { act: string; what: string; status: string; url: string; checked: string }

export const CURRENCY_GAPS: CurrencyGap[] = [
  {
    act: 'Commission Implementing Regulation (EU) 2025/111',
    what: 'Amends Regulation (EU) No 1321/2014, including Annex II (Part-145), as regards continuing airworthiness of electric- and hybrid-propulsion and other non-conventional aircraft.',
    status: 'Applicable from 13 February 2026. EASA states it is not incorporated in the September 2025 Easy Access Rules and will be in the next revision.',
    url: 'https://eur-lex.europa.eu/eli/reg_impl/2025/111/oj/eng',
    checked: '2026-10-06',
  },
  {
    act: 'ED Decision 2026/005/R',
    what: 'Issues AMC and GM to Part-145 — Issue 2, Amendment 9 (airworthiness review process; alignment with Regulation (EU) No 376/2014 on occurrence reporting). The dataset ends at Issue 2, Amendment 7, so Amendment 8 is missing as well.',
    status: 'Published by EASA in 2026; not in the ingested export.',
    url: 'https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2026005r',
    checked: '2026-10-06',
  },
]
