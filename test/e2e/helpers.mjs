import puppeteer from "puppeteer-core";
import { serve } from "../../scripts/serve.mjs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function setup(port) {
  execFileSync("node", [join(ROOT, "scripts/build-web.mjs")], { stdio: "ignore" });
  const server = serve(join(ROOT, "www"), port);
  if (!existsSync(CHROME)) throw new Error("Chrome not found at " + CHROME + " (set CHROME_PATH)");
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-default-browser-check"] });
  return { server, browser, base: `http://localhost:${port}/` };
}

export async function newPage(browser, opts = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: opts.width || 390, height: opts.height || 844, deviceScaleFactor: 1 });
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text()); });
  page.ctx = ctx;
  // Smooth scrolling makes clicks land before scrolling ends; reduced motion
  // turns it off (the app honours this setting) and stops fade-ins skewing axe.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: opts.scheme || "light" }]);
  return page;
}

export async function axe(page, context) {
  await page.addScriptTag({ path: join(ROOT, "node_modules/axe-core/axe.min.js") });
  return page.evaluate(async (ctx) => {
    const r = await window.axe.run(ctx || document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n")[1]) }));
  }, context || null);
}

export const text = (page, sel) => page.$eval(sel, (el) => el.innerText);
