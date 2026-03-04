/**
 * @module MarketingContactListsAPI
 * @intent Manage marketing contact lists for segmentation
 * @responsibility CRUD operations for contact lists
 * @domain Marketing
 * @tags marketing, contact-lists, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ContactListListFilters {
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface CreateContactListRequest {
  name: string;
  description?: string;
  filters?: unknown;
}

interface UpdateContactListRequest {
  name?: string;
  description?: string;
  filters?: unknown;
}

function parseContactListFilters(searchParams: URLSearchParams): ContactListListFilters {
  const filters: ContactListListFilters = {};

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  return filters;
}

function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

function validateCreateContactListRequest(
  body: unknown
): asserts body is CreateContactListRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
  const b = body as Record<string, unknown>;
  InvariantError(typeof b.name === "string" && b.name.trim().length > 0, "Contact list name is required");
}

function validateUpdateContactListRequest(
  body: unknown
): asserts body is UpdateContactListRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
}

/**
 * GET /api/marketing/contact-lists
 * List contact lists with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const filters = parseContactListFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      (whereClause.AND as Record<string, unknown>[]).push({
        OR: [
          { name: { contains: searchLower, mode: "insensitive" } },
          { description: { contains: searchLower, mode: "insensitive" } },
        ],
      });
    }

    const [contactLists, total] = await Promise.all([
      database.contactList.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.contactList.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      contactLists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing contact lists:", error);
    return NextResponse.json(
      { message: "Failed to list contact lists", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/contact-lists
 * Create a new contact list
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    validateCreateContactListRequest(body);

    const contactList = await database.contactList.create({
      data: {
        ...body,
        tenantId,
      },
    });

    return NextResponse.json(contactList, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating contact list:", error);
    return NextResponse.json(
      { message: "Failed to create contact list", error: String(error) },
      { status: 500 }
    );
  }
}
