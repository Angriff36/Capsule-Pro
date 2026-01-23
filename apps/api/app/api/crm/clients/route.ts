/**
 * Client CRUD API Endpoints
 *
 * GET    /api/crm/clients      - List clients with pagination and filters
 * POST   /api/crm/clients      - Create a new client
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateClientRequest } from "./types";
import {
  parseClientListFilters,
  parsePaginationParams,
  validateCreateClientRequest,
} from "./validation";

/**
 * GET /api/crm/clients
 * List clients with pagination, search, and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse filters and pagination
    const filters = parseClientListFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add search filter (searches company name, individual names, email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        {
          OR: [
            { company_name: { contains: searchLower, mode: "insensitive" } },
            { first_name: { contains: searchLower, mode: "insensitive" } },
            { last_name: { contains: searchLower, mode: "insensitive" } },
            { email: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Add tag filter
    if (filters.tags && filters.tags.length > 0) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { tags: { hasSome: filters.tags } },
      ];
    }

    // Add assignedTo filter
    if (filters.assignedTo) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { assignedTo: filters.assignedTo },
      ];
    }

    // Add clientType filter
    if (filters.clientType) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { clientType: filters.clientType },
      ];
    }

    // Add source filter
    if (filters.source) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { source: filters.source },
      ];
    }

    // Fetch clients
    const clients = await database.client.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.client.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: clients,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing clients:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/clients
 * Create a new client
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    // Validate request body
    validateCreateClientRequest(body);

    const data = body as CreateClientRequest;

    // Check for duplicate email (if provided)
    if (data.email && data.email.trim()) {
      const existingClient = await database.client.findFirst({
        where: {
          AND: [
            { tenantId },
            { email: data.email.trim() },
            { deletedAt: null },
          ],
        },
      });

      if (existingClient) {
        return NextResponse.json(
          { message: "A client with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Determine client type from data
    const clientType =
      data.clientType || (data.company_name ? "company" : "individual");

    // Create client
    const client = await database.client.create({
      data: {
        tenantId,
        clientType,
        company_name: data.company_name?.trim() || null,
        first_name: data.first_name?.trim() || null,
        last_name: data.last_name?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        addressLine1: data.addressLine1?.trim() || null,
        addressLine2: data.addressLine2?.trim() || null,
        city: data.city?.trim() || null,
        stateProvince: data.stateProvince?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        countryCode: data.countryCode?.trim() || null,
        defaultPaymentTerms: data.defaultPaymentTerms ?? 30,
        taxExempt: data.taxExempt ?? false,
        taxId: data.taxId?.trim() || null,
        notes: data.notes?.trim() || null,
        tags: data.tags || [],
        source: data.source?.trim() || null,
        assignedTo: data.assignedTo || null,
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating client:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
