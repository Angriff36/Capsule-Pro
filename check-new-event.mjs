import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env var is required");
}
const sql = neon(process.env.DATABASE_URL);
const rows =
  await sql`SELECT id, title, event_type, guest_count, created_at FROM tenant_events.events ORDER BY created_at DESC LIMIT 5`;
console.log(JSON.stringify(rows, null, 2));
