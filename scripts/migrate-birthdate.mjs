// One-off, SAFE migration: switch aoe.players.birth_date from date -> text so
// it can hold partial/odd values (year only, month-year, etc.).
// Runs ONLY db/migrations/0002 (idempotent) — does NOT touch other tables/data.
// Usage: node scripts/migrate-birthdate.mjs
import fs from "node:fs";
import path from "node:path";
import { sql } from "./_pg.mjs";

try {
  const text = fs.readFileSync(path.join(process.cwd(), "db", "migrations", "0002_birth_date_text.sql"), "utf8");
  await sql.unsafe(text);
  const [col] = await sql`
    select data_type from information_schema.columns
    where table_schema='aoe' and table_name='players' and column_name='birth_date'`;
  console.log("OK · birth_date column type is now:", col?.data_type);
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
