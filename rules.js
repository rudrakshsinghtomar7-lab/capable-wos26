/* Capable — government rules and figures. THE single source of truth.
 *
 * Every amount, threshold and eligibility condition the app shows, speaks or
 * calculates with comes from this file. Nothing else may hard-code a figure.
 *
 * Fields on each entry:
 *   amount / unit / kind  what the number is and whether it is a payment, a
 *                         bill rebate, a subsidy or a non-cash benefit
 *   conditions            plain-language eligibility conditions, as the source states them
 *   source                the official page the figure was checked against
 *   effectiveFrom         when the figure took effect, per the source (null = source does not say)
 *   verifiedOn            the date someone actually checked the source (NOT the effective date)
 *   verificationMethod    how the figure was checked, stated honestly
 *   status                "verified"   read directly on the official page by our own tools on verifiedOn
 *                         "review-confirmed"
 *                                      an independent reviewer read the full official page and
 *                                      confirmed it (reported to us on verifiedOn). Our own tools
 *                                      could not retrieve the page, so we did not read it ourselves.
 *                         "excerpt"    confirmed only from search-engine excerpts of the official
 *                                      page; the page itself could not be opened. Used, but shown
 *                                      as provisional with a "check this" note.
 *                         "unverified" not confirmed. The app must NOT present it as a figure
 *                                      someone is entitled to.
 *   limitation            anything the source does not establish
 *
 * To update after re-checking a source: change the figure, effectiveFrom,
 * verifiedOn and status together, then run `npm test` (the tests recompute
 * expected DSP amounts from these numbers independently).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CapableRules = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CHECKED = "2026-11-14";

  const SA_INCOME_TEST = "https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment";
  const SA_RATES = "https://www.servicesaustralia.gov.au/payment-rates-for-disability-support-pension";
  const SA_WORKING = "https://www.servicesaustralia.gov.au/working-while-you-get-disability-support-pension-dsp";
  const REVIEWED = "2026-11-14";
  const SA_REVIEW_METHOD =
    "Search-engine excerpts of the official page, cross-checked against the DSS 20 September 2026 rates list " +
    "excerpt (our tools, " + CHECKED + "); then the full official page was read by an independent reviewer, who " +
    "confirmed the figure (reported to us on " + REVIEWED + "). Our own tools could not retrieve the page (requests timed out).";
  const REVIEWED_2 = "2026-11-15";
  const SA_REVIEW_METHOD_2 =
    "Search-engine excerpts of the official page only (our tools, " + CHECKED + "); our own tools could not retrieve the page " +
    "(servicesaustralia.gov.au requests timed out on 14 and 15 Nov 2026). Then the independent reviewer directly read the full " +
    "official page (the ?context=22276 version) and confirmed it (reported to us on " + REVIEWED_2 + ").";
  const SA_EXCERPT_METHOD = "Search-engine excerpts of the official page only (our tools, " + CHECKED + "). Not covered by the independent review.";
  const SA_EXCERPT_NOTE =
    "servicesaustralia.gov.au could not be opened by our checking tools on " + CHECKED +
    " (requests timed out). The figure was confirmed from search-engine excerpts of the official page, " +
    "and cross-checked against the DSS 20 September 2026 rates list excerpt and the published cut-off point. " +
    "Open the source link to confirm before relying on it.";

  /* ---------------- Disability Support Pension ---------------- */
  const dsp = {
    maxRateSingle21: {
      name: "DSP maximum total fortnightly rate — adult single (21 or over), no children, including Pension Supplement and Energy Supplement",
      amount: 1237.70, unit: "AUD per fortnight, total including supplements (not the basic rate)", kind: "payment",
      parts: { basic: 1135.40, pensionSupplement: 88.20, energySupplement: 14.10 },
      conditions: ["Single", "Aged 21 or over", "No dependent children"],
      source: SA_RATES,
      effectiveFrom: "2026-09-20",
      verifiedOn: REVIEWED, status: "review-confirmed", verificationMethod: SA_REVIEW_METHOD,
      limitation: "This is the maximum TOTAL (basic rate $1,135.40 + Pension Supplement $88.20 + Energy Supplement $14.10), " +
        "not the basic rate. Rates are indexed every 20 March and 20 September."
    },
    incomeFreeAreaSingle: {
      name: "DSP income free area — single",
      amount: 226.00, unit: "AUD per fortnight (gross income)", kind: "threshold",
      conditions: ["Single"],
      source: SA_INCOME_TEST,
      effectiveFrom: "2026-07-01",
      verifiedOn: REVIEWED, status: "review-confirmed", verificationMethod: SA_REVIEW_METHOD,
      limitation: "Effective date taken from the July 2026 Services Australia payment guide (1 July indexation); " +
        "the review confirmed the amount, not this date."
    },
    taperSingle: {
      name: "DSP income test reduction — single (standard rules)",
      amount: 0.50, unit: "dollars of payment lost per dollar of income above the free area", kind: "rate",
      conditions: ["Single", "Not on the transitional rate"],
      source: SA_INCOME_TEST, effectiveFrom: null,
      verifiedOn: REVIEWED_2, status: "review-confirmed", verificationMethod: SA_REVIEW_METHOD_2,
      limitation: "Confirmed by the independent review only (50 cents per dollar above $226 a fortnight, standard single rules); " +
        "Capable's own tools have not read this page. The transitional rate (40 cents) is not modelled."
    },
    cutOffSingle: {
      name: "DSP income cut-off point — single, aged 21 or over",
      amount: 2701.40, unit: "AUD per fortnight", kind: "threshold",
      conditions: ["Single", "Aged 21 or over", "No Rent Assistance or Work Bonus"],
      source: SA_INCOME_TEST, effectiveFrom: "2026-09-20",
      verifiedOn: REVIEWED_2, status: "review-confirmed", verificationMethod: SA_REVIEW_METHOD_2,
      limitation: "Confirmed by the independent review as the published standard cut-off for a single person aged 21 or over, " +
        "subject to Capable's scope exclusions (no Rent Assistance, Work Bonus, transitional rate, couples, children or blindness). " +
        "Capable's own tools have not read this page. The effective date comes from the 20 September 2026 indexation excerpts; " +
        "the review confirmed the amount, not the date. Not used in the calculation — kept so tests can check the calculation " +
        "reproduces Services Australia's own published cut-off."
    },
    // Recorded for reference only. The calculator does NOT support couples.
    incomeFreeAreaCouple: {
      name: "DSP income free area — couple, combined (reference only, not calculated)",
      amount: 396.00, unit: "AUD per fortnight, combined", kind: "threshold",
      conditions: ["Partnered"], source: SA_INCOME_TEST, effectiveFrom: "2026-07-01",
      verifiedOn: CHECKED, status: "excerpt", verificationMethod: SA_EXCERPT_METHOD, limitation: SA_EXCERPT_NOTE
    },
    thirtyHourRule: {
      name: "Working 30 hours a week or more",
      amount: 30, unit: "hours a week, ongoing", kind: "rule",
      conditions: [
        "If you work 30 or more hours a week on an ongoing basis, DSP can be suspended for up to 2 years instead of cancelled.",
        "This does not apply if you work in an Australian Disability Enterprise, are paid under the Supported Wage System, " +
          "or get ongoing support from Inclusive Employment Australia."
      ],
      // Not covered by the 15 Nov 2026 review: still confirmed only from search excerpts.
      excerptConditions: [
        "You can keep your Pensioner Concession Card for up to 2 years during the suspension.",
        "You need to tell Services Australia within 14 days."
      ],
      exceptions: ["Australian Disability Enterprise", "Supported Wage System", "ongoing Inclusive Employment Australia support"],
      suspensionYears: 2,
      source: SA_WORKING, effectiveFrom: null,
      verifiedOn: REVIEWED_2, status: "review-confirmed", verificationMethod: SA_REVIEW_METHOD_2,
      limitation: "The independent review confirmed the 30-hour suspension for up to 2 years and the three exceptions. " +
        "The Pensioner Concession Card and 14-day reporting points were not part of that review and are still confirmed only " +
        "from search excerpts. Capable's own tools have not read this page."
    },
    grossIncome: {
      name: "Employment income is gross income — before tax and deductions",
      amount: null, unit: null, kind: "rule",
      conditions: ["Enter wages before tax and before any deductions (gross)."],
      source: "https://www.servicesaustralia.gov.au/employment-income-reporting",
      effectiveFrom: null, verifiedOn: REVIEWED, status: "review-confirmed",
      verificationMethod: "Independent reviewer read the full official page, which defines employment income as gross income " +
        "before tax and deductions (reported to us on " + REVIEWED + "). Our own tools could not retrieve the page (requests timed out).",
      limitation: "Confirmed by the independent review only; Capable's own tools have not read this page."
    },
    /* Rules that change the payment and are NOT modelled. Each has a required
       question; "yes" or "not sure" stops the estimate. */
    workBonus: {
      name: "Work Bonus (not modelled)",
      amount: null, unit: null, kind: "unsupported-rule",
      conditions: ["Applies to DSP recipients who have reached Age Pension age, whose rate is worked out under the income test, and who are not on the transitional rate. It reduces the employment income that is counted."],
      source: SA_WORKING, effectiveFrom: null, verifiedOn: CHECKED, status: "excerpt",
      verificationMethod: SA_EXCERPT_METHOD + " Supported by excerpts of Services Australia procedure 108-07010130.",
      limitation: "Credit amounts and balance caps were seen only in excerpts with differing dates, so Work Bonus is not calculated. Anyone of Age Pension age is treated as unsupported."
    },
    workingCredit: {
      name: "Working Credit (not modelled)",
      amount: null, unit: null, kind: "unsupported-rule",
      conditions: ["A Working Credit balance can reduce the income counted for DSP recipients under Age Pension age, and affects qualification when work starts."],
      source: SA_WORKING, effectiveFrom: null, verifiedOn: CHECKED, status: "excerpt",
      verificationMethod: SA_EXCERPT_METHOD + " Supported by excerpts of the DSS Social Security Guide (3.1.11.30, 3.6.1.100).",
      limitation: "How a balance accrues and is used was not verified, so it is not calculated. Anyone with a balance in use, or who is not sure, is treated as unsupported."
    },
    assetsTest: {
      name: "Assets test (not modelled)",
      amount: null, unit: null, kind: "unsupported-rule",
      conditions: ["DSP is paid at the lower of the income-test and assets-test rates. If the assets test gives the lower rate, an income-test estimate overstates the payment."],
      source: "https://www.servicesaustralia.gov.au/assets-test-for-disability-support-pension", effectiveFrom: null, verifiedOn: CHECKED, status: "excerpt",
      verificationMethod: SA_EXCERPT_METHOD,
      limitation: "Asset limits are not modelled. Anyone whose payment is reduced by the assets test, or who is not sure, is treated as unsupported."
    }
  };

  /* What the DSP estimate does NOT cover. Shown with every result. */
  const dspNotIncluded = [
    { text: "Whether you qualify for DSP at all — this only estimates the income test for someone already getting it.", url: "https://www.servicesaustralia.gov.au/disability-support-pension" },
    { text: "The assets test, which can reduce or stop the payment separately.", url: "https://www.servicesaustralia.gov.au/assets-test-for-disability-support-pension" },
    { text: "Work Bonus, Working Credit, Rent Assistance, other income, and income tax.", url: SA_WORKING },
    { text: "Your reporting obligations — you still report your income to Services Australia each fortnight.", url: "https://www.servicesaustralia.gov.au/what-your-commitments-are-for-disability-support-pension-dsp" },
    { text: "The 30-hour work rule, which affects your payment separately from income.", url: SA_WORKING }
  ];

  /* ---------------- Queensland concessions ---------------- */
  const QLD = "https://www.qld.gov.au/community/cost-of-living-support/concessions";
  const concessions = [
    {
      id: "electricity",
      name: "Queensland Electricity Rebate",
      amount: 399.47, unit: "AUD per year, GST inclusive", kind: "bill-rebate",
      paidAs: "Taken off your electricity bill by your retailer.",
      conditions: [
        "You hold a Pensioner Concession Card, a Health Care Card (not a Commonwealth Seniors Health Card or Foster Child Health Care Card), a Queensland Seniors Card, or a DVA Veteran Gold Card.",
        "You are the electricity account holder.",
        "The supply address is your principal place of residence.",
        "One rebate per household."
      ],
      howToApply: "Contact your electricity retailer.",
      source: QLD + "/energy-concessions/electricity-gas-rebates",
      effectiveFrom: null, verifiedOn: CHECKED, status: "verified",
      verificationMethod: "Read directly on qld.gov.au by our tools on " + CHECKED + "; amount also confirmed by the independent review (reported " + REVIEWED + ").",
      limitation: "The page does not state when this amount took effect (page last updated 10 July 2026)."
    },
    {
      id: "gas",
      name: "Reticulated Natural Gas Rebate",
      amount: 96.45, unit: "AUD per year, GST inclusive", kind: "bill-rebate",
      paidAs: "Taken off your mains gas bill by your retailer.",
      conditions: [
        "You hold a Pensioner Concession Card, a Queensland Seniors Card, or a DVA Veteran Gold Card (not a Health Care Card).",
        "Your home is connected to mains (reticulated) natural gas and you hold the gas account.",
        "It is your principal place of residence."
      ],
      howToApply: "Contact your gas retailer.",
      source: QLD + "/energy-concessions/electricity-gas-rebates",
      effectiveFrom: null, verifiedOn: CHECKED, status: "verified",
      verificationMethod: "Read directly on qld.gov.au by our tools on " + CHECKED + "; amount also confirmed by the independent review (reported " + REVIEWED + ").",
      limitation: "The page states the account-holder rule using the word 'electricity' only; applying it to gas is our reading. Effective date not stated."
    },
    {
      id: "medical",
      name: "Medical Cooling and Heating Electricity Concession Scheme",
      amount: 522.09, unit: "AUD per year, GST inclusive", kind: "payment",
      paidAs: "Paid into your bank account in pro-rata quarterly payments. Eligibility is reviewed every two years.",
      conditions: [
        "You live in Queensland, at your principal place of residence, which has an air-conditioning or heating unit.",
        "You (or a child you are legal guardian of) have a qualifying medical condition and need cooling or heating to stop symptoms getting significantly worse.",
        "A medical specialist completes the medical certification on the form.",
        "The applicant holds a Pensioner Concession Card or Health Care Card, and is financially responsible for paying the electricity bill."
      ],
      howToApply: "Post the application form, including the specialist's certification.",
      source: QLD + "/medical-concessions/medical-cooling-heating-electricity-concession-scheme",
      effectiveFrom: "2026-07-01", verifiedOn: CHECKED, status: "verified",
      verificationMethod: "Read directly on qld.gov.au by our tools on " + CHECKED + "; amount also confirmed by the independent review (reported " + REVIEWED + ").",
      limitation: "The qualifying conditions are listed on the application form, which was not reviewed. DVA Gold Card is not listed for this scheme."
    },
    {
      id: "rates",
      name: "Pensioner Rate Subsidy Scheme",
      amount: 200.00, unit: "AUD per year maximum (20% of gross council rates and charges)", kind: "subsidy",
      percent: 20,
      paidAs: "Taken off your council rates notice.",
      conditions: [
        "You hold a Pensioner Concession Card or a DVA Gold Card.",
        "You own the property, or are a life tenant (created only by a valid will or a Supreme or Family Court order).",
        "It is your principal place of residence, in Queensland.",
        "You are legally responsible for paying the council rates and charges on it."
      ],
      howToApply: "Contact your local council.",
      source: QLD + "/property-concessions/rates-subsidy",
      effectiveFrom: null, verifiedOn: CHECKED, status: "verified",
      verificationMethod: "Read directly on qld.gov.au by our tools on " + CHECKED + ". Not part of the independent review.",
      limitation: "The official page was last updated 9 August 2019. The $200 cap appears on that page but not on the property-concessions overview page. Your council may offer its own extra rebate, which is not included."
    },
    {
      id: "water",
      name: "Pensioner Water Subsidy (South East Queensland Water Grid)",
      amount: 120.00, unit: "AUD per year maximum", kind: "subsidy",
      paidAs: "Taken off your water access and usage charges.",
      conditions: [
        "The property is in the South East Queensland Water Grid area.",
        "You hold a Pensioner Concession Card or a DVA Gold Card.",
        "You own the property or are a life tenant, it is your principal place of residence, and you are legally responsible for its council rates and charges."
      ],
      howToApply: "Contact your water retailer.",
      source: QLD + "/property-concessions/water-subsidy",
      effectiveFrom: null, verifiedOn: CHECKED, status: "verified",
      verificationMethod: "Read directly on qld.gov.au by our tools on " + CHECKED + ". Not part of the independent review.",
      limitation: "The official page was last updated 14 June 2017. No equivalent pensioner water subsidy outside the SEQ Water Grid was found."
    },
    {
      id: "companion",
      name: "Companion Card",
      amount: null, unit: null, kind: "non-cash",
      paidAs: "Not money. Your companion gets a free ticket at participating venues and on public transport. Valid for 5 years.",
      conditions: [
        "You are a lawful Australian resident living in Queensland.",
        "Because of your disability, you cannot take part at most community venues or activities without attendant care support.",
        "You need, or are likely to need, that support for life.",
        "A health professional completes an assessment. Being eligible for the NDIS does not guarantee a Companion Card. It is not income tested."
      ],
      howToApply: "Apply online with a Digital ID, or by post, email or in person.",
      source: "https://www.qld.gov.au/disability/out-and-about/subsidies-concessions-passes/companion-card/apply-companion-card",
      effectiveFrom: null, verifiedOn: CHECKED, status: "excerpt",
      verificationMethod: "Search-engine excerpts of the qld.gov.au pages (our tools, " + CHECKED + ").",
      limitation: "Confirmed from search-engine excerpts of the qld.gov.au pages; the page was not opened directly."
    }
  ];

  /* ---------------- NDIS ---------------- */
  const ndis = {
    supports: {
      name: "What NDIS funding is for",
      conditions: [
        "NDIS funding pays for supports in your plan that are reasonable and necessary and related to your disability.",
        "It is not income and it does not pay for day-to-day living costs such as rent, groceries or utility bills.",
        "Flexible supports can be used across your budget in the way that suits you; stated supports can only be used for the support described in your plan."
      ],
      source: "https://www.ndis.gov.au/participants/using-your-funding/understanding-your-ndis-funding/what-are-ndis-supports",
      effectiveFrom: null, verifiedOn: CHECKED, status: "excerpt", verificationMethod: "Search-engine excerpts of ndis.gov.au pages (our tools, " + CHECKED + ").",
      limitation: "ndis.gov.au refused automated requests (HTTP 403). Wording confirmed from search-engine excerpts of ndis.gov.au pages ('What is reasonable and necessary', 'What is an NDIS plan')."
    }
  };

  ndis.fundingPeriods = {
    name: "NDIS funding periods",
    conditions: [
      "Newer plans release each funding component in funding periods, usually 3 months. The total in the plan does not change — only when it can be used.",
      "If a period's funding runs out, more cannot be used until the next period starts. Unused funding rolls over to the next period within the same plan, but not into a new plan.",
      "Older plans that continue unchanged may not have funding periods. Your plan document, the participant portal or the my NDIS app shows your periods."
    ],
    source: "https://www.ndis.gov.au/participants/using-your-funding/understanding-your-ndis-funding/what-ndis-funding",
    effectiveFrom: "2025-05-19", verifiedOn: CHECKED, status: "excerpt",
    verificationMethod: "Search-engine excerpts of ndis.gov.au 'What is NDIS funding' and the news item 'Changes to NDIS funding periods' (our tools, " + CHECKED + "). ndis.gov.au refused direct requests (HTTP 403).",
    limitation: "19 May 2025 is when shorter funding periods began for new or reassessed plans, per the excerpts."
  };

  const helpLines = {
    servicesAustralia: { name: "Services Australia — Disability, Sickness and Carers line", phone: "13 27 17", tel: "132717", status: "review-confirmed", verifiedOn: REVIEWED,
      verificationMethod: "Confirmed by an independent reviewer against the official page (reported " + REVIEWED + "); not retrieved by our tools." },
    ndia: { name: "National Disability Insurance Agency", phone: "1800 800 110", tel: "1800800110", status: "review-confirmed", verifiedOn: REVIEWED,
      verificationMethod: "Confirmed by an independent reviewer against the official page (reported " + REVIEWED + "); not retrieved by our tools." },
    qgov: { name: "Queensland Government (13 QGOV)", phone: "13 74 68", tel: "137468", status: "excerpt",
      limitation: "From search-engine excerpts of the Companion Card page." }
  };

  return {
    checkedOn: CHECKED,
    dsp: dsp,
    dspNotIncluded: dspNotIncluded,
    concessions: concessions,
    ndis: ndis,
    helpLines: helpLines,
    /* Is a figure safe to present as a number someone may receive? */
    isReliable: function (entry) { return !!entry && (entry.status === "verified" || entry.status === "review-confirmed" || entry.status === "excerpt"); }
  };
}));
