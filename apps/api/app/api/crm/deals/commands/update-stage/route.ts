/**
 * POST /api/crm/deals/commands/update-stage
 * Move a proposal (deal) from one pipeline stage to another.
 * Body: { dealId: string, stage: string }
 *
 * Stage → proposal status mapping:
 * - lead        → draft
 * - qualified   → sent
 * - proposal    → viewed
 * - negotiation → accepted
 * - won         → accepted  (note: caller should ensure event is linked for won)
 * - lost        → rejected
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const VALID_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
type Stage = (typeof VALID_STAGES)[number];

const STAGE_TO_STATUS: Record<Stage, string> = {
  lead: "draft",
  qualified: "sent",
  proposal: "viewed",
  negotiation: "accepted",
  won: "accepted",
  lost: "rejected",
};

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { dealId, stage } = body as { dealId: string; stage: string };

    if (!dealId || typeof dealId !== "string") {
      return NextResponse.json(
        { message: "dealId is required" },
        { status: 400 }
      );
    }

    if (!(stage && VALID_STAGES.includes(stage as Stage))) {
      return NextResponse.json(
        {
          message: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const newStatus = STAGE_TO_STATUS[stage as Stage];

    // Update the proposal's status (the "deal" is a proposal)
    await database.proposal.update({
      where: {
        tenantId_id: {
          tenantId,
          id: dealId,
        },
      },
      data: {
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      dealId,
      stage,
      status: newStatus,
    });
  } catch (error) {
    captureException(error);
    console.error("Error updating deal stage:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
