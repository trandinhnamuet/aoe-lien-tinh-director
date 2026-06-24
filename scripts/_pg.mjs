// Shared connection helper for migration/seed scripts.
// Loads env from .env.local (Node scripts don't auto-load it) and prefers
// DIRECT_URL (session-mode pooler / direct) for DDL — falling back to DATABASE_URL.
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

// Prefer IPv4 — Supabase pooler V2 advertises IPv6 that IPv4-only networks
// can't route, which otherwise hangs connections until CONNECT_TIMEOUT.
dns.setDefaultResultOrder("ipv4first");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const txt = fs.readFileSync(envPath, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

loadEnv();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DIRECT_URL / DATABASE_URL (set it in .env.local)");
  process.exit(1);
}

const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
export const sql = postgres(url, {
  ssl: process.env.DATABASE_SSL === "false" ? false : local ? false : "require",
  prepare: false,
  max: 1,
  connect_timeout: 20,
});
