/**
 * Shipment API Endpoints
 *
 * GET    /api/shipments      - List shipments with pagination and filters
 * POST   /api/shipments      - Create a new shipment
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  PaginationParams,
  ShipmentFilters,
  ShipmentStatus,
} from "./types";
import { validateCreateShipmentRequest } from "./validation";

function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  return { page, limit };
}

function parseShipmentFilters(searchParams: URLSearchParams): ShipmentFilters {
  const filters: ShipmentFilters = {};
  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }
  const status = searchParams.get("status");
  if (status) {
    filters.status = status as ShipmentStatus;
  }
  const eventId = searchParams.get("event_id");
  if (eventId) {
    filters.event_id = eventId;
  }
  const supplierId = searchParams.get("supplier_id");
  if (supplierId) {
    filters.supplier_id = supplierId;
  }
  const locationId = searchParams.get("location_id");
  if (locationId) {
    filters.location_id = locationId;
  }
  const dateFrom = searchParams.get("date_from");
  if (dateFrom) {
    filters.date_from = dateFrom;
  }
  const dateTo = searchParams.get("date_to");
  if (dateTo) {
    filters.date_to = dateTo;
  }
  return filters;
}

export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const filters = parseShipmentFilters(searchParams);
    const where: Prisma.ShipmentWhereInput = { tenantId, deletedAt: null };
    if (filters.search) {
      where.OR = [
        { shipmentNumber: { contains: filters.search, mode: "insensitive" } },
        { trackingNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.event_id) {
      where.eventId = filters.event_id;
    }
    if (filters.supplier_id) {
      where.supplierId = filters.supplier_id;
    }
    if (filters.location_id) {
      where.locationId = filters.location_id;
    }
    if (filters.date_from || filters.date_to) {
      where.scheduledDate = {};
      if (filters.date_from) {
        where.scheduledDate.gte = new Date(filters.date_from);
      }
      if (filters.date_to) {
        where.scheduledDate.lte = new Date(filters.date_to);
      }
    }
    const total = await database.shipment.count({ where });
    const shipments = await database.shipment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
    });
    const mappedShipments = shipments.map((s) => ({
      id: s.id,
      tenant_id: s.tenantId,
      shipment_number: s.shipmentNumber,
      status: s.status,
      event_id: s.eventId,
      supplier_id: s.supplierId,
      location_id: s.locationId,
      scheduled_date: s.scheduledDate,
      shipped_date: s.shippedDate,
      estimated_delivery_date: s.estimatedDeliveryDate,
      actual_delivery_date: s.actualDeliveryDate,
      total_items: s.totalItems,
      shipping_cost: s.shippingCost ? Number(s.shippingCost) : null,
      total_value: s.totalValue ? Number(s.totalValue) : null,
      tracking_number: s.trackingNumber,
      carrier: s.carrier,
      shipping_method: s.shippingMethod,
      delivered_by: s.deliveredBy,
      received_by: s.receivedBy,
      signature: s.signature,
      notes: s.notes,
      internal_notes: s.internalNotes,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      deleted_at: s.deletedAt,
    }));
    return NextResponse.json({
      data: mappedShipments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to list shipments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const body = await request.json();
    validateCreateShipmentRequest(body);
    const shipmentNumber = body.shipment_number || `SHP-${Date.now()}`;
    const existing = await database.shipment.findFirst({
      where: { tenantId, shipmentNumber, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Shipment number already exists" },
        { status: 409 }
      );
    }
    const shipment = await database.shipment.create({
      data: {
        tenantId,
        shipmentNumber,
        status: body.status || "draft",
        eventId: body.event_id,
        supplierId: body.supplier_id,
        locationId: body.location_id,
        scheduledDate: body.scheduled_date
          ? new Date(body.scheduled_date)
          : null,
        estimatedDeliveryDate: body.estimated_delivery_date
          ? new Date(body.estimated_delivery_date)
          : null,
        shippingCost: body.shipping_cost ? body.shipping_cost.toString() : null,
        trackingNumber: body.tracking_number,
        carrier: body.carrier,
        shippingMethod: body.shipping_method,
        notes: body.notes,
        internalNotes: body.internal_notes,
      },
    });
    const mappedShipment = {
      id: shipment.id,
      tenant_id: shipment.tenantId,
      shipment_number: shipment.shipmentNumber,
      status: shipment.status,
      event_id: shipment.eventId,
      supplier_id: shipment.supplierId,
      location_id: shipment.locationId,
      scheduled_date: shipment.scheduledDate,
      shipped_date: shipment.shippedDate,
      estimated_delivery_date: shipment.estimatedDeliveryDate,
      actual_delivery_date: shipment.actualDeliveryDate,
      total_items: shipment.totalItems,
      shipping_cost: shipment.shippingCost
        ? Number(shipment.shippingCost)
        : null,
      total_value: shipment.totalValue ? Number(shipment.totalValue) : null,
      tracking_number: shipment.trackingNumber,
      carrier: shipment.carrier,
      shipping_method: shipment.shippingMethod,
      delivered_by: shipment.deliveredBy,
      received_by: shipment.receivedBy,
      signature: shipment.signature,
      notes: shipment.notes,
      internal_notes: shipment.internalNotes,
      created_at: shipment.createdAt,
      updated_at: shipment.updatedAt,
      deleted_at: shipment.deletedAt,
    };
    return NextResponse.json(mappedShipment, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create shipment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
