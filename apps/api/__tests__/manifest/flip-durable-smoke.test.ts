/**
 * Durable write/read smoke for the PrismaJsonStore → GenericPrismaStore flip.
 *
 * GATE: proves that a governed Manifest create for a *flipped* entity lands in
 * its REAL typed Prisma table — not in `tenant.manifest_entity` (the JSON blob).
 * This is the merge gate from the verification spec; the mocked factory unit
 * test proves routing, this proves the routing actually persists to the right
 * physical table through the production command path.
 *
 * Runs ONLY when RUN_DB_SMOKE=1 and a real tenant is supplied — it talks to the
 * live DB and writes/cleans up real rows. Never runs in plain CI by accident.
 *
 *   RUN_DB_SMOKE=1 \
 *   SMOKE_TENANT_ID=<an existing tenant_accounts.id> \
 *   SMOKE_USER_ID=<an existing user id for that tenant> \
 *   SMOKE_USER_ROLE=owner \
 *   pnpm --filter api test -- flip-durable-smoke
 *
 * The body for each entity is DERIVED from the same generated Prisma metadata
 * the store uses (required, non-default scalar columns get type-appropriate
 * dummies) — no hand-guessed field lists, so it stays correct as the schema
 * changes. If a create still fails, it fails loud with the exact column/guard.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { database } from "@repo/database";
// Production wrapper: binds the real prisma/log/sentry singletons + the flip.
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";

// ---------------------------------------------------------------------------
// Config / guards
// ---------------------------------------------------------------------------
const ENABLED = process.env.RUN_DB_SMOKE === "1";
const TENANT_ID = process.env.SMOKE_TENANT_ID ?? "";
const USER_ID = process.env.SMOKE_USER_ID ?? "smoke-user";
const USER_ROLE = process.env.SMOKE_USER_ROLE ?? "owner";

// Entities that were flipped (must persist to a real table) + one that is
// intentionally still on PrismaJsonStore (must persist to manifest_entity and
// NOT crash). SelOnboardingTrainingModuleDefinition has no Prisma model at all.
const FLIPPED = [
  "Event",
  "Dish",
  "PrepList",
  "TrainingModule",
  "StaffMember",
] as const;
const STILL_JSON = "SelOnboardingTrainingModuleDefinition";

// ---------------------------------------------------------------------------
// Metadata-derived body builder (mirrors GenericPrismaStore.buildCreateData)
// ---------------------------------------------------------------------------
interface FieldMeta {
  name: string;
  irName: string;
  type: string;
  isList: boolean;
  optional: boolean;
  hasDefault: boolean;
  isUpdatedAt: boolean;
  isId: boolean;
  isEnum: boolean;
}
interface ModelMeta {
  accessor: string;
  pkFields: string[];
  hasDeletedAt: boolean;
  fields: FieldMeta[];
}

function loadMetadata(): Record<string, ModelMeta> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(
    here,
    "../../../../manifest/runtime/src/generated/prisma-model-metadata.generated.ts"
  );
  const src = readFileSync(path, "utf8");
  const b = src.indexOf("{", src.indexOf("PRISMA_MODEL_METADATA"));
  let depth = 0;
  let end = -1;
  for (let i = b; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return JSON.parse(src.slice(b, end).replace(/,\s*([}\]])/g, "$1"));
}

const META = ENABLED ? loadMetadata() : {};

function dummyFor(f: FieldMeta): unknown {
  if (f.isList) return [`smoke-${f.name}`];
  switch (f.type) {
    case "Int":
    case "BigInt":
    case "Float":
      return 1;
    case "Decimal":
      return 1;
    case "Boolean":
      return false;
    case "DateTime":
      return Date.now(); // manifest contract = epoch millis
    case "Json":
      return {};
    default:
      return `smoke-${f.name}`;
  }
}

/** Required, non-default scalar columns get dummies; id/tenantId/@updatedAt skipped. */
function buildBody(meta: ModelMeta): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of meta.fields) {
    if (f.isId || f.name === "id" || f.name === "tenantId" || f.isUpdatedAt) {
      continue;
    }
    if (f.optional || f.hasDefault) continue;
    body[f.irName] = dummyFor(f);
  }
  // Common guard parity: ensure a non-empty name when the model has one.
  if (meta.fields.some((f) => f.name === "name")) body.name = "smoke-test";
  return body;
}

function makeRunner(entity: string) {
  let engine: Awaited<ReturnType<typeof createManifestRuntime>> | undefined;
  const user = { id: USER_ID, tenantId: TENANT_ID, role: USER_ROLE };
  const create = async (body: Record<string, unknown>) =>
    runManifestCommandCore(
      {
        createRuntime: async (ctx) => {
          engine = await createManifestRuntime({
            user: ctx.user,
            entityName: entity,
          });
          return engine;
        },
      },
      { entity, command: "create", body, user }
    );
  return {
    create,
    getInstance: (id: string) => engine?.getInstance(entity, id),
  };
}

// ---------------------------------------------------------------------------
// Cleanup registry — hard-delete every row the smoke creates.
// ---------------------------------------------------------------------------
const cleanups: Array<() => Promise<void>> = [];
afterAll(async () => {
  for (const c of cleanups) {
    try {
      await c();
    } catch {
      /* best-effort */
    }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe.skipIf(!ENABLED || !TENANT_ID)(
  "flip durable smoke (real DB)",
  () => {
    for (const entity of FLIPPED) {
      it(`${entity}.create persists to the real typed table, not manifest_entity`, async () => {
        const meta = META[entity];
        expect(meta, `no metadata for ${entity}`).toBeTruthy();

        const runner = makeRunner(entity);
        const res = await runner.create(buildBody(meta));

        // Fail loud with the runtime's own message (guard/policy/NOT NULL col).
        expect(res.ok, `create failed: ${JSON.stringify(res)}`).toBe(true);
        const id = (res as { result: { id: string } }).result.id;
        expect(id).toBeTruthy();
        cleanups.push(async () => {
          // biome-ignore lint/suspicious/noExplicitAny: dynamic delegate by name
          const delegate = (database as any)[meta.accessor];
          await delegate.deleteMany({ where: { tenantId: TENANT_ID, id } });
        });

        // 1) Row exists in the REAL typed table.
        // biome-ignore lint/suspicious/noExplicitAny: dynamic delegate by name
        const realRow = await (database as any)[meta.accessor].findFirst({
          where: { tenantId: TENANT_ID, id },
        });
        expect(realRow, `${entity} row missing from real table`).toBeTruthy();

        // 2) Row is NOT in the JSON blob table.
        const jsonRow = await database.manifestEntity.findUnique({
          where: {
            tenantId_entityType_id: {
              tenantId: TENANT_ID,
              entityType: entity,
              id,
            },
          },
        });
        expect(
          jsonRow,
          `${entity} leaked into manifest_entity — flip not applied`
        ).toBeNull();

        // 3) Read path round-trips through the real store.
        const readBack = await runner.getInstance(id);
        expect((readBack as { id?: string })?.id).toBe(id);
      });
    }

    it(`${STILL_JSON}.create stays on PrismaJsonStore (manifest_entity) and does not crash`, async () => {
      // Intentionally-excluded control: no Prisma model, so it must remain JSON.
      const runner = makeRunner(STILL_JSON);
      const res = await runner.create({ name: "smoke-test", id: crypto.randomUUID() });
      expect(res.ok, `excluded entity create failed: ${JSON.stringify(res)}`).toBe(
        true
      );
      const id = (res as { result: { id: string } }).result.id;
      const jsonRow = await database.manifestEntity.findUnique({
        where: {
          tenantId_entityType_id: {
            tenantId: TENANT_ID,
            entityType: STILL_JSON,
            id,
          },
        },
      });
      expect(jsonRow, "excluded entity should be in manifest_entity").toBeTruthy();
      cleanups.push(async () => {
        await database.manifestEntity.deleteMany({
          where: { tenantId: TENANT_ID, entityType: STILL_JSON, id },
        });
      });
    });
  }
);
