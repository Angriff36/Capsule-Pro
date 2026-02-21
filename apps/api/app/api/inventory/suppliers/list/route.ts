// Auto-generated Next.js API route for InventorySupplier
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { auth } from "@repo/auth/server";

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

const inventorySuppliers = await database.inventorySupplier.findMany({
    where: {
        tenantId,
        deletedAt: null
      },
    orderBy: {
      createdAt: "desc",
    },
  });

    return manifestSuccessResponse({ inventorySuppliers });
  } catch (error) {
    console.error("Error fetching inventorySuppliers:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
