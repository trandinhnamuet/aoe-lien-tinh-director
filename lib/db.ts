import "server-only";
import dns from "node:dns";
import postgres from "postgres";

// Supabase's shared pooler (V2) now advertises IPv6; Node defaults to preferring
// it, and on IPv4-only networks that makes connections hang until CONNECT_TIMEOUT.
// Force IPv4 first so the pooler is reachable everywhere.
dns.setDefaultResultOrder("ipv4first");

// Single postgres client for the Next.js server. All queries qualify
// tables with the `aoe.` schema, so no search_path juggling is needed.
const globalForDb = globalThis as unknown as { _aoeSql?: ReturnType<typeof postgres> };

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Local Postgres (server deploy) has no TLS; remote (Supabase pooler) requires it.
  // Override with DATABASE_SSL=require|false if auto-detection is ever wrong.
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const ssl = process.env.DATABASE_SSL === "false" ? false
    : process.env.DATABASE_SSL === "require" ? "require"
    : local ? false : "require";
  return postgres(url, {
    ssl,
    prepare: false, // Supabase pooler (Supavisor) friendly
    max: 5,
    idle_timeout: 20,
    connect_timeout: 20,
  });
}

export const sql = globalForDb._aoeSql ?? create();
if (process.env.NODE_ENV !== "production") globalForDb._aoeSql = sql;
