import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Math.min(Number(searchParams.get("limit") ?? "25"), 100);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where = {
    tenantId,
    deletedAt: null,
    ...(status && status !== "all" ? { order_status: status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" as const } },
            { venue_name: { contains: search, mode: "insensitive" as const } },
            {
              special_instructions: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    database.cateringOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    database.cateringOrder.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return manifestSuccessResponse({
    data: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerId: o.customer_id,
      eventId: o.eventId,
      status: o.order_status,
      orderDate: o.order_date.toISOString(),
      deliveryDate: o.delivery_date.toISOString(),
      deliveryTime: o.delivery_time,
      subtotal: o.subtotal_amount.toString(),
      tax: o.tax_amount.toString(),
      discount: o.discount_amount.toString(),
      serviceCharge: o.service_charge_amount.toString(),
      total: o.totalAmount.toString(),
      depositRequired: o.deposit_required,
      depositAmount: o.deposit_amount?.toString() ?? null,
      depositPaid: o.deposit_paid,
      venueName: o.venue_name,
      venueCity: o.venue_city,
      venueState: o.venue_state,
      guestCount: o.guest_count,
      dietaryRestrictions: o.dietary_restrictions,
      staffRequired: o.staff_required,
      staffAssigned: o.staff_assigned,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages },
  });
}
