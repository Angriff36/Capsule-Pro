// Quality Checklists API route
// Lists all quality control checklists for the current tenant

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    const checklists = await database.qualityChecklist.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(category && { category }),
        ...(isActive !== null && { isActive: isActive === "true" }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return manifestSuccessResponse({ checklists });
  } catch (error) {
    console.error("Error fetching quality checklists:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { name, category, description, checklistData } = body;

    if (!(name && category)) {
      return manifestErrorResponse("Name and category are required", 400);
    }

    const checklist = await database.qualityChecklist.create({
      data: {
        tenantId,
        name,
        category,
        description,
        checklistData: checklistData || {},
        version: "1.0",
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ checklist });
  } catch (error) {
    console.error("Error creating quality checklist:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
