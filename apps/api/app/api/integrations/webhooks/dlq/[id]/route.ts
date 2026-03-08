/**
 * Webhook Dead Letter Queue (DLQ) Single Entry API
 *
 * GET /api/integrations/webhooks/dlq/[id] - Get single DLQ entry
 * DELETE /api/integrations/webhooks/dlq/[id] - Delete DLQ entry (mark as resolved)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get a single DLQ entry
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    const entry = await database.webhookDeadLetterQueue.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "DLQ entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Error getting DLQ entry:", error);
    return NextResponse.json(
      { error: "Failed to get DLQ entry" },
      { status: 500 }
    );
  }
}

/**
 * Delete a DLQ entry (mark as resolved without retrying)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    // Mark as resolved instead of hard delete
    const entry = await database.webhookDeadLetterQueue.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        resolvedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: userId,
        resolution: "Marked as resolved without retry",
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Error resolving DLQ entry:", error);
    return NextResponse.json(
      { error: "Failed to resolve DLQ entry" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
