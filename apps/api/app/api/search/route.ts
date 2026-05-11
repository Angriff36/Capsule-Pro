import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const url = request.nextUrl.searchParams;
    const q = url.get("q")?.trim();
    if (!q || q.length < 2) {
      return manifestSuccessResponse({ groups: [], total: 0 });
    }

    const type = url.get("type")?.trim();
    const page = Math.max(1, Number.parseInt(url.get("page") ?? "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(url.get("limit") ?? "10", 10))
    );
    const skip = (page - 1) * limit;

    const baseFilter = (fields: string[]) => ({
      tenantId,
      deletedAt: null,
      OR: fields.map((f) => ({
        [f]: { contains: q, mode: "insensitive" as const },
      })),
    });

    const groups: Record<string, { items: unknown[]; total: number }> = {};

    const shouldSearch = (entityType: string) => !type || type === entityType;

    if (shouldSearch("events")) {
      const [items, total] = await Promise.all([
        database.event.findMany({
          where: baseFilter(["title", "eventNumber", "venueName"]),
          orderBy: [{ eventDate: "desc" }],
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            title: true,
            eventNumber: true,
            eventDate: true,
            venueName: true,
            status: true,
          },
        }),
        database.event.count({
          where: baseFilter(["title", "eventNumber", "venueName"]),
        }),
      ]);
      groups.events = { items, total };
    }

    if (shouldSearch("clients")) {
      const [items, total] = await Promise.all([
        database.client.findMany({
          where: baseFilter([
            "company_name",
            "first_name",
            "last_name",
            "email",
            "phone",
          ]),
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        }),
        database.client.count({
          where: baseFilter([
            "company_name",
            "first_name",
            "last_name",
            "email",
            "phone",
          ]),
        }),
      ]);
      groups.clients = { items, total };
    }

    if (shouldSearch("contacts")) {
      const [items, total] = await Promise.all([
        database.clientContact.findMany({
          where: baseFilter([
            "first_name",
            "last_name",
            "email",
            "phone",
            "phoneMobile",
          ]),
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            clientId: true,
            first_name: true,
            last_name: true,
            title: true,
            email: true,
            phone: true,
          },
        }),
        database.clientContact.count({
          where: baseFilter([
            "first_name",
            "last_name",
            "email",
            "phone",
            "phoneMobile",
          ]),
        }),
      ]);
      groups.contacts = { items, total };
    }

    if (shouldSearch("venues")) {
      const [items, total] = await Promise.all([
        database.venue.findMany({
          where: {
            ...baseFilter(["name", "city", "contactName", "contactEmail"]),
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            name: true,
            city: true,
            stateProvince: true,
            venueType: true,
            capacity: true,
          },
        }),
        database.venue.count({
          where: {
            ...baseFilter(["name", "city", "contactName", "contactEmail"]),
            isActive: true,
          },
        }),
      ]);
      groups.venues = { items, total };
    }

    if (shouldSearch("inventory")) {
      const [items, total] = await Promise.all([
        database.inventoryItem.findMany({
          where: baseFilter(["name", "item_number", "description", "category"]),
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            item_number: true,
            name: true,
            category: true,
            unitOfMeasure: true,
            quantityOnHand: true,
          },
        }),
        database.inventoryItem.count({
          where: baseFilter(["name", "item_number", "description", "category"]),
        }),
      ]);
      groups.inventory = { items, total };
    }

    if (shouldSearch("tasks")) {
      const [items, total] = await Promise.all([
        database.kitchenTask.findMany({
          where: baseFilter(["title", "summary"]),
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            title: true,
            summary: true,
            status: true,
            priority: true,
          },
        }),
        database.kitchenTask.count({
          where: baseFilter(["title", "summary"]),
        }),
      ]);
      groups.tasks = { items, total };
    }

    if (shouldSearch("knowledge")) {
      const [items, total] = await Promise.all([
        database.knowledgeBaseEntry.findMany({
          where: {
            ...baseFilter(["title", "content", "category"]),
            status: "published",
          },
          orderBy: { publishedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            slug: true,
            title: true,
            category: true,
            publishedAt: true,
          },
        }),
        database.knowledgeBaseEntry.count({
          where: {
            ...baseFilter(["title", "content", "category"]),
            status: "published",
          },
        }),
      ]);
      groups.knowledge = { items, total };
    }

    if (shouldSearch("recipes")) {
      const [items, total] = await Promise.all([
        database.recipe.findMany({
          where: baseFilter(["name", "description", "category", "cuisineType"]),
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            name: true,
            category: true,
            cuisineType: true,
          },
        }),
        database.recipe.count({
          where: baseFilter(["name", "description", "category", "cuisineType"]),
        }),
      ]);
      groups.recipes = { items, total };
    }

    if (shouldSearch("dishes")) {
      const [items, total] = await Promise.all([
        database.dish.findMany({
          where: baseFilter(["name", "description", "category", "serviceStyle"]),
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            name: true,
            category: true,
            serviceStyle: true,
          },
        }),
        database.dish.count({
          where: baseFilter(["name", "description", "category", "serviceStyle"]),
        }),
      ]);
      groups.dishes = { items, total };
    }

    if (shouldSearch("equipment")) {
      const [items, total] = await Promise.all([
        database.equipment.findMany({
          where: baseFilter([
            "name",
            "serialNumber",
            "manufacturer",
            "model",
            "type",
          ]),
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            name: true,
            type: true,
            manufacturer: true,
            status: true,
          },
        }),
        database.equipment.count({
          where: baseFilter([
            "name",
            "serialNumber",
            "manufacturer",
            "model",
            "type",
          ]),
        }),
      ]);
      groups.equipment = { items, total };
    }

    if (shouldSearch("ingredients")) {
      const [items, total] = await Promise.all([
        database.ingredient.findMany({
          where: baseFilter(["name", "category"]),
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            name: true,
            category: true,
          },
        }),
        database.ingredient.count({
          where: baseFilter(["name", "category"]),
        }),
      ]);
      groups.ingredients = { items, total };
    }

    if (shouldSearch("menus")) {
      const [items, total] = await Promise.all([
        database.menu.findMany({
          where: baseFilter(["name", "description", "category"]),
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            name: true,
            category: true,
          },
        }),
        database.menu.count({
          where: baseFilter(["name", "description", "category"]),
        }),
      ]);
      groups.menus = { items, total };
    }

    if (shouldSearch("leads")) {
      const [items, total] = await Promise.all([
        database.lead.findMany({
          where: baseFilter([
            "companyName",
            "contactName",
            "contactEmail",
            "contactPhone",
            "eventType",
          ]),
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            companyName: true,
            contactName: true,
            contactEmail: true,
            status: true,
            source: true,
          },
        }),
        database.lead.count({
          where: baseFilter([
            "companyName",
            "contactName",
            "contactEmail",
            "contactPhone",
            "eventType",
          ]),
        }),
      ]);
      groups.leads = { items, total };
    }

    if (shouldSearch("proposals")) {
      const [items, total] = await Promise.all([
        database.proposal.findMany({
          where: baseFilter(["title", "proposalNumber", "eventType", "venueName"]),
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            title: true,
            proposalNumber: true,
            status: true,
            eventType: true,
          },
        }),
        database.proposal.count({
          where: baseFilter(["title", "proposalNumber", "eventType", "venueName"]),
        }),
      ]);
      groups.proposals = { items, total };
    }

    if (shouldSearch("invoices")) {
      const [items, total] = await Promise.all([
        database.invoice.findMany({
          where: baseFilter(["invoiceNumber", "notes"]),
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          select: {
            id: true,
            tenantId: true,
            invoiceNumber: true,
            invoiceType: true,
            status: true,
            total: true,
            dueDate: true,
          },
        }),
        database.invoice.count({
          where: baseFilter(["invoiceNumber", "notes"]),
        }),
      ]);
      groups.invoices = { items, total };
    }

    const total = Object.values(groups).reduce((sum, g) => sum + g.total, 0);

    return manifestSuccessResponse({ groups, total, page, limit });
  } catch (error) {
    captureException(error);
    log.error("Search error:", error);
    return manifestErrorResponse("Search failed", 500);
  }
}
