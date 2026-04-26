// List maintenance work orders
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

function mapWorkOrderToSnake(w: {
  id: string;
  workOrderNumber: string;
  areaId: string | null;
  equipmentId: string | null;
  workOrderType: string;
  priority: string;
  status: string;
  title: string;
  description: string | null;
  reportedBy: string | null;
  reportedAt: Date;
  assignedTo: string | null;
  assignedVendor: string | null;
  scheduledDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  completedBy: string | null;
  laborHours: { toNumber: () => number } | null;
  partsCost: { toNumber: () => number } | null;
  laborCost: { toNumber: () => number } | null;
  totalCost: { toNumber: () => number } | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: w.id,
    work_order_number: w.workOrderNumber,
    area_id: w.areaId,
    equipment_id: w.equipmentId,
    work_order_type: w.workOrderType,
    priority: w.priority,
    status: w.status,
    title: w.title,
    description: w.description,
    reported_by: w.reportedBy,
    reported_at: w.reportedAt,
    assigned_to: w.assignedTo,
    assigned_vendor: w.assignedVendor,
    scheduled_date: w.scheduledDate,
    started_at: w.startedAt,
    completed_at: w.completedAt,
    completed_by: w.completedBy,
    labor_hours: w.laborHours?.toNumber?.() ?? null,
    parts_cost: w.partsCost?.toNumber?.() ?? null,
    labor_cost: w.laborCost?.toNumber?.() ?? null,
    total_cost: w.totalCost?.toNumber?.() ?? null,
    notes: w.notes,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  };
}

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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "open";
    const priority = searchParams.get("priority");
    const areaId = searchParams.get("areaId");
    const workOrderType = searchParams.get("workOrderType");

    const workOrders = await database.maintenanceWorkOrder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status !== "all" && { status }),
        ...(priority && { priority }),
        ...(areaId && { areaId }),
        ...(workOrderType && { workOrderType }),
      },
      orderBy: [{ priority: "asc" }, { reportedAt: "desc" }],
    });

    const sorted = workOrders.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.reportedAt.getTime() - a.reportedAt.getTime();
    });

    return manifestSuccessResponse({
      workOrders: sorted.map(mapWorkOrderToSnake),
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
