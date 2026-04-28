import { analytics } from "@repo/analytics/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

// Types matching the frontend's SearchResult interface
interface SearchGroup {
  items: Record<string, unknown>[];
  total: number;
}

interface SearchResponse {
  success: true;
  groups: Record<string, SearchGroup>;
  total: number;
  page: number;
  limit: number;
}

const MAX_QUERY_LENGTH = 200;
const MIN_QUERY_LENGTH = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const ITEMS_PER_GROUP = 5;

type SearchType =
  | "events"
  | "clients"
  | "contacts"
  | "venues"
  | "inventory"
  | "knowledge"
  | "tasks";

const ALL_TYPES: readonly SearchType[] = [
  "events",
  "clients",
  "contacts",
  "venues",
  "inventory",
  "knowledge",
  "tasks",
];

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = await requireTenantId();

    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get("q") ?? "";
    const q = rawQ.trim();
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10) || 1
    );
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        Number.parseInt(
          searchParams.get("limit") ?? String(DEFAULT_LIMIT),
          10
        ) || DEFAULT_LIMIT
      )
    );
    const typeFilter = searchParams.get("type") ?? "all";

    if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({
        success: true,
        groups: {},
        total: 0,
        page,
        limit,
      });
    }

    const offset = (page - 1) * ITEMS_PER_GROUP;

    const typesToSearch: readonly SearchType[] =
      typeFilter === "all"
        ? ALL_TYPES
        : typeFilter
            .split(",")
            .filter((t): t is SearchType =>
              ALL_TYPES.includes(t as SearchType)
            );

    // Run all searches in parallel using plain Prisma findMany
    const [events, clients, contacts, venues, inventory, knowledge, tasks] =
      await Promise.all([
        typesToSearch.includes("events")
          ? Promise.all([
              database.event.findMany({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { eventNumber: { contains: q, mode: "insensitive" } },
                    { venueName: { contains: q, mode: "insensitive" } },
                  ],
                },
                select: {
                  id: true,
                  title: true,
                  eventNumber: true,
                  eventDate: true,
                  venueName: true,
                  tenantId: true,
                },
                orderBy: { eventDate: "desc" },
                take: ITEMS_PER_GROUP,
                skip: offset,
              }),
              database.event.count({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { eventNumber: { contains: q, mode: "insensitive" } },
                    { venueName: { contains: q, mode: "insensitive" } },
                  ],
                },
              }),
            ]).then(([items, total]) => ({ items, total }))
          : Promise.resolve({
              items: [] as Record<string, unknown>[],
              total: 0,
            }),

        typesToSearch.includes("clients")
          ? Promise.all([
              database.client.findMany({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { company_name: { contains: q, mode: "insensitive" } },
                    { first_name: { contains: q, mode: "insensitive" } },
                    { last_name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
                select: {
                  id: true,
                  company_name: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                  tenantId: true,
                },
                orderBy: { updatedAt: "desc" },
                take: ITEMS_PER_GROUP,
                skip: offset,
              }),
              database.client.count({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { company_name: { contains: q, mode: "insensitive" } },
                    { first_name: { contains: q, mode: "insensitive" } },
                    { last_name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
              }),
            ]).then(([items, total]) => ({ items, total }))
          : Promise.resolve({
              items: [] as Record<string, unknown>[],
              total: 0,
            }),

        typesToSearch.includes("contacts")
          ? Promise.all([
              database.clientContact.findMany({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { first_name: { contains: q, mode: "insensitive" } },
                    { last_name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { title: { contains: q, mode: "insensitive" } },
                  ],
                },
                select: {
                  id: true,
                  clientId: true,
                  first_name: true,
                  last_name: true,
                  title: true,
                  email: true,
                  phone: true,
                  tenantId: true,
                },
                orderBy: { updatedAt: "desc" },
                take: ITEMS_PER_GROUP,
                skip: offset,
              }),
              database.clientContact.count({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { first_name: { contains: q, mode: "insensitive" } },
                    { last_name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { title: { contains: q, mode: "insensitive" } },
                  ],
                },
              }),
            ]).then(([items, total]) => ({ items, total }))
          : Promise.resolve({
              items: [] as Record<string, unknown>[],
              total: 0,
            }),

        typesToSearch.includes("venues")
          ? Promise.all([
              database.venue.findMany({
                where: {
                  tenantId,
                  deletedAt: null,
                  isActive: true,
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { city: { contains: q, mode: "insensitive" } },
                    { stateProvince: { contains: q, mode: "insensitive" } },
                    { venueType: { contains: q, mode: "insensitive" } },
                  ],
                },
                select: {
                  id: true,
                  name: true,
                  city: true,
                  stateProvince: true,
                  venueType: true,
                  tenantId: true,
                },
                orderBy: { name: "asc" },
                take: ITEMS_PER_GROUP,
                skip: offset,
              }),
              database.venue.count({
                where: {
                  tenantId,
                  deletedAt: null,
                  isActive: true,
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { city: { contains: q, mode: "insensitive" } },
                    { stateProvince: { contains: q, mode: "insensitive" } },
                    { venueType: { contains: q, mode: "insensitive" } },
                  ],
                },
              }),
            ]).then(([items, total]) => ({ items, total }))
          : Promise.resolve({
              items: [] as Record<string, unknown>[],
              total: 0,
            }),

        typesToSearch.includes("inventory")
          ? Promise.all([
              database.inventoryItem.findMany({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { item_number: { contains: q, mode: "insensitive" } },
                    { category: { contains: q, mode: "insensitive" } },
                  ],
                },
                select: {
                  id: true,
                  item_number: true,
                  name: true,
                  category: true,
                  unitOfMeasure: true,
                  tenantId: true,
                },
                orderBy: { name: "asc" },
                take: ITEMS_PER_GROUP,
                skip: offset,
              }),
              database.inventoryItem.count({
                where: {
                  tenantId,
                  deletedAt: null,
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { item_number: { contains: q, mode: "insensitive" } },
                    { category: { contains: q, mode: "insensitive" } },
                  ],
                },
              }),
            ]).then(([items, total]) => ({ items, total }))
          : Promise.resolve({
              items: [] as Record<string, unknown>[],
              total: 0,
            }),

        typesToSearch.includes("knowledge")
          ? Promise.all([
              database.knowledgeBaseEntry.findMany({
                where: {
                  tenantId,
                  deletedAt: null,
                  status: "published",
                  OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { category: { contains: q, mode: "insensitive" } },
                    { content: { contains: q, mode: "insensitive" } },
                  ],
                },
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  category: true,
                  status: true,
                  tenantId: true,
                },
                orderBy: { updatedAt: "desc" },
                take: ITEMS_PER_GROUP,
                skip: offset,
              }),
              database.knowledgeBaseEntry.count({
                where: {
                  tenantId,
                  deletedAt: null,
                  status: "published",
                  OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { category: { contains: q, mode: "insensitive" } },
                    { content: { contains: q, mode: "insensitive" } },
                  ],
                },
              }),
            ]).then(([items, total]) => ({ items, total }))
          : Promise.resolve({
              items: [] as Record<string, unknown>[],
              total: 0,
            }),

        typesToSearch.includes("tasks")
          ? (async () => {
              const [kitchenItems, kitchenCount, adminItems, adminCount] =
                await Promise.all([
                  database.kitchenTask.findMany({
                    where: {
                      tenantId,
                      deletedAt: null,
                      title: { contains: q, mode: "insensitive" },
                    },
                    select: {
                      id: true,
                      title: true,
                      summary: true,
                      status: true,
                      priority: true,
                      tenantId: true,
                    },
                    orderBy: { updatedAt: "desc" },
                    take: ITEMS_PER_GROUP,
                    skip: offset,
                  }),
                  database.kitchenTask.count({
                    where: {
                      tenantId,
                      deletedAt: null,
                      title: { contains: q, mode: "insensitive" },
                    },
                  }),
                  database.adminTask.findMany({
                    where: {
                      tenantId,
                      deletedAt: null,
                      OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                      ],
                    },
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      status: true,
                      priority: true,
                      tenantId: true,
                    },
                    orderBy: { updatedAt: "desc" },
                    take: ITEMS_PER_GROUP,
                    skip: offset,
                  }),
                  database.adminTask.count({
                    where: {
                      tenantId,
                      deletedAt: null,
                      OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                      ],
                    },
                  }),
                ]);

              // Tag items with task_type for frontend routing
              const taggedKitchen = kitchenItems.map((item) => ({
                ...item,
                task_type: "kitchen",
              }));
              const taggedAdmin = adminItems.map((item) => ({
                ...item,
                task_type: "admin",
              }));

              return {
                items: [...taggedKitchen, ...taggedAdmin],
                total: kitchenCount + adminCount,
              };
            })()
          : Promise.resolve({
              items: [] as Record<string, unknown>[],
              total: 0,
            }),
      ]);

    // Build groups
    const groups: Record<string, SearchGroup> = {};
    let total = 0;

    const groupEntries: [string, typeof events][] = [
      ["events", events],
      ["clients", clients],
      ["contacts", contacts],
      ["venues", venues],
      ["inventory", inventory],
      ["knowledge", knowledge],
      ["tasks", tasks],
    ];

    for (const [key, result] of groupEntries) {
      if (result.total > 0) {
        groups[key] = {
          items: result.items as Record<string, unknown>[],
          total: result.total,
        };
        total += result.total;
      }
    }

    const response: SearchResponse = {
      success: true,
      groups,
      total,
      page,
      limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[/api/search] Error:", error);
    analytics.capture({
      distinctId: "server",
      event: "error:api_request_failed",
      properties: {
        endpoint: "/api/search",
        status_code: 500,
      },
    });
    return NextResponse.json(
      { success: false, message: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
