import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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
const ITEMS_PER_GROUP = 5; // Max items per entity type per page

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = await requireTenantId();

    // Parse query params
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

    // Validate query
    if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({
        success: true,
        groups: {},
        total: 0,
        page,
        limit,
      });
    }

    // Build search term for ILIKE
    const term = `%${q}%`;

    // Determine which entity types to search
    const allTypes = [
      "events",
      "clients",
      "contacts",
      "venues",
      "inventory",
      "knowledge",
    ] as const;
    type SearchType = (typeof allTypes)[number];
    const typesToSearch: readonly SearchType[] =
      typeFilter === "all"
        ? allTypes
        : typeFilter
            .split(",")
            .filter((t): t is SearchType => allTypes.includes(t as SearchType));

    // Run all searches in parallel
    const [events, clients, contacts, venues, inventory, knowledge] =
      await Promise.all([
        typesToSearch.includes("events")
          ? database.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
            SELECT id, title, "event_number" AS "eventNumber", "event_date" AS "eventDate", "venue_name" AS "venueName"
            FROM tenant_events.events
            WHERE tenant_id = ${tenantId}
              AND deleted_at IS NULL
              AND (
                LOWER(title) ILIKE ${term}
                OR LOWER("event_number") ILIKE ${term}
                OR LOWER(COALESCE("venue_name", '')) ILIKE ${term}
              )
            ORDER BY "event_date" DESC
            LIMIT ${ITEMS_PER_GROUP}
          `)
          : Promise.resolve([]),

        typesToSearch.includes("clients")
          ? database.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
            SELECT id, company_name, first_name, last_name, email
            FROM tenant_crm.clients
            WHERE tenant_id = ${tenantId}
              AND deleted_at IS NULL
              AND (
                LOWER(COALESCE(company_name, '')) ILIKE ${term}
                OR LOWER(COALESCE(first_name, '')) ILIKE ${term}
                OR LOWER(COALESCE(last_name, '')) ILIKE ${term}
                OR LOWER(COALESCE(email, '')) ILIKE ${term}
              )
            ORDER BY updated_at DESC
            LIMIT ${ITEMS_PER_GROUP}
          `)
          : Promise.resolve([]),

        typesToSearch.includes("contacts")
          ? database.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
            SELECT cc.id, cc.client_id AS "clientId", cc.first_name, cc.last_name, cc.title, cc.email, cc.phone
            FROM tenant_crm.client_contacts cc
            JOIN tenant_crm.clients c ON c.tenant_id = cc.tenant_id AND c.id = cc.client_id
            WHERE cc.tenant_id = ${tenantId}
              AND cc.deleted_at IS NULL
              AND c.deleted_at IS NULL
              AND (
                LOWER(cc.first_name) ILIKE ${term}
                OR LOWER(cc.last_name) ILIKE ${term}
                OR LOWER(COALESCE(cc.email, '')) ILIKE ${term}
                OR LOWER(COALESCE(cc.title, '')) ILIKE ${term}
              )
            ORDER BY cc.updated_at DESC
            LIMIT ${ITEMS_PER_GROUP}
          `)
          : Promise.resolve([]),

        typesToSearch.includes("venues")
          ? database.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
            SELECT id, name, city, "state_province" AS "stateProvince", venue_type AS "venueType"
            FROM tenant.venues
            WHERE tenant_id = ${tenantId}
              AND deleted_at IS NULL
              AND is_active = true
              AND (
                LOWER(name) ILIKE ${term}
                OR LOWER(COALESCE(city, '')) ILIKE ${term}
                OR LOWER(COALESCE("state_province", '')) ILIKE ${term}
                OR LOWER(venue_type) ILIKE ${term}
              )
            ORDER BY name ASC
            LIMIT ${ITEMS_PER_GROUP}
          `)
          : Promise.resolve([]),

        typesToSearch.includes("inventory")
          ? database.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
            SELECT id, item_number AS "item_number", name, category, "unit_of_measure" AS "unitOfMeasure"
            FROM tenant_inventory.inventory_items
            WHERE tenant_id = ${tenantId}
              AND deleted_at IS NULL
              AND (
                LOWER(name) ILIKE ${term}
                OR LOWER("item_number") ILIKE ${term}
                OR LOWER(category) ILIKE ${term}
              )
            ORDER BY name ASC
            LIMIT ${ITEMS_PER_GROUP}
          `)
          : Promise.resolve([]),

        typesToSearch.includes("knowledge")
          ? database.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
            SELECT id, slug, title, category, status
            FROM tenant.knowledge_base_entries
            WHERE tenant_id = ${tenantId}
              AND deleted_at IS NULL
              AND status = 'published'
              AND (
                LOWER(title) ILIKE ${term}
                OR LOWER(COALESCE(category, '')) ILIKE ${term}
              )
            ORDER BY updated_at DESC
            LIMIT ${ITEMS_PER_GROUP}
          `)
          : Promise.resolve([]),
      ]);

    // Attach tenantId to each item for the frontend's key prop
    const tag = (items: Record<string, unknown>[]) =>
      items.map((item) => ({ ...item, tenantId }));

    // Build groups
    const groups: Record<string, SearchGroup> = {};
    let total = 0;

    if (events.length > 0) {
      groups.events = { items: tag(events), total: events.length };
      total += events.length;
    }
    if (clients.length > 0) {
      groups.clients = { items: tag(clients), total: clients.length };
      total += clients.length;
    }
    if (contacts.length > 0) {
      groups.contacts = { items: tag(contacts), total: contacts.length };
      total += contacts.length;
    }
    if (venues.length > 0) {
      groups.venues = { items: tag(venues), total: venues.length };
      total += venues.length;
    }
    if (inventory.length > 0) {
      groups.inventory = { items: tag(inventory), total: inventory.length };
      total += inventory.length;
    }
    if (knowledge.length > 0) {
      groups.knowledge = { items: tag(knowledge), total: knowledge.length };
      total += knowledge.length;
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
    return NextResponse.json(
      { success: false, message: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
