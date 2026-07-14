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

// Runs one entity group's findMany + count concurrently and tags the result.
// Module-scoped (not inside GET) so it adds no cognitive complexity to the
// handler — GET only orchestrates; this does the per-group await shape.
const searchGroup = <T>(
  items: Promise<T[]>,
  total: Promise<number>
): Promise<{ items: T[]; total: number }> =>
  Promise.all([items, total]).then(([i, t]) => ({ items: i, total: t }));

// Module-level so the regex literal is created once (Biome useTopLevelRegex)
// and the tokenization branch adds no cognitive complexity to GET.
const WHITESPACE = /\s+/;

// Upper bound on the query string so a pathologically long `q` can't drive the
// full entity fan-out (up to 15 findMany + 15 count ILIKE scans). Parity with
// the apps/app search route (MAX_QUERY_LENGTH = 200). Exported so the route
// test can pin the boundary against the single source of truth.
export const MAX_QUERY_LENGTH = 200;

const makeBaseFilter =
  ({
    tenantId,
    q,
    tokens,
  }: {
    tenantId: string;
    q: string;
    tokens: string[];
  }) =>
  (fields: string[]) => {
    const orForToken = (token: string) => ({
      OR: fields.map((f) => ({
        [f]: { contains: token, mode: "insensitive" as const },
      })),
    });
    if (tokens.length <= 1) {
      return {
        tenantId,
        deletedAt: null,
        OR: fields.map((f) => ({
          [f]: { contains: q, mode: "insensitive" as const },
        })),
      };
    }
    return {
      tenantId,
      deletedAt: null,
      AND: tokens.map(orForToken),
    };
  };

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const url = request.nextUrl.searchParams;
    const q = url.get("q")?.trim();
    if (!q || q.length < 2 || q.length > MAX_QUERY_LENGTH) {
      return manifestSuccessResponse({ groups: [], total: 0 });
    }

    const type = url.get("type")?.trim();
    const page = Math.max(1, Number.parseInt(url.get("page") ?? "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(url.get("limit") ?? "10", 10))
    );
    const skip = (page - 1) * limit;

    // FR-106 (specs/general/search.md): multi-word queries split on whitespace
    // and AND-chain tokens — each token must match SOME searched column.
    // Single-token queries collapse to a plain OR-over-columns (no AND wrapper).
    const tokens = q.split(WHITESPACE).filter((t) => t.length > 0);

    const baseFilter = makeBaseFilter({ tenantId, q, tokens });

    const groups: Record<string, { items: unknown[]; total: number }> = {};

    const shouldSearch = (entityType: string) => !type || type === entityType;

    // Each entity block fires its findMany + count but does NOT await here —
    // every active group's promises are gathered in `entries` and resolved by a
    // single Promise.all below. This collapses the omni-search path (no `type`)
    // from N serial rounds (one per entity) to one concurrent round, while
    // preserving the original synchronous DB call order (entries are pushed in
    // the same sequence as the prior serial if-blocks, so order-sensitive
    // mocked tests stay green). Scoped (`type=…`) search still runs one group.
    const entries: [string, Promise<{ items: unknown[]; total: number }>][] =
      [];

    if (shouldSearch("events")) {
      const where = baseFilter(["title", "eventNumber", "venueName"]);
      entries.push([
        "events",
        searchGroup(
          database.event.findMany({
            where,
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
          database.event.count({ where })
        ),
      ]);
    }

    if (shouldSearch("clients")) {
      const where = baseFilter([
        "companyName",
        "firstName",
        "lastName",
        "email",
        "phone",
      ]);
      entries.push([
        "clients",
        searchGroup(
          database.client.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
            select: {
              id: true,
              tenantId: true,
              companyName: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          }),
          database.client.count({ where })
        ),
      ]);
    }

    if (shouldSearch("contacts")) {
      const where = baseFilter([
        "firstName",
        "lastName",
        "email",
        "phone",
        "phoneMobile",
      ]);
      entries.push([
        "contacts",
        searchGroup(
          database.clientContact.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
            select: {
              id: true,
              tenantId: true,
              clientId: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
              phone: true,
            },
          }),
          database.clientContact.count({ where })
        ),
      ]);
    }

    if (shouldSearch("venues")) {
      const where = {
        ...baseFilter(["name", "city", "contactName", "contactEmail"]),
        isActive: true,
      };
      entries.push([
        "venues",
        searchGroup(
          database.venue.findMany({
            where,
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
          database.venue.count({ where })
        ),
      ]);
    }

    if (shouldSearch("inventory")) {
      const where = baseFilter([
        "name",
        "item_number",
        "description",
        "category",
      ]);
      entries.push([
        "inventory",
        searchGroup(
          database.inventoryItem.findMany({
            where,
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
          database.inventoryItem.count({ where })
        ),
      ]);
    }

    if (shouldSearch("tasks")) {
      const where = baseFilter(["title", "summary"]);
      entries.push([
        "tasks",
        searchGroup(
          database.kitchenTask.findMany({
            where,
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
          database.kitchenTask.count({ where })
        ),
      ]);
    }

    if (shouldSearch("knowledge")) {
      const where = {
        ...baseFilter(["title", "content", "category"]),
        status: "published" as const,
      };
      entries.push([
        "knowledge",
        searchGroup(
          database.knowledgeBaseEntry.findMany({
            where,
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
          database.knowledgeBaseEntry.count({ where })
        ),
      ]);
    }

    if (shouldSearch("recipes")) {
      const where = baseFilter([
        "name",
        "description",
        "category",
        "cuisineType",
      ]);
      entries.push([
        "recipes",
        searchGroup(
          database.recipe.findMany({
            where,
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
          database.recipe.count({ where })
        ),
      ]);
    }

    if (shouldSearch("dishes")) {
      const where = baseFilter([
        "name",
        "description",
        "category",
        "serviceStyle",
      ]);
      entries.push([
        "dishes",
        searchGroup(
          database.dish.findMany({
            where,
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
          database.dish.count({ where })
        ),
      ]);
    }

    if (shouldSearch("equipment")) {
      const where = baseFilter([
        "name",
        "serialNumber",
        "manufacturer",
        "model",
        "type",
      ]);
      entries.push([
        "equipment",
        searchGroup(
          database.equipment.findMany({
            where,
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
          database.equipment.count({ where })
        ),
      ]);
    }

    if (shouldSearch("ingredients")) {
      const where = baseFilter(["name", "category"]);
      entries.push([
        "ingredients",
        searchGroup(
          database.ingredient.findMany({
            where,
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
          database.ingredient.count({ where })
        ),
      ]);
    }

    if (shouldSearch("menus")) {
      const where = baseFilter(["name", "description", "category"]);
      entries.push([
        "menus",
        searchGroup(
          database.menu.findMany({
            where,
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
          database.menu.count({ where })
        ),
      ]);
    }

    if (shouldSearch("leads")) {
      const where = baseFilter([
        "companyName",
        "contactName",
        "contactEmail",
        "contactPhone",
        "eventType",
      ]);
      entries.push([
        "leads",
        searchGroup(
          database.lead.findMany({
            where,
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
          database.lead.count({ where })
        ),
      ]);
    }

    if (shouldSearch("proposals")) {
      const where = baseFilter([
        "title",
        "proposalNumber",
        "eventType",
        "venueName",
      ]);
      entries.push([
        "proposals",
        searchGroup(
          database.proposal.findMany({
            where,
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
          database.proposal.count({ where })
        ),
      ]);
    }

    if (shouldSearch("invoices")) {
      const where = baseFilter(["invoiceNumber", "notes"]);
      entries.push([
        "invoices",
        searchGroup(
          database.invoice.findMany({
            where,
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
          database.invoice.count({ where })
        ),
      ]);
    }

    // One concurrent round resolves every active group; the per-group
    // findMany + count already ran (in push order) when each entry was built.
    await Promise.all(
      entries.map(async ([key, promise]) => {
        groups[key] = await promise;
      })
    );

    const total = Object.values(groups).reduce((sum, g) => sum + g.total, 0);

    // `private` (not `public`): results are authenticated + tenant-scoped, so a
    // shared CDN must not cache them (cross-tenant leak). Browser-only caching
    // of identical omni-search URLs mirrors the apps/app search route.
    const response = manifestSuccessResponse({ groups, total, page, limit });
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=300"
    );
    return response;
  } catch (error) {
    captureException(error);
    log.error("Search error:", error);
    return manifestErrorResponse("Search failed", 500);
  }
}
