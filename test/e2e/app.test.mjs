// End-to-end checks in real (headless) Chrome against the built www/ bundle.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, newPage, axe } from "./helpers.mjs";

let env;
before(async () => { env = await setup(8770); });
after(async () => { await env.browser.close(); env.server.close(); });

async function fresh(opts) {
  const p = await newPage(env.browser, opts);
  await p.goto(env.base, { waitUntil: "networkidle0" });
  return p;
}
async function choose(p, mode) { await p.click(mode === "demo" ? "#ob-demo" : "#ob-personal"); }
async function go(p, view) { await p.click(`.navbtn[data-view=${view}]`); }
const bodyText = (p) => p.evaluate(() => document.body.innerText);
const keys = (p) => p.evaluate(() => Object.keys(localStorage).sort());

test("first launch asks demo or own session; nothing personal is stored", async () => {
  const p = await fresh();
  assert.equal(await p.$eval("#onboarding", (e) => e.hidden), false);
  assert.deepEqual(await keys(p), []);
  assert.deepEqual(p.errors, []);
});

test("a blank personal session shows none of the demo user's data", async () => {
  const p = await fresh();
  await choose(p, "personal");
  for (const v of ["dashboard", "jobs", "money", "claim"]) {
    await go(p, v);
    const t = await bodyText(p);
    assert.ok(!/\bSam\b|Whitton|\$390|\$1,155\.70|\$22,660/.test(t), "no demo data on " + v);
  }
  await go(p, "money");
  assert.equal(await p.$eval("#wages", (e) => e.value), "");
  assert.match(await bodyText(p), /More information needed/);
  assert.match(await bodyText(p), /Tracking each NDIS budget and claim is not available/);
  await go(p, "claim");
  assert.equal(await p.$eval("[data-fact=concessions]", (e) => e.textContent), "0 you may be able to claim");
  assert.deepEqual(p.errors, []);
});

test("demo is clearly labelled and computes the DSP estimate from rules", async () => {
  const p = await fresh();
  await choose(p, "demo");
  const t = await bodyText(p);
  assert.match(t, /Demo\. You are looking at a made-up person/);
  await go(p, "money");
  assert.equal(await p.$eval("#dsp-result [data-fact=dsp]", (e) => e.textContent), "$1,155.70");
  assert.equal(await p.$eval("#dsp-result [data-fact=total]", (e) => e.textContent), "$1,545.70");
  assert.doesNotMatch(await bodyText(p), /better off/i);
  await go(p, "jobs");
  const jt = await bodyText(p);
  assert.match(jt, /sample jobs at fictional employers/i);
  assert.match(jt, /not job ads/);
  await go(p, "claim");
  await p.$eval("#tab-discounts", (e) => e.scrollIntoView({ block: "center" }));
  await p.click("#tab-discounts");
  assert.match(await bodyText(p), /None is a partner of Capable/);
});

test("standard, Easy Read and spoken summaries show the same figures", async () => {
  const p = await fresh();
  await choose(p, "demo");
  for (const view of ["dashboard", "money", "claim", "jobs"]) {
    await go(p, view);
    const items = await p.evaluate((v) => CapableApp.summaryItems(v), view);
    const spoken = await p.evaluate(() => CapableApp.spokenSummary());
    const standard = await p.$eval(`#view-${view}`, (e) => e.innerText);
    await p.click("#easy-read-btn");
    const easy = await p.$eval("#view-easyread", (e) => e.innerText);
    await p.click("#easy-read-btn");
    const amounts = items.flatMap((i) => i.text.match(/\$[\d,]+\.\d{2}/g) || []);
    assert.ok(amounts.length > 0 || view === "jobs" || view === "claim", "has amounts on " + view);
    for (const a of amounts) {
      assert.ok(spoken.includes(a), `${view}: spoken has ${a}`);
      assert.ok(easy.includes(a), `${view}: Easy Read has ${a}`);
      if (view === "money" || view === "dashboard") assert.ok(standard.includes(a) || standard.includes(a.replace(/\.\d{2}$/, "")), `${view}: standard has ${a}`);
    }
  }
  // The counts too.
  await go(p, "claim");
  const std = await p.$eval("[data-fact=concessions]", (e) => e.textContent);
  const n = std.match(/^\d+/)[0];
  assert.match(await p.evaluate(() => CapableApp.spokenSummary()), new RegExp("may be able to claim " + n + " concession"));
});

test("unsupported circumstance hides the estimate everywhere", async () => {
  const p = await fresh();
  await choose(p, "demo");
  await go(p, "money");
  await p.click("#dsp-relationship-1"); // Partnered
  const t = await p.$eval("#dsp-result", (e) => e.innerText);
  assert.match(t, /cannot estimate your payment for this situation/);
  assert.equal(await p.$("#dsp-result [data-fact=dsp]"), null);
  assert.match(await p.evaluate(() => CapableApp.spokenSummary()), /cannot estimate your pension/);
  await go(p, "dashboard");
  assert.doesNotMatch(await p.$eval("#view-dashboard", (e) => e.innerText), /\$1,155/);
});

test("'not sure' about the assets test hides the estimate on every surface", async () => {
  const p = await fresh();
  await choose(p, "demo");
  await go(p, "money");
  await p.$eval("#dsp-assetsReduced-1", (e) => e.scrollIntoView({ block: "center" }));
  await p.click("#dsp-assetsReduced-1"); // I'm not sure
  const t = await p.$eval("#dsp-result", (e) => e.innerText);
  assert.match(t, /No estimate yet: you were not sure/);
  assert.match(t, /assets test/);
  assert.equal(await p.$("#dsp-result [data-fact=dsp]"), null);
  assert.doesNotMatch(await p.evaluate(() => CapableApp.spokenSummary()), /\$1,155\.70/);
  await go(p, "jobs");
  assert.doesNotMatch(await p.$eval("#view-jobs", (e) => e.innerText), /Estimated DSP/);
});

test("demo DSP result labels the maximum as a total including supplements, wages as gross", async () => {
  const p = await fresh();
  await choose(p, "demo");
  await go(p, "money");
  const t = await p.$eval("#dsp-result", (e) => e.textContent);
  assert.match(t, /Maximum total DSP, adult single 21 or over, including Pension Supplement and Energy Supplement/);
  assert.match(t, /\$1,237\.70 maximum total DSP alone/);
  assert.match(t, /Gross wages plus DSP/);
  assert.match(await p.$eval("#wages-hint", (e) => e.textContent), /before tax and before any deductions/);
});

test("NDIS manual balance: scope choice, never 'verified' or 'available now'", async () => {
  const p = await fresh();
  await choose(p, "personal");
  await go(p, "money");
  await p.type("#ndis-balance", "4000"); await p.$eval("#ndis-balance", (e) => e.dispatchEvent(new Event("change", { bubbles: true })));
  await p.$eval("#ndis-asof", (e) => { e.value = "2026-11-01"; e.dispatchEvent(new Event("change", { bubbles: true })); });
  await p.type("#ndis-source", "my NDIS app"); await p.$eval("#ndis-source", (e) => e.dispatchEvent(new Event("change", { bubbles: true })));
  let t = await p.$eval("#ndis-summary", (e) => e.innerText);
  assert.match(t, /not known whether this is your whole plan or just the current funding period/);
  assert.match(t, /not checked by Capable/);
  assert.match(t, /may not all be available to use right now/);
  await p.$eval("#ndis-scope-1", (e) => e.scrollIntoView({ block: "center" }));
  await p.click("#ndis-scope-1");
  t = await p.$eval("#ndis-summary", (e) => e.innerText);
  assert.match(t, /current funding period/);
  const all = await bodyText(p);
  assert.doesNotMatch(all, /verified balance|available now:/i);
  await go(p, "dashboard");
  assert.match(await p.$eval("#view-dashboard", (e) => e.innerText), /for the current funding period, as you entered it[\s\S]*Not checked by Capable/);
});

test("invalid wages show an understandable error and no figures", async () => {
  const p = await fresh();
  await choose(p, "personal");
  await go(p, "money");
  for (const k of ["relationship-0", "age21-0", "children-0", "blind-0", "rentAssistance-0", "otherIncome-0", "transitional-0", "agePensionAge-0", "workingCredit-0", "assetsReduced-0"]) {
    await p.$eval("#dsp-" + k, (el) => el.scrollIntoView({ block: "center" }));
    await p.click("#dsp-" + k);
  }
  await p.type("#wages", "-40");
  await p.$eval("#wages", (e) => e.blur());
  assert.equal(await p.$eval("#wages", (e) => e.getAttribute("aria-invalid")), "true");
  assert.match(await p.$eval("#wages-error", (e) => e.innerText), /cannot be below zero/);
  assert.equal(await p.$("#dsp-result [data-fact=dsp]"), null);
  await p.$eval("#wages", (e) => { e.value = ""; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.type("#wages", "500");
  assert.equal(await p.$eval("#dsp-result [data-fact=dsp]", (e) => e.textContent), "$1,100.70");
});

test("personal answers persist only after saving is turned on; delete needs confirmation", async () => {
  const p = await fresh();
  await choose(p, "personal");
  await go(p, "money");
  await p.type("#wages", "321");
  assert.ok(!(await keys(p)).includes("capable.v2"), "not saved without consent");
  await p.click("#profile-btn");
  await p.click('#profile-panel [data-open-dialog="privacy-dialog"]');
  await p.click("#save-consent");
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("capable.v2")));
  assert.equal(saved.personal.dsp.wages, "321");
  await p.keyboard.press("Escape");
  await p.reload({ waitUntil: "networkidle0" });
  assert.equal(await p.$eval("#onboarding", (e) => e.hidden), true);
  await go(p, "money");
  assert.equal(await p.$eval("#wages", (e) => e.value), "321", "restored after reload");

  // Delete everything: cancel first, then confirm.
  await p.click('.site-footer [data-open-dialog="privacy-dialog"]');
  await p.click("#clear-everything");
  assert.equal(await p.$eval("#confirm-dialog", (d) => d.open), true);
  assert.equal(await p.evaluate(() => document.activeElement.id), "confirm-cancel", "Cancel is focused first");
  await p.click("#confirm-cancel");
  assert.ok((await keys(p)).includes("capable.v2"), "cancel keeps data");
  await p.click("#clear-everything");
  await p.click("#confirm-ok");
  await p.waitForFunction(() => localStorage.length === 0, { timeout: 3000 });
  assert.deepEqual(await keys(p), []);
  assert.equal(await p.$eval("#onboarding", (e) => e.hidden), false);
});

test("an earlier version's record is shown, not silently used", async () => {
  const p = await newPage(env.browser);
  await p.goto(env.base, { waitUntil: "networkidle0" });
  await p.evaluate(() => {
    localStorage.setItem("capable.session", JSON.stringify({ hoursPerWeek: 22, wagesInputValue: "390.00", needs: { remote: true } }));
    localStorage.setItem("capable.mode", "personal");
  });
  await p.reload({ waitUntil: "networkidle0" });
  const t = await bodyText(p);
  assert.match(t, /An earlier version of Capable saved some answers/);
  await go(p, "money");
  assert.equal(await p.$eval("#wages", (e) => e.value), "", "not applied automatically");
  await go(p, "dashboard");
  await p.click("#legacy-use");
  await go(p, "money");
  assert.equal(await p.$eval("#wages", (e) => e.value), "390.00");
  assert.ok(!(await keys(p)).includes("capable.session"));
});

test("a corrupt saved record is set aside and reported", async () => {
  const p = await newPage(env.browser);
  await p.goto(env.base, { waitUntil: "networkidle0" });
  await p.evaluate(() => { localStorage.setItem("capable.v2", "{broken"); localStorage.setItem("capable.mode", "personal"); });
  await p.reload({ waitUntil: "networkidle0" });
  assert.match(await bodyText(p), /could not be read\. They have been set aside, not deleted/);
  assert.equal(await p.evaluate(() => localStorage.getItem("capable.v2.unreadable")), "{broken");
  assert.deepEqual(p.errors, []);
});

test("concession answers: missing never counts as yes; scheme rules apply", async () => {
  const p = await fresh();
  await choose(p, "personal");
  await go(p, "claim");
  await p.click("#card-pcc");
  assert.equal(await p.$eval("[data-fact=concessions]", (e) => e.textContent), "0 you may be able to claim");
  await p.click("#conc-qldResident-0");
  await p.click("#conc-elecAccount-0");
  assert.equal(await p.$eval("[data-fact=concessions]", (e) => e.textContent), "1 you may be able to claim");
  await p.click("#conc-ownerOrLifeTenant-1"); // No
  const t = await p.$eval("#conc-results", (e) => e.innerText);
  assert.match(t, /Not eligible, based on your answers \(\d\)/, "group heading keeps the qualifier");
  assert.match(t, /Pensioner Rate Subsidy Scheme[\s\S]*Not eligible[\s\S]*do not own your home/);
  assert.match(t, /Medical Cooling[\s\S]*More information needed/);
});

test("voice panel: tap options work and the mic is not requested on open", async () => {
  const p = await fresh();
  await choose(p, "demo");
  await p.evaluate(() => { window.__micAsked = false; const g = navigator.mediaDevices && navigator.mediaDevices.getUserMedia; if (g) navigator.mediaDevices.getUserMedia = function () { window.__micAsked = true; return g.apply(this, arguments); }; });
  await p.click('#view-dashboard [data-tool="ask"]');
  assert.equal(await p.$eval("#voice-panel", (e) => e.hidden), false);
  assert.match(await p.$eval("#voice-status", (e) => e.textContent), /Not listening|not available/);
  assert.equal(await p.evaluate(() => window.__micAsked), false);
  await p.click('[data-ask="claim"]');
  assert.equal(await p.$eval("#view-claim", (e) => e.hidden), false);
  await p.click("#voice-close");
  assert.equal(await p.$eval("#voice-panel", (e) => e.hidden), true);
  assert.equal(await p.evaluate(() => [CapableMatchTopic("what work can i do"), CapableMatchTopic("am i getting paid enough"), CapableMatchTopic("what concessions can i get"), CapableMatchTopic("banana")].join()), "jobs,money,claim,");
});

for (const scheme of ["light", "dark"]) {
  test(`axe (WCAG 2.2 AA rules), ${scheme} mode: every view, Easy Read and dialogs`, async () => {
    const p = await newPage(env.browser, { scheme });
    await p.goto(env.base, { waitUntil: "networkidle0" });
    const all = [];
    const check = async (label) => { const v = await axe(p); if (v.length) all.push({ label, v }); };
    await check("onboarding");
    await choose(p, "demo");
    for (const v of ["dashboard", "jobs", "money", "claim"]) { await go(p, v); await check("demo " + v); }
    await p.click("#easy-read-btn"); await check("easy read"); await p.click("#easy-read-btn");
    for (const d of ["help-dialog", "privacy-dialog", "about-dialog"]) {
      await p.click(`.site-footer [data-open-dialog]`).catch(() => {});
      await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach((x) => x.close()));
      await p.evaluate((id) => document.querySelector(`[data-open-dialog="${id}"]`).click(), d);
      const v = await axe(p, "#" + d); if (v.length) all.push({ label: d, v });
      await p.keyboard.press("Escape");
    }
    await p.click("#profile-btn"); await p.click('#profile-panel [data-mode="personal"]');
    for (const v of ["dashboard", "money", "claim"]) { await go(p, v); await check("personal " + v); }
    assert.deepEqual(all, [], JSON.stringify(all, null, 2));
  });
}

for (const [label, width, font] of [["320px wide (WCAG 1.4.10)", 320, null], ["200% text at phone width (WCAG 1.4.4)", 390, "38px"]]) test("reflow: no horizontal scrolling, " + label, async () => {
  const p = await fresh({ width, height: 700 });
  await choose(p, "demo");
  if (font) await p.addStyleTag({ content: "html{font-size:" + font + " !important}" });
  for (const v of ["dashboard", "jobs", "money", "claim"]) {
    await go(p, v);
    const over = await p.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return [...document.querySelectorAll("main *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > w + 1 && !e.closest(".table-wrap") && getComputedStyle(e).position !== "fixed"; })
        .slice(0, 5).map((e) => e.tagName + "." + e.className + " " + Math.round(e.getBoundingClientRect().right));
    });
    assert.deepEqual(over, [], v);
  }
});

test("offline: after one visit the app cold-launches and calculates with no network", async () => {
  const p = await newPage(env.browser);
  await p.goto(env.base, { waitUntil: "networkidle0" });
  await p.evaluate(async () => { await navigator.serviceWorker.ready; });
  await p.reload({ waitUntil: "networkidle0" }); // now controlled
  await p.evaluate(() => localStorage.setItem("capable.mode", "demo"));
  await p.setOfflineMode(true);
  await p.reload({ waitUntil: "load" });
  await p.waitForSelector("#view-dashboard h1");
  assert.match(await bodyText(p), /You are offline/);
  await go(p, "money");
  assert.equal(await p.$eval("#dsp-result [data-fact=dsp]", (e) => e.textContent), "$1,155.70");
  await p.setOfflineMode(false);
  assert.deepEqual(p.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e)), []);
});
