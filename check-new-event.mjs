import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_4xRiAGLCaT7s@ep-divine-math-ah5lmxku-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require');
const rows = await sql`SELECT id, title, event_type, guest_count, created_at FROM tenant_events.events ORDER BY created_at DESC LIMIT 5`;
console.log(JSON.stringify(rows, null, 2));
