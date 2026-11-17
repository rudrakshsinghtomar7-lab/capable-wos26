/* Capable — interface.
 * All figures come from rules.js via engine.js. This file formats them; it
 * never holds a government figure of its own. Standard screens, Easy Read and
 * the spoken summary are all formatted from the same `facts` object.
 */
(function () {
"use strict";

const E = window.CapableEngine, R = window.CapableRules, D = window.CapableDemo;
const fm = E.formatMoney;
const NATIVE = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
/* The iOS shell injects window.Capacitor but not registerPlugin, which lives in
   @capacitor/core's browser build. www/capacitor.js is copied from the pinned
   package by the build script and loaded only inside the native app. */
let speechPlugin = null;
/* Resolves to { p: plugin }, never to the plugin itself: Capacitor plugin
   proxies answer every property, including "then", so resolving a promise
   with one makes the promise wait forever on a native "then" method. */
function nativePlugin() {
  if (speechPlugin) return Promise.resolve({ p: speechPlugin });
  return new Promise(function (resolve, reject) {
    if (typeof window.Capacitor.registerPlugin === "function") return resolve();
    const s = document.createElement("script");
    s.src = "capacitor.js"; s.onload = function () { resolve(); }; s.onerror = function () { reject(new Error("capacitor.js missing")); };
    document.head.appendChild(s);
  }).then(function () { speechPlugin = speechPlugin || window.Capacitor.registerPlugin("CapableSpeech"); return { p: speechPlugin }; });
}
const Speech = NATIVE ? ["available", "checkPermissions", "requestPermissions", "start", "stop", "speak", "stopSpeaking", "setKeepAwake", "addListener"].reduce(function (o, m) {
  o[m] = function () { const args = arguments; return nativePlugin().then(function (box) { return box.p[m].apply(box.p, args); }); };
  return o;
}, {}) : null;
const MODE_PREF = "capable.mode";

const storage = (function () { try { const s = window.localStorage; s.getItem("x"); return s; } catch (e) { return null; } })();
function getPref(k) { try { return storage ? storage.getItem(k) : null; } catch (e) { return null; } }
function setPref(k, v) { try { if (storage) storage.setItem(k, v); } catch (e) { /* storage blocked */ } }

/* ============================== HELPERS ============================== */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function plural(n, one, many) { return n === 1 ? one : many; }
const dateFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
function fmtDate(iso) { return iso ? dateFmt.format(new Date(iso + "T00:00:00+10:00")) : "not stated"; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

const ICON = {
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  alert: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><path d="M12 16.5h.01"/></svg>',
  ok: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/></svg>',
  info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  ext: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>',
  tick: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m4 12.5 5 5L20 6.5"/></svg>',
  cross: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  q: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M9.2 9a3 3 0 1 1 3.8 2.9c-.6.2-1 .8-1 1.4v.5"/><path d="M12 17.5h.01"/></svg>',
  card: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'
};
const NAV_ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="8" rx="2"/><rect x="3" y="15" width="7" height="6" rx="2"/><rect x="14" y="12.5" width="7" height="8.5" rx="2"/><circle cx="17.5" cy="6.2" r="2.4" fill="currentColor" stroke="none"/>',
  jobs: '<rect x="2" y="10" width="14.5" height="10.5" rx="2.5"/><path d="M2 14.6h14.5"/><path d="M6.6 10V7.4a1.9 1.9 0 0 1 1.9-1.9h1.6a1.9 1.9 0 0 1 1.9 1.9V10"/><circle cx="20.3" cy="5.8" r="2.2" fill="currentColor" stroke="none"/>',
  money: '<path d="M4.5 20.5V16"/><path d="M10 20.5V13.5"/><path d="M15.5 20.5V11"/><circle cx="20.3" cy="6.5" r="2.2" fill="currentColor" stroke="none"/>',
  claim: '<path d="M3.41 13.41l7.17 7.17a2 2 0 0 0 2.83 0L22 12V2H12L3.41 10.59a2 2 0 0 0 0 2.82z"/><circle cx="16.9" cy="6.9" r="1.9" fill="currentColor" stroke="none"/>'
};
function navIcon(n, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + NAV_ICONS[n] + '</svg>'; }

function extLink(url, label, srLabel) {
  return '<a class="ext-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + ' ' + ICON.ext +
    '<span class="visually-hidden"> (' + esc(srLabel || "official website") + ', opens outside Capable)</span></a>';
}

/* One polite announcer for meaningful changes. Debounced so typing a number
   does not read out every keystroke. */
let announceTimer = null;
function announce(text, now) {
  clearTimeout(announceTimer);
  const go = function () { const el = $("#announcer"); el.textContent = ""; setTimeout(function () { el.textContent = text; }, 30); };
  if (now) go(); else announceTimer = setTimeout(go, 900);
}

/* ============================== STATE ============================== */

function freshDemo() {
  const p = D.DEMO_PROFILE;
  return { dsp: clone(p.dsp), concessions: clone(p.concessions), capacity: clone(p.capacity), ndis: null };
}

const state = {
  mode: null,              // "demo" | "personal" | null (not chosen yet)
  saveConsent: false,      // personal answers written to storage only when true
  personal: E.blankPersonal(),
  demo: freshDemo(),
  view: "dashboard",
  claimTab: "entitlements",
  easyRead: false,
  loadReport: null,        // what loadStore found, for notices
  legacyDismissed: false
};

function active() { return state.mode === "demo" ? state.demo : state.personal; }

function facts() {
  const a = active();
  return E.buildFacts({
    mode: state.mode,
    dspAnswers: a.dsp,
    concessionAnswers: a.concessions,
    jobs: D.SAMPLE_JOBS,
    capacity: a.capacity,
    plan: state.mode === "demo" ? D.DEMO_PLAN : null,
    manualNdis: state.mode === "personal" ? a.ndis : null
  });
}

let placeholderRender = false;   // true while drawing screens behind the welcome choice
function persist() {
  if (placeholderRender) return;
  if (state.mode) setPref(MODE_PREF, state.mode);
  if (state.mode === "personal" && state.saveConsent) {
    const r = E.saveStore(storage, { saveConsent: true, mode: "personal", personal: state.personal, ui: { view: state.view, claimTab: state.claimTab } });
    if (!r.ok && r.reason === "storage-error") showNotice("save-failed", "warn", "Your answers could not be saved on this device (storage is full or blocked). They will be kept only while Capable is open.");
  }
}

/* ============================== SHARED SUMMARY ==============================
   Plain-language lines for a view. Easy Read shows them; the spoken summary
   reads them; the standard screens show the same figures from the same facts. */

function schemeValueText(s) {
  if (s.kind === "non-cash") return s.paidAs;
  if (!R.isReliable(s) || typeof s.amount !== "number") return "Amount not confirmed — check the official page.";
  const amt = fm(E.toCents(s.amount));
  if (s.kind === "payment") return amt + " a year, paid to you. " + s.paidAs;
  if (s.kind === "bill-rebate") return amt + " a year taken off a bill. " + s.paidAs;
  return "Up to " + amt + " a year off a bill. " + s.paidAs;
}

function dspLines(d) {
  if (d.status === "ok") return [
    { sym: "work", key: "wages", text: "Your wages: " + fm(d.wagesCents) + " every 2 weeks, before tax." },
    { sym: "money", key: "dsp", text: "Estimated pension: " + fm(d.paymentCents) + " every 2 weeks." },
    { sym: "tick", key: "total", tone: "good", text: "Wages and pension together: " + fm(d.totalCents) + " every 2 weeks." }
  ];
  if (d.status === "unsupported") return [{ sym: "warn", key: "dsp", tone: "warn", text: "Capable cannot estimate your pension for your situation. Ask Services Australia." }];
  if (d.status === "invalid") return [{ sym: "warn", key: "dsp", tone: "warn", text: "Check the wages amount. " + d.wagesError }];
  if (d.status === "unverified-rules") return [{ sym: "warn", key: "dsp", tone: "warn", text: "The pension figures have not been checked, so there is no estimate." }];
  if (d.status === "uncertain") return [{ sym: "warn", key: "dsp", tone: "warn", text: "You were not sure about " + d.unsure.length + " " + plural(d.unsure.length, "question", "questions") + ". Check your Centrelink letter, then answer to see an estimate." }];
  const n = d.missing.length;
  return [{ sym: "money", key: "dsp", text: "Answer " + n + " more " + plural(n, "question", "questions") + " on the Money page to see your pension estimate." }];
}

/* What a manually entered NDIS balance covers. Never described as checked or
   as money available right now. */
const NDIS_SCOPE_TEXT = {
  "whole-plan": "This is what is left across your whole plan. With funding periods, only the current period's share may be usable now.",
  "current-period": "You said this is for your current funding period.",
  "unknown": "It is not known whether this is your whole plan or just the current funding period."
};
function ndisLines(f) {
  if (!f.ndis) return [];
  if (f.ndis.kind === "plan") return [
    { sym: "money", key: "ndis", text: "NDIS flexible funding left in the whole plan (demo): " + fm(f.ndis.totals.flexibleLeftCents) + ". Not all of it may be usable now. It is for your plan supports. It is not spending money or income." }
  ];
  return [{ sym: "money", key: "ndis", text: "NDIS balance you entered: " + fm(f.ndis.flexibleLeftCents) + (f.ndis.asOf ? ", on " + fmtDate(f.ndis.asOf) : "") + ". " +
    NDIS_SCOPE_TEXT[f.ndis.scope] + " Capable has not checked it. It is for your plan supports. It is not spending money or income." }];
}

function concessionLine(f) {
  const c = f.concessions;
  return { sym: "gift", key: "concessions", text: "You may be able to claim " + c.potential.length + " " + plural(c.potential.length, "concession", "concessions") +
    ". " + c.moreInfo.length + " more need" + (c.moreInfo.length === 1 ? "s" : "") + " answers. These are not approved until you apply." };
}

function summaryItems(view, f) {
  const items = [];
  if (view === "jobs") {
    items.push({ sym: "clock", key: "hours", text: "You said you can work up to " + f.hoursPerWeek + " hours each week." });
    items.push({ sym: "work", key: "jobs", text: f.jobs.length + " sample " + plural(f.jobs.length, "job fits", "jobs fit") + ". These are examples, not real job ads." });
    f.jobs.slice(0, 3).forEach(function (r) {
      items.push({ sym: "work", key: "job-" + r.job.id, text: r.job.title + ", " + r.job.hoursPerWeek + " hours a week: " + fm(E.jobFortnightCents(r.job)) + " every 2 weeks before tax." });
    });
  } else if (view === "money") {
    dspLines(f.dsp).forEach(function (l) { items.push(l); });
    ndisLines(f).forEach(function (l) { items.push(l); });
  } else if (view === "claim") {
    items.push(concessionLine(f));
    f.concessions.potential.forEach(function (r) {
      items.push({ sym: "gift", key: "scheme-" + r.id, text: r.scheme.name + ": " + schemeValueText(r.scheme) });
    });
  } else {
    items.push({ sym: "work", key: "jobs", text: f.jobs.length + " sample " + plural(f.jobs.length, "job fits", "jobs fit") + " the hours and needs you gave." });
    dspLines(f.dsp).forEach(function (l) { if (l.key !== "wages") items.push(l); });
    ndisLines(f).forEach(function (l) { items.push(l); });
    items.push(concessionLine(f));
  }
  return items;
}
const SUMMARY_FOOTER = "These numbers are estimates, not a promise. Your Centrelink letter shows your real payment.";

function spokenSummary() {
  const f = facts();
  const title = { dashboard: "Summary.", jobs: "Jobs.", money: "Your money.", claim: "Concessions." }[state.view];
  return [title].concat(summaryItems(state.view, f).map(function (i) { return i.text; }), [SUMMARY_FOOTER]).join(" ");
}

/* ============================== NOTICES ============================== */
function showNotice(id, tone, html, actions) {
  let el = document.getElementById("notice-" + id);
  if (!el) { el = document.createElement("div"); el.id = "notice-" + id; $("#notices").appendChild(el); }
  el.className = "note note-" + tone;
  el.innerHTML = (tone === "warn" ? ICON.warn : ICON.info) + '<div><p>' + html + '</p>' +
    (actions ? '<p class="footer-actions">' + actions + '</p>' : '') + '</div>';
}
function clearNotice(id) { const el = document.getElementById("notice-" + id); if (el) el.remove(); }

function renderNotices() {
  const rep = state.loadReport || {};
  if (rep.status === "corrupt") {
    showNotice("corrupt", "warn", "Some saved answers could not be read. They have been set aside, not deleted. You can delete them in <strong>Privacy and your data</strong>.",
      '<button type="button" class="btn btn-secondary btn-sm" data-open-dialog="privacy-dialog">Privacy and your data</button>');
  } else clearNotice("corrupt");
  if (rep.status === "unavailable") showNotice("nostore", "info", "This browser is blocking storage, so nothing can be saved. Capable still works; your answers last only while it is open.");
  const legacy = rep.legacy && !state.legacyDismissed && getPref(E.LEGACY_KEY) !== null;
  if (legacy) {
    const bits = [];
    if (rep.legacy.unreadable) bits.push("a record that could not be read");
    else {
      if (rep.legacy.hoursPerWeek) bits.push("hours a week (" + rep.legacy.hoursPerWeek + ")");
      if (rep.legacy.needs) bits.push("job needs");
      if (rep.legacy.wages) bits.push("a wages amount (" + esc(rep.legacy.wages) + ")");
    }
    showNotice("legacy", "info", "<strong>An earlier version of Capable saved some answers on this device:</strong> " + (bits.join(", ") || "a few settings") +
      ". They may have been the demo's figures. Nothing has been done with them.",
      (rep.legacy.unreadable ? "" : '<button type="button" class="btn btn-sm" id="legacy-use">Use them in my own session</button>') +
      '<button type="button" class="btn btn-secondary btn-sm" id="legacy-delete">Delete them</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="legacy-later">Decide later</button>');
  } else clearNotice("legacy");
  if (!navigator.onLine) showNotice("offline", "info", "You are offline. Capable works fully offline. Government figures shown were last checked on " + fmtDate(R.checkedOn) + ". Links to official websites need a connection.");
  else clearNotice("offline");
}

/* ============================== HEADER / PROFILE ============================== */
function renderProfile() {
  const btn = $("#profile-btn"), panel = $("#profile-panel");
  const p = D.DEMO_PROFILE;
  if (state.mode === "demo") {
    btn.removeAttribute("aria-label");
    btn.innerHTML = '<span class="avatar" aria-hidden="true">' + p.initials + '</span><span class="pf-text"><strong>Demo</strong></span><span class="visually-hidden">Demo session menu</span>' + chev();
    panel.innerHTML = '<div class="profile-head"><span class="avatar" aria-hidden="true">' + p.initials + '</span><span><strong>' + esc(p.name) + '</strong><br><span class="muted-line">' + esc(p.place) + '</span></span></div>' +
      '<div class="chiprow">' + p.chips.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join("") + '</div>' +
      '<p class="small fineprint">You are trying the demo. Everything here is made up, and nothing you change in the demo is saved.</p><hr class="menu-sep">' +
      '<button type="button" class="menu-item" data-mode="personal">' + (hasPersonalAnswers() ? "Back to my own session" : "Start my own session (blank)") + '</button>' +
      '<button type="button" class="menu-item" data-open-dialog="privacy-dialog">Privacy and your data</button>';
  } else {
    btn.removeAttribute("aria-label");
    btn.innerHTML = '<span class="avatar" aria-hidden="true">Me</span><span class="pf-text"><strong>My session</strong></span><span class="visually-hidden">My session menu</span>' + chev();
    panel.innerHTML = '<div class="profile-head"><span class="avatar" aria-hidden="true">Me</span><span><strong>Your own session</strong><br><span class="muted-line">' +
      (state.saveConsent ? "Saved on this device" : "Not saved — answers last only while Capable is open") + '</span></span></div><hr class="menu-sep">' +
      '<button type="button" class="menu-item" data-open-dialog="privacy-dialog">Privacy and your data</button>' +
      '<button type="button" class="menu-item" data-mode="demo">Try the demo instead</button>';
  }
  function chev() { return '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>'; }
}

function hasPersonalAnswers() {
  return JSON.stringify(E.sanitizePersonal(state.personal)) !== JSON.stringify(E.blankPersonal());
}

/* ============================== VIEW TOOLS ============================== */
function viewToolsHtml() {
  return '<ul class="view-tools">' +
    '<li><button type="button" class="tool-btn" data-tool="ask">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>Ask Capable</button></li>' +
    '<li><button type="button" class="tool-btn" data-tool="speak">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9.5a3.5 3.5 0 0 1 0 5"/><path d="M19.5 7a7 7 0 0 1 0 10"/></svg><span data-speak-label>Read this to me</span></button></li>' +
    '<li><button type="button" class="tool-btn" data-tool="share">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3v13"/><path d="m8 7 4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg><span data-share-label>Share this summary</span></button></li>' +
    '<li><button type="button" class="tool-btn" data-tool="awake" aria-pressed="' + (awake.on ? "true" : "false") + '">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>Keep screen on</button></li>' +
    '</ul>';
}

function modeBanner() {
  if (state.mode === "demo") {
    return '<p class="mode-banner">' + ICON.info + ' <span><strong>Demo.</strong> You are looking at a made-up person, ' + esc(D.DEMO_PROFILE.name) +
      '. <button type="button" class="linklike" data-mode="personal">' + (hasPersonalAnswers() ? "Back to my own session" : "Start my own session") + '</button></span></p>';
  }
  return '<p class="mode-banner">' + ICON.lock + ' <span><strong>Your own session.</strong> ' +
    (state.saveConsent ? "Saved on this device only." : "Not saved — your answers last only while Capable is open.") +
    ' <button type="button" class="linklike" data-open-dialog="privacy-dialog">Privacy and your data</button></span></p>';
}

function checkedNote() {
  return '<p class="small muted">' + ICON.info + ' Government figures last checked on ' + fmtDate(R.checkedOn) +
    '. Some could only be checked indirectly — see <button type="button" class="linklike" data-open-dialog="about-dialog">sources and checks</button>.</p>';
}

/* ============================== DASHBOARD ============================== */
function renderDashboard() {
  const f = facts();
  const d = f.dsp;
  const h = [];
  h.push('<div class="view-intro"><h1>' + (state.mode === "demo" ? "Hello, " + esc(D.DEMO_PROFILE.firstName) + " (demo)" : "Your summary") + '</h1>');
  h.push('<p>Everything is per fortnight — every 2 weeks.</p></div>');
  h.push(modeBanner());
  h.push(viewToolsHtml());
  h.push('<div class="widget-grid" role="group" aria-label="Your summaries">');

  h.push('<section class="card widget" aria-labelledby="dash-jobs-h"><h2 id="dash-jobs-h">' + navIcon("jobs", 18) + ' Job mapping</h2>');
  h.push('<p class="widget-value" aria-hidden="true">' + f.jobs.length + '</p>');
  h.push('<p class="widget-caption"><strong data-fact="jobs">' + f.jobs.length + ' sample ' + plural(f.jobs.length, "job fits", "jobs fit") + '</strong> up to ' + f.hoursPerWeek + ' hours a week. Examples, not real vacancies.</p>');
  h.push('<button type="button" class="btn btn-secondary btn-sm" data-goto="jobs">See the sample jobs</button></section>');

  h.push('<section class="card widget" aria-labelledby="dash-money-h"><h2 id="dash-money-h">' + navIcon("money", 18) + ' Pension estimate</h2>');
  if (d.status === "ok") {
    h.push('<p class="widget-value money" aria-hidden="true">' + fm(d.paymentCents, { whole: true }) + '</p>');
    h.push('<p class="widget-caption"><strong data-fact="dsp">' + fm(d.paymentCents) + '</strong> estimated DSP a fortnight. With ' + fm(d.wagesCents) + ' wages before tax, that is <strong data-fact="total">' + fm(d.totalCents) + '</strong> together. Income test only.</p>');
  } else {
    h.push('<p class="widget-caption">' + esc(dspLines(d)[0].text) + '</p>');
  }
  h.push('<button type="button" class="btn btn-secondary btn-sm" data-goto="money">' + (d.status === "ok" ? "See how it is worked out" : "Answer the questions") + '</button></section>');

  h.push('<section class="card widget" aria-labelledby="dash-ndis-h"><h2 id="dash-ndis-h">' + ICON.lock + ' NDIS funding</h2>');
  if (f.ndis) {
    const left = f.ndis.kind === "plan" ? f.ndis.totals.flexibleLeftCents : f.ndis.flexibleLeftCents;
    h.push('<p class="widget-value money" aria-hidden="true">' + fm(left, { whole: true }) + '</p>');
    const scope = f.ndis.kind === "plan" ? "left in the whole plan (demo) &mdash; not all may be usable now" :
      f.ndis.scope === "current-period" ? "for the current funding period, as you entered it" : f.ndis.scope === "whole-plan" ? "left in the whole plan, as you entered it" : "as you entered it (whole plan or current period not known)";
    h.push('<p class="widget-caption"><strong data-fact="ndis">' + fm(left) + '</strong> flexible funding ' + scope + '. For plan supports only &mdash; not income or spending money. ' +
      '<span class="small muted">Source: ' + esc(f.ndis.source || "entered by you") + (f.ndis.asOf ? ', as at ' + fmtDate(f.ndis.asOf) : '') + (f.ndis.kind === "manual" ? '. Not checked by Capable' : '') + '.</span></p>');
  } else {
    h.push('<p class="widget-caption">You can note your NDIS balance on the Money page. It is kept separate from your income.</p>');
  }
  h.push('<button type="button" class="btn btn-secondary btn-sm" data-goto="money">Open NDIS funding</button></section>');

  const c = f.concessions;
  h.push('<section class="card widget" aria-labelledby="dash-claim-h"><h2 id="dash-claim-h">' + navIcon("claim", 18) + ' Concessions</h2>');
  h.push('<p class="widget-value" aria-hidden="true">' + c.potential.length + '</p>');
  h.push('<p class="widget-caption"><strong data-fact="concessions">' + c.potential.length + ' you may be able to claim</strong>, based on your answers. ' +
    c.moreInfo.length + ' ' + plural(c.moreInfo.length, "needs", "need") + ' more answers. Not approved until you apply.</p>');
  h.push('<button type="button" class="btn btn-secondary btn-sm" data-goto="claim">Check concessions</button></section>');
  h.push('</div>');

  if (state.mode === "demo") {
    const next = nextDemoReportingDate();
    h.push('<p class="small" style="margin-top:1rem">' + ICON.info + ' <strong>Demo reporting date: ' + dateFmt.format(next) +
      '.</strong> Reporting your income on time is what prevents a debt. Capable cannot report for you.</p>');
  } else {
    h.push('<p class="small" style="margin-top:1rem">' + ICON.info + ' Keep reporting your income to Services Australia on your usual reporting day. Capable cannot report for you and is not connected to Centrelink or the NDIA.</p>');
  }
  h.push(checkedNote());
  $("#view-dashboard").innerHTML = h.join("");
}

function nextDemoReportingDate() {
  const anchor = new Date(D.DEMO_PROFILE.reportingAnchor + "T00:00:00+10:00");
  const asOf = new Date(D.DEMO_PROFILE.asOf + "T00:00:00+10:00");
  let d = anchor;
  while (d < asOf) d = new Date(d.getTime() + 14 * 86400000);
  return d;
}

/* ============================== JOBS ============================== */
const NEED_LABELS = { remote: "Work from home", flexible_hours: "Flexible hours", low_physical_demand: "Low physical demand", quiet_environment: "Quiet environment", public_transport_accessible: "Near public transport" };
const NEED_NOTES = { remote: "The job can be done from home most of the time.", flexible_hours: "You can change start and finish times, or swap shifts.", low_physical_demand: "Little or no lifting, carrying or standing all day.", quiet_environment: "Low noise, low interruption, calm workspace.", public_transport_accessible: "A short walk from an accessible bus, train or ferry stop." };

function renderJobsShell() {
  const c = active().capacity;
  const h = [];
  h.push('<div class="view-intro"><h1>Job mapping</h1><p>Tell us what you can do. We show sample work that fits. We never ask about your diagnosis.</p></div>');
  h.push(modeBanner());
  h.push(viewToolsHtml());
  h.push('<div class="note note-info">' + ICON.info + '<div><p><strong>These are sample jobs at fictional employers.</strong> They are not job ads and are not open for application. They show how matching on capacity works.</p>' +
    '<details class="quiet"><summary>How matching works</summary><p class="small">A job is shown if its hours a week are at or under the hours you can work. It is then ranked by how many of the needs you ticked it meets, and then by pay. Turn on &ldquo;Only show jobs that meet every need&rdquo; to hide partial matches. Nothing about your health or diagnosis is used.</p></details></div></div>');
  h.push('<div class="grid grid-2"><section class="card" aria-labelledby="cap-h"><h2 id="cap-h">Your capacity profile</h2><form id="capacity-form" novalidate>');
  h.push('<fieldset><legend>Hours you can work</legend><label for="hours-number">Hours available per week</label>');
  h.push('<p class="hint" id="hours-hint">2 to 38 hours. Type it, tap minus or plus, or use the slider.</p><div class="stepper">');
  h.push('<button type="button" class="btn btn-secondary step-btn" id="hours-down"' + (c.hoursPerWeek <= 2 ? ' disabled' : '') + '><span aria-hidden="true">&minus;</span><span class="visually-hidden">One hour less</span></button>');
  h.push('<input type="number" id="hours-number" inputmode="numeric" enterkeyhint="done" min="2" max="38" step="1" value="' + c.hoursPerWeek + '" aria-describedby="hours-hint hours-error">');
  h.push('<button type="button" class="btn btn-secondary step-btn" id="hours-up"' + (c.hoursPerWeek >= 38 ? ' disabled' : '') + '><span aria-hidden="true">+</span><span class="visually-hidden">One hour more</span></button></div>');
  h.push('<p class="field-error" id="hours-error" hidden></p>');
  h.push('<input type="range" id="hours" min="2" max="38" step="1" value="' + c.hoursPerWeek + '" aria-label="Hours available per week, slider" aria-describedby="hours-hint"></fieldset>');
  h.push('<fieldset><legend>What you need from a job</legend><p class="hint">Tick what matters to you.</p>');
  E.NEED_KEYS.forEach(function (k) {
    h.push('<label class="check" for="need-' + k + '"><input type="checkbox" id="need-' + k + '" data-need="' + k + '"' + (c.needs[k] ? " checked" : "") + ' aria-describedby="need-' + k + '-note">' +
      '<span>' + esc(NEED_LABELS[k]) + '<span class="check-note" id="need-' + k + '-note">' + esc(NEED_NOTES[k]) + '</span></span></label>');
  });
  h.push('</fieldset><fieldset><legend>How strict should we be?</legend><label class="check" for="strict"><input type="checkbox" id="strict"' + (c.strictOnly ? " checked" : "") + ' aria-describedby="strict-note">' +
    '<span>Only show jobs that meet every need I ticked<span class="check-note" id="strict-note">Leave this off to also see jobs that meet most of your needs.</span></span></label></fieldset></form></section>');
  h.push('<section aria-labelledby="results-h"><h2 id="results-h">Sample jobs that fit</h2><div id="jobs-count"></div><div id="jobs-results"></div></section></div>');
  $("#view-jobs").innerHTML = h.join("");

  $("#hours").addEventListener("input", function (e) { setHours(Number(e.target.value), "range"); });
  $("#hours-number").addEventListener("input", function (e) {
    const raw = e.target.value.trim();
    if (raw === "") return setHoursError("Enter how many hours a week you can work, as a whole number from 2 to 38.");
    if (!/^\d+$/.test(raw)) return setHoursError("Enter whole hours as a number, like 16.");
    const v = Number(raw);
    if (v < 2 || v > 38) { setHoursError("Enter a number from 2 to 38. Showing jobs for " + Math.min(38, Math.max(2, v)) + " hours for now."); setHours(v, "number"); return; }
    setHoursError(null); setHours(v, "number");
  });
  $("#hours-number").addEventListener("blur", function (e) { setHoursError(null); setHours(Number(e.target.value), "blur"); });
  $("#hours-down").addEventListener("click", function () { setHours(active().capacity.hoursPerWeek - 1, "step"); });
  $("#hours-up").addEventListener("click", function () { setHours(active().capacity.hoursPerWeek + 1, "step"); });
  $$("[data-need]").forEach(function (cb) { cb.addEventListener("change", function () { active().capacity.needs[cb.dataset.need] = cb.checked; changed("jobs"); }); });
  $("#strict").addEventListener("change", function (e) { active().capacity.strictOnly = e.target.checked; changed("jobs"); });
  renderJobResults();
}

function setHoursError(msg) {
  const input = $("#hours-number"), el = $("#hours-error");
  input.setAttribute("aria-invalid", msg ? "true" : "false");
  el.hidden = !msg;
  el.innerHTML = msg ? ICON.alert + " <span>" + esc(msg) + "</span>" : "";
}

function setHours(value, source) {
  let v = Math.round(Number(value));
  if (isNaN(v)) v = active().capacity.hoursPerWeek;
  v = Math.min(38, Math.max(2, v));
  active().capacity.hoursPerWeek = v;
  if (source !== "range") $("#hours").value = String(v);
  if (source !== "number") $("#hours-number").value = String(v);
  $("#hours-down").disabled = v <= 2; $("#hours-up").disabled = v >= 38;
  changed("jobs");
}

function starsHtml(rating) {
  let out = '<span class="stars" aria-hidden="true">';
  for (let i = 1; i <= 5; i++) out += rating >= i - 0.25
    ? '<svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9Z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" focusable="false"><path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9Z"/></svg>';
  return out + '</span>';
}

function jobReviewHtml(id) {
  const rev = D.REVIEWS[id];
  if (!rev) return "";
  const tone = rev.rating >= 3.2 ? "warn" : "danger";
  const q = rev.quotes[0];
  return '<div class="job-review"><p class="jr-head"><strong>Sample reviews</strong> <span class="badge badge-demo">Made up</span></p>' +
    '<p class="jr-rating">' + starsHtml(rev.rating) + ' <strong>' + rev.rating.toFixed(1) + ' out of 5</strong> from ' + rev.count + ' fictional ' + plural(rev.count, "reviewer", "reviewers") + '.</p>' +
    '<div class="jr-bits"><span class="badge badge-good">' + ICON.tick + ' Best: ' + esc(rev.best) + '</span><span class="badge badge-' + tone + '">' + ICON.warn + ' Hardest: ' + esc(rev.worst) + '</span></div>' +
    '<ul class="quotes"><li><blockquote>&ldquo;' + esc(q.text) + '&rdquo;</blockquote><p class="small muted">' + esc(q.who) + ' &mdash; on ' + esc(q.tag) + '</p></li></ul></div>';
}

function thirtyHourNote() {
  const r = R.dsp.thirtyHourRule;
  return '<div class="note note-info">' + ICON.card + '<div><p><strong>Working ' + r.amount + ' hours a week or more.</strong> ' + r.conditions.map(esc).join(" ") + '</p>' +
    ((r.excerptConditions || []).length ? '<p class="small"><strong>Provisional, from search excerpts only:</strong> ' + r.excerptConditions.map(esc).join(" ") + '</p>' : '') +
    '<p class="small">' + extLink(r.source, "Working while on DSP — Services Australia", "Services Australia") + '</p></div></div>';
}

function renderJobResults() {
  const a = active(), f = facts(), results = f.jobs;
  const selected = E.NEED_KEYS.filter(function (k) { return a.capacity.needs[k]; }).length;
  const current = f.dsp;
  $("#jobs-count").innerHTML = '<p class="midnum" style="margin-bottom:.4rem">' +
    (results.length ? results.length + " sample " + plural(results.length, "job fits", "jobs fit") : "No sample jobs fit yet") + '</p>' +
    '<p class="small muted">Up to ' + a.capacity.hoursPerWeek + ' hours a week, ' + (selected ? selected + ' ' + plural(selected, "need", "needs") + ' ticked' : 'no needs ticked') +
    (a.capacity.strictOnly ? ', only jobs meeting every need.' : ', best fit first.') + '</p>';
  const h = [];
  if (!results.length) h.push('<div class="note note-info">' + ICON.info + '<div><p><strong>Nothing fits yet.</strong> Try more hours a week (the shortest sample job is 8), or turn off &ldquo;Only show jobs that meet every need&rdquo;.</p></div></div>');
  if (current.status !== "ok") {
    h.push('<p class="small">' + ICON.info + ' To see how each job might change your Disability Support Pension, answer the questions on the <button type="button" class="linklike" data-goto="money">Money page</button>.</p>');
  }
  if (results.some(function (r) { return r.job.hoursPerWeek >= R.dsp.thirtyHourRule.amount; })) h.push(thirtyHourNote());
  h.push('<ul class="results">');
  results.forEach(function (r) {
    const job = r.job, m = r.m, pay = E.jobFortnightCents(job);
    h.push('<li class="result"><h3>' + esc(job.title) + ' <span class="badge badge-demo">Sample</span></h3>');
    h.push('<p class="result-meta"><span>' + esc(job.employer) + '</span><span>' + esc(job.suburb) + '</span><span><span class="num">' + job.hoursPerWeek + '</span> hrs a week</span><span class="money">' + fm(E.toCents(job.hourlyRate)) + ' an hour</span></p>');
    h.push('<p>' + esc(job.summary) + '</p>');
    h.push('<p><strong>' + (selected ? "Meets " + m.metCount + " of your " + selected + " " + plural(selected, "need", "needs") : "You have not ticked any needs") + '.</strong>' +
      (m.meetsAll ? ' <span class="badge badge-good">' + ICON.tick + ' Meets everything you asked for</span>' : '') + '</p>');
    h.push('<details class="quiet"><summary>What this job is like</summary><ul class="taglist">');
    E.NEED_KEYS.forEach(function (k) {
      const wanted = a.capacity.needs[k], has = job.attrs[k];
      if (!wanted && !has) return;
      h.push('<li><span class="tag ' + (has ? "tag-yes" : "tag-no") + '">' + (has ? ICON.tick : ICON.cross) + '<span class="visually-hidden">' + (has ? "Yes" : "No") + ': </span>' +
        esc(NEED_LABELS[k]) + (wanted ? '' : ' <span class="small">(not on your list)</span>') + '</span></li>');
    });
    h.push('</ul></details>');
    h.push('<dl class="figrow"><div><dt>Wages a fortnight, before tax</dt><dd class="money">' + fm(pay) + '</dd></div>');
    if (current.status === "ok") {
      const est = E.estimateDsp(Object.assign({}, a.dsp, { wages: (pay / 100).toFixed(2) }));
      h.push('<div><dt>Estimated DSP (total)</dt><dd class="money">' + fm(est.paymentCents) + '</dd></div><div><dt>Gross wages plus DSP</dt><dd class="money">' + fm(est.totalCents) + '</dd></div></dl>');
      const diff = est.totalCents - current.totalCents;
      h.push('<p class="small"><strong>' + (diff >= 0 ? fm(diff) + " more" : fm(-diff) + " less") + ' a fortnight than your current entry</strong> (' + fm(current.totalCents) + '), counting only wages and the DSP income test. ' +
        'Not counted: tax, travel and other work costs, Work Bonus, and changes to concessions.</p>');
    } else h.push('</dl>');
    h.push(jobReviewHtml(job.id));
    h.push('</li>');
  });
  h.push('</ul>');
  $("#jobs-results").innerHTML = h.join("");
}

/* ============================== MONEY ============================== */
function radioGroup(name, legend, options, value, hintHtml) {
  const h = ['<fieldset class="choice-group"' + (hintHtml ? ' aria-describedby="' + name + '-hint"' : '') + '><legend>' + esc(legend) + '</legend>'];
  if (hintHtml) h.push('<p class="hint" id="' + name + '-hint">' + hintHtml + '</p>');
  options.forEach(function (o, i) {
    const id = name + "-" + i;
    h.push('<label class="check" for="' + id + '"><input type="radio" id="' + id + '" name="' + name + '" value="' + esc(o[0]) + '"' + (value === o[0] ? " checked" : "") + '><span>' + esc(o[1]) + '</span></label>');
  });
  h.push('</fieldset>');
  return h.join("");
}

function renderMoneyShell() {
  const a = active();
  const h = [];
  h.push('<div class="view-intro"><h1>Money</h1><p>Your wages and a Disability Support Pension estimate, per fortnight. Your NDIS funding is shown separately, because it is not income.</p></div>');
  h.push(modeBanner());
  h.push(viewToolsHtml());

  h.push('<section class="card" aria-labelledby="dsp-h"><h2 id="dsp-h">Disability Support Pension estimate</h2>');
  h.push('<p>This estimates the <strong>income test</strong> only, for one situation: a single person aged 21 or over and under Age Pension age, with no dependent children, whose only other income is wages, with no Working Credit in use and no assets-test reduction. It does not decide whether you qualify for DSP.</p>');
  h.push('<form id="dsp-form" novalidate>');
  E.DSP_QUESTIONS.forEach(function (q) { h.push(radioGroup("dsp-" + q.key, q.label, q.options, a.dsp[q.key])); });
  h.push('<fieldset><legend>Your wages this fortnight</legend><label for="wages">Gross wages (before tax and deductions), for the last 14 days</label>');
  h.push('<p class="hint" id="wages-hint">A number in dollars, like 390 or 390.50. Use the gross amount: before tax and before any deductions. If you were not paid, enter 0.</p>');
  h.push('<input type="text" id="wages" inputmode="decimal" enterkeyhint="done" autocomplete="off" spellcheck="false" value="' + esc(a.dsp.wages) + '" aria-describedby="wages-hint wages-error" style="max-width:16rem">');
  h.push('<p class="field-error" id="wages-error" hidden></p>');
  h.push('<label for="payslip" style="margin-top:1rem">Or take a photo of your payslip to read the amount from</label>');
  h.push('<p class="hint" id="payslip-hint">The photo stays on this device and is not saved. Press and hold the number in it to copy it.</p>');
  h.push('<input type="file" id="payslip" accept="image/*" capture="environment" aria-describedby="payslip-hint"><p class="small" id="payslip-status" role="status"></p><div id="payslip-preview"></div>');
  h.push('</fieldset></form>');
  h.push('<div id="dsp-result"></div></section>');

  h.push('<section aria-labelledby="ndis-h" style="margin-top:2rem"><h2 id="ndis-h">NDIS funding</h2>');
  const s = R.ndis.supports;
  h.push('<div class="note note-info">' + ICON.lock + '<div><p><strong>This is not income or spending money.</strong> ' + s.conditions.map(esc).join(" ") + '</p><p class="small">' +
    extLink(s.source, "What are NDIS supports — NDIS", "NDIS") + '</p></div></div>');
  const fp = R.ndis.fundingPeriods;
  h.push('<details class="data-table"><summary>Whole plan or this funding period?</summary><ul class="small" style="margin-top:.5rem">' + fp.conditions.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join("") +
    '</ul><p class="small">' + extLink(fp.source, "What is NDIS funding — NDIS", "NDIS") + '</p></details>');
  h.push('<div id="ndis-body"></div></section>');
  $("#view-money").innerHTML = h.join("");

  $("#dsp-form").addEventListener("change", function (e) {
    const t = e.target;
    if (t.type === "radio" && t.name.indexOf("dsp-") === 0) { active().dsp[t.name.slice(4)] = t.value; changed("dsp"); }
  });
  const wages = $("#wages");
  wages.addEventListener("input", function () { active().dsp.wages = wages.value; showWagesError(false); changed("dsp"); });
  wages.addEventListener("blur", function () { showWagesError(true); });
  $("#payslip").addEventListener("change", function (e) {
    const file = e.target.files && e.target.files[0];
    const status = $("#payslip-status"), preview = $("#payslip-preview");
    if (!file) { status.textContent = ""; preview.innerHTML = ""; return; }
    const url = URL.createObjectURL(file);
    preview.innerHTML = '<img src="' + url + '" alt="The payslip photo you just added." style="max-width:100%;border-radius:var(--radius-sm);border:1px solid var(--border);margin-top:.6rem">';
    status.textContent = "Photo added. It stays on this device and is not saved. Press and hold the amount in the picture to copy it, then paste it into the wages box.";
  });
  renderDspResult();
  renderNdis();
}

function showWagesError(onBlur) {
  const p = E.parseMoney(active().dsp.wages);
  const el = $("#wages-error"), input = $("#wages");
  const show = !p.ok && (p.code !== "missing" || onBlur);
  input.setAttribute("aria-invalid", show ? "true" : "false");
  el.hidden = !show;
  el.innerHTML = show ? ICON.alert + " <span>" + esc(p.error) + "</span>" : "";
}

const DSP_LABEL = {};
E.DSP_QUESTIONS.forEach(function (q) { DSP_LABEL[q.key] = q.label; });
DSP_LABEL.wages = "Your wages this fortnight";

/* How the DSP figures were checked, stated per figure. */
function provisionalNote(entries) {
  const rev = entries.filter(function (e) { return e.status === "review-confirmed"; });
  const ex = entries.filter(function (e) { return e.status === "excerpt"; });
  const h = [];
  if (rev.length) h.push('<strong>Checked by independent review:</strong> ' + rev.map(function (e) { return esc(e.name.split(" — ")[0].replace(/^DSP /, "")); }).join("; ") +
    '. A reviewer read the full official pages (reported ' + rev.map(function (e) { return e.verifiedOn; }).filter(function (d, i, a) { return a.indexOf(d) === i; }).sort().map(fmtDate).join(" and ") + '); Capable&rsquo;s own checking tools could not open them.');
  if (ex.length) h.push('<strong>Provisional:</strong> ' + ex.map(function (e) { return esc(e.name.replace(/^DSP /, "")); }).join("; ") +
    ' &mdash; confirmed only from search excerpts of the official page on ' + fmtDate(ex[0].verifiedOn) + '.');
  if (!h.length) return "";
  return '<p class="small">' + ICON.info + ' ' + h.join(" ") + ' ' + extLink(R.dsp.maxRateSingle21.source, "Check on Services Australia", "Services Australia") + '</p>';
}

function renderDspResult() {
  const d = facts().dsp;
  const r = R.dsp;
  const h = [];
  if (d.status === "incomplete") {
    h.push('<div class="note note-info">' + ICON.info + '<div><p><strong>More information needed.</strong> Answer these to see an estimate:</p><ul>' +
      d.missing.map(function (k) { return '<li>' + esc(DSP_LABEL[k]) + '</li>'; }).join("") + '</ul><p class="small">Unanswered questions are never assumed.</p></div></div>');
  } else if (d.status === "unsupported") {
    h.push('<div class="note note-warn">' + ICON.warn + '<div><p><strong>Capable cannot estimate your payment for this situation.</strong> Using the single-person formula would give a misleading number, so none is shown.</p><ul>' +
      d.unsupported.map(function (u) { return '<li>' + esc(u.text) + ' ' + extLink(u.url, "Official guidance", "Services Australia") + '</li>'; }).join("") +
      '</ul><p class="small">Services Australia can work out your real amount: ring ' + telLink(R.helpLines.servicesAustralia) + '.</p></div></div>');
  } else if (d.status === "invalid") {
    h.push('<div class="note note-danger">' + ICON.alert + '<div><p><strong>Check the wages amount.</strong> ' + esc(d.wagesError) + '</p><p class="small">No estimate is shown until the amount is valid.</p></div></div>');
  } else if (d.status === "unverified-rules") {
    h.push('<div class="note note-warn">' + ICON.warn + '<div><p>The DSP figures in this version have not been confirmed, so no estimate is shown.</p></div></div>');
  } else if (d.status === "uncertain") {
    h.push('<div class="note note-warn">' + ICON.warn + '<div><p><strong>No estimate yet: you were not sure about these.</strong> Each one can change your payment, so an ordinary estimate might not be yours.</p><ul>' +
      d.unsure.map(function (k) { return '<li>' + esc(DSP_LABEL[k]) + '</li>'; }).join("") +
      '</ul><p class="small">Your Centrelink letters, or your income statement in myGov, will show these. Or ring Services Australia on ' + telLink(R.helpLines.servicesAustralia) + '.</p></div></div>');
  } else {
    h.push('<dl class="figrow" style="margin-top:.4rem"><div><dt>Gross wages</dt><dd class="money">' + fm(d.wagesCents) + '</dd></div>' +
      '<div><dt>Estimated DSP (total, incl. supplements)</dt><dd class="money" data-fact="dsp">' + fm(d.paymentCents) + '</dd></div>' +
      '<div><dt>Gross wages plus DSP</dt><dd class="money" data-fact="total">' + fm(d.totalCents) + '</dd></div></dl>');
    if (d.belowFreeArea) {
      h.push('<div class="note note-good">' + ICON.ok + '<div><p><strong>The income test does not reduce your payment.</strong> Your wages are at or under the ' + fm(d.freeAreaCents) +
        ' income free area. You could earn ' + fm(d.headroomCents) + ' more this fortnight before it would.</p></div></div>');
    } else if (d.paymentStops) {
      h.push('<div class="note note-warn">' + ICON.warn + '<div><p><strong>At this income, the estimated payment is $0.</strong> Your wages are above the point where the income test reduces DSP to nothing.</p></div></div>');
      h.push(thirtyHourNote());
    } else {
      h.push('<div class="note note-info">' + ICON.info + '<div><p><strong>The income test reduces your payment by ' + fm(d.reductionCents) + '.</strong> That is ' +
        Math.round(d.taper * 100) + ' cents for each dollar of the ' + fm(d.overCents) + ' you earned above ' + fm(d.freeAreaCents) + '.</p></div></div>');
    }
    h.push('<p><strong>Compared with earning no wages:</strong> ' + fm(d.vsNoWagesCents) + ' more a fortnight (' + fm(d.totalCents) + ' instead of the ' + fm(d.maxRateCents) + ' maximum total DSP alone). ' +
      'This counts only your gross wages and the DSP income test. It does not count income tax, travel and other work costs, Work Bonus, Working Credit, Rent Assistance, other income, the assets test, or any change to concessions.</p>');
    h.push('<p class="small">If this fortnight&rsquo;s total stayed exactly the same for all 26 fortnights, it would come to ' + fm(d.annualIfUnchangedCents) + ' a year. Pay and rates usually change, so treat this as a rough guide only.</p>');
    if (d.caveats.length) h.push('<div class="note note-warn">' + ICON.warn + '<div>' + d.caveats.map(function (c) { return '<p>' + esc(c) + '</p>'; }).join("") + '</div></div>');
    h.push('<details class="data-table"><summary>Show the working, step by step</summary><div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table><caption>How the estimate was worked out</caption><thead><tr><th scope="col">Step</th><th class="num" scope="col">Amount</th></tr></thead><tbody>' +
      '<tr><th scope="row">Maximum total DSP, adult single 21 or over, including Pension Supplement and Energy Supplement (from ' + fmtDate(r.maxRateSingle21.effectiveFrom) + ')</th><td class="num">' + fm(d.maxRateCents) + '</td></tr>' +
      '<tr><th scope="row">Your gross wages (before tax and deductions)</th><td class="num">' + fm(d.wagesCents) + '</td></tr>' +
      '<tr><th scope="row">Income free area (single)</th><td class="num">' + fm(d.freeAreaCents) + '</td></tr>' +
      '<tr><th scope="row">Wages above the free area</th><td class="num">' + fm(d.overCents) + '</td></tr>' +
      '<tr><th scope="row">Reduction at ' + Math.round(d.taper * 100) + ' cents per dollar, rounded to the nearest cent</th><td class="num">&minus;' + fm(d.reductionCents) + '</td></tr>' +
      '<tr><th scope="row">Estimated total DSP (not below $0)</th><td class="num">' + fm(d.paymentCents) + '</td></tr>' +
      '<tr><th scope="row">Gross wages plus DSP</th><td class="num">' + fm(d.totalCents) + '</td></tr></tbody></table></div></details>');
  }
  h.push('<details class="data-table"><summary>What this estimate assumes and leaves out</summary>');
  h.push('<p class="small" style="margin-top:.5rem"><strong>Assumes:</strong> single; aged 21 or over and under Age Pension age (so no Work Bonus); no dependent children; not permanently blind; no Rent Assistance; no Working Credit in use; not reduced by the assets test; wages are your only income; the standard (not transitional) rate; and wages are gross &mdash; ' +
    esc(r.grossIncome.conditions[0]) + ' The maximum used (' + fm(E.toCents(r.maxRateSingle21.amount)) + ') is the total including Pension Supplement and Energy Supplement, not the basic rate. Reductions are rounded to the nearest cent; Services Australia&rsquo;s own rounding may differ by a cent.</p>');
  h.push('<p class="small"><strong>Leaves out:</strong></p><ul class="small">' + R.dspNotIncluded.map(function (n) { return '<li>' + esc(n.text) + ' ' + extLink(n.url, "More", "Services Australia") + '</li>'; }).join("") + '</ul>');
  h.push('<p class="small"><strong>If this and a Centrelink letter disagree, believe the letter.</strong> Capable is not connected to Centrelink, cannot report your income, and cannot create a debt.</p></details>');
  h.push(provisionalNote([r.maxRateSingle21, r.incomeFreeAreaSingle, r.grossIncome, r.taperSingle]));
  h.push('<p class="small muted">Maximum rate effective ' + fmtDate(r.maxRateSingle21.effectiveFrom) + '; income free area effective ' + fmtDate(r.incomeFreeAreaSingle.effectiveFrom) + '; both confirmed ' + fmtDate(r.maxRateSingle21.verifiedOn) + '.</p>');
  $("#dsp-result").innerHTML = h.join("");
}

function telLink(line) { return '<a href="tel:' + esc(line.tel) + '">' + esc(line.phone) + '</a>'; }

function renderNdis() {
  if (state.mode === "demo") return renderDemoPlan();
  const n = active().ndis;
  const v = E.validateManualNdis(n);
  const h = [];
  h.push('<div class="card"><h3>Note your NDIS balance (optional)</h3><p class="small">If you want, type in the flexible funding left in your plan, from wherever you checked it. Capable shows it on its own, labelled with where and when you got it. It is never added to your income.</p><form id="ndis-form" novalidate>');
  h.push('<label for="ndis-balance">Flexible funding left, in dollars</label><input type="text" id="ndis-balance" inputmode="decimal" autocomplete="off" value="' + esc(n.balance) + '" aria-describedby="ndis-balance-err" style="max-width:16rem"><p class="field-error" id="ndis-balance-err"' + (v.errors.balance ? '' : ' hidden') + '>' + (v.errors.balance ? ICON.alert + ' <span>' + esc(v.errors.balance) + '</span>' : '') + '</p>');
  h.push('<label for="ndis-asof" style="margin-top:.8rem">Date you checked it</label><input type="date" id="ndis-asof" value="' + esc(n.asOf) + '" aria-describedby="ndis-asof-err" style="max-width:16rem"><p class="field-error" id="ndis-asof-err"' + (v.errors.asOf ? '' : ' hidden') + '>' + (v.errors.asOf ? ICON.alert + ' <span>' + esc(v.errors.asOf) + '</span>' : '') + '</p>');
  h.push('<label for="ndis-source" style="margin-top:.8rem">Where the balance came from</label><input type="text" id="ndis-source" maxlength="80" value="' + esc(n.source) + '" aria-describedby="ndis-source-hint ndis-source-err" style="max-width:24rem"><p class="hint" id="ndis-source-hint">For example: my NDIS app, my plan manager&rsquo;s statement.</p><p class="field-error" id="ndis-source-err"' + (v.errors.source ? '' : ' hidden') + '>' + (v.errors.source ? ICON.alert + ' <span>' + esc(v.errors.source) + '</span>' : '') + '</p>');
  h.push(radioGroup("ndis-scope", "What does this balance cover?", [["whole-plan", "What is left in my whole plan"], ["current-period", "My current funding period only"], ["unknown", "I'm not sure"]], n.scope || "",
    "Newer plans release funding in periods, usually 3 months. Your NDIS app or portal shows both."));
  h.push('</form><div id="ndis-summary"></div></div>');
  h.push('<p class="small muted">Tracking each NDIS budget and claim is not available in your own session in this version. The demo shows how it would work.</p>');
  $("#ndis-body").innerHTML = h.join("");
  [["ndis-balance", "balance"], ["ndis-asof", "asOf"], ["ndis-source", "source"]].forEach(function (pair) {
    const el = document.getElementById(pair[0]);
    el.addEventListener("change", function () { active().ndis[pair[1]] = el.value; changed("ndis"); renderNdis(); const again = document.getElementById(pair[0]); if (again) again.focus(); });
  });
  $$('input[name="ndis-scope"]').forEach(function (r) {
    r.addEventListener("change", function () { active().ndis.scope = r.value; changed("ndis"); renderNdisSummary(E.validateManualNdis(active().ndis)); });
  });
  renderNdisSummary(v);
}

function renderNdisSummary(v) {
  const el = $("#ndis-summary");
  if (!el) return;
  if (v.balanceCents === null) { el.innerHTML = ""; return; }
  el.innerHTML = '<p class="midnum" style="margin:.8rem 0 .2rem"><span data-fact="ndis">' + fm(v.balanceCents) + '</span> flexible NDIS funding, as you entered it</p>' +
    '<p class="small">' + esc(NDIS_SCOPE_TEXT[v.scope]) + '</p>' +
    '<p class="small muted">Source: ' + esc(v.source || "not given") + '. As at: ' + (v.asOf ? fmtDate(v.asOf) : "not given") +
    '. Entered by you and not checked by Capable &mdash; it may not all be available to use right now. For plan supports only: not income, and not included in any income total.</p>';
}

function renderDemoPlan() {
  const plan = D.DEMO_PLAN;
  const start = new Date(plan.planStart + "T00:00:00+10:00"), end = new Date(plan.planEnd + "T00:00:00+10:00"), asOf = new Date(plan.asOf + "T00:00:00+10:00");
  const t = E.planTotals(plan);
  const h = [];
  h.push('<p class="small"><span class="badge badge-demo">Demo</span> Source: ' + esc(plan.source) + '. Figures as at ' + fmtDate(plan.asOf) + '. Plan year ' + fmtDate(plan.planStart) + ' to ' + fmtDate(plan.planEnd) + '.</p>');
  h.push('<div class="widget-grid" style="margin-bottom:1rem">' +
    '<div class="card widget widget-stat"><h3>Funded in total</h3><p class="widget-value money">' + fm(t.allocatedCents) + '</p></div>' +
    '<div class="card widget widget-stat"><h3>Spent so far</h3><p class="widget-value money">' + fm(t.spentCents) + '</p></div>' +
    '<div class="card widget widget-stat"><h3>Flexible funding left in the whole plan</h3><p class="widget-value money" data-fact="ndis">' + fm(t.flexibleLeftCents) + '</p><p class="widget-caption small">For plan supports only. Not all may be usable now.</p></div>' +
    '<div class="card widget widget-stat"><h3>' + ICON.lock + ' Stated, locked to one item</h3><p class="widget-value money">' + fm(t.statedLeftCents) + '</p></div></div>');
  h.push('<p class="small muted">' + ICON.info + ' These demo figures are whole-plan totals. If a plan has funding periods, only the current period&rsquo;s share can be used now, and the demo does not show periods.</p>');
  h.push('<p class="small muted">' + ICON.info + ' Funding can move within a budget, never between Core, Capacity Building and Capital. Stated supports can only buy what the plan names.</p>');
  plan.budgets.forEach(function (b) {
    h.push('<section style="margin-top:1.5rem" aria-labelledby="b-' + b.id + '-h"><h3 id="b-' + b.id + '-h" style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap"><span class="pill ' + b.pillClass + '">' + esc(b.pillLabel) + '</span> ' + esc(b.name) + '</h3>');
    h.push('<p class="small muted">' + esc(b.note) + '</p><div class="cat-grid">');
    b.categories.forEach(function (c) {
      const s = E.categoryStats(c, start, end, asOf);
      const pct = Math.round(s.usedPct * 100);
      let badge;
      if (c.stated) badge = '<span class="badge badge-info">' + ICON.lock + ' Stated</span>';
      else if (s.status === "danger") badge = '<span class="badge badge-danger">' + ICON.warn + ' Running low</span>';
      else if (s.status === "warn") badge = '<span class="badge badge-warn">' + ICON.warn + ' Watch this one</span>';
      else badge = '<span class="badge badge-good">' + ICON.ok + ' On track</span>';
      h.push('<div class="cat-card"><h4>' + esc(c.name) + '</h4><p class="cat-left money">' + fm(s.leftCents) + ' <span class="cat-of">left of ' + fm(c.allocatedCents) + '</span></p>' +
        '<div class="meter ' + (s.status === "danger" ? "is-danger" : s.status === "warn" ? "is-warn" : "") + ' meter-marker" style="--marker:' + (s.daysElapsed / s.daysTotal * 100).toFixed(1) + '%" aria-hidden="true"><span style="width:' + Math.min(100, pct) + '%"></span></div>' +
        '<p class="small" style="margin:.3rem 0 0">' + badge + '</p><details><summary>Details</summary><p class="small" style="margin-top:.4rem">Used ' + pct + '% of this category, ' + Math.round(s.daysElapsed / s.daysTotal * 100) + '% of the way through the plan year. ' +
        (c.stated ? esc(c.statedDetail) : s.runsOutEarly ? 'At about ' + fm(s.perFortnightCents) + ' a fortnight, this runs out around ' + dateFmt.format(s.runsOutDate) + ', about ' + s.shortfallDays + ' days before the plan ends.' : 'At about ' + fm(s.perFortnightCents) + ' a fortnight, this lasts the plan year.') +
        '</p></details></div>');
    });
    h.push('</div></section>');
  });
  $("#ndis-body").innerHTML = h.join("");
}

/* ============================== CLAIM ============================== */
const MISSING_TEXT = {
  cards: "which concession card you hold", qldResident: "whether you live in Queensland", elecAccount: "whether the electricity account for your home is in your name",
  gasAccount: "whether you have a mains gas account in your name", medicalCondition: "whether a specialist will certify a qualifying medical condition",
  acOrHeating: "whether your home has an air-conditioner or heater", paysElecBill: "whether you pay the electricity bill",
  ownerOrLifeTenant: "whether you own your home or are a life tenant", ratesLiable: "whether you are responsible for the council rates",
  seqWaterGrid: "whether your home is in the SEQ Water Grid area", attendantCare: "whether you need lifelong attendant care to take part in the community"
};
const FAILED_TEXT = {
  cards: "You do not hold a card this scheme accepts.", qldResident: "You said you do not live in Queensland.", elecAccount: "You said the electricity account is not in your name.",
  gasAccount: "You said you do not have a mains gas account in your name.", medicalCondition: "You said there is no qualifying condition a specialist will certify.",
  acOrHeating: "You said your home has no air-conditioner or heater.", paysElecBill: "You said you do not pay the electricity bill.",
  ownerOrLifeTenant: "You said you do not own your home or hold a life tenancy.", ratesLiable: "You said you are not responsible for the council rates.",
  seqWaterGrid: "You said your home is not in the SEQ Water Grid area.", attendantCare: "You said you do not need lifelong attendant care to take part in the community."
};
const STATE_LABEL = { potential: "May be able to claim, based on your answers", "more-info": "More information needed", "not-eligible": "Not eligible, based on your answers" };
const STATE_BADGE = { potential: "good", "more-info": "info", "not-eligible": "demo" };
/* Short badge text; the group heading above carries "based on your answers". */
const STATE_SHORT = { potential: "May be able to claim", "more-info": "More information needed", "not-eligible": "Not eligible" };
const STATE_ICON = { potential: ICON.tick, "more-info": ICON.q, "not-eligible": ICON.cross };

function renderClaimShell() {
  const h = [];
  h.push('<div class="view-intro"><h1>Claim</h1><p>Queensland concessions you may be able to claim. Answer a few questions and Capable checks each scheme&rsquo;s actual rules.</p></div>');
  h.push(modeBanner());
  h.push(viewToolsHtml());
  h.push('<div id="panel-entitlements">' + concessionsPanelHtml() + '</div>');
  if (state.mode === "demo") h.push(claimHistoryHtml());
  $("#view-claim").innerHTML = h.join("");

  $("#conc-form").addEventListener("change", onConcessionChange);
  renderConcessionResults();
}

const YNU_OPTS = [["yes", "Yes"], ["no", "No"], ["unsure", "I'm not sure"]];
const CONC_GROUPS = [
  { title: "About you", keys: ["qldResident"] },
  { title: "Electricity and gas", keys: ["elecAccount", "paysElecBill", "gasAccount"] },
  { title: "Health", keys: ["medicalCondition", "acOrHeating"] },
  { title: "Your home", keys: ["ownerOrLifeTenant", "ratesLiable", "seqWaterGrid"] },
  { title: "Getting out and about", keys: ["attendantCare"] }
];

function concessionsPanelHtml() {
  const a = active().concessions;
  const cards = a.cards || {};
  const qlabel = {};
  E.CONCESSION_QUESTIONS.forEach(function (q) { qlabel[q.key] = q.label; });
  const h = [];
  h.push('<div class="grid grid-2"><section class="card" aria-labelledby="conc-q-h"><h2 id="conc-q-h">Your answers</h2><p class="small"><a href="#conc-r-h">Jump to where you stand</a></p><p class="small">Answer what you can. Anything you skip, or are not sure about, is treated as &ldquo;more information needed&rdquo; &mdash; never as a yes.</p><form id="conc-form" novalidate>');
  h.push('<fieldset><legend>Which of these cards do you hold?</legend><p class="hint">Tick all that apply.</p>');
  E.CARD_OPTIONS.forEach(function (o) {
    h.push('<label class="check" for="card-' + o[0] + '"><input type="checkbox" id="card-' + o[0] + '" data-card="' + o[0] + '"' + ((cards.held || []).indexOf(o[0]) > -1 ? " checked" : "") + '><span>' + esc(o[1]) + '</span></label>');
  });
  h.push('<label class="check" for="card-none"><input type="checkbox" id="card-none" data-card="none"' + (cards.none ? " checked" : "") + '><span>None of these</span></label>');
  h.push('<label class="check" for="card-unsure"><input type="checkbox" id="card-unsure" data-card="unsure"' + (cards.unsure ? " checked" : "") + '><span>I&rsquo;m not sure</span></label></fieldset>');
  CONC_GROUPS.forEach(function (g) {
    h.push('<h3 class="q-group">' + esc(g.title) + '</h3>');
    g.keys.forEach(function (k) { h.push(radioGroup("conc-" + k, qlabel[k], YNU_OPTS, a[k])); });
  });
  h.push('</form></section><section aria-labelledby="conc-r-h"><h2 id="conc-r-h">Where you stand</h2><div id="conc-results"></div></section></div>');
  return h.join("");
}

function onConcessionChange(e) {
  const t = e.target, a = active().concessions;
  if (t.dataset.card) {
    const c = a.cards || (a.cards = { answered: false, held: [], none: false, unsure: false });
    if (t.dataset.card === "none") { c.none = t.checked; if (t.checked) { c.held = []; c.unsure = false; } }
    else if (t.dataset.card === "unsure") { c.unsure = t.checked; if (t.checked) c.none = false; }
    else {
      c.held = c.held.filter(function (x) { return x !== t.dataset.card; });
      if (t.checked) { c.held.push(t.dataset.card); c.none = false; }
    }
    c.answered = c.held.length > 0 || c.none || c.unsure;
    // keep the checkboxes consistent with the rules above
    $$("[data-card]").forEach(function (cb) {
      const k = cb.dataset.card;
      cb.checked = k === "none" ? c.none : k === "unsure" ? c.unsure : c.held.indexOf(k) > -1;
    });
  } else if (t.type === "radio" && t.name.indexOf("conc-") === 0) {
    a[t.name.slice(5)] = t.value;
  }
  changed("concessions");
}

function renderConcessionResults() {
  const c = facts().concessions;
  const h = [];
  h.push('<p class="midnum" style="margin-bottom:.3rem" data-fact="concessions">' + c.potential.length + ' you may be able to claim</p>');
  h.push('<p class="small muted">' + c.moreInfo.length + ' need more information &middot; ' + c.notEligible.length + ' not eligible on your answers. Nothing here is approved until you apply, and amounts are the published maximums.</p>');
  [["potential", c.potential], ["more-info", c.moreInfo], ["not-eligible", c.notEligible]].forEach(function (grp) {
    if (!grp[1].length) return;
    h.push('<h3 class="state-h">' + STATE_ICON[grp[0]] + ' ' + STATE_LABEL[grp[0]] + ' (' + grp[1].length + ')</h3><ul class="results">');
    grp[1].forEach(function (r) { h.push(schemeCardHtml(r)); });
    h.push('</ul>');
  });
  h.push('<p class="small muted">Non-cash benefits, like the Companion Card, are listed but never given a dollar value. Bill rebates reduce a bill rather than paying you money.</p>');
  $("#conc-results").innerHTML = h.join("");
}

function schemeCardHtml(r) {
  const s = r.scheme;
  const h = ['<li class="result scheme scheme-' + r.state + '">'];
  h.push('<div class="scheme-head"><h4 style="margin:0">' + esc(s.name) + '</h4></div>');
  h.push('<p style="margin:.4rem 0"><span class="badge badge-' + STATE_BADGE[r.state] + '">' + STATE_ICON[r.state] + ' ' + STATE_SHORT[r.state] + '</span></p>');
  h.push('<p><strong>' + (s.kind === "non-cash" ? "Non-cash benefit." : s.kind === "payment" ? "Payment." : s.kind === "bill-rebate" ? "Bill rebate." : "Bill subsidy.") + '</strong> ' + esc(schemeValueText(s)) + '</p>');
  if (r.failed.length) h.push('<p class="small"><strong>Why not:</strong> ' + r.failed.map(function (k) { return esc(FAILED_TEXT[k]); }).join(" ") + '</p>');
  if (r.missing.length && !r.failed.length) h.push('<p class="small"><strong>Still need to know:</strong> ' + r.missing.map(function (k) { return esc(MISSING_TEXT[k]); }).join("; ") + '.</p>');
  h.push('<details class="quiet"><summary>Rules, source and checks</summary><ul class="small">' + s.conditions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
    '<p class="small"><strong>How to apply:</strong> ' + esc(s.howToApply) + '</p>' +
    '<p class="small">Effective from: ' + (s.effectiveFrom ? fmtDate(s.effectiveFrom) : "not stated by the source") + '. Checked: ' + fmtDate(s.verifiedOn) + '. ' + esc(s.limitation || "") + '</p>' +
    '<p class="small">' + extLink(s.source, s.name + " — qld.gov.au", "Queensland Government") + '</p></details>');
  h.push('</li>');
  return h.join("");
}

function claimHistoryHtml() {
  const plan = D.DEMO_PLAN;
  const names = {};
  plan.budgets.forEach(function (b) { b.categories.forEach(function (c) { names[c.id] = c.name; }); });
  const h = ['<section class="card" style="margin-top:1.75rem" aria-labelledby="claim-hist-h"><h2 id="claim-hist-h">Demo NDIS claim history <span class="badge badge-demo">Demo</span></h2><div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table><caption>Made-up NDIS claims, newest first</caption><thead><tr><th scope="col">Date</th><th scope="col">What it was for</th><th scope="col">Category</th><th class="num" scope="col">Amount</th></tr></thead><tbody>'];
  plan.history.forEach(function (x) {
    h.push('<tr><td>' + fmtDate(x.date) + '</td><td>' + esc(x.description) + '</td><td>' + esc(names[x.categoryId] || x.categoryId) + '</td><td class="num">' + fm(x.amountCents) + '</td></tr>');
  });
  h.push('</tbody></table></div></section>');
  return h.join("");
}

/* ============================== EASY READ ============================== */
const SYM = {
  work: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="7" width="20" height="14" rx="2.5"/><path d="M2 12h20"/><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7"/></svg>',
  money: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  gift: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M2 9h20"/><path d="M12 9v12"/><path d="M12 9S9 3 6.5 4.5 9 9 12 9Z"/><path d="M12 9s3-6 5.5-4.5S15 9 12 9Z"/></svg>',
  clock: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/></svg>',
  tick: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="m8 12.4 2.6 2.6L16 9.6"/></svg>',
  warn: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
};

function easyReadHtml(view) {
  const f = facts();
  const titles = { dashboard: state.mode === "demo" ? "Hello " + D.DEMO_PROFILE.firstName + " (demo)" : "Your summary", jobs: "Jobs for you", money: "Your money", claim: "Help you can ask for" };
  const h = ['<div class="easyread"><h1>' + esc(titles[view]) + '</h1>'];
  if (state.mode === "demo") h.push('<p class="er-note">This is a demo. The person is made up.</p>');
  h.push('<ul class="er-lines">');
  summaryItems(view, f).forEach(function (i) {
    h.push('<li' + (i.tone ? ' class="is-' + i.tone + '"' : '') + ' data-er-key="' + esc(i.key) + '"><span class="er-sym">' + SYM[i.sym] + '</span><span>' + esc(i.text) + '</span></li>');
  });
  h.push('</ul>');
  if (view === "money" || view === "claim" || view === "jobs") h.push('<p class="er-note">To change your answers, turn Easy Read off.</p>');
  h.push('<p class="er-note">' + SUMMARY_FOOTER + '</p></div>');
  return h.join("");
}

/* ============================== RENDER / NAVIGATION ============================== */
const VIEW_TITLES = { dashboard: "Summary", jobs: "Job mapping", money: "Money", claim: "Claim" };

/* Something changed: re-render the parts that depend on it, keep focus where it is. */
function changed(what) {
  persist();
  if (what === "jobs") renderJobResults();
  if (what === "dsp") { renderDspResult(); renderJobResults(); const d = facts().dsp; announce(d.status === "ok" ? "Estimated pension " + fm(d.paymentCents) + " a fortnight." : dspLines(d)[0].text); }
  if (what === "ndis") { /* renderNdis handles itself */ }
  if (what === "concessions") { renderConcessionResults(); const c = facts().concessions; announce(c.potential.length + " may be able to claim, " + c.moreInfo.length + " need more information, " + c.notEligible.length + " not eligible."); }
  renderDashboard();
  renderProfile();
}

function rebuildAll() {
  renderProfile();
  renderDashboard();
  renderJobsShell();
  renderMoneyShell();
  renderClaimShell();
  renderNotices();
  showView(state.view, false);
}

function showView(name, moveFocus) {
  stopSpeaking();
  state.view = E.VIEWS.indexOf(name) > -1 ? name : "dashboard";
  const er = $("#view-easyread");
  if (state.easyRead) {
    er.innerHTML = easyReadHtml(state.view); er.hidden = false;
    E.VIEWS.forEach(function (v) { document.getElementById("view-" + v).hidden = true; });
  } else {
    er.hidden = true;
    E.VIEWS.forEach(function (v) { document.getElementById("view-" + v).hidden = v !== state.view; });
  }
  $$(".navbtn").forEach(function (b) { if (b.dataset.view === state.view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  document.title = VIEW_TITLES[state.view] + " — Capable";
  persist();
  if (moveFocus) {
    const h1 = $((state.easyRead ? "#view-easyread" : "#view-" + state.view) + " h1") || $("#main");
    if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
    h1.focus();
    window.scrollTo(0, 0);
  }
}

/* ============================== MODES ============================== */
function setMode(mode, moveFocus) {
  state.mode = mode;
  if (mode === "demo") state.demo = freshDemo();
  setPref(MODE_PREF, mode);
  document.body.classList.toggle("is-demo", mode === "demo");
  rebuildAll();
  if (moveFocus) showView(state.view, true);
  announce(mode === "demo" ? "Demo started. Everything shown is made up." : "Your own session. " + (state.saveConsent ? "Saved on this device." : "Not saved unless you turn saving on."), true);
}

/* ============================== DIALOGS ============================== */
let dialogOpener = null;
function openDialog(id, opener) {
  const d = document.getElementById(id);
  if (!d) return;
  if (id === "privacy-dialog") renderPrivacy();
  if (id === "about-dialog") renderAbout();
  if (id === "help-dialog") renderHelp();
  dialogOpener = opener || document.activeElement;
  if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  const h = d.querySelector("h2");
  if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
}
$$("dialog").forEach(function (d) {
  d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
  d.addEventListener("close", function () {
    if (d.id === "confirm-dialog") return;
    if (dialogOpener && document.contains(dialogOpener)) dialogOpener.focus();
    dialogOpener = null;
  });
});

/* Accessible confirm, built on <dialog>. Cancel is focused first. */
function confirmAction(title, bodyHtml, confirmLabel) {
  return new Promise(function (resolve) {
    const d = $("#confirm-dialog");
    const prev = document.activeElement;
    $("#confirm-title").textContent = title;
    $("#confirm-body").innerHTML = bodyHtml;
    $("#confirm-ok").textContent = confirmLabel;
    let result = false;
    function done(v) { result = v; d.close(); }
    $("#confirm-ok").onclick = function () { done(true); };
    $("#confirm-cancel").onclick = function () { done(false); };
    d.addEventListener("close", function onClose() {
      d.removeEventListener("close", onClose);
      if (prev && document.contains(prev)) prev.focus();
      resolve(result);
    });
    d.showModal();
    $("#confirm-cancel").focus();
  });
}

const KEY_LABELS = {
  "capable.v2": "Your saved answers (only written if you turned saving on)",
  "capable.session": "Answers saved by an earlier version of Capable",
  "capable.v2.unreadable": "A saved record that could not be read (set aside)",
  "capable.easyread": "Whether Easy Read is on",
  "capable.onboarded": "Whether you have seen the welcome screen",
  "capable.installTipDismissed": "Whether you closed the install tip",
  "capable.mode": "Whether you last used the demo or your own session",
  "capable.voiceHintDismissed": "Whether you closed the reading-voice tip"
};

function renderPrivacy() {
  const stored = E.describeStored(storage).concat([{ key: MODE_PREF, present: getPref(MODE_PREF) !== null }]);
  const present = stored.filter(function (s) { return s.present; });
  const h = [];
  h.push('<h3>Saving your answers</h3>');
  if (state.mode === "personal") {
    h.push('<label class="check" for="save-consent"><input type="checkbox" id="save-consent"' + (state.saveConsent ? " checked" : "") + ' aria-describedby="save-consent-note"><span>Save my answers on this device<span class="check-note" id="save-consent-note">' +
      'When on, your answers stay after you close Capable, until you delete them. When off, they last only while Capable is open.</span></span></label>');
  } else {
    h.push('<p>You are in the demo. Nothing you change in the demo is saved.</p>');
  }
  h.push('<p class="small" id="save-status" role="status"></p>');
  h.push('<h3>What is stored on this device right now</h3>');
  h.push(present.length ? '<ul>' + present.map(function (s) { return '<li>' + esc(KEY_LABELS[s.key] || s.key) + '</li>'; }).join("") + '</ul>' : '<p>Nothing.</p>');
  h.push('<p class="small">Your answers can include your wages, your pension questions, your concession answers, your job needs and an NDIS balance. The settings above contain no personal details.</p>');
  h.push('<h3>Where it is stored</h3><p>' + (NATIVE ? "In the Capable iPhone app&rsquo;s own storage on this phone." : "In this web browser&rsquo;s storage on this device.") +
    ' The web version and the iPhone app keep <strong>separate</strong> storage &mdash; answers saved in one do not appear in the other, and are not moved across automatically.' +
    (NATIVE ? "" : " Some browsers, including Safari, may remove website data if a site has not been used for a while.") + '</p>');
  h.push('<h3>Is anything sent anywhere?</h3><ul>' +
    '<li>Capable has no server and no account. It does not send your answers anywhere.</li>' +
    '<li><strong>Voice input:</strong> ' + (NATIVE ? "in this iPhone app, speech is recognised on the phone only. If your phone cannot do that, voice input stays off — it never falls back to an online service." :
      "in a web browser, speech recognition is done by the browser, which may send your voice to Apple, Google or another provider. Capable cannot stop that, and does not receive the audio.") + ' Voice is only used when you press &ldquo;Speak&rdquo;.</li>' +
    '<li><strong>Read aloud:</strong> ' + (NATIVE ? "uses the voices built into your iPhone." : "uses your device&rsquo;s voices where available. Some browsers use online voices.") + '</li>' +
    '<li><strong>Links</strong> to government websites open those websites. <strong>Share</strong> sends the summary text only where you choose.</li>' +
    '<li><strong>Payslip photos</strong> stay on the device and are not saved by Capable.</li></ul>');
  h.push('<h3>Delete what is stored</h3><p class="footer-actions">');
  if (state.mode === "personal") h.push('<button type="button" class="btn btn-secondary" id="clear-answers">Clear my answers</button>');
  h.push('<button type="button" class="btn btn-secondary" id="clear-everything">Delete everything Capable has stored</button></p>');
  $("#privacy-body").innerHTML = h.join("");

  const cb = $("#save-consent");
  if (cb) cb.addEventListener("change", async function () {
    if (cb.checked) {
      state.saveConsent = true; persist();
      $("#save-status").textContent = "Saving is on. Your answers are saved on this device.";
    } else {
      const hadSaved = getPref(E.STORE_KEY) !== null;
      if (hadSaved) {
        const ok = await confirmAction("Turn off saving?", "<p>This deletes the copy of your answers saved on this device. Your answers stay on screen until you close Capable.</p>", "Turn off and delete saved copy");
        if (!ok) { cb.checked = true; return; }
        E.removeKeys(storage, [E.STORE_KEY]);
      }
      state.saveConsent = false;
      $("#save-status").textContent = "Saving is off. Nothing about your answers is stored on this device.";
    }
    renderProfile(); renderDashboard(); rebuildBanners();
  });
  const ca = $("#clear-answers");
  if (ca) ca.addEventListener("click", async function () {
    const ok = await confirmAction("Clear your answers?", "<p>This removes everything you entered in your own session" + (state.saveConsent ? ", including the copy saved on this device" : "") + ". It cannot be undone.</p>", "Clear my answers");
    if (!ok) return;
    state.personal = E.blankPersonal();
    if (state.saveConsent) persist();
    rebuildAll();
    renderPrivacy();
    $("#save-status").textContent = "Your answers were cleared.";
  });
  $("#clear-everything").addEventListener("click", async function () {
    const list = present.map(function (s) { return '<li>' + esc(KEY_LABELS[s.key] || s.key) + '</li>'; }).join("");
    const ok = await confirmAction("Delete everything?", "<p>This deletes everything Capable has stored on this device:</p>" + (list ? "<ul>" + list + "</ul>" : "<p>(Nothing is stored right now.)</p>") + "<p>Your answers on screen are cleared too, and you will be asked to choose the demo or your own session again. It cannot be undone.</p>", "Delete everything");
    if (!ok) return;
    E.removeKeys(storage, E.ALL_KEYS.concat([MODE_PREF]));
    state.personal = E.blankPersonal(); state.saveConsent = false; state.mode = null; state.easyRead = false;
    state.loadReport = { status: "empty" };
    $("#privacy-dialog").close();
    $("#easy-read-btn").setAttribute("aria-pressed", "false");
    rebuildAllSafe();
    showOnboarding(true);
    announce("Everything Capable stored on this device was deleted.", true);
  });
}
function rebuildBanners() { renderJobsShell(); renderMoneyShell(); renderClaimShell(); showView(state.view, false); }
function rebuildAllSafe() {
  if (state.mode) { rebuildAll(); return; }
  placeholderRender = true;
  state.mode = "personal";
  try { rebuildAll(); } finally { state.mode = null; placeholderRender = false; }
}

function renderAbout() {
  const rows = [];
  const add = function (e) {
    rows.push('<tr><th scope="row">' + esc(e.name) + '</th><td>' + (typeof e.amount === "number" ? esc((e.kind === "rate" || e.kind === "rule" ? e.amount : fm(E.toCents(e.amount))) + (e.unit ? " " + e.unit : "")) : "—") + '</td>' +
      '<td>' + (e.effectiveFrom ? fmtDate(e.effectiveFrom) : "Not stated") + '</td><td>' + fmtDate(e.verifiedOn) + '</td><td>' + esc(e.status) + '</td>' +
      '<td><a href="' + esc(e.source) + '" target="_blank" rel="noopener noreferrer">Source<span class="visually-hidden">: ' + esc(e.name) + ', opens outside Capable</span></a>' + (e.verificationMethod ? '<br><span class="small"><strong>How checked:</strong> ' + esc(e.verificationMethod) + '</span>' : '') + (e.limitation ? '<br><span class="small">' + esc(e.limitation) + '</span>' : '') + '</td></tr>');
  };
  Object.keys(R.dsp).forEach(function (k) { add(R.dsp[k]); });
  R.concessions.forEach(add);
  add(R.ndis.supports);
  add(R.ndis.fundingPeriods);
  $("#about-sources").innerHTML = '<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table><caption>Every government figure Capable uses</caption><thead><tr><th scope="col">Rule</th><th scope="col">Amount</th><th scope="col">Effective from</th><th scope="col">Checked</th><th scope="col">Status</th><th scope="col">Source and limits</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div>' +
    '<p class="small"><strong>Status:</strong> &ldquo;verified&rdquo; means read on the official page by Capable&rsquo;s checking tools on the date checked. &ldquo;review-confirmed&rdquo; means an independent reviewer read the full official page and confirmed the figure; Capable&rsquo;s own tools could not retrieve it. &ldquo;excerpt&rdquo; means the official page could not be opened by our checking tools, so the figure was confirmed from search excerpts of it &mdash; treat as provisional. &ldquo;unverified&rdquo; figures are never shown as an amount you may get.</p>';
}

function renderHelp() {
  const l = R.helpLines;
  $("#help-lines").innerHTML = '<h3>' + esc(l.servicesAustralia.name) + '</h3><p>' + telLink(l.servicesAustralia) + '<br><span class="small muted">For your DSP, reporting income and your concession card.</span></p>' +
    '<h3>' + esc(l.ndia.name) + '</h3><p>' + telLink(l.ndia) + '<br><span class="small muted">For your NDIS plan and what your funding can pay for.</span></p>' +
    '<h3>' + esc(l.qgov.name) + '</h3><p>' + telLink(l.qgov) + '<br><span class="small muted">For Queensland concessions and the Companion Card.</span></p>' +
    '<p class="small muted">The Services Australia and NDIA numbers were confirmed against the official pages by an independent review (reported ' + fmtDate(l.servicesAustralia.verifiedOn) + '). Check opening hours on the official websites.</p>';
}

/* ============================== READ ALOUD ============================== */
let speaking = false;
function setSpeakLabels(on) { $$("[data-speak-label]").forEach(function (el) { el.textContent = on ? "Stop reading" : "Read this to me"; }); }

function stopSpeaking() {
  if (!speaking) return;
  speaking = false;
  if (Speech) Speech.stopSpeaking().catch(function () {});
  else if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  setSpeakLabels(false);
}

let chosenVoice = null;
function pickVoice() {
  if (chosenVoice) return chosenVoice;
  const voices = (window.speechSynthesis.getVoices() || []).filter(function (v) { return (v.lang || "").indexOf("en") === 0; });
  const local = voices.filter(function (v) { return v.localService; });
  const pool = local.length ? local : voices;
  const score = function (v) {
    const n = (v.name || "").toLowerCase(); let pts = 0;
    if (/siri|enhanced|premium|neural|natural/.test(n)) pts += 100;
    if (v.lang === "en-AU") pts += 60; else if (v.lang === "en-GB") pts += 30;
    if (n.indexOf("compact") > -1) pts -= 50;
    return pts;
  };
  chosenVoice = pool.slice().sort(function (a, b) { return score(b) - score(a); })[0] || null;
  return chosenVoice;
}
if (!NATIVE && "speechSynthesis" in window) window.speechSynthesis.addEventListener("voiceschanged", function () { chosenVoice = null; });

function speak(text, onDone) {
  onDone = onDone || function () {};
  speaking = true;
  if (Speech) {
    Speech.speak({ text: text, lang: "en-AU", rate: 0.5 }).then(function (r) {
      if (speaking) { speaking = false; setSpeakLabels(false); }
      if (r && r.voiceQuality === "default") basicVoiceHint();
      onDone();
    })
      .catch(function () { speaking = false; setSpeakLabels(false); onDone(); });
    return;
  }
  if (!("speechSynthesis" in window)) { speaking = false; onDone(); return; }
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const voice = pickVoice();
  let i = 0;
  (function next() {
    if (!speaking || i >= parts.length) { speaking = false; setSpeakLabels(false); onDone(); return; }
    const u = new SpeechSynthesisUtterance(parts[i++]);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-AU";
    u.rate = 0.92;
    u.onend = next;
    u.onerror = function () { speaking = false; setSpeakLabels(false); onDone(); };
    window.speechSynthesis.speak(u);
  })();
}

/* The phone only had its basic (compact) voice. Say how to get a natural
   one; the app cannot download voices itself. Shown once per session. */
let voiceHintShown = false;
const VOICE_HINT_PREF = "capable.voiceHintDismissed";
function basicVoiceHint() {
  // iOS may swap in the voice chosen in Read & Speak without telling the app,
  // so the app cannot know the person already has a good voice. Once they
  // tap OK, never show it again.
  if (voiceHintShown || getPref(VOICE_HINT_PREF) === "1") return;
  voiceHintShown = true;
  showNotice("voice", "info", "<strong>Want a more natural voice?</strong> Your iPhone is using its basic voice. In the Settings app, go to Accessibility &rsaquo; Read &amp; Speak &rsaquo; Voices &rsaquo; English (called Spoken Content on older iOS), and download an Enhanced or Premium voice, for example an Australian one. Capable uses it automatically.",
    '<button type="button" class="btn btn-secondary btn-sm" id="voice-hint-ok">OK, don&rsquo;t show this again</button>');
  const ok = document.getElementById("voice-hint-ok");
  if (ok) ok.addEventListener("click", function () { setPref(VOICE_HINT_PREF, "1"); clearNotice("voice"); announce("The voice tip will not be shown again.", true); });
}

function toggleSpeak(btn) {
  if (!Speech && !("speechSynthesis" in window)) { btn.disabled = true; btn.querySelector("[data-speak-label]").textContent = "Reading aloud is not available here"; return; }
  if (speaking) { stopSpeaking(); return; }
  setSpeakLabels(true);
  speak(spokenSummary());
}

/* ============================== SHARE / KEEP AWAKE ============================== */
async function shareView(btn) {
  const text = spokenSummary() + "\n\nFrom Capable. Estimates only, not financial advice." + (state.mode === "demo" ? " (Demo figures for a made-up person.)" : "");
  const label = btn.querySelector("[data-share-label]");
  if (navigator.share) {
    try { await navigator.share({ title: "Capable — " + VIEW_TITLES[state.view], text: text }); } catch (e) { /* dismissed */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = "Copied — paste it anywhere";
    announce("Summary copied to the clipboard.", true);
  } catch (e) {
    label.textContent = "Sharing is not available here";
  }
  setTimeout(function () { label.textContent = "Share this summary"; }, 4000);
}

const awake = { on: false, lock: null };
function setAwakeButtons() { $$('[data-tool="awake"]').forEach(function (b) { b.setAttribute("aria-pressed", String(awake.on)); }); }
async function toggleAwake(btn) {
  if (awake.on) {
    awake.on = false;
    if (Speech) Speech.setKeepAwake({ on: false }).catch(function () {});
    if (awake.lock) { try { await awake.lock.release(); } catch (e) { /* gone */ } awake.lock = null; }
    setAwakeButtons(); announce("The screen can lock again.", true); return;
  }
  if (Speech) {
    try { await Speech.setKeepAwake({ on: true }); awake.on = true; } catch (e) { /* unavailable */ }
  } else if ("wakeLock" in navigator) {
    try { awake.lock = await navigator.wakeLock.request("screen"); awake.on = true; awake.lock.addEventListener("release", function () { awake.lock = null; }); } catch (e) { /* refused */ }
  }
  if (!awake.on) { btn.disabled = true; btn.lastChild.textContent = "Keep screen on is not available here"; return; }
  setAwakeButtons(); announce("The screen will stay on while Capable is open.", true);
}

/* ============================== ASK CAPABLE (VOICE) ==============================
   Speaking is never required: the tap buttons do everything. The microphone
   is only requested when "Speak" is pressed. */
const ASK_TOPICS = {
  jobs: ["job", "jobs", "work", "working", "hours", "employment", "employer", "shift", "career"],
  money: ["money", "pay", "paid", "wage", "wages", "pension", "payment", "centrelink", "ndis", "plan", "budget", "funding", "income", "afford", "spend"],
  claim: ["claim", "claiming", "entitlement", "entitlements", "rebate", "rebates", "owed", "owe", "discount", "concession", "concessions", "card", "free", "get more"],
  help: ["help", "call", "phone", "ring", "number", "contact", "talk to someone", "wrong", "stuck"]
};
function matchTopic(said) {
  const t = (said || "").toLowerCase();
  let best = null, bestScore = 0;
  Object.keys(ASK_TOPICS).forEach(function (topic) {
    let score = 0;
    ASK_TOPICS[topic].forEach(function (w) { if (new RegExp("\\b" + w.replace(/ /g, "\\s+"), "i").test(t)) score++; });
    if (score > bestScore) { bestScore = score; best = topic; }
  });
  return bestScore > 0 ? best : null;
}
window.CapableMatchTopic = matchTopic;

const WebSR = window.SpeechRecognition || window.webkitSpeechRecognition;
const voice = { open: false, listening: false, rec: null, listeners: [] };

function vpStatus(text, tone) {
  const el = $("#voice-status");
  el.textContent = text;
  el.className = "vp-status" + (tone ? " is-" + tone : "");
}
function vpSay(text) { $("#voice-said").textContent = text; }
function vpHeard(text) { $("#voice-heard").textContent = text ? "You said: " + text : ""; }
function setListeningUi(on) {
  voice.listening = on;
  $("#voice-panel").classList.toggle("vp-listening", on);
  const b = $("#voice-speak");
  b.textContent = on ? "Stop listening" : "Speak";
  b.setAttribute("aria-pressed", String(on));
}

async function voiceAvailability() {
  if (Speech) {
    try { const a = await Speech.available({ lang: "en-AU" }); return a; } catch (e) { return { recognition: false, reason: "error" }; }
  }
  return { recognition: !!WebSR, onDevice: false, reason: WebSR ? null : "unsupported" };
}

function openVoicePanel() {
  if (voice.open) { closeVoicePanel(); return; }
  voice.open = true;
  const panel = $("#voice-panel");
  panel.hidden = false;
  const greet = state.mode === "demo" ? "Hello " + D.DEMO_PROFILE.firstName + ". What do you want to know?" : "Hello. What do you want to know?";
  vpSay(greet); vpHeard("");
  vpStatus("Not listening. Tap an option, or press Speak to say it.");
  voiceAvailability().then(function (a) {
    const b = $("#voice-speak");
    if (!a.recognition) {
      b.hidden = true;
      vpStatus(a.reason === "no-on-device"
        ? "Voice input is off: this iPhone cannot recognise English speech on the device, and Capable will not send your voice online. Tap an option instead."
        : "Voice input is not available here. Tap an option instead.", "warn");
    } else {
      b.hidden = false;
      $("#voice-privacy").textContent = NATIVE ? "Speech is recognised on this phone only." : "Your browser does the speech recognition and may send your voice to its provider.";
    }
  });
  window.scrollTo(0, 0);
  $("#voice-title").focus();
  speak(greet);
}

function closeVoicePanel() {
  stopListening("closed");
  stopSpeaking();
  voice.open = false;
  $("#voice-panel").hidden = true;
  const back = $('#view-' + state.view + ' [data-tool="ask"]');
  if (back) back.focus();
}

function stopListening(reason) {
  if (!voice.listening) return;
  if (Speech) Speech.stop().catch(function () {});
  else if (voice.rec) { try { voice.rec.abort(); } catch (e) { /* stopped */ } }
  setListeningUi(false);
  if (reason === "background") vpStatus("Stopped listening because Capable went into the background.");
  else if (reason === "user") vpStatus("Stopped listening.");
}

function handleHeard(text) {
  vpHeard(text);
  stopListening();
  const topic = matchTopic(text);
  if (!topic) { const miss = "Sorry, I did not catch that. You can tap one of the options."; vpSay(miss); vpStatus("Not listening."); speak(miss); return; }
  answerTopic(topic);
}

function voiceError(code) {
  setListeningUi(false);
  const msg = {
    "not-allowed": NATIVE ? "Capable is not allowed to use the microphone or speech recognition. You can still tap the options. To use your voice, turn on Microphone and Speech Recognition for Capable in the Settings app." : "The microphone is blocked for this site. You can still tap the options. To use your voice, allow the microphone in your browser's site settings.",
    "no-speech": "I did not hear anything. Press Speak to try again, or tap an option.",
    "network": "Speech recognition in this browser needs an internet connection. Tap an option instead.",
    "no-on-device": "This iPhone cannot recognise English speech on the device, so voice input is off. Tap an option instead.",
    "interrupted": "Listening was interrupted, for example by a call. Press Speak to try again.",
    "audio-capture": "No microphone was found. Tap an option instead."
  }[code] || "Voice input stopped. Press Speak to try again, or tap an option.";
  vpStatus(msg, "warn");
}

async function startListening() {
  if (voice.listening) { stopListening("user"); return; }
  stopSpeaking();
  if (Speech) {
    try {
      const p = await Speech.requestPermissions();
      if (p.microphone !== "granted" || p.speechRecognition !== "granted") { voiceError("not-allowed"); return; }
      setListeningUi(true);
      vpStatus("Listening… say jobs, money, claim or help.", "live");
      await Speech.start({ lang: "en-AU" });
    } catch (e) { voiceError((e && e.code) || (e && e.message) || "error"); }
    return;
  }
  if (!WebSR) { voiceError("unsupported"); return; }
  const rec = new WebSR();
  voice.rec = rec;
  rec.lang = "en-AU"; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onstart = function () { setListeningUi(true); vpStatus("Listening… say jobs, money, claim or help.", "live"); };
  rec.onend = function () { if (voice.listening) { setListeningUi(false); vpStatus("Not listening."); } };
  rec.onerror = function (ev) { voiceError(ev.error === "service-not-allowed" ? "not-allowed" : ev.error); };
  rec.onresult = function (ev) { handleHeard(ev.results[0][0].transcript); };
  try { rec.start(); } catch (e) { voiceError("error"); }
}

if (Speech) {
  Speech.addListener("result", function (ev) { if (ev && ev.text) handleHeard(ev.text); });
  Speech.addListener("error", function (ev) { voiceError(ev && ev.code); });
  Speech.addListener("end", function () { if (voice.listening) { setListeningUi(false); vpStatus("Not listening."); } });
}

const ASK_REPLIES = { jobs: "OK. Here are the sample jobs that fit you.", money: "OK. Here is your money.", claim: "OK. Here are the concessions.", help: "OK. Here is who to call." };
function answerTopic(topic) {
  stopListening();
  const reply = ASK_REPLIES[topic];
  vpSay(reply);
  vpStatus("Not listening.");
  if (topic === "help") { openDialog("help-dialog", $("#voice-speak")); speak(reply); return; }
  showView(topic, false);
  speak(reply + " " + spokenSummary());
}

/* ============================== ONBOARDING ============================== */
function showOnboarding(moveFocus) {
  document.body.classList.add("onboarding-active");
  $("#onboarding").hidden = false;
  document.title = "Welcome — Capable";
  window.scrollTo(0, 0);
  if (moveFocus) $("#ob-title").focus();
}
function finishOnboarding(mode) {
  setPref("capable.onboarded", "1");
  document.body.classList.remove("onboarding-active");
  $("#onboarding").hidden = true;
  setMode(mode, true);
}

/* ============================== EVENTS ============================== */
document.addEventListener("click", function (e) {
  const t = e.target;
  const nav = t.closest(".navbtn"); if (nav) { showView(nav.dataset.view, true); return; }
  const go = t.closest("[data-goto]"); if (go) { closeAllMenus(); showView(go.dataset.goto, true); return; }
  const od = t.closest("[data-open-dialog]"); if (od) { closeAllMenus(); openDialog(od.getAttribute("data-open-dialog"), od); return; }
  const cd = t.closest("[data-close-dialog]"); if (cd) { const d = cd.closest("dialog"); if (d) d.close(); return; }
  const md = t.closest("[data-mode]"); if (md) { closeAllMenus(); setMode(md.dataset.mode, true); return; }
  const tool = t.closest("[data-tool]");
  if (tool) {
    const k = tool.dataset.tool;
    if (k === "speak") toggleSpeak(tool); else if (k === "share") shareView(tool); else if (k === "awake") toggleAwake(tool); else if (k === "ask") openVoicePanel();
    return;
  }
  const ask = t.closest("[data-ask]"); if (ask) { answerTopic(ask.dataset.ask); return; }
  if (t.id === "legacy-use") {
    state.personal = E.importLegacy(state.personal, state.loadReport.legacy);
    E.removeKeys(storage, [E.LEGACY_KEY]);
    state.loadReport.legacy = null;
    setMode("personal", true);
    announce("The earlier answers were moved into your own session. Pension questions still need answering.", true);
    return;
  }
  if (t.id === "legacy-later") { state.legacyDismissed = true; renderNotices(); return; }
  if (t.id === "legacy-delete") {
    confirmAction("Delete the earlier answers?", "<p>This deletes the answers saved by an earlier version of Capable on this device. It cannot be undone.</p>", "Delete them").then(function (ok) {
      if (!ok) return;
      E.removeKeys(storage, [E.LEGACY_KEY]); state.loadReport.legacy = null; renderNotices(); announce("The earlier answers were deleted.", true);
    });
  }
});

$("#voice-close").addEventListener("click", closeVoicePanel);
$("#voice-speak").addEventListener("click", startListening);
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && voice.open && !document.querySelector("dialog[open]")) closeVoicePanel(); });
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") { stopListening("background"); stopSpeaking(); }
  else if (awake.on && !Speech && !awake.lock && "wakeLock" in navigator) navigator.wakeLock.request("screen").then(function (l) { awake.lock = l; }).catch(function () {});
});
window.addEventListener("online", renderNotices);
window.addEventListener("offline", renderNotices);

$("#easy-read-btn").addEventListener("click", function () {
  state.easyRead = !state.easyRead;
  setPref("capable.easyread", state.easyRead ? "1" : "0");
  this.setAttribute("aria-pressed", String(state.easyRead));
  showView(state.view, true);
});
$("#ob-demo").addEventListener("click", function () { finishOnboarding("demo"); });
$("#ob-personal").addEventListener("click", function () { finishOnboarding("personal"); });
$("#menu-replay").addEventListener("click", function () { closeAllMenus(); showOnboarding(true); });

/* Header disclosure menus. */
const OPEN_MENUS = [];
function closeAllMenus() { OPEN_MENUS.forEach(function (c) { c(false); }); }
function initMenu(triggerId, panelId) {
  const trigger = document.getElementById(triggerId), panel = document.getElementById(panelId);
  function open() { closeAllMenus(); panel.hidden = false; trigger.setAttribute("aria-expanded", "true"); const first = panel.querySelector("button, a"); if (first) first.focus(); }
  function close(ret) { if (panel.hidden) return; panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); if (ret) trigger.focus(); }
  trigger.addEventListener("click", function (e) { e.stopPropagation(); if (panel.hidden) open(); else close(false); });
  function onKey(e) { if (e.key === "Escape") close(true); }
  panel.addEventListener("keydown", onKey); trigger.addEventListener("keydown", onKey);
  panel.addEventListener("focusout", function (e) { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== trigger && e.relatedTarget) close(false); });
  document.addEventListener("click", function (e) { if (!panel.hidden && !panel.contains(e.target) && !trigger.contains(e.target)) close(false); });
  OPEN_MENUS.push(close);
}
initMenu("more-menu-btn", "more-menu-panel");
initMenu("profile-btn", "profile-panel");

/* ============================== INSTALL (web only) ============================== */
const installItem = $("#menu-install");
function isStandalone() { return window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches); }
function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
function showTip(text, withButton, force) {
  if (NATIVE) return;
  if ((getPref("capable.installTipDismissed") === "1" || isStandalone()) && !force) return;
  $("#install-tip-text").innerHTML = text; $("#install-btn").hidden = !withButton; $("#install-tip").hidden = false;
}
function dismissTip() { setPref("capable.installTipDismissed", "1"); $("#install-tip").hidden = true; }
$("#install-dismiss").addEventListener("click", dismissTip);
const IOS_TIP = 'Tap the Share button <kbd>↑</kbd>, then <kbd>Add to Home Screen</kbd>. Capable then opens full screen and works offline.';
let deferredPrompt = null;
if (NATIVE || isStandalone()) installItem.hidden = true;
else {
  if (isIOS()) showTip(IOS_TIP, false);
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); if (isIOS()) return; deferredPrompt = e; showTip("Install Capable to open it from your home screen, full screen and offline.", true); });
  $("#install-btn").addEventListener("click", function () { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt.userChoice.finally(function () { deferredPrompt = null; dismissTip(); }); });
  installItem.addEventListener("click", function () {
    closeAllMenus();
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(function () { deferredPrompt = null; }); }
    else if (isIOS()) showTip(IOS_TIP, false, true);
    else showTip("Your browser has not offered an install prompt. Look for &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo; in its menu.", false, true);
  });
  window.addEventListener("appinstalled", function () { dismissTip(); installItem.hidden = true; });
}

/* ============================== START ============================== */
function start() {
  if (NATIVE) document.documentElement.classList.add("is-native");
  state.loadReport = E.loadStore(storage);
  const rep = state.loadReport;
  if (rep.status === "ok") {
    state.saveConsent = true;
    state.personal = rep.record.personal;
    state.view = rep.record.ui.view;
    // Older saved sessions may name a retired prototype offer tab. Keep the
    // storage schema compatible and open actual concessions without changing answers.
    state.claimTab = "entitlements";
    state.mode = "personal";
  } else {
    const m = getPref(MODE_PREF);
    state.mode = m === "demo" || m === "personal" ? m : null;
  }
  state.easyRead = getPref("capable.easyread") === "1";
  $("#easy-read-btn").setAttribute("aria-pressed", String(state.easyRead));
  document.body.classList.toggle("is-demo", state.mode === "demo");
  if (state.mode) rebuildAll(); else { rebuildAllSafe(); showOnboarding(false); }
}
start();

/* Offline support for the web/PWA only. The native app ships its files in
   the app bundle and does not need (or register) a service worker. */
if (!NATIVE && "serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", function () {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline mode unavailable */ });
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      // First install needs no reload; an update replacing an old worker does.
      if (refreshing || !hadController) return; refreshing = true;
      // Reloading only re-reads files: saved answers live in storage, not in the cache.
      window.location.reload();
    });
  });
}

/* Test hooks (read-only views of internal formatting). */
window.CapableApp = { voiceAvailability: voiceAvailability, spokenSummary: spokenSummary, summaryItems: function (v) { return summaryItems(v, facts()); }, state: state, facts: facts };
})();

