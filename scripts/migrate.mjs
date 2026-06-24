// Runs every .sql file in db/migrations (sorted) against the database.
import fs from "node:fs";
import path from "node:path";
import { sql } from "./_pg.mjs";

const dir = path.join(process.cwd(), "db", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

try {
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    process.stdout.write(`Running ${f} ... `);
    await sql.unsafe(text);
    console.log("ok");
  }
  console.log(`\nDone (${files.length} migration file(s)).`);
} catch (e) {
  console.error("\nMigration FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
