import { auth } from "@repo/auth/server";
import { clearSampleData, db, seedSampleData } from "@repo/database";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { createManifestRuntime } from "@/lib/manifest-runtime";

/**
 * DELETE /api/settings/sample-data
 * Clear all sample data for the current tenant.
 *
 * GOVERNED: Uses manifest runtime for policy enforcement and event emission.
 * The actual Prisma deletes happen as a post-command effect after the
 * manifest command succeeds (guards pass, SampleDataCleared event emitted).
 */
export const DELETE = async () => {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runtime = await createManifestRuntime({
      user: {
        id: userId,
        tenantId: orgId,
        role: "admin", // Settings page is admin-only
      },
      entityName: "SampleData",
    });

    const result = await runtime.runCommand(
      "clear",
      { requestedBy: userId, reason: "User requested via settings" },
      { entityName: "SampleData", instanceId: `sample-data-${orgId}` }
    );

    if (!result.success) {
      log.warn("Sample data clear command rejected", {
        tenantId: orgId,
        userId,
        guardFailure: result.guardFailure,
        policyDenial: result.policyDenial,
      });

      return NextResponse.json(
        {
          error:
            result.guardFailure ||
            result.policyDenial ||
            "Clear command rejected",
        },
        { status: 422 }
      );
    }

    // Command succeeded — perform the actual data deletes as a post-command effect
    await clearSampleData(db, orgId);

    log.info("Sample data cleared (governed)", {
      tenantId: orgId,
      userId,
      emittedEvents: result.emittedEvents?.map((e: { name: string }) => e.name),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to clear sample data", {
      tenantId: orgId,
      error,
    });

    return NextResponse.json(
      { error: "Failed to clear sample data" },
      { status: 500 }
    );
  }
};

/**
 * POST /api/settings/sample-data
 * Seed sample data on demand for existing tenants.
 *
 * GOVERNED: Uses manifest runtime for policy enforcement and event emission.
 * Supports both initial seed (action: "seed") and re-seed (action: "reseed").
 */
export const POST = async (request: Request) => {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { action?: string };
    const action = body.action === "reseed" ? "reseed" : "seed";

    const runtime = await createManifestRuntime({
      user: {
        id: userId,
        tenantId: orgId,
        role: "admin",
      },
      entityName: "SampleData",
    });

    const params =
      action === "reseed" ? { requestedBy: userId } : { requestedBy: userId };

    const result = await runtime.runCommand(action, params, {
      entityName: "SampleData",
      instanceId: `sample-data-${orgId}`,
    });

    if (!result.success) {
      log.warn(`Sample data ${action} command rejected`, {
        tenantId: orgId,
        userId,
        guardFailure: result.guardFailure,
        policyDenial: result.policyDenial,
      });

      return NextResponse.json(
        {
          error:
            result.guardFailure ||
            result.policyDenial ||
            `${action} command rejected`,
        },
        { status: 422 }
      );
    }

    // Command succeeded — perform the actual data writes as a post-command effect
    if (action === "reseed") {
      // Clear first, then seed fresh
      await clearSampleData(db, orgId);
      await seedSampleData(db, orgId);
    } else {
      await seedSampleData(db, orgId);
    }

    log.info(`Sample data ${action} complete (governed)`, {
      tenantId: orgId,
      userId,
      emittedEvents: result.emittedEvents?.map((e: { name: string }) => e.name),
    });

    return NextResponse.json({ success: true, action });
  } catch (error) {
    log.error("Failed to seed sample data", {
      tenantId: orgId,
      error,
    });

    return NextResponse.json(
      { error: "Failed to seed sample data" },
      { status: 500 }
    );
  }
};

/**
 * GET /api/settings/sample-data
 * Check if sample data exists for the current tenant.
 *
 * READ-ONLY: No governance needed — this is a query, not a mutation.
 */
export const GET = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if any sample data exists by looking for sample-tagged items
    const sampleEventsCount = await db.event.count({
      where: {
        tenantId: orgId,
        tags: { has: "sample" },
        deletedAt: null,
      },
    });

    const hasSampleData = sampleEventsCount > 0;

    return NextResponse.json({
      hasSampleData,
      sampleEventsCount,
    });
  } catch (error) {
    log.error("Failed to check sample data", {
      tenantId: orgId,
      error,
    });

    return NextResponse.json(
      { error: "Failed to check sample data" },
      { status: 500 }
    );
  }
};
