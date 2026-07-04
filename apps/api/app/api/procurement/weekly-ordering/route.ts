/**
 * GET /api/procurement/weekly-ordering?start=ISO&end=ISO
 *
 * Read-model for the weekly ordering surface (constitution §10: reads bypass
 * the runtime). Returns, for the selected date range (default: this week):
 *   - events in range with their prep lists (id/name/status/totalItems), so a
 *     manager can see which lists are still draft (finalizing a list is what
 *     feeds the demand pipeline);
 *   - the open prep-demand draft requisitions grouped per supplier (plus the
 *     UNRESOLVED draft), with line items and per-line prep-list provenance.
 *
 * No writes happen here — finalize/submit/convert all go through governed
 * commands from the client.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export const runtime = "nodejs";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat; week starts Monday
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse(
        { error: "Unauthorized", diagnostics: [] },
        401
      );
    }
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse(
        { error: "Tenant not found", diagnostics: [] },
        400
      );
    }

    const { searchParams } = request.nextUrl;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const start = startParam ? new Date(startParam) : startOfWeek(new Date());
    const end = endParam
      ? new Date(endParam)
      : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return manifestErrorResponse(
        { error: "Invalid start/end date", diagnostics: [] },
        400
      );
    }

    const events = await database.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
        eventDate: { gte: start, lt: end },
      },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        title: true,
        eventDate: true,
        status: true,
        guestCount: true,
      },
    });

    const eventIds = events.map((e) => e.id);
    const prepLists = eventIds.length
      ? await database.prepList.findMany({
          where: { tenantId, deletedAt: null, eventId: { in: eventIds } },
          select: {
            id: true,
            eventId: true,
            name: true,
            status: true,
            totalItems: true,
            generatedAt: true,
          },
        })
      : [];

    // Open prep-demand drafts (per supplier + unresolved), with items.
    const drafts = await database.purchaseRequisition.findMany({
      where: {
        tenantId,
        deletedAt: null,
        itemCategory: "prep-list-demand",
        status: "draft",
      },
      orderBy: { createdAt: "asc" },
    });
    const draftIds = drafts.map((d) => d.id);
    const draftItems = draftIds.length
      ? await database.purchaseRequisitionItem.findMany({
          where: {
            tenantId,
            deletedAt: null,
            requisitionId: { in: draftIds },
          },
          orderBy: { itemName: "asc" },
        })
      : [];

    const supplierIds = [
      ...new Set(drafts.map((d) => d.supplierId).filter(Boolean)),
    ] as string[];
    const suppliers = supplierIds.length
      ? await database.inventorySupplier.findMany({
          where: { tenantId, id: { in: supplierIds } },
          select: { id: true, name: true, vendorId: true },
        })
      : [];
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));

    return manifestSuccessResponse({
      range: { start: start.toISOString(), end: end.toISOString() },
      events: events.map((event) => ({
        ...event,
        prepLists: prepLists.filter((p) => p.eventId === event.id),
      })),
      drafts: drafts.map((draft) => {
        const supplier = draft.supplierId
          ? supplierById.get(draft.supplierId)
          : undefined;
        return {
          id: draft.id,
          requisitionNumber: draft.requisitionNumber,
          sourceType: draft.sourceType ?? "",
          supplierId: draft.supplierId ?? "",
          supplierName: supplier?.name ?? "",
          supplierVendorLinked: Boolean(supplier?.vendorId),
          status: draft.status,
          itemCount: draft.itemCount ?? 0,
          subtotal: Number(draft.subtotal).toFixed(2),
          estimatedTotal: Number(draft.estimatedTotal).toFixed(2),
          notes: draft.notes ?? "",
          items: draftItems
            .filter((item) => item.requisitionId === draft.id)
            .map((item) => ({
              id: item.id,
              itemId: item.itemId,
              itemName: item.itemName ?? "",
              quantityRequested: Number(item.quantityRequested),
              estimatedUnitCost: Number(item.estimatedUnitCost).toFixed(2),
              estimatedTotalCost: Number(item.estimatedTotalCost).toFixed(2),
              specifications: item.specifications ?? "",
              notes: item.notes ?? "",
              sourcePrepListIds: item.sourcePrepListIds ?? [],
            })),
        };
      }),
    });
  } catch (error) {
    return manifestErrorResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load ordering data",
        diagnostics: [],
      },
      500
    );
  }
}
