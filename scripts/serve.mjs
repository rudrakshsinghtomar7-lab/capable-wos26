// Minimal static server for local testing: node scripts/serve.mjs <dir> <port>
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
const dir = process.argv[2] || "www", port = Number(process.argv[3] || 8080);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png" };
export function serve(d, p) {
  return createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(d, path));
    if (!file.startsWith(normalize(d))) { res.writeHead(403).end(); return; }
    try { const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" }); res.end(body); }
    catch { res.writeHead(404).end("not found"); }
  }).listen(p, "127.0.0.1");
}
if (import.meta.url === `file://${process.argv[1]}`) { serve(dir, port); console.log(`Serving ${dir} at http://localhost:${port}/`); }
