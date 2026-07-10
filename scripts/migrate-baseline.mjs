#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";
import pg from "pg";

const name = process.argv[2];
if (!name) {
  console.error("Usage: pnpm migrate:baseline <migration_name>");
  process.exit(1);
}

config({ path: resolve("packages/database/.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set (checked packages/database/.env).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const { rows } = await client.query(
    "SELECT 1 FROM public._prisma_migrations WHERE migration_name = $1 LIMIT 1",
    [name]
  );
  await client.end();

  if (rows.length > 0) {
    console.log(`Migration ${name} is already applied. Nothing to do.`);
    process.exit(0);
  }
} catch (error) {
  console.error(`DB check failed: ${error.message}`);
  console.error("Falling through to prisma migrate resolve.");
}

try {
  execFileSync(
    "pnpm",
    ["--filter", "@repo/database", "exec", "prisma", "migrate", "resolve", "--applied", name],
    { stdio: "inherit" }
  );
} catch (error) {
  process.exit(error?.status ?? 1);
}
