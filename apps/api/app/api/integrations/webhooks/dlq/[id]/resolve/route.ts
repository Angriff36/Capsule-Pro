/**
 * Webhook DLQ Resolve API
 *
 * POST /api/integrations/webhooks/dlq/[id]/resolve - Mark DLQ entry as resolved
 *
 * Mark a DLQ entry as resolved with optional notes. This is used when the issue
 * has been addressed outside the system (e.g., fixed in the destination system).
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ResolveRequest {
  resolution: string; // Required: explanation of how the issue was resolved
}

/**
 * Mark a DLQ entry as resolved
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const body: ResolveRequest = await request.json();

    if (!body.resolution?.trim()) {
      return NextResponse.json(
        { error: "Resolution notes are required" },
        { status: 400 }
      );
    }

    // Get the DLQ entry
    const dlqEntry = await database.webhookDeadLetterQueue.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    if (!dlqEntry) {
      return NextResponse.json({ error: "DLQ entry not found" }, { status: 404 });
    }

    // Check if already resolved
    if (dlqEntry.resolvedAt) {
      return NextResponse.json(
        { error: "DLQ entry already resolved" },
        { status: 400 }
      );
    }

    // Mark as resolved
    const updatedEntry = await database.webhookDeadLetterQueue.update({
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
        resolution: body.resolution.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    });
  } catch (error) {
    console.error("Error resolving DLQ entry:", error);
    return NextResponse.json(
      { error: "Failed to resolve DLQ entry" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
