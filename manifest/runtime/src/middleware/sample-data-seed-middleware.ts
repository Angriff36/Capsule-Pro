/**
 * SampleData seed/clear effect middleware (onboarding, governed sample data).
 *
 * Completes the `SampleData` command flow that the DSL declared but never wired.
 * `SampleData.seed` / `reseed` / `clear` (manifest/source/platform/sample-data-rules.manifest)
 * only mutate the SampleData tracking row (`isSeeded`, counters) and emit a
 * `SampleDataSeeded` / `SampleDataReseeded` / `SampleDataCleared` event — the source
 * comments say "the actual seeding is performed by the store's effect handler", but
 * NO such effect existed. So dispatching `SampleData.seed` flipped `isSeeded = true`
 * without ever creating the demo Event/Client/Recipe/PrepTask/Inventory rows the
 * onboarding empty-state CTA promises. This middleware IS that effect handler.
 *
 * WHY middleware (not a reaction): the work is bulk row creation across ~20 tables
 * performed by the existing `seedSampleData` / `clearSampleData` helpers
 * (@repo/database/sample-data) — a cross-table fan-out that the declarative DSL
 * cannot express and that a reaction (single-target) cannot perform. Direct Prisma
 * writes are constitution §9-permissible here because they execute INSIDE the
 * Manifest runtime lifecycle (an approved adapter/effect boundary), driven by the
 * governed command's emitted semantic event.
 *
 * Guard-safe + non-fatal: a seeding failure is logged via `onDiagnostic`, never
 * thrown — the SampleData command itself already succeeded and emitted its event, so
 * surfacing partial-seed errors to the caller would be misleading. Sample/demo data
 * is expendable; a partial seed is acceptable and re-runnable via `reseed`.
 */

import type {
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
} from "@angriff36/manifest";
import { clearSampleData, seedSampleData } from "@repo/database/sample-data";

/** Full Prisma client shape expected by the seed/clear helpers. */
type SampleDataPrisma = Parameters<typeof seedSampleData>[0];

export interface SampleDataSeedDiagnostic {
  detail?: Record<string, unknown>;
  event?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface SampleDataSeedMiddlewareOptions {
  onDiagnostic?: (diag: SampleDataSeedDiagnostic) => void;
  prisma: SampleDataPrisma;
}

const defaultDiagnostic = (diag: SampleDataSeedDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[sample-data-seed:${diag.stage}] ${diag.reason}`, {
    event: diag.event,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createSampleDataSeedMiddleware(
  options: SampleDataSeedMiddlewareOptions
): Middleware {
  const { prisma, onDiagnostic = defaultDiagnostic } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "SampleData") {
        return {};
      }

      for (const event of ctx.emittedEvents) {
        if (
          event.name === "SampleDataSeeded" ||
          event.name === "SampleDataReseeded"
        ) {
          await runSeed(event, ctx);
        } else if (event.name === "SampleDataCleared") {
          await runClear(event, ctx, "clear");
        }
      }

      return {};
    },
  };

  function resolveTenantId(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext
  ): string | undefined {
    const payload = event.payload as { tenantId?: unknown } | undefined;
    return (
      asNonEmptyString(payload?.tenantId) ??
      asNonEmptyString(
        (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
          ?.tenantId
      )
    );
  }

  /** Reseed clears then seeds; seed seeds. */
  async function runSeed(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext
  ): Promise<void> {
    const tenantId = resolveTenantId(event, ctx);
    if (!tenantId) {
      onDiagnostic({
        stage: "tenant",
        reason: "could not resolve tenantId — sample data not seeded",
        event: event.name,
      });
      return;
    }

    try {
      if (event.name === "SampleDataReseeded") {
        await clearSampleData(prisma, tenantId);
      }
      await seedSampleData(prisma, tenantId);
      onDiagnostic({
        stage: "done",
        reason: "sample data seeded",
        event: event.name,
        tenantId,
      });
    } catch (error) {
      onDiagnostic({
        stage: "seed",
        reason: `sample data seeding failed (partial seed may persist): ${
          error instanceof Error ? error.message : String(error)
        }`,
        event: event.name,
        tenantId,
      });
    }
  }

  async function runClear(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext,
    stage: string
  ): Promise<void> {
    const tenantId = resolveTenantId(event, ctx);
    if (!tenantId) {
      onDiagnostic({
        stage: "tenant",
        reason: "could not resolve tenantId — sample data not cleared",
        event: event.name,
      });
      return;
    }

    try {
      await clearSampleData(prisma, tenantId);
      onDiagnostic({
        stage: "done",
        reason: "sample data cleared",
        event: event.name,
        tenantId,
      });
    } catch (error) {
      onDiagnostic({
        stage,
        reason: `sample data clear failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        event: event.name,
        tenantId,
      });
    }
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
