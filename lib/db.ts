import "server-only";
import postgres from "postgres";

// Single postgres client for the Next.js server. All queries qualify
// tables with the `aoe.` schema, so no search_path juggling is needed.
const globalForDb = globalThis as unknown as { _aoeSql?: ReturnType<typeof postgres> };

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    ssl: "require",
    prepare: false, // Supabase pooler (Supavisor) friendly
    max: 5,
    idle_timeout: 20,
    connect_timeout: 20,
  });
}

export const sql = globalForDb._aoeSql ?? create();
if (process.env.NODE_ENV !== "production") globalForDb._aoeSql = sql;
