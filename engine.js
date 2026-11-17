/* Capable — calculation, eligibility and storage engine.
 *
 * Pure functions only: no DOM, no globals except the rules passed in. That is
 * what lets the same code run in the page, in Node tests, and in the iOS app,
 * and what keeps the standard screens, Easy Read and the spoken summary from
 * ever disagreeing — they all format the one `facts` object built here.
 *
 * Money is held in integer cents throughout. Floats appear only when reading
 * a rules figure, and are converted to cents immediately with toCents().
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./rules.js"));
  else root.CapableEngine = factory(root.CapableRules);
}(typeof self !== "undefined" ? self : this, function (RULES) {
  "use strict";

  /* ============================== MONEY ============================== */

  function toCents(dollars) {
    // Round from a fixed-point string so float error like 0.29 * 100 = 28.999999999999996 cannot leak in.
    return Math.round(Number(Number(dollars).toFixed(2)) * 100);
  }

  /* Half a cent rounds up. Applied to non-negative integers only. */
  function halfCentsUp(numerator, denominator) {
    return Math.floor((numerator * 2 + denominator) / (denominator * 2));
  }

  const MONEY_MAX_CENTS = 2000000; // $20,000 a fortnight — beyond that it is almost certainly a typo

  /* Parses what a person types into a money field. Never guesses. */
  function parseMoney(raw, opts) {
    const max = (opts && opts.maxCents) || MONEY_MAX_CENTS;
    if (raw === null || raw === undefined) return { ok: false, code: "missing", error: "Enter an amount in dollars, like 390. If it was nothing, enter 0." };
    const s = String(raw).trim().replace(/^\$\s*/, "").replace(/,(?=\d{3}(\D|$))/g, "");
    if (s === "") return { ok: false, code: "missing", error: "Enter an amount in dollars, like 390. If it was nothing, enter 0." };
    if (/^-/.test(s)) return { ok: false, code: "negative", error: "The amount cannot be below zero. If it was nothing, enter 0." };
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, code: "format", error: "Enter numbers only, like 390 or 390.50 — no letters, spaces or symbols, and no more than 2 decimal places." };
    const parts = s.split(".");
    const cents = Number(parts[0]) * 100 + (parts[1] ? Number((parts[1] + "0").slice(0, 2)) : 0);
    if (!Number.isSafeInteger(cents)) return { ok: false, code: "format", error: "That number is too long. Enter the amount in dollars, like 390." };
    if (cents > max) return { ok: false, code: "too-large", error: "That is more than " + formatMoney(max) + ", which is higher than this calculator handles. Check the amount is for one fortnight." };
    return { ok: true, cents: cents };
  }

  function formatMoney(cents, opts) {
    const whole = opts && opts.whole;
    const neg = cents < 0;
    let c = Math.abs(cents);
    if (whole) c = Math.round(c / 100) * 100;
    const dollars = Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const rest = String(c % 100).padStart(2, "0");
    return (neg ? "-" : "") + "$" + dollars + (whole ? "" : "." + rest);
  }

  /* For speech: "1,237 dollars and 70 cents". */
  function spokenMoney(cents) {
    const d = Math.floor(Math.abs(cents) / 100), c = Math.abs(cents) % 100;
    const ds = d.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (cents < 0 ? "minus " : "") + ds + (d === 1 ? " dollar" : " dollars") + (c ? " and " + c + (c === 1 ? " cent" : " cents") : "");
  }

  /* ============================== DSP ============================== */

  /* The only circumstance this calculator supports. Every question below is
     required; an unanswered one stops the calculation rather than being
     assumed in the person's favour. */
  const DSP_QUESTIONS = [
    { key: "relationship", supported: "single", label: "Are you single or partnered?",
      options: [["single", "Single"], ["partnered", "Partnered (married, de facto or registered)"]],
      unsupported: { text: "This calculator only works out the single rate. For couples, your combined income is tested and each partner's payment reduces at 25 cents in the dollar, plus other rules this app does not model.", url: "https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment" } },
    { key: "age21", supported: "yes", label: "Are you aged 21 or over?",
      options: [["yes", "Yes, 21 or over"], ["no", "No, under 21"]],
      unsupported: { text: "Under-21 DSP rates are different and are not modelled here.", url: "https://www.servicesaustralia.gov.au/payment-rates-for-disability-support-pension" } },
    { key: "children", supported: "no", label: "Do you have dependent children?",
      options: [["no", "No"], ["yes", "Yes"]],
      unsupported: { text: "Dependent children raise the income free area, which this calculator does not model.", url: "https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment" } },
    { key: "blind", supported: "no", label: "Are you permanently blind (for DSP purposes)?",
      options: [["no", "No"], ["yes", "Yes"]],
      unsupported: { text: "Permanently blind DSP recipients are usually not income tested, so this estimate would be wrong for you.", url: "https://www.servicesaustralia.gov.au/what-your-commitments-are-for-disability-support-pension-dsp" } },
    { key: "rentAssistance", supported: "no", label: "Do you get Rent Assistance with your DSP?",
      options: [["no", "No"], ["yes", "Yes"]],
      unsupported: { text: "Rent Assistance changes the maximum rate and the cut-off point, which this calculator does not model.", url: "https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment" } },
    { key: "otherIncome", supported: "no", label: "Apart from wages from a job, do you have any other income? (For example investments, a business, or a super pension.)",
      options: [["no", "No, only wages"], ["yes", "Yes"]],
      unsupported: { text: "Other income — and the deeming rules for savings and investments — are not modelled here.", url: "https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment" } },
    { key: "transitional", supported: "no", label: "Does a Centrelink letter say you are paid the 'transitional rate'?",
      options: [["no", "No"], ["unsure", "I'm not sure"], ["yes", "Yes"]],
      unsupported: { text: "The transitional rate uses a different reduction (40 cents in the dollar) and is not modelled here.", url: "https://www.servicesaustralia.gov.au/income-test-for-disability-support-payment" } },
    { key: "agePensionAge", supported: "no", label: "Have you reached Age Pension age?",
      options: [["no", "No"], ["unsure", "I'm not sure"], ["yes", "Yes"]],
      unsupported: { text: "At Age Pension age, Work Bonus can reduce the wages that are counted. Capable does not calculate Work Bonus, so its estimate would be too low.", url: RULES.dsp.workBonus.source } },
    { key: "workingCredit", supported: "no", label: "Is a Working Credit balance being used to reduce the income Services Australia counts for you? (Your Centrelink letters or income statement in myGov would show this.)",
      options: [["no", "No"], ["unsure", "I'm not sure"], ["yes", "Yes"]],
      unsupported: { text: "A Working Credit balance changes the income that is counted. Capable does not calculate Working Credit.", url: RULES.dsp.workingCredit.source } },
    { key: "assetsReduced", supported: "no", label: "Has Services Australia said your DSP is reduced because of the assets test?",
      options: [["no", "No"], ["unsure", "I'm not sure"], ["yes", "Yes"]],
      unsupported: { text: "When the assets test gives a lower rate, that lower rate is paid. Capable only estimates the income test, so it would show too much.", url: RULES.dsp.assetsTest.source } }
  ];

  /* answers: { relationship, age21, children, blind, rentAssistance, otherIncome, transitional, wages (string as typed) } */
  function estimateDsp(answers) {
    const a = answers || {};
    const r = RULES.dsp;
    const out = { status: null, missing: [], unsupported: [], unsure: [], caveats: [], wagesError: null };

    DSP_QUESTIONS.forEach(function (q) {
      const v = a[q.key];
      const valid = q.options.some(function (o) { return o[0] === v; });
      if (!valid) { out.missing.push(q.key); return; }
      // "Not sure" is never treated as the supported answer: the ordinary
      // estimate might not be this person's payment, so none is shown.
      if (v === "unsure") { out.unsure.push(q.key); return; }
      if (v !== q.supported) out.unsupported.push({ key: q.key, text: q.unsupported.text, url: q.unsupported.url });
    });

    const parsed = parseMoney(a.wages);
    if (!parsed.ok) { out.wagesError = parsed.error; if (parsed.code === "missing") out.missing.push("wages"); }

    if (!RULES.isReliable(r.maxRateSingle21) || !RULES.isReliable(r.incomeFreeAreaSingle) || !RULES.isReliable(r.taperSingle) || !RULES.isReliable(r.grossIncome)) {
      out.status = "unverified-rules";
      return out;
    }
    if (out.unsupported.length) { out.status = "unsupported"; return out; }
    if (out.unsure.length) { out.status = "uncertain"; return out; }
    if (out.missing.length) { out.status = "incomplete"; return out; }
    if (out.wagesError) { out.status = "invalid"; return out; }

    const wages = parsed.cents;
    const maxRate = toCents(r.maxRateSingle21.amount);
    const freeArea = toCents(r.incomeFreeAreaSingle.amount);
    // Taper as an exact fraction of cents: 0.50 -> 50/100.
    const taperNum = Math.round(r.taperSingle.amount * 100);
    const over = Math.max(0, wages - freeArea);
    const reduction = halfCentsUp(over * taperNum, 100);
    const payment = Math.max(0, maxRate - reduction);

    Object.assign(out, {
      status: "ok",
      wagesCents: wages,
      maxRateCents: maxRate,
      freeAreaCents: freeArea,
      taper: r.taperSingle.amount,
      overCents: over,
      reductionCents: reduction,
      paymentCents: payment,
      totalCents: wages + payment,
      paymentStops: payment === 0,
      belowFreeArea: wages <= freeArea,
      headroomCents: Math.max(0, freeArea - wages),
      // Compared with earning nothing: what working adds, after the income test only.
      vsNoWagesCents: (wages + payment) - maxRate,
      annualIfUnchangedCents: (wages + payment) * 26,
      thirtyHourNote: r.thirtyHourRule
    });
    return out;
  }

  /* ============================== CONCESSIONS ============================== */

  const CARD_OPTIONS = [
    ["pcc", "Pensioner Concession Card"],
    ["hcc", "Health Care Card"],
    ["seniors", "Queensland Seniors Card"],
    ["gold", "DVA Veteran Gold Card"]
  ];

  /* Each question is yes / no / unsure. Missing or unsure never counts as yes. */
  const CONCESSION_QUESTIONS = [
    { key: "qldResident", label: "Do you live in Queensland?" },
    { key: "elecAccount", label: "Is the electricity account for the home you live in (your main home) in your name?" },
    { key: "gasAccount", label: "Is your home connected to mains natural gas, with the gas account in your name?" },
    { key: "medicalCondition", label: "Do you (or a child you are legal guardian of) have a medical condition that means you need cooling or heating to stop symptoms getting much worse — and will a medical specialist certify it?" },
    { key: "acOrHeating", label: "Does your main home have an air-conditioner or heater?" },
    { key: "paysElecBill", label: "Are you financially responsible for paying the electricity bill?" },
    { key: "ownerOrLifeTenant", label: "Do you own your main home, or hold a life tenancy created by a will or court order?" },
    { key: "ratesLiable", label: "Are you legally responsible for paying the council rates on it?" },
    { key: "seqWaterGrid", label: "Is the home in the South East Queensland Water Grid area?" },
    { key: "attendantCare", label: "Because of disability, do you need a support person with you at most community venues or activities — for life, or likely for life?" }
  ];

  /* Criteria per scheme. `cards` lists which cards satisfy the card rule. */
  const SCHEME_CRITERIA = {
    electricity: { cards: ["pcc", "hcc", "seniors", "gold"], need: ["qldResident", "elecAccount"] },
    gas:         { cards: ["pcc", "seniors", "gold"],        need: ["qldResident", "gasAccount"] },
    medical:     { cards: ["pcc", "hcc"],                    need: ["qldResident", "medicalCondition", "acOrHeating", "paysElecBill"] },
    rates:       { cards: ["pcc", "gold"],                   need: ["qldResident", "ownerOrLifeTenant", "ratesLiable"] },
    water:       { cards: ["pcc", "gold"],                   need: ["qldResident", "ownerOrLifeTenant", "ratesLiable", "seqWaterGrid"] },
    companion:   { cards: null,                              need: ["qldResident", "attendantCare"] }
  };

  const YNU = ["yes", "no", "unsure"];

  /* cards answer: { answered: bool, held: [ids], none: bool, unsure: bool } */
  function cardCheck(cardsAnswer, accepted) {
    const c = cardsAnswer || {};
    const held = Array.isArray(c.held) ? c.held : [];
    if (held.some(function (h) { return accepted.indexOf(h) > -1; })) return "pass";
    if (!c.answered || c.unsure) return "missing";
    return "fail";
  }

  const STATE = { POTENTIAL: "potential", MORE_INFO: "more-info", NOT_ELIGIBLE: "not-eligible" };

  function assessScheme(scheme, answers) {
    const a = answers || {};
    const crit = SCHEME_CRITERIA[scheme.id];
    const failed = [], missing = [];
    if (crit.cards) {
      const r = cardCheck(a.cards, crit.cards);
      if (r === "fail") failed.push("cards"); else if (r === "missing") missing.push("cards");
    }
    crit.need.forEach(function (k) {
      const v = a[k];
      if (v === "no") failed.push(k);
      else if (v !== "yes") missing.push(k);   // unanswered, "unsure" or garbage
    });
    let state;
    if (failed.length) state = STATE.NOT_ELIGIBLE;
    else if (missing.length) state = STATE.MORE_INFO;
    else state = STATE.POTENTIAL;
    return {
      id: scheme.id, scheme: scheme, state: state, failed: failed, missing: missing,
      reliableAmount: RULES.isReliable(scheme) && typeof scheme.amount === "number",
      provisional: scheme.status === "excerpt"
    };
  }

  function assessConcessions(answers) {
    const results = RULES.concessions.map(function (s) { return assessScheme(s, answers); });
    const by = function (st) { return results.filter(function (r) { return r.state === st; }); };
    return {
      results: results,
      potential: by(STATE.POTENTIAL),
      moreInfo: by(STATE.MORE_INFO),
      notEligible: by(STATE.NOT_ELIGIBLE),
      // Cash-type and non-cash are kept apart; nothing here is a guaranteed total.
      potentialCash: by(STATE.POTENTIAL).filter(function (r) { return r.scheme.kind !== "non-cash"; }),
      potentialNonCash: by(STATE.POTENTIAL).filter(function (r) { return r.scheme.kind === "non-cash"; })
    };
  }

  /* ============================== NDIS ============================== */

  /* Plan figures are support funding, not income. Nothing here is ever added
     to wages or pension. Amounts are cents. */
  function planTotals(plan) {
    let allocated = 0, spent = 0, flexibleLeft = 0, statedLeft = 0;
    (plan && plan.budgets || []).forEach(function (b) {
      b.categories.forEach(function (c) {
        allocated += c.allocatedCents; spent += c.spentCents;
        const left = c.allocatedCents - c.spentCents;
        if (c.stated) statedLeft += left; else flexibleLeft += left;
      });
    });
    return { allocatedCents: allocated, spentCents: spent, flexibleLeftCents: flexibleLeft, statedLeftCents: statedLeft, leftCents: flexibleLeft + statedLeft };
  }

  function categoryStats(cat, planStart, planEnd, today) {
    const DAY = 86400000;
    const total = Math.round((planEnd - planStart) / DAY) + 1;
    const elapsed = Math.min(total, Math.max(1, Math.round((today - planStart) / DAY)));
    const daysLeft = total - elapsed;
    const left = cat.allocatedCents - cat.spentCents;
    const perDay = cat.spentCents / elapsed;
    const daysOfMoney = perDay > 0 ? left / perDay : Infinity;
    const runsOutEarly = isFinite(daysOfMoney) && daysOfMoney < daysLeft;
    const shortfallDays = runsOutEarly ? Math.round(daysLeft - daysOfMoney) : 0;
    return {
      leftCents: left,
      usedPct: cat.allocatedCents > 0 ? cat.spentCents / cat.allocatedCents : 0,
      perFortnightCents: Math.round(perDay * 14),
      runsOutDate: isFinite(daysOfMoney) ? new Date(today.getTime() + Math.floor(daysOfMoney) * DAY) : null,
      runsOutEarly: runsOutEarly, shortfallDays: shortfallDays,
      status: runsOutEarly ? (shortfallDays >= 60 ? "danger" : "warn") : "ok",
      daysTotal: total, daysElapsed: elapsed, daysLeft: daysLeft
    };
  }

  const NDIS_SCOPES = ["whole-plan", "current-period", "unknown"];

  /* A balance someone typed in themselves, with where it came from and when. */
  function validateManualNdis(input) {
    const i = input || {};
    const errors = {};
    let cents = null, asOf = null;
    if (i.balance !== undefined && String(i.balance).trim() !== "") {
      const p = parseMoney(i.balance, { maxCents: 100000000 });
      if (p.ok) cents = p.cents; else errors.balance = p.error;
    }
    if (i.asOf) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(i.asOf) && !isNaN(Date.parse(i.asOf + "T00:00:00Z"))) asOf = i.asOf;
      else errors.asOf = "Enter the date as day, month and year.";
    }
    const source = typeof i.source === "string" ? i.source.trim().slice(0, 80) : "";
    // What the balance covers. Not chosen = unknown; never assumed to be money available now.
    const scope = NDIS_SCOPES.indexOf(i.scope) > -1 ? i.scope : "unknown";
    if (cents !== null && !asOf) errors.asOf = "Add the date you checked this balance, so you know how current it is.";
    if (cents !== null && !source) errors.source = "Say where the balance came from, for example 'my NDIS app'.";
    return { ok: Object.keys(errors).length === 0, errors: errors, balanceCents: cents, asOf: asOf, source: source, scope: scope, verified: false };
  }

  /* ============================== JOB MATCHING ============================== */

  const NEED_KEYS = ["remote", "flexible_hours", "low_physical_demand", "quiet_environment", "public_transport_accessible"];

  function matchJob(job, capacity) {
    const selected = NEED_KEYS.filter(function (k) { return capacity.needs[k]; });
    const met = selected.filter(function (k) { return job.attrs[k]; });
    return {
      withinHours: job.hoursPerWeek <= capacity.hoursPerWeek,
      selectedCount: selected.length, metCount: met.length, metKeys: met,
      unmetKeys: selected.filter(function (k) { return !job.attrs[k]; }),
      meetsAll: selected.length > 0 && met.length === selected.length
    };
  }

  function jobFortnightCents(job) { return Math.round(job.hoursPerWeek * 2 * toCents(job.hourlyRate)); }

  function matchedJobs(jobs, capacity, strictOnly) {
    return jobs
      .map(function (job) { return { job: job, m: matchJob(job, capacity) }; })
      .filter(function (r) { return r.m.withinHours && (!strictOnly || r.m.meetsAll); })
      .sort(function (a, b) {
        if (b.m.metCount !== a.m.metCount) return b.m.metCount - a.m.metCount;
        return jobFortnightCents(b.job) - jobFortnightCents(a.job);
      });
  }

  /* ============================== STORAGE ==============================
     Only one record is personal: STORE_KEY. It is written ONLY when the person
     has chosen "save on this device". Preferences (Easy Read, intro seen,
     install tip dismissed) are separate keys and contain no personal details. */

  const STORE_KEY = "capable.v2";
  const LEGACY_KEY = "capable.session";
  const BACKUP_KEY = "capable.v2.unreadable";
  const PREF_KEYS = ["capable.easyread", "capable.onboarded", "capable.installTipDismissed", "capable.voiceHintDismissed"];
  const ALL_KEYS = [STORE_KEY, LEGACY_KEY, BACKUP_KEY].concat(PREF_KEYS);

  const VIEWS = ["dashboard", "jobs", "money", "claim"];
  const CLAIM_TABS = ["entitlements", "discounts", "cashbacks"];

  function blankPersonal() {
    return {
      dsp: { relationship: null, age21: null, children: null, blind: null, rentAssistance: null, otherIncome: null, transitional: null, wages: "" },
      concessions: { cards: { answered: false, held: [], none: false, unsure: false } },
      capacity: { hoursPerWeek: 16, needs: { remote: false, flexible_hours: false, low_physical_demand: false, quiet_environment: false, public_transport_accessible: false }, strictOnly: false },
      ndis: { balance: "", asOf: "", source: "", scope: "" }
    };
  }

  function pick(v, allowed) { return allowed.indexOf(v) > -1 ? v : null; }

  /* Keeps only fields that are the right shape. Anything else is dropped, not coerced. */
  function sanitizePersonal(p) {
    const out = blankPersonal();
    if (!p || typeof p !== "object") return out;
    if (p.dsp && typeof p.dsp === "object") {
      DSP_QUESTIONS.forEach(function (q) {
        out.dsp[q.key] = pick(p.dsp[q.key], q.options.map(function (o) { return o[0]; }));
      });
      if (typeof p.dsp.wages === "string" && p.dsp.wages.length <= 20) out.dsp.wages = p.dsp.wages;
    }
    if (p.concessions && typeof p.concessions === "object") {
      CONCESSION_QUESTIONS.forEach(function (q) { const v = pick(p.concessions[q.key], YNU); if (v) out.concessions[q.key] = v; });
      const c = p.concessions.cards;
      if (c && typeof c === "object") {
        out.concessions.cards = {
          answered: c.answered === true,
          held: Array.isArray(c.held) ? c.held.filter(function (h) { return CARD_OPTIONS.some(function (o) { return o[0] === h; }); }) : [],
          none: c.none === true, unsure: c.unsure === true
        };
      }
    }
    if (p.capacity && typeof p.capacity === "object") {
      const h = p.capacity.hoursPerWeek;
      if (typeof h === "number" && h >= 2 && h <= 38) out.capacity.hoursPerWeek = Math.round(h);
      if (p.capacity.needs && typeof p.capacity.needs === "object") {
        NEED_KEYS.forEach(function (k) { if (typeof p.capacity.needs[k] === "boolean") out.capacity.needs[k] = p.capacity.needs[k]; });
      }
      if (typeof p.capacity.strictOnly === "boolean") out.capacity.strictOnly = p.capacity.strictOnly;
    }
    if (p.ndis && typeof p.ndis === "object") {
      ["balance", "asOf", "source", "scope"].forEach(function (k) {
        if (typeof p.ndis[k] === "string" && p.ndis[k].length <= 80) out.ndis[k] = p.ndis[k];
      });
    }
    return out;
  }

  function sanitizeUi(u) {
    const o = { view: "dashboard", claimTab: "entitlements" };
    if (u && typeof u === "object") {
      o.view = pick(u.view, VIEWS) || o.view;
      o.claimTab = pick(u.claimTab, CLAIM_TABS) || o.claimTab;
    }
    return o;
  }

  function safeGet(storage, key) { try { return storage ? storage.getItem(key) : null; } catch (e) { return undefined; } }

  /* Reads everything Capable may have stored. Never throws, never deletes.
     A record it cannot read is moved aside (not destroyed) and reported. */
  function loadStore(storage) {
    const res = { status: "empty", record: null, legacy: null, movedAside: false };
    const raw = safeGet(storage, STORE_KEY);
    if (raw === undefined) { res.status = "unavailable"; return res; }
    if (raw) {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      if (parsed && typeof parsed === "object" && parsed.v === 2 && parsed.saveConsent === true) {
        res.status = "ok";
        res.record = {
          v: 2, saveConsent: true,
          mode: parsed.mode === "demo" ? "demo" : "personal",
          savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : null,
          personal: sanitizePersonal(parsed.personal),
          ui: sanitizeUi(parsed.ui)
        };
      } else {
        res.status = "corrupt";
        try { storage.setItem(BACKUP_KEY, raw); storage.removeItem(STORE_KEY); res.movedAside = true; } catch (e) { /* leave it */ }
      }
    }
    const legacyRaw = safeGet(storage, LEGACY_KEY);
    if (legacyRaw) {
      try {
        const l = JSON.parse(legacyRaw);
        if (l && typeof l === "object") {
          res.legacy = {
            hoursPerWeek: (typeof l.hoursPerWeek === "number" && l.hoursPerWeek >= 2 && l.hoursPerWeek <= 38) ? Math.round(l.hoursPerWeek) : null,
            needs: (l.needs && typeof l.needs === "object") ? NEED_KEYS.reduce(function (o, k) { o[k] = l.needs[k] === true; return o; }, {}) : null,
            strictOnly: l.strictOnly === true,
            wages: (typeof l.wagesInputValue === "string" && parseMoney(l.wagesInputValue).ok) ? l.wagesInputValue.trim() : null
          };
        }
      } catch (e) { res.legacy = { unreadable: true }; }
    }
    return res;
  }

  function saveStore(storage, record) {
    if (!record || record.saveConsent !== true) return { ok: false, reason: "no-consent" };
    try {
      storage.setItem(STORE_KEY, JSON.stringify({
        v: 2, saveConsent: true, mode: record.mode, savedAt: new Date().toISOString(),
        personal: sanitizePersonal(record.personal), ui: sanitizeUi(record.ui)
      }));
      return { ok: true };
    } catch (e) { return { ok: false, reason: "storage-error" }; }
  }

  /* Folds an old (v1) record into a personal session. Wages from v1 are
     carried across as typed, but they never answer the DSP questions. */
  function importLegacy(personal, legacy) {
    const p = sanitizePersonal(personal);
    if (!legacy || legacy.unreadable) return p;
    if (legacy.hoursPerWeek) p.capacity.hoursPerWeek = legacy.hoursPerWeek;
    if (legacy.needs) p.capacity.needs = legacy.needs;
    p.capacity.strictOnly = !!legacy.strictOnly;
    if (legacy.wages) p.dsp.wages = legacy.wages;
    return p;
  }

  function removeKeys(storage, keys) {
    const removed = [];
    keys.forEach(function (k) { try { if (storage.getItem(k) !== null) { storage.removeItem(k); removed.push(k); } } catch (e) { /* ignore */ } });
    return removed;
  }

  /* What is on this device right now, for the privacy panel. */
  function describeStored(storage) {
    return ALL_KEYS.map(function (k) { const v = safeGet(storage, k); return { key: k, present: v !== null && v !== undefined, bytes: v ? v.length : 0 }; });
  }

  /* ============================== SHARED FACTS ==============================
     One object per screen state. Standard, Easy Read and spoken output are all
     formatted from this, so they cannot drift apart. */
  function buildFacts(input) {
    const dsp = estimateDsp(input.dspAnswers);
    const conc = assessConcessions(input.concessionAnswers);
    const jobs = matchedJobs(input.jobs, input.capacity, input.capacity.strictOnly);
    let ndis = null;
    if (input.plan) {
      ndis = { kind: "plan", totals: planTotals(input.plan), source: input.plan.source, asOf: input.plan.asOf };
    } else if (input.manualNdis) {
      const v = validateManualNdis(input.manualNdis);
      if (v.balanceCents !== null) ndis = { kind: "manual", flexibleLeftCents: v.balanceCents, asOf: v.asOf, source: v.source, scope: v.scope, verified: false, valid: v.ok };
    }
    return { mode: input.mode, dsp: dsp, concessions: conc, jobs: jobs, ndis: ndis, hoursPerWeek: input.capacity.hoursPerWeek };
  }

  return {
    RULES: RULES,
    toCents: toCents, parseMoney: parseMoney, formatMoney: formatMoney, spokenMoney: spokenMoney, halfCentsUp: halfCentsUp,
    DSP_QUESTIONS: DSP_QUESTIONS, estimateDsp: estimateDsp,
    CARD_OPTIONS: CARD_OPTIONS, CONCESSION_QUESTIONS: CONCESSION_QUESTIONS, SCHEME_CRITERIA: SCHEME_CRITERIA,
    STATE: STATE, assessScheme: assessScheme, assessConcessions: assessConcessions,
    planTotals: planTotals, categoryStats: categoryStats, validateManualNdis: validateManualNdis, NDIS_SCOPES: NDIS_SCOPES,
    NEED_KEYS: NEED_KEYS, matchJob: matchJob, matchedJobs: matchedJobs, jobFortnightCents: jobFortnightCents,
    STORE_KEY: STORE_KEY, LEGACY_KEY: LEGACY_KEY, BACKUP_KEY: BACKUP_KEY, PREF_KEYS: PREF_KEYS, ALL_KEYS: ALL_KEYS,
    VIEWS: VIEWS, CLAIM_TABS: CLAIM_TABS,
    blankPersonal: blankPersonal, sanitizePersonal: sanitizePersonal, loadStore: loadStore, saveStore: saveStore,
    importLegacy: importLegacy, removeKeys: removeKeys, describeStored: describeStored,
    buildFacts: buildFacts
  };
}));
