// dev-server.mjs
// Local preview server — lets you run the auditor on your own machine without
// installing the Vercel CLI. It serves ./public and routes POST /api/audit to
// the same api/audit.js handler Vercel runs in production, wrapping req/res so
// the handler code stays unchanged between local and deployed.
//
//   node dev-server.mjs                       → demo mode (no key needed)
//   ANTHROPIC_API_KEY=sk-... node dev-server.mjs   → real Claude reviews
//
// Production deploys do not use this file — Vercel invokes api/audit.js directly.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import auditHandler from "./api/audit.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = fileURLToPath(new URL("./public/", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      // Guard against an oversized body tying up the dev server.
      if (raw.length > 1_000_000) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

/** Minimal shim of the Vercel response helpers the handler relies on. */
function wrapResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
    return res;
  };
  return res;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/audit") {
    wrapResponse(res);
    try {
      req.body = req.method === "POST" ? await readBody(req) : {};
      await auditHandler(req, res);
    } catch (err) {
      if (!res.writableEnded) res.status(500).json({ error: "Dev server error.", detail: String(err) });
    }
    return;
  }

  // Static files, scoped to ./public so path traversal can't escape it.
  const rel = url.pathname === "/" ? "index.html" : normalize(url.pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const filePath = join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.setHeader("content-type", MIME[extname(filePath)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Not found");
  }
});

server.listen(PORT, HOST, () => {
  const mode = process.env.ANTHROPIC_API_KEY
    ? "live (Claude API key detected)"
    : "DEMO MODE (no ANTHROPIC_API_KEY — audits are rule-based samples)";
  console.log(`AI Governance Auditor running on http://${HOST}:${PORT}`);
  console.log(`Mode: ${mode}`);
});
