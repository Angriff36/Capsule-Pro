import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import pg from "pg";

const MIGRATIONS_DIR = path.resolve("prisma/migrations");
const SCHEMA_PATH = path.resolve("prisma/schema.prisma");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

function log(title, items) {
  console.log(`\n=== ${title} ===`);
  items.forEach(i => console.log(i));
}

async function getDbState() {
  await client.connect();

  const tables = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name
  `);

  const columns = await client.query(`
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name, column_name
  `);

  await client.end();

  return {
    tables: tables.rows.map(r => `${r.table_schema}.${r.table_name}`),
    columns: columns.rows.map(r =>
      `${r.table_schema}.${r.table_name}.${r.column_name}`
    ),
  };
}

function getSchemaState() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");

  const models = [...schema.matchAll(/model\s+(\w+)/g)].map(m => m[1]);

  const fields = [];
  for (const match of schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\}/g)) {
    const model = match[1];
    const body = match[2];
    for (const line of body.split("\n")) {
      const field = line.trim().split(/\s+/)[0];
      if (field && !field.startsWith("@")) {
        fields.push(`${model}.${field}`);
      }
    }
  }

  return { models, fields };
}

function getMigrationState() {
  const objects = [];

  for (const dir of fs.readdirSync(MIGRATIONS_DIR)) {
    const sqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;

    const sql = fs.readFileSync(sqlPath, "utf8");

    for (const m of sql.matchAll(/CREATE TABLE\s+"?([\w]+)"?\."?([\w]+)"?/gi)) {
      objects.push(`table:${m[1]}.${m[2]}`);
    }

    for (const m of sql.matchAll(/ADD COLUMN\s+"?([\w]+)"?/gi)) {
      objects.push(`column:${m[1]}`);
    }

    for (const m of sql.matchAll(/CREATE INDEX\s+"?([\w]+)"?/gi)) {
      objects.push(`index:${m[1]}`);
    }
  }

  return objects;
}

function diff(label, a, b) {
  return a.filter(x => !b.includes(x)).map(x => `${label}: ${x}`);
}

(async () => {
  const db = await getDbState();
  const schema = getSchemaState();
  const migrations = getMigrationState();

  log("DB tables", db.tables);
  log("Schema models", schema.models);

  log("DB but not in schema",
    diff("missing_in_schema", db.tables.map(t => t.split(".")[1]), schema.models)
  );

  log("Schema but not in DB",
    diff("missing_in_db", schema.models, db.tables.map(t => t.split(".")[1]))
  );

  log("Migration objects", migrations);

})();
