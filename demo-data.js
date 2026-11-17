/* Capable — demonstration and sample data. ALL OF IT IS MADE UP.
 *
 * - DEMO_PROFILE is the fictional "Sam Whitton". It is used ONLY in "Try the
 *   demo" mode and is never copied into a personal session.
 * - SAMPLE_JOBS are illustrative roles at fictional employers. They are not
 *   vacancies and are not open for application. They are shown in both modes,
 *   always labelled "Sample".
 * - REVIEWS and OFFERS are fictional. No business here is a partner.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CapableDemo = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DEMO_PROFILE = {
    name: "Sam Whitton",
    firstName: "Sam",
    initials: "SW",
    place: "Woolloongabba, Brisbane QLD (fictional person)",
    chips: ["Disability Support Pension", "Pensioner Concession Card", "Self-managed NDIS plan"],
    hoursNow: 6, hourlyNow: 32.50,
    dsp: { relationship: "single", age21: "yes", children: "no", blind: "no", rentAssistance: "no", otherIncome: "no", transitional: "no", agePensionAge: "no", workingCredit: "no", assetsReduced: "no", wages: "390.00" },
    concessions: {
      cards: { answered: true, held: ["pcc"], none: false, unsure: false },
      qldResident: "yes", elecAccount: "yes", gasAccount: "no",
      medicalCondition: "unsure", acOrHeating: "yes", paysElecBill: "yes",
      ownerOrLifeTenant: "no", ratesLiable: "no", seqWaterGrid: "yes",
      attendantCare: "yes"
    },
    capacity: { hoursPerWeek: 16, strictOnly: false,
      needs: { remote: false, flexible_hours: true, low_physical_demand: true, quiet_environment: true, public_transport_accessible: true } },
    reportingAnchor: "2026-08-27",
    asOf: "2026-08-29"
  };

  /* NDIS plan — Core, Capacity Building, Capital kept separate. Cents. */
  const DEMO_PLAN = {
    source: "Demo figures (made up), entered manually",
    asOf: "2026-08-29",
    planStart: "2026-03-01",
    planEnd: "2027-02-28",
    budgets: [
      { id: "core", name: "Core supports", pillClass: "pill-core", pillLabel: "Core", flexible: true,
        note: "Funding can move between these categories, because none of them are stated supports.",
        categories: [
          { id: "daily", name: "Assistance with Daily Life", allocatedCents: 1820000, spentCents: 954000, stated: false },
          { id: "consum", name: "Consumables", allocatedCents: 160000, spentCents: 118000, stated: false },
          { id: "social", name: "Social and Community Participation", allocatedCents: 1240000, spentCents: 512000, stated: false },
          { id: "transport", name: "Transport", allocatedCents: 620000, spentCents: 486000, stated: false }
        ] },
      { id: "cb", name: "Capacity Building supports", pillClass: "pill-cb", pillLabel: "Capacity Building", flexible: true,
        note: "Separate from Core. It can move between the categories below, but never into Core.",
        categories: [
          { id: "employ", name: "Finding and Keeping a Job", allocatedCents: 640000, spentCents: 288000, stated: false },
          { id: "dls", name: "Improved Daily Living Skills", allocatedCents: 320000, spentCents: 176000, stated: false }
        ] },
      { id: "capital", name: "Capital supports", pillClass: "pill-capital", pillLabel: "Capital", flexible: false,
        note: "A stated support: it can only pay for the item named in the plan.",
        categories: [
          { id: "at", name: "Assistive Technology — power wheelchair repairs and replacement", allocatedCents: 745000, spentCents: 125000, stated: true,
            statedDetail: "Named in the plan as: power wheelchair maintenance, repair and replacement (quote required)." }
        ] }
    ],
    history: [
      { date: "2026-08-22", categoryId: "transport", description: "Accessible taxi — hydrotherapy", amountCents: 6430 },
      { date: "2026-08-20", categoryId: "daily", description: "Support worker, 4 hrs weekday", amountCents: 27120 },
      { date: "2026-08-18", categoryId: "consum", description: "Continence consumables, monthly order", amountCents: 9640 },
      { date: "2026-08-15", categoryId: "transport", description: "Accessible taxi — appointments x3", amountCents: 11890 },
      { date: "2026-08-13", categoryId: "social", description: "Community access support, Saturday", amountCents: 21260 },
      { date: "2026-08-11", categoryId: "employ", description: "Employment coach session", amountCents: 19399 },
      { date: "2026-08-08", categoryId: "daily", description: "Support worker, 4 hrs weekday", amountCents: 27120 },
      { date: "2026-08-04", categoryId: "dls", description: "Occupational therapy, daily living goals", amountCents: 19399 },
      { date: "2026-07-28", categoryId: "at", description: "Wheelchair repair — replacement castors", amountCents: 125000 }
    ]
  };

  /* Fictional employers. Not vacancies. */
  const SAMPLE_JOBS = [
    { id: "j1", title: "Library Customer Service Assistant", employer: "Northside Community Library (fictional)", suburb: "Brisbane north",
      hoursPerWeek: 12, hourlyRate: 38.40,
      attrs: { remote: false, flexible_hours: true, low_physical_demand: true, quiet_environment: true, public_transport_accessible: true },
      summary: "Helping people find books, joining new members, some shelving on a trolley." },
    { id: "j2", title: "Data Entry Officer", employer: "Riverside Health Records (fictional)", suburb: "Inner Brisbane",
      hoursPerWeek: 20, hourlyRate: 36.20,
      attrs: { remote: true, flexible_hours: true, low_physical_demand: true, quiet_environment: true, public_transport_accessible: true },
      summary: "Entering transport records. Fully seated. Set your own hours between 7am and 7pm." },
    { id: "j3", title: "Peer Support Worker", employer: "Open Door Peer Network (fictional)", suburb: "Brisbane south",
      hoursPerWeek: 8, hourlyRate: 41.80,
      attrs: { remote: false, flexible_hours: true, low_physical_demand: true, quiet_environment: false, public_transport_accessible: true },
      summary: "Lived experience role supporting people in a drop-in space. Busy and social." },
    { id: "j4", title: "Online Chat Support", employer: "Nexa Utilities (fictional)", suburb: "Work from home",
      hoursPerWeek: 15, hourlyRate: 34.50,
      attrs: { remote: true, flexible_hours: false, low_physical_demand: true, quiet_environment: true, public_transport_accessible: false },
      summary: "Answering customer questions by text chat only. No phone calls. Fixed 4-hour blocks." },
    { id: "j5", title: "Cafe All-Rounder", employer: "The Corner Grind (fictional)", suburb: "Brisbane west",
      hoursPerWeek: 25, hourlyRate: 29.60,
      attrs: { remote: false, flexible_hours: false, low_physical_demand: false, quiet_environment: false, public_transport_accessible: true },
      summary: "Coffee, dishes and table service in a fast, loud cafe. On your feet the whole shift." },
    { id: "j6", title: "Bookkeeping Assistant", employer: "Southside Accounting Co (fictional)", suburb: "Brisbane south",
      hoursPerWeek: 10, hourlyRate: 39.00,
      attrs: { remote: true, flexible_hours: true, low_physical_demand: true, quiet_environment: true, public_transport_accessible: true },
      summary: "Reconciling invoices. Two days from home, one short day in the office if you want it." },
    { id: "j7", title: "Warehouse Pick-Packer", employer: "Westgate Distribution (fictional)", suburb: "Industrial estate",
      hoursPerWeek: 38, hourlyRate: 31.20,
      attrs: { remote: false, flexible_hours: false, low_physical_demand: false, quiet_environment: false, public_transport_accessible: false },
      summary: "Full-time picking and packing. Lifting up to 15kg. No bus stop nearby." },
    { id: "j8", title: "Community Transport Driver", employer: "Neighbour Rides (fictional)", suburb: "Brisbane north",
      hoursPerWeek: 16, hourlyRate: 33.90,
      attrs: { remote: false, flexible_hours: true, low_physical_demand: false, quiet_environment: true, public_transport_accessible: true },
      summary: "Driving older people to appointments. Some help in and out of the vehicle." },
    { id: "j9", title: "Administration Officer, Records", employer: "Riverbank College (fictional)", suburb: "Brisbane west",
      hoursPerWeek: 22, hourlyRate: 37.75,
      attrs: { remote: false, flexible_hours: true, low_physical_demand: true, quiet_environment: true, public_transport_accessible: true },
      summary: "Filing and digitising records in a quiet office. Ferry stop at the door." },
    { id: "j10", title: "Retail Assistant", employer: "Eastside Newsagency (fictional)", suburb: "Brisbane east",
      hoursPerWeek: 18, hourlyRate: 30.10,
      attrs: { remote: false, flexible_hours: true, low_physical_demand: false, quiet_environment: false, public_transport_accessible: true },
      summary: "Serving customers, restocking, some standing and reaching." },
    { id: "j11", title: "Manual Test Analyst", employer: "Ardent Digital (fictional)", suburb: "Work from home",
      hoursPerWeek: 30, hourlyRate: 45.00,
      attrs: { remote: true, flexible_hours: true, low_physical_demand: true, quiet_environment: true, public_transport_accessible: false },
      summary: "Testing web apps against a script and writing up what broke. Fully remote." },
    { id: "j12", title: "Gardening and Grounds Assistant", employer: "Greenway Supported Living (fictional)", suburb: "Brisbane outer west",
      hoursPerWeek: 20, hourlyRate: 32.80,
      attrs: { remote: false, flexible_hours: true, low_physical_demand: false, quiet_environment: true, public_transport_accessible: false },
      summary: "Outdoor grounds work. Bending, kneeling, some machinery." }
  ];

  const REVIEWS = {
    j1: { rating: 4.6, count: 11, best: "Flexible hours", worst: "Busy at school pick-up time",
      quotes: [{ text: "They swapped my shifts around treatment without me having to explain myself twice.", who: "Casual, 2 years", tag: "Flexible hours" },
               { text: "There is a quiet back room you can use if the desk gets loud.", who: "Library assistant", tag: "Quiet environment" }] },
    j2: { rating: 4.8, count: 17, best: "Working from home", worst: "Onboarding week is in the office",
      quotes: [{ text: "Fully remote after the first week. My chair, my desk, my bathroom.", who: "Data officer, 3 years", tag: "Work from home" }] },
    j3: { rating: 4.4, count: 8, best: "They get it", worst: "Can be loud and emotionally heavy",
      quotes: [{ text: "Everyone here has lived experience. I did not have to educate my manager.", who: "Peer worker, 1 year", tag: "Understanding manager" }] },
    j4: { rating: 3.9, count: 6, best: "No phone calls", worst: "Fixed shift blocks, no swapping",
      quotes: [{ text: "Text chat only. As someone who cannot do phones, this was the whole reason I applied.", who: "Chat support", tag: "No phone calls" }] },
    j5: { rating: 2.6, count: 9, best: "Friendly team", worst: "On your feet the whole shift",
      quotes: [{ text: "No seat behind the counter. I lasted five weeks.", who: "Former all-rounder", tag: "Physical demand" }] },
    j6: { rating: 4.7, count: 5, best: "Genuinely flexible", worst: "Very small team",
      quotes: [{ text: "They care that the work is right, not when I did it.", who: "Bookkeeper, 4 years", tag: "Flexible hours" }] },
    j7: { rating: 2.1, count: 14, best: "Steady pay", worst: "Quotas, lifting, no transport",
      quotes: [{ text: "The pick rate does not move for anybody.", who: "Former picker", tag: "Physical demand" }] },
    j8: { rating: 4.1, count: 7, best: "Meaningful work", worst: "Some lifting",
      quotes: [{ text: "Rosters come out three weeks ahead, which makes planning appointments possible.", who: "Driver, 2 years", tag: "Predictable roster" }] },
    j9: { rating: 4.5, count: 12, best: "Quiet and calm", worst: "No natural light",
      quotes: [{ text: "Genuinely the quietest office I have worked in.", who: "Records officer", tag: "Quiet environment" }] },
    j10: { rating: 3.4, count: 10, best: "Good bus routes", worst: "Standing, and Christmas is relentless",
      quotes: [{ text: "They found me a stool after I asked. Took a while, but they did it.", who: "Retail assistant", tag: "Adjustments made" }] },
    j11: { rating: 4.9, count: 9, best: "Remote and flexible", worst: "Deadlines cluster at release time",
      quotes: [{ text: "Adjustments were sorted before I started, not after I begged.", who: "Test analyst, 2 years", tag: "Adjustments made" }] },
    j12: { rating: 3.2, count: 4, best: "Outdoors, good team", worst: "Kneeling, machinery, no transport",
      quotes: [{ text: "Good crew, but it is real physical work and the site is hard to get to.", who: "Grounds assistant", tag: "Physical demand" }] }
  };

  const OFFERS = {
    discounts: [
      { id: "d1", name: "Sunstate Pharmacy", offer: "15% off over-the-counter items", detail: "Show a concession card at the counter. Excludes prescriptions." },
      { id: "d2", name: "GreenLeaf Grocers", offer: "10% off every Tuesday", detail: "In store only, on shops over $30." },
      { id: "d3", name: "Riverbend Cinemas", offer: "$9 concession tickets", detail: "Any session. Companion Card accepted." }
    ],
    cashbacks: [
      { id: "c1", name: "Energy Compare AU", offer: "$60 back when you switch retailer", detail: "Paid 45 days after your first bill on the new plan." },
      { id: "c2", name: "CoverMate Insurance", offer: "$85 back on home contents cover", detail: "New policies only." },
      { id: "c3", name: "Telco Swap", offer: "$45 back on a new mobile plan", detail: "Paid as bill credit on your second invoice." }
    ]
  };

  return { DEMO_PROFILE: DEMO_PROFILE, DEMO_PLAN: DEMO_PLAN, SAMPLE_JOBS: SAMPLE_JOBS, REVIEWS: REVIEWS, OFFERS: OFFERS };
}));
