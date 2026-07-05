import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { generatePrepListCore } from "@/lib/prep-lists/generation";
import { PrepListEventNotFoundError } from "@/lib/prep-lists/types";

/**
 * POST /api/kitchen/prep-lists/generate
 *
 * Canonical prep-list generation endpoint. Expands the event's linked dishes
 * (tenant_events.event_dishes) through recipes → latest version → ingredients
 * and returns station-grouped demand plus unresolved-dish diagnostics.
 *
 * Generation logic lives in apps/api/lib/prep-lists/generation.ts.
 */
export async function POST(request: NextRequest) {
  let eventId: string | undefined;
  try {
    const body = await request.json();
    eventId = body.eventId;
    const { batchMultiplier, dietaryRestrictions } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const prepList = await generatePrepListCore(tenantId, {
      eventId,
      batchMultiplier,
      dietaryRestrictions,
    });

    return NextResponse.json(prepList);
  } catch (error) {
    if (error instanceof PrepListEventNotFoundError) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    captureException(error);
    log.error("prep-list generate failed", { eventId, error });
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate prep list: ${detail}` },
      { status: 500 }
    );
  }
}
