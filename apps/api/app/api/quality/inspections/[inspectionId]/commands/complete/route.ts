// Quality Inspection Complete Command
// Transitions an inspection from in_progress to completed

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(
  request: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const inspectionId = params.inspectionId;
    const body = await request.json();
    const { inspectionData, notes } = body;

    // Get the inspection
    const inspection = await database.qualityInspection.findFirst({
      where: {
        tenantId,
        id: inspectionId,
        deletedAt: null,
      },
    });

    if (!inspection) {
      return manifestErrorResponse("Inspection not found", 404);
    }

    if (inspection.status !== "in_progress") {
      return manifestErrorResponse(
        "Can only complete in-progress inspections",
        400
      );
    }

    if (!(inspectionData && inspectionData.items)) {
      return manifestErrorResponse(
        "Inspection data with items is required",
        400
      );
    }

    // Calculate pass/fail statistics
    const totalItems = inspectionData.items.length;
    let passedItems = 0;
    let failedItems = 0;
    let skippedItems = 0;

    for (const item of inspectionData.items) {
      if (item.status === "pass") {
        passedItems++;
      } else if (item.status === "fail") {
        failedItems++;
      } else if (item.status === "skip") {
        skippedItems++;
      }
    }

    const passRate = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;

    // Update inspection to completed
    const updatedInspection = await database.qualityInspection.update({
      where: {
        tenantId_id: {
          tenantId,
          id: inspectionId,
        },
      },
      data: {
        status: "completed",
        inspectionData,
        notes,
        totalItems,
        passedItems,
        failedItems,
        skippedItems,
        passRate,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ inspection: updatedInspection });
  } catch (error) {
    console.error("Error completing inspection:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
