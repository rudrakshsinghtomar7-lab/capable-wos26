# Government figures: sources and verification record

All figures live in [`rules.js`](../rules.js), the only place the app reads them from. Each entry records its **effective date** (when the figure took effect, according to the source) separately from its **checked date** (when it was confirmed), plus a **verification method** that says exactly how it was checked.

## Status meanings

| Status | Meaning | What the app does |
|---|---|---|
| `verified` | Read directly on the official page by Capable's own checking tools on the checked date. | Shown as a published figure. |
| `review-confirmed` | An independent reviewer read the full official page and confirmed the figure (reported to us on 14 Nov 2026, and for the reduction, cut-off and 30-hour rule on 15 Nov 2026). **Capable's own tools could not retrieve the page:** servicesaustralia.gov.au timed out on every attempt, on both 14 and 15 Nov 2026. We have not read these pages ourselves. | Shown as a published figure. The app says it was checked by independent review. |
| `excerpt` | Confirmed only from search-engine excerpts of the official page, 14 Nov 2026. The page itself couldn't be opened (Services Australia timed out; ndis.gov.au and the DSS Guide returned HTTP 403). | Shown with a "provisional, confirmed only from search excerpts" note. Rules in this state are never calculated: they are treated as unsupported. |
| `unverified` | Not confirmed. | Never shown as an amount someone may get. The DSP calculator refuses to run if any core figure is unverified. |

## Disability Support Pension (Services Australia)

| Rule | Amount | Effective from | Status | Source |
|---|---|---|---|---|
| **Maximum total fortnightly DSP, adult single (21+), no children, including supplements** | **$1,237.70/fn total** = basic $1,135.40 + Pension Supplement $88.20 + Energy Supplement $14.10. This is the total, not the basic rate. | 20 Sep 2026 | review-confirmed | [Payment rates for DSP](https://www.servicesaustralia.gov.au/payment-rates-for-disability-support-pension) |
| Income free area, single | $226.00/fn | 1 Jul 2026 (date from the July 2026 payment guide; the review confirmed the amount, not the date) | review-confirmed | [Income test for DSP](https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment) |
| **Employment income is gross income, before tax and deductions** | — | not stated | review-confirmed | [Employment income reporting](https://www.servicesaustralia.gov.au/employment-income-reporting) |
| Reduction, single (standard rules) | 50c per $1 above $226/fn | not stated | review-confirmed (15 Nov 2026) | [Income test for DSP](https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment?context=22276) |
| Cut-off point, single, 21+ | $2,701.40/fn, subject to the app's scope exclusions (no Rent Assistance, Work Bonus, transitional rate, couples, children or blindness) | 20 Sep 2026 (date from the indexation excerpts; the review confirmed the amount, not the date) | review-confirmed (15 Nov 2026) | [Income test for DSP](https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment?context=22276) |
| Income free area, couple combined (reference only) | $396.00/fn | 1 Jul 2026 | excerpt | Income test for DSP |
| Working 30+ hours a week | Ongoing work of 30+ hours a week may cause suspension (not cancellation) for up to 2 years. **Exceptions:** Australian Disability Enterprises, the Supported Wage System, ongoing Inclusive Employment Australia support. | not stated | review-confirmed (15 Nov 2026) | [Working while you get DSP](https://www.servicesaustralia.gov.au/working-while-you-get-disability-support-pension-dsp?context=22276) |
| Working 30+ hours: card and reporting | Pensioner Concession Card kept for up to 2 years during suspension; tell Services Australia within 14 days | not stated | excerpt (not covered by the 15 Nov review; the app labels these as provisional) | Working while you get DSP |

How the review-confirmed figures were checked:

1. Search-engine excerpts of the official pages, cross-checked against the DSS "Social Security Payment Parameters, 20 September 2026 indexation" excerpt (our tools, 14 Nov 2026).
2. Internal consistency: 226.00 + 1,237.70 ÷ 0.50 = 2,701.40, which matches the published single cut-off.
3. The independent reviewer's reading of the full pages, reported 14 Nov 2026 (maximum rate, free area, gross income).
4. **15 Nov 2026:** the independent reviewer directly read the full official pages again ([Income test](https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment?context=22276), [Working while you get DSP](https://www.servicesaustralia.gov.au/working-while-you-get-disability-support-pension-dsp?context=22276)) and confirmed the 50c reduction above $226/fn, the $2,701.40/fn single 21+ cut-off, and the 30-hour suspension rule with its three exceptions. Capable's own tools still could not retrieve servicesaustralia.gov.au (timed out on 14 and 15 Nov 2026); we have not read these pages ourselves.

### Rules the calculator does NOT model

Each one has a required question. A "yes" answer makes the situation unsupported. **"Not sure" stops the estimate:** no ordinary figure is shown, because it might not be that person's payment.

| Rule | What the excerpts say | Why not modelled | Question asked |
|---|---|---|---|
| **Work Bonus** | Applies to DSP recipients who have reached Age Pension age, whose rate is worked out under the income test, and who are not on the transitional rate. It reduces the employment income counted. | Credit amounts and balance caps were seen only in excerpts with different dates. | "Have you reached Age Pension age?" |
| **Working Credit** | A balance can reduce the income counted for DSP recipients under Age Pension age, and affects qualification when work starts (DSS Social Security Guide 3.1.11.30, 3.6.1.100). | How a balance accrues and is used was not verified. | "Is a Working Credit balance being used to reduce the income Services Australia counts for you?" |
| **Assets test** | DSP is paid at the lower of the income-test and assets-test rates. | Asset limits are not modelled. An income-test estimate would overstate a payment reduced by assets. | "Has Services Australia said your DSP is reduced because of the assets test?" |
| Transitional rate | 40c reduction per $1 | Not modelled. | "Does a Centrelink letter say you are paid the transitional rate?" (*not sure* now also stops the estimate) |

Status: excerpt, from the [Working while you get DSP](https://www.servicesaustralia.gov.au/working-while-you-get-disability-support-pension-dsp?context=22276) page, Services Australia procedure 108-07010130, and the DSS Social Security Guide. None of these could be opened directly.

### Hand-worked check of the supported scenario

| Step | Amount |
|---|---|
| Gross wages for the fortnight | $390.00 |
| Income free area | − $226.00 |
| Wages above the free area | $164.00 |
| Reduction at 50c per $1 | $82.00 |
| Maximum total DSP (incl. supplements) − reduction | $1,237.70 − $82.00 = **$1,155.70** |
| Gross wages + DSP | $390.00 + $1,155.70 = **$1,545.70** |

`test/unit/engine.test.js` asserts these exact numbers. A separate BigInt oracle re-derives other amounts from `rules.js`.

## Queensland concessions (qld.gov.au)

All rows except the Companion Card were read directly by our tools on 14 Nov 2026. The electricity, gas and medical cooling/heating amounts were also confirmed by the independent review.

| Scheme | Amount | Kind | Effective from | Page last updated | Status |
|---|---|---|---|---|---|
| [Electricity Rebate](https://www.qld.gov.au/community/cost-of-living-support/concessions/energy-concessions/electricity-gas-rebates) | $399.47/yr incl. GST | bill rebate | not stated | 10 Jul 2026 | verified |
| [Reticulated Natural Gas Rebate](https://www.qld.gov.au/community/cost-of-living-support/concessions/energy-concessions/electricity-gas-rebates) | $96.45/yr incl. GST | bill rebate | not stated | 10 Jul 2026 | verified |
| [Medical Cooling and Heating Electricity Concession Scheme](https://www.qld.gov.au/community/cost-of-living-support/concessions/medical-concessions/medical-cooling-heating-electricity-concession-scheme) | $522.09/yr incl. GST, paid pro-rata quarterly to a bank account | payment | 1 Jul 2026 | 24 Jun 2025 (reviewed 24 Mar 2026) | verified |
| [Pensioner Rate Subsidy](https://www.qld.gov.au/community/cost-of-living-support/concessions/property-concessions/rates-subsidy) | 20% of gross council rates, max $200/yr | subsidy | not stated | 9 Aug 2019 | verified |
| [Pensioner water subsidy (SEQ Water Grid)](https://www.qld.gov.au/community/cost-of-living-support/concessions/property-concessions/water-subsidy) | up to $120/yr | subsidy | not stated | 14 Jun 2017 | verified |
| [Companion Card](https://www.qld.gov.au/disability/out-and-about/subsidies-concessions-passes/companion-card/apply-companion-card) | — (free companion ticket) | non-cash | — | — | excerpt |

Limitations:

- The rates and water pages are old (2019 and 2017).
- The gas page states the account-holder rule using only the word "electricity".
- The medical conditions list is on the application form, which wasn't reviewed.

## NDIS

| Rule | Status | Source |
|---|---|---|
| Funding pays for reasonable and necessary supports in the plan. It is not income and doesn't cover day-to-day living costs. Flexible vs stated supports. | excerpt | [What are NDIS supports](https://www.ndis.gov.au/participants/using-your-funding/understanding-your-ndis-funding/what-are-ndis-supports) |
| **Funding periods**: newer plans release each funding component in periods, usually 3 months. The total doesn't change. When a period runs out, nothing more can be used until the next. Unused funding rolls over within the same plan, not into a new plan. Older plans that continue unchanged may not have periods. Shorter periods apply from 19 May 2025 for new or reassessed plans. | excerpt (ndis.gov.au returned 403) | [What is NDIS funding](https://www.ndis.gov.au/participants/using-your-funding/understanding-your-ndis-funding/what-ndis-funding); news item "Changes to NDIS funding periods" |

How the app applies this:

- A balance you enter manually must state what it covers: the **whole plan**, the **current funding period**, or **not sure** (the default when nothing is chosen).
- That balance is always labelled "entered by you, not checked by Capable, may not all be available to use right now".
- The demo plan is labelled as whole-plan totals.

## Phone numbers

| Line | Number | Status |
|---|---|---|
| Services Australia, Disability, Sickness and Carers | 13 27 17 | review-confirmed (not retrieved by our tools) |
| NDIA | 1800 800 110 | review-confirmed (not retrieved by our tools) |
| 13 QGOV | 13 74 68 | excerpt |

## To re-verify

1. Open each source link in a normal browser.
2. In `rules.js`, update `amount`, `effectiveFrom`, `verifiedOn`, `status` and `verificationMethod` together. Use `verified` only when you read the page yourself.
3. Run `npm test`.
4. Bump `CACHE` in `sw.js`.
