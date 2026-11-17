"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join } = require("node:path");
const R = require("../../rules.js");

const ROOT = join(__dirname, "..", "..");
const EXPECTED = ["app.js", "asset-manifest.json", "capacitor.js", "demo-data.js", "engine.js", "icon-180.png", "icon-192.png", "icon-512.png",
  "icon-maskable-512.png", "index.html", "manifest.json", "rules.js", "sw.js"];

function build() { execFileSync("node", [join(ROOT, "scripts/build-web.mjs")], { stdio: "ignore" }); return JSON.parse(readFileSync(join(ROOT, "www/asset-manifest.json"), "utf8")); }
function walk(dir, base = "") { return readdirSync(dir).flatMap((f) => statSync(join(dir, f)).isDirectory() ? walk(join(dir, f), base + f + "/") : [base + f]); }

test("native web bundle contains only the intended app files", () => {
  build();
  assert.deepEqual(walk(join(ROOT, "www")).sort(), EXPECTED);
});

test("native web bundle is reproducible", () => {
  const a = build(), b = build();
  assert.deepEqual(a, b);
  for (const f of a.files) assert.equal(f.bytes, statSync(join(ROOT, f.from || f.file)).size, f.file + " copied unchanged");
});

test("service worker precaches every bundled app file", () => {
  const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
  for (const f of EXPECTED.filter((x) => !["asset-manifest.json", "sw.js", "capacitor.js"].includes(x))) assert.ok(sw.includes('"./' + f + '"'), f);
});

test("single source of truth: no government figure is hard-coded outside rules.js", () => {
  const figures = [];
  Object.values(R.dsp).concat(R.concessions).forEach((e) => {
    if (typeof e.amount === "number" && e.amount > 1) figures.push(e.amount.toFixed(2), e.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 }));
  });
  for (const file of ["app.js", "index.html", "engine.js", "demo-data.js"]) {
    const src = readFileSync(join(ROOT, file), "utf8");
    for (const fig of new Set(figures)) assert.ok(!src.includes(fig), `${file} hard-codes ${fig}`);
  }
});
