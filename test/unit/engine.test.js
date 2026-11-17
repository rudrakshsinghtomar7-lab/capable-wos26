"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../../engine.js");
const R = require("../../rules.js");
const D = require("../../demo-data.js");

/* ---------- independent oracle ----------
   Recomputes the expected DSP payment with BigInt arithmetic in tenths of a
   cent (no floats, no shared code with engine.js), from the rule figures. */
function dollarsToMills(str) { // "1237.70" -> 1237700n (tenths of a cent)
  const [d, c = ""] = String(str).split(".");
  return BigInt(d) * 1000n + BigInt((c + "000").slice(0, 3));
}
function oracle(wagesStr) {
  const max = dollarsToMills(R.dsp.maxRateSingle21.amount.toFixed(2));
  const free = dollarsToMills(R.dsp.incomeFreeAreaSingle.amount.toFixed(2));
  const w = dollarsToMills(wagesStr);
  const over = w > free ? w - free : 0n;
  const reductionMills = over / 2n;                            // exact: 0.5 per dollar (over is a multiple of 10 mills)
  const reductionCents = (reductionMills + 5n) / 10n;          // half a cent rounds up
  let pay = max / 10n - reductionCents;
  if (pay < 0n) pay = 0n;
  return { payment: Number(pay), total: Number(w / 10n + pay) };
}
const SUPPORTED = { relationship: "single", age21: "yes", children: "no", blind: "no", rentAssistance: "no", otherIncome: "no", transitional: "no",
  agePensionAge: "no", workingCredit: "no", assetsReduced: "no" };
const est = (wages, extra) => E.estimateDsp(Object.assign({}, SUPPORTED, extra || {}, { wages }));

test("rules: the taper this oracle assumes is the one in rules.js", () => {
  assert.equal(R.dsp.taperSingle.amount, 0.5);
});

test("DSP: just below, at and just above the income free area", () => {
  const free = R.dsp.incomeFreeAreaSingle.amount;
  for (const w of [(free - 0.01).toFixed(2), free.toFixed(2), (free + 0.01).toFixed(2), (free + 0.02).toFixed(2)]) {
    const r = est(w), o = oracle(w);
    assert.equal(r.status, "ok", w);
    assert.equal(r.paymentCents, o.payment, "payment at " + w);
    assert.equal(r.totalCents, o.total, "total at " + w);
  }
  assert.equal(est((free - 0.01).toFixed(2)).paymentCents, E.toCents(R.dsp.maxRateSingle21.amount));
  assert.equal(est(free.toFixed(2)).paymentCents, E.toCents(R.dsp.maxRateSingle21.amount));
  assert.equal(est(free.toFixed(2)).belowFreeArea, true);
  // 1 cent over: reduction is half a cent, which rounds up to 1 cent.
  assert.equal(est((free + 0.01).toFixed(2)).reductionCents, 1);
  assert.equal(est((free + 0.02).toFixed(2)).reductionCents, 1);
});

test("DSP: reproduces Services Australia's published single cut-off point", () => {
  const cut = R.dsp.cutOffSingle.amount; // 2701.40
  assert.equal(est(cut.toFixed(2)).paymentCents, 0);
  assert.equal(est(cut.toFixed(2)).paymentStops, true);
  assert.equal(est((cut - 0.02).toFixed(2)).paymentCents, 1);
  assert.ok(est((cut - 1).toFixed(2)).paymentCents > 0);
  assert.equal(est((cut + 100).toFixed(2)).paymentCents, 0, "never negative");
});

test("DSP: a spread of amounts matches the independent oracle", () => {
  for (const w of ["0", "0.01", "100", "225.99", "390.00", "390.5", "1000", "1234.57", "2000", "2701.38", "5000", "19999.99"]) {
    const r = est(w), o = oracle(String(Number(w).toFixed(2)));
    assert.equal(r.paymentCents, o.payment, w);
    assert.equal(r.totalCents, o.total, w);
    assert.equal(r.annualIfUnchangedCents, o.total * 26, w);
    assert.equal(r.vsNoWagesCents, o.total - E.toCents(R.dsp.maxRateSingle21.amount), w);
  }
});

test("DSP: demo figure — $390 wages", () => {
  const r = est("390.00");
  assert.equal(r.overCents, 16400);
  assert.equal(r.reductionCents, 8200);
  assert.equal(r.paymentCents, 123770 - 8200);
  assert.equal(E.formatMoney(r.paymentCents), "$1,155.70");
});

test("DSP: every unanswered question stops the calculation", () => {
  for (const k of Object.keys(SUPPORTED)) {
    const a = Object.assign({}, SUPPORTED, { wages: "390" });
    delete a[k];
    const r = E.estimateDsp(a);
    assert.equal(r.status, "incomplete", k);
    assert.ok(r.missing.includes(k));
    assert.equal(r.paymentCents, undefined, "no number for " + k);
  }
  assert.equal(E.estimateDsp(Object.assign({}, SUPPORTED)).status, "incomplete");
  assert.equal(E.estimateDsp({}).missing.length, Object.keys(SUPPORTED).length + 1);
});

test("DSP: unsupported circumstances give no number and a reason with a link", () => {
  const cases = { relationship: "partnered", age21: "no", children: "yes", blind: "yes", rentAssistance: "yes", otherIncome: "yes", transitional: "yes",
    agePensionAge: "yes", workingCredit: "yes", assetsReduced: "yes" };
  for (const [k, v] of Object.entries(cases)) {
    const r = est("390", { [k]: v });
    assert.equal(r.status, "unsupported", k);
    assert.equal(r.paymentCents, undefined, k);
    assert.equal(r.unsupported[0].key, k);
    assert.match(r.unsupported[0].url, /^https:\/\/www\.servicesaustralia\.gov\.au\//);
  }
  // Unsupported wins over missing — the person learns early it will not apply.
  assert.equal(E.estimateDsp({ relationship: "partnered" }).status, "unsupported");
});

test("DSP: any 'not sure' (transitional, Work Bonus age, Working Credit, assets test) gives no estimate", () => {
  for (const k of ["transitional", "agePensionAge", "workingCredit", "assetsReduced"]) {
    const r = est("390", { [k]: "unsure" });
    assert.equal(r.status, "uncertain", k);
    assert.deepEqual(r.unsure, [k]);
    assert.equal(r.paymentCents, undefined, "no ordinary estimate presented for " + k);
    assert.equal(r.totalCents, undefined);
  }
  // A definite unsupported answer still wins, so the person learns it will not apply.
  assert.equal(est("390", { assetsReduced: "unsure", workingCredit: "yes" }).status, "unsupported");
});

test("DSP: the supported standard scenario, worked by hand", () => {
  // Written out independently of rules.js and engine.js:
  //   gross wages 390.00; income free area 226.00; excess 164.00
  //   reduction 164.00 x 0.50 = 82.00
  //   maximum total single adult DSP (incl. supplements) 1,237.70 - 82.00 = 1,155.70
  //   gross wages + DSP = 390.00 + 1,155.70 = 1,545.70
  const r = est("390");
  assert.equal(r.status, "ok");
  assert.equal(r.wagesCents, 39000);
  assert.equal(r.freeAreaCents, 22600);
  assert.equal(r.overCents, 16400);
  assert.equal(r.reductionCents, 8200);
  assert.equal(r.paymentCents, 115570);
  assert.equal(r.totalCents, 154570);
  assert.equal(E.formatMoney(r.reductionCents), "$82.00");
  assert.equal(E.formatMoney(r.paymentCents), "$1,155.70");
  assert.equal(E.formatMoney(r.totalCents), "$1,545.70");
});

test("rules: $1,237.70 is the maximum TOTAL including supplements, and wages are gross", () => {
  const m = R.dsp.maxRateSingle21;
  assert.equal(m.amount, 1237.70);
  assert.equal(E.toCents(m.parts.basic) + E.toCents(m.parts.pensionSupplement) + E.toCents(m.parts.energySupplement), E.toCents(m.amount));
  assert.match(m.name, /total/i); assert.match(m.name, /Pension Supplement and Energy Supplement/);
  assert.match(m.unit, /not the basic rate/);
  assert.equal(R.dsp.grossIncome.status, "review-confirmed");
  assert.match(R.dsp.grossIncome.name, /gross/i);
  assert.equal(R.dsp.grossIncome.source, "https://www.servicesaustralia.gov.au/employment-income-reporting");
  for (const k of ["maxRateSingle21", "incomeFreeAreaSingle", "grossIncome"]) {
    assert.match(R.dsp[k].verificationMethod, /independent reviewer/i, k);
    assert.match(R.dsp[k].verificationMethod, /could not retrieve/, k + " does not claim our tools read the page");
  }
  for (const k of ["workBonus", "workingCredit", "assetsTest"]) assert.equal(R.dsp[k].kind, "unsupported-rule");
});

test("DSP: garbage answers are treated as missing, never as favourable", () => {
  const r = est("390", { relationship: "SINGLE", age21: true, blind: 0 });
  assert.equal(r.status, "incomplete");
  assert.deepEqual(r.missing.sort(), ["age21", "blind", "relationship"]);
});

test("DSP: unverified rules block the estimate", () => {
  const saved = R.dsp.maxRateSingle21.status;
  try {
    R.dsp.maxRateSingle21.status = "unverified";
    assert.equal(est("390").status, "unverified-rules");
    assert.equal(est("390").paymentCents, undefined);
  } finally { R.dsp.maxRateSingle21.status = saved; }
});

test("money: parsing valid input", () => {
  const ok = { "390": 39000, "390.5": 39050, "390.50": 39050, "$1,234.56": 123456, " 0 ": 0, "$ 12": 1200, "20000": 2000000, "0.01": 1 };
  for (const [s, c] of Object.entries(ok)) assert.deepEqual(E.parseMoney(s), { ok: true, cents: c }, s);
});

test("money: invalid, negative, missing and malformed input", () => {
  const bad = { "": "missing", "   ": "missing", "$": "missing", "-5": "negative", "abc": "format", "1.234": "format", "12,34": "format",
    "1e3": "format", "NaN": "format", "Infinity": "format", "3 90": "format", "20000.01": "too-large", "99999999999999999999": "format" };
  for (const [s, code] of Object.entries(bad)) {
    const r = E.parseMoney(s);
    assert.equal(r.ok, false, s);
    assert.equal(r.code, code, s);
    assert.ok(r.error.length > 10, "has a readable message: " + s);
  }
  assert.equal(E.parseMoney(null).code, "missing");
  assert.equal(E.parseMoney(undefined).code, "missing");
  const inv = est("-5");
  assert.equal(inv.status, "invalid");
  assert.equal(inv.paymentCents, undefined);
});

test("money: formatting and rounding", () => {
  assert.equal(E.formatMoney(123456), "$1,234.56");
  assert.equal(E.formatMoney(5), "$0.05");
  assert.equal(E.formatMoney(-2550), "-$25.50");
  assert.equal(E.formatMoney(123450, { whole: true }), "$1,235");
  assert.equal(E.formatMoney(100000000), "$1,000,000.00");
  assert.equal(E.toCents(1237.70), 123770);
  assert.equal(E.toCents(0.1 + 0.2), 30);
  assert.equal(E.toCents(522.09), 52209);
  assert.equal(E.halfCentsUp(1, 2), 1);   // 0.5 -> 1
  assert.equal(E.halfCentsUp(3, 2), 2);   // 1.5 -> 2
  assert.equal(E.halfCentsUp(2, 2), 1);
  assert.equal(E.spokenMoney(123770), "1,237 dollars and 70 cents");
});

/* ---------- concessions ---------- */
const byId = (res, id) => res.results.find((r) => r.id === id);

test("concessions: no answers → nothing is 'potentially eligible'", () => {
  const res = E.assessConcessions({});
  assert.equal(res.potential.length, 0);
  assert.equal(res.notEligible.length, 0);
  assert.equal(res.moreInfo.length, R.concessions.length);
});

test("concessions: 'not sure' is never a yes", () => {
  const unsure = {};
  E.CONCESSION_QUESTIONS.forEach((q) => { unsure[q.key] = "unsure"; });
  unsure.cards = { answered: true, held: [], none: false, unsure: true };
  const res = E.assessConcessions(unsure);
  assert.equal(res.potential.length, 0);
  assert.equal(res.moreInfo.length, R.concessions.length);
});

const ALL_YES = (() => { const a = { cards: { answered: true, held: ["pcc"], none: false, unsure: false } }; E.CONCESSION_QUESTIONS.forEach((q) => { a[q.key] = "yes"; }); return a; })();

test("concessions: all criteria met → potentially eligible, never 'approved'", () => {
  const res = E.assessConcessions(ALL_YES);
  assert.equal(res.potential.length, R.concessions.length);
  assert.ok(res.results.every((r) => r.state === "potential"));
});

test("concessions: medical cooling/heating needs certification AND bill responsibility", () => {
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { medicalCondition: "unsure" })), "medical").state, "more-info");
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { medicalCondition: "no" })), "medical").state, "not-eligible");
  const r = byId(E.assessConcessions(Object.assign({}, ALL_YES, { paysElecBill: "no" })), "medical");
  assert.equal(r.state, "not-eligible");
  assert.deepEqual(r.failed, ["paysElecBill"]);
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { acOrHeating: "no" })), "medical").state, "not-eligible");
  // Gold Card alone does not qualify for medical cooling/heating.
  const gold = Object.assign({}, ALL_YES, { cards: { answered: true, held: ["gold"] } });
  assert.equal(byId(E.assessConcessions(gold), "medical").state, "not-eligible");
});

test("concessions: rates subsidy needs ownership/life tenancy AND rates liability", () => {
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { ownerOrLifeTenant: "no" })), "rates").state, "not-eligible");
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { ratesLiable: "no" })), "rates").state, "not-eligible");
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { ratesLiable: undefined })), "rates").state, "more-info");
  // Health Care Card does not qualify for rates or water.
  const hcc = Object.assign({}, ALL_YES, { cards: { answered: true, held: ["hcc"] } });
  assert.equal(byId(E.assessConcessions(hcc), "rates").state, "not-eligible");
  assert.equal(byId(E.assessConcessions(hcc), "water").state, "not-eligible");
  assert.equal(byId(E.assessConcessions(hcc), "gas").state, "not-eligible");
  assert.equal(byId(E.assessConcessions(hcc), "electricity").state, "potential");
});

test("concessions: water subsidy is limited to the SEQ Water Grid", () => {
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { seqWaterGrid: "no" })), "water").state, "not-eligible");
  assert.equal(byId(E.assessConcessions(Object.assign({}, ALL_YES, { seqWaterGrid: "unsure" })), "water").state, "more-info");
});

test("concessions: a definite 'no' outranks a missing answer", () => {
  const r = byId(E.assessConcessions({ qldResident: "no" }), "electricity");
  assert.equal(r.state, "not-eligible");
  assert.ok(r.missing.includes("cards"));
});

test("concessions: 'no card' fails card-based schemes but not the Companion Card", () => {
  const a = Object.assign({}, ALL_YES, { cards: { answered: true, held: [], none: true, unsure: false } });
  const res = E.assessConcessions(a);
  assert.equal(byId(res, "electricity").state, "not-eligible");
  assert.equal(byId(res, "companion").state, "potential");
});

test("concessions: non-cash benefits are kept separate and never valued", () => {
  const res = E.assessConcessions(ALL_YES);
  assert.deepEqual(res.potentialNonCash.map((r) => r.id), ["companion"]);
  assert.ok(!res.potentialCash.some((r) => r.id === "companion"));
  assert.equal(R.concessions.find((s) => s.id === "companion").amount, null);
  assert.equal(byId(res, "companion").reliableAmount, false);
  assert.equal(res.total, undefined, "engine exposes no aggregate dollar total");
});

test("rules: every scheme records source, effective date, check date and status", () => {
  const all = Object.values(R.dsp).concat(R.concessions, [R.ndis.supports, R.ndis.fundingPeriods]);
  for (const e of all) {
    assert.match(e.source, /^https:\/\/www\.(servicesaustralia|qld|ndis)\.gov\.au\//, e.name);
    assert.ok(e.effectiveFrom === null || /^\d{4}-\d{2}-\d{2}$/.test(e.effectiveFrom), e.name);
    assert.match(e.verifiedOn, /^\d{4}-\d{2}-\d{2}$/, e.name);
    assert.ok(["verified", "review-confirmed", "excerpt", "unverified"].includes(e.status), e.name);
    assert.ok(typeof e.verificationMethod === "string" && e.verificationMethod.length > 20, "verification method recorded for " + e.name);
    if (e.status !== "verified") assert.ok(e.limitation && e.limitation.length > 20, "limitation recorded for " + e.name);
  }
  for (const s of R.concessions) {
    assert.ok(["payment", "bill-rebate", "subsidy", "non-cash"].includes(s.kind), s.id);
    assert.ok(E.SCHEME_CRITERIA[s.id], "criteria for " + s.id);
  }
  assert.equal(R.isReliable({ status: "unverified" }), false);
});

/* ---------- NDIS ---------- */
test("NDIS: funding totals are separate from personal income", () => {
  const t = E.planTotals(D.DEMO_PLAN);
  assert.equal(t.allocatedCents, 1820000 + 160000 + 1240000 + 620000 + 640000 + 320000 + 745000);
  assert.equal(t.statedLeftCents, 745000 - 125000);
  assert.equal(t.flexibleLeftCents + t.statedLeftCents, t.allocatedCents - t.spentCents);

  const input = (plan) => ({ mode: "demo", dspAnswers: D.DEMO_PROFILE.dsp, concessionAnswers: {}, jobs: D.SAMPLE_JOBS, capacity: D.DEMO_PROFILE.capacity, plan });
  const withPlan = E.buildFacts(input(D.DEMO_PLAN));
  const noPlan = E.buildFacts(input(null));
  assert.equal(withPlan.dsp.totalCents, withPlan.dsp.wagesCents + withPlan.dsp.paymentCents, "income total = wages + DSP only");
  assert.equal(withPlan.dsp.totalCents, noPlan.dsp.totalCents, "NDIS plan never changes income totals");
  assert.equal(withPlan.dsp.annualIfUnchangedCents, noPlan.dsp.annualIfUnchangedCents);
});

test("NDIS: a manual balance needs its date and source", () => {
  assert.equal(E.validateManualNdis({ balance: "5000" }).ok, false);
  assert.ok(E.validateManualNdis({ balance: "5000" }).errors.asOf);
  assert.ok(E.validateManualNdis({ balance: "5000", asOf: "2026-11-01" }).errors.source);
  const ok = E.validateManualNdis({ balance: "5,000.50", asOf: "2026-11-01", source: "my NDIS app" });
  assert.equal(ok.ok, true);
  assert.equal(ok.balanceCents, 500050);
  assert.equal(E.validateManualNdis({ balance: "-1" }).ok, false);
  assert.equal(E.validateManualNdis({ asOf: "yesterday" }).ok, false);
});

test("NDIS: a manual balance has a scope, defaults to unknown, and is never marked verified", () => {
  const base = { balance: "1200", asOf: "2026-11-01", source: "my NDIS app" };
  assert.equal(E.validateManualNdis(base).scope, "unknown");
  assert.equal(E.validateManualNdis(Object.assign({}, base, { scope: "whole-plan" })).scope, "whole-plan");
  assert.equal(E.validateManualNdis(Object.assign({}, base, { scope: "current-period" })).scope, "current-period");
  assert.equal(E.validateManualNdis(Object.assign({}, base, { scope: "available-now" })).scope, "unknown", "unrecognised scope is not trusted");
  assert.equal(E.validateManualNdis(base).verified, false);
  const p = E.blankPersonal(); Object.assign(p.ndis, base, { scope: "current-period" });
  const f = E.buildFacts({ mode: "personal", dspAnswers: p.dsp, concessionAnswers: {}, jobs: D.SAMPLE_JOBS, capacity: p.capacity, plan: null, manualNdis: p.ndis });
  assert.equal(f.ndis.scope, "current-period");
  assert.equal(f.ndis.verified, false);
  assert.equal(E.sanitizePersonal({ ndis: { scope: "whole-plan" } }).ndis.scope, "whole-plan");
});

/* ---------- demo / personal separation ---------- */
test("demo/personal: a blank personal session contains none of the demo user's data", () => {
  const p = E.blankPersonal();
  const s = JSON.stringify(p);
  assert.ok(!s.includes("390"));
  assert.equal(p.dsp.wages, "");
  assert.ok(Object.values(p.dsp).every((v) => v === null || v === ""));
  assert.equal(p.ndis.balance, "");
  const f = E.buildFacts({ mode: "personal", dspAnswers: p.dsp, concessionAnswers: p.concessions, jobs: D.SAMPLE_JOBS, capacity: p.capacity, plan: null, manualNdis: p.ndis });
  assert.equal(f.dsp.status, "incomplete");
  assert.equal(f.ndis, null);
  assert.equal(f.concessions.potential.length, 0);
});

test("demo data is labelled fictional", () => {
  assert.ok(D.SAMPLE_JOBS.every((j) => /\(fictional\)|Work from home/.test(j.employer) || /fictional/.test(j.employer)));
  assert.ok(D.SAMPLE_JOBS.filter((j) => !/fictional/.test(j.employer)).length === 0);
  assert.match(D.DEMO_PLAN.source, /made up/i);
});

/* ---------- storage ---------- */
class MemStorage {
  constructor(init) { this.m = new Map(Object.entries(init || {})); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
class BrokenStorage { getItem() { throw new Error("SecurityError"); } setItem() { throw new Error("QuotaExceeded"); } removeItem() { throw new Error("x"); } }

test("storage: nothing is written without consent", () => {
  const s = new MemStorage();
  const r = E.saveStore(s, { saveConsent: false, mode: "personal", personal: E.blankPersonal() });
  assert.equal(r.ok, false);
  assert.equal(s.m.size, 0);
});

test("storage: persistence round-trip with consent", () => {
  const s = new MemStorage();
  const p = E.blankPersonal();
  p.dsp.wages = "500"; p.dsp.relationship = "single"; p.capacity.hoursPerWeek = 20;
  assert.equal(E.saveStore(s, { saveConsent: true, mode: "personal", personal: p, ui: { view: "money", claimTab: "discounts" } }).ok, true);
  const l = E.loadStore(s);
  assert.equal(l.status, "ok");
  assert.equal(l.record.personal.dsp.wages, "500");
  assert.equal(l.record.personal.dsp.relationship, "single");
  assert.equal(l.record.personal.capacity.hoursPerWeek, 20);
  assert.equal(l.record.ui.view, "money");
});

test("storage: deletion removes every Capable key and nothing else", () => {
  const s = new MemStorage({ "capable.v2": "{}", "capable.session": "{}", "capable.easyread": "1", "other.app": "keep" });
  const removed = E.removeKeys(s, E.ALL_KEYS);
  assert.deepEqual(removed.sort(), ["capable.easyread", "capable.session", "capable.v2"]);
  assert.equal(s.getItem("other.app"), "keep");
});

test("storage: corrupt records are set aside, not destroyed or used", () => {
  for (const bad of ["{not json", "null", "[]", JSON.stringify({ v: 1 }), JSON.stringify({ v: 2, saveConsent: false })]) {
    const s = new MemStorage({ "capable.v2": bad });
    const l = E.loadStore(s);
    assert.equal(l.status, "corrupt", bad);
    assert.equal(l.record, null);
    assert.equal(s.getItem(E.BACKUP_KEY), bad, "kept as backup");
    assert.equal(s.getItem(E.STORE_KEY), null);
  }
});

test("storage: wrong-shaped fields are dropped, not coerced", () => {
  const s = new MemStorage({ "capable.v2": JSON.stringify({ v: 2, saveConsent: true, mode: "personal", personal: {
    dsp: { relationship: "married", age21: "yes", wages: { evil: 1 } }, capacity: { hoursPerWeek: 999, needs: { remote: "yes", quiet_environment: true } },
    concessions: { qldResident: "maybe", elecAccount: "yes", cards: { answered: true, held: ["pcc", "<script>"] } }, ndis: { balance: 5 } }, ui: { view: "admin" } }) });
  const l = E.loadStore(s);
  assert.equal(l.status, "ok");
  const p = l.record.personal;
  assert.equal(p.dsp.relationship, null);
  assert.equal(p.dsp.age21, "yes");
  assert.equal(p.dsp.wages, "");
  assert.equal(p.capacity.hoursPerWeek, 16);
  assert.equal(p.capacity.needs.remote, false);
  assert.equal(p.capacity.needs.quiet_environment, true);
  assert.equal(p.concessions.qldResident, undefined);
  assert.equal(p.concessions.elecAccount, "yes");
  assert.deepEqual(p.concessions.cards.held, ["pcc"]);
  assert.equal(p.ndis.balance, "");
  assert.equal(l.record.ui.view, "dashboard");
});

test("storage: older (v1) records are detected but never silently applied", () => {
  const v1 = JSON.stringify({ view: "money", hoursPerWeek: 22, needs: { remote: true }, strictOnly: true, wagesInputValue: "390.00", claimTab: "entitlements" });
  const s = new MemStorage({ "capable.session": v1 });
  const l = E.loadStore(s);
  assert.equal(l.status, "empty", "no personal record is created from it");
  assert.equal(l.record, null);
  assert.equal(l.legacy.hoursPerWeek, 22);
  assert.equal(l.legacy.wages, "390.00");
  assert.equal(s.getItem("capable.session"), v1, "left untouched until the person decides");
  const p = E.importLegacy(E.blankPersonal(), l.legacy);
  assert.equal(p.capacity.hoursPerWeek, 22);
  assert.equal(p.dsp.wages, "390.00");
  assert.equal(p.dsp.relationship, null, "v1 never answers DSP questions");
  assert.equal(E.estimateDsp(p.dsp).status, "incomplete");
  assert.deepEqual(E.loadStore(new MemStorage({ "capable.session": "{{" })).legacy, { unreadable: true });
});

test("storage: blocked storage is reported, never thrown", () => {
  const l = E.loadStore(new BrokenStorage());
  assert.equal(l.status, "unavailable");
  assert.equal(E.saveStore(new BrokenStorage(), { saveConsent: true, mode: "personal", personal: E.blankPersonal() }).ok, false);
  assert.doesNotThrow(() => E.removeKeys(new BrokenStorage(), E.ALL_KEYS));
  assert.equal(E.loadStore(null).status, "empty");
});

test("rules: 15 Nov 2026 independent review — reduction, cut-off and 30-hour rule", () => {
  const { taperSingle: t, cutOffSingle: c, thirtyHourRule: h, incomeFreeAreaSingle: f } = R.dsp;
  assert.equal(t.amount, 0.5); assert.equal(f.amount, 226); assert.equal(c.amount, 2701.40);
  // The cut-off follows from the reviewed figures: free area + max rate / taper.
  assert.equal(E.toCents(f.amount) + E.toCents(R.dsp.maxRateSingle21.amount) * 2, E.toCents(c.amount));
  assert.equal(h.amount, 30); assert.equal(h.suspensionYears, 2);
  assert.deepEqual(h.exceptions, ["Australian Disability Enterprise", "Supported Wage System", "ongoing Inclusive Employment Australia support"]);
  const shown = h.conditions.join(" ");
  for (const x of ["Australian Disability Enterprise", "Supported Wage System", "Inclusive Employment Australia", "up to 2 years"]) assert.ok(shown.includes(x), x);
  // Points the review did not cover stay separate and are never presented as reviewed.
  assert.ok(h.excerptConditions.some((s) => /Pensioner Concession Card/.test(s)));
  assert.ok(h.excerptConditions.some((s) => /14 days/.test(s)));
  assert.ok(!/Pensioner Concession Card|14 days/.test(shown));
  assert.match(h.limitation, /not part of that review/);
  for (const e of [t, c, h]) {
    assert.equal(e.status, "review-confirmed", e.name);
    assert.equal(e.verifiedOn, "2026-11-15", e.name);
    assert.match(e.verificationMethod, /independent reviewer/i, e.name);
    assert.match(e.verificationMethod, /could not retrieve/, e.name + " does not claim our tools read the page");
    assert.match(e.verificationMethod, /timed out on 14 and 15 Nov 2026/, e.name);
  }
  assert.equal(R.dsp.incomeFreeAreaCouple.status, "excerpt", "couple figure was not part of the review");
});
