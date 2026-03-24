import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@repo/database";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const { transferId } = body;

    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    const transfer = await database.inventoryTransfer.findFirst({
      where: { tenantId, id: transferId, deletedAt: null },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (transfer.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved transfers can be shipped" },
        { status: 400 }
      );
    }

    const updatedTransfer = await database.inventoryTransfer.update({
      where: { tenantId_id: { tenantId, id: transferId } },
      data: {
        status: "in_transit",
        shippedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, transfer: updatedTransfer });
  } catch (error) {
    console.error("Error shipping inventory transfer:", error);
    return NextResponse.json(
      { error: "Failed to ship inventory transfer" },
      { status: 500 }
    );
  }
}
