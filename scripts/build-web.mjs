// Builds www/ — the ONLY directory Capacitor copies into the iOS app.
// Explicit allow-list: nothing else from the repository can end up in the
// bundle (no node_modules, ios/, tests, scripts, brag-output, .env, .git).
import { rmSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");

export const WEB_ASSETS = [
  "index.html",
  "rules.js",
  "engine.js",
  "demo-data.js",
  "app.js",
  "sw.js",
  "manifest.json",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const listing = [];
for (const f of WEB_ASSETS) {
  const src = join(root, f);
  if (!statSync(src).isFile()) throw new Error("Missing asset: " + f);
  copyFileSync(src, join(out, f));
  const hash = createHash("sha256").update(readFileSync(src)).digest("hex");
  listing.push({ file: f, bytes: statSync(src).size, sha256: hash });
}
// Machine-readable record of exactly what was bundled (not shipped to users
// as a feature; it lets tests and reviewers check the bundle).
// Native-only runtime: @capacitor/core's browser build, from the pinned package.
// app.js loads it only when running inside the iOS app.
{
  const src = join(root, "node_modules/@capacitor/core/dist/capacitor.js");
  copyFileSync(src, join(out, "capacitor.js"));
  listing.push({ file: "capacitor.js", from: "node_modules/@capacitor/core/dist/capacitor.js", bytes: statSync(src).size, sha256: createHash("sha256").update(readFileSync(src)).digest("hex") });
}
writeFileSync(join(out, "asset-manifest.json"), JSON.stringify({ files: listing }, null, 2) + "\n");
console.log("www/ built with " + listing.length + " files:");
for (const l of listing) console.log("  " + l.file.padEnd(24) + String(l.bytes).padStart(8) + "  " + l.sha256.slice(0, 12));
