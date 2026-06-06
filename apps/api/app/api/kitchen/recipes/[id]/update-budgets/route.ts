import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import {
  runManifestCommandCore,
  type ManifestUserContext,
} from "@repo/manifest-runtime/run-manifest-command-core";

export const runtime = "nodejs";

/**
 * Compute per-event recipe costs for all events using a given recipe version.
 * Read path (constitution §10) — not governed.
 */
const computeEventRecipeCosts = async (
  recipeVersionId: string,
  tenantId: string
): Promise<Array<{ eventId: string; totalRecipeCost: number }>> => {
  const rows = await database.$queryRaw<
    Array<{ event_id: string; total_recipe_cost: bigint }>
  >(Prisma.sql`
    WITH recipe_events AS (
      SELECT DISTINCT pt.event_id
      FROM tenant_kitchen.prep_tasks pt
      WHERE pt.tenant_id = ${tenantId}
        AND pt.recipe_version_id = ${recipeVersionId}
        AND pt.deleted_at IS NULL
    ),
    event_recipe_costs AS (
      SELECT
        e.id as event_id,
        COALESCE(SUM(rv.total_cost), 0) as total_recipe_cost
      FROM recipe_events re
      JOIN tenant_events.events e ON e.id = re.event_id
      JOIN tenant_kitchen.dishes d
        ON d.id IN (
          SELECT DISTINCT pt.dish_id
          FROM tenant_kitchen.prep_tasks pt
          WHERE pt.event_id = e.id
            AND pt.tenant_id = ${tenantId}
            AND pt.deleted_at IS NULL
            AND pt.dish_id IS NOT NULL
        )
        AND d.tenant_id = ${tenantId}
        AND d.deleted_at IS NULL
      JOIN tenant_kitchen.recipe_versions rv
        ON rv.recipe_id = d.recipe_id
        AND rv.version_number = (
          SELECT MAX(rv2.version_number)
          FROM tenant_kitchen.recipe_versions rv2
          WHERE rv2.recipe_id = rv.recipe_id
            AND rv2.tenant_id = ${tenantId}
            AND rv2.deleted_at IS NULL
        )
      WHERE e.tenant_id = ${tenantId}
      GROUP BY e.id
    )
    SELECT event_id, total_recipe_cost
    FROM event_recipe_costs
  `);

  return rows.map((r) => ({
    eventId: r.event_id,
    totalRecipeCost: Number(r.total_recipe_cost),
  }));
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;
    const recipeVersionId = recipeId;
    const _body = await request.json();

    if (!recipeVersionId) {
      return NextResponse.json(
        { error: "recipeVersionId is required" },
        { status: 400 }
      );
    }

    const tenantId = user.tenantId;

    // Read path: compute per-event recipe costs
    const eventCosts = await computeEventRecipeCosts(recipeVersionId, tenantId);

    // Governed write: dispatch updateBudget for each affected event
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const { eventId, totalRecipeCost } of eventCosts) {
      const result = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: {
                id: u.id,
                tenantId: u.tenantId,
                role: u.role,
              },
              entityName,
            }),
        },
        {
          entity: "Event",
          command: "updateBudget",
          body: {
            id: eventId,
            tenantId,
            newBudget: totalRecipeCost,
          },
          user: {
            id: user.id,
            tenantId,
            role: user.role,
          } as ManifestUserContext,
        }
      );

      if (result.ok) {
        updated++;
      } else {
        failed++;
        errors.push(`Event ${eventId}: ${result.message}`);
        log.error("updateBudget command failed", {
          eventId,
          error: result.message,
        });
      }
    }

    return NextResponse.json({
      success: failed === 0,
      message: `Event budgets updated: ${updated} succeeded, ${failed} failed`,
      updated,
      failed,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to update event budgets" },
      { status: 500 }
    );
  }
}
