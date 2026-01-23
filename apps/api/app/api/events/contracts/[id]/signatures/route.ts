/**
 * Event Contract Signatures API Endpoints
 *
 * GET /api/events/contracts/[id]/signatures - List all signatures for a contract
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Define types
type PaginationParams = {
  page: number;
  limit: number;
};

type SignatureFilters = {
  signerEmail?: string;
  dateFrom?: string;
  dateTo?: string;
};

type SignatureListResponse = {
  data: Array<{
    id: string;
    contractId: string;
    signedAt: Date;
    signatureData: string;
    signerName: string;
    signerEmail: string | null;
    ipAddress: string | null;
    contractTitle: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Parse pagination parameters from URL search params
 */
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

/**
 * Parse signature filters from URL search params
 */
function parseSignatureFilters(
  searchParams: URLSearchParams
): SignatureFilters {
  const filters: SignatureFilters = {};

  // Parse signer email filter
  const signerEmail = searchParams.get("signerEmail");
  if (signerEmail) {
    filters.signerEmail = signerEmail;
  }

  // Parse date from filter
  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) {
    const date = new Date(dateFrom);
    if (!isNaN(date.getTime())) {
      filters.dateFrom = dateFrom;
    }
  }

  // Parse date to filter
  const dateTo = searchParams.get("dateTo");
  if (dateTo) {
    const date = new Date(dateTo);
    if (!isNaN(date.getTime())) {
      filters.dateTo = dateTo;
    }
  }

  return filters;
}

/**
 * Build where clause for signature queries
 */
function buildSignatureWhereClause(
  tenantId: string,
  contractId: string,
  filters: SignatureFilters
) {
  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { contractId }, { deletedAt: null }],
  };

  // Add signer email filter
  if (filters.signerEmail) {
    (whereClause.AND as Record<string, unknown>[]).push({
      signerEmail: {
        contains: filters.signerEmail,
        mode: "insensitive" as const,
      },
    });
  }

  // Add date range filters
  if (filters.dateFrom || filters.dateTo) {
    const dateConditions: Array<Record<string, unknown>> = [];

    if (filters.dateFrom) {
      dateConditions.push({
        signedAt: { gte: new Date(filters.dateFrom) },
      });
    }

    if (filters.dateTo) {
      dateConditions.push({
        signedAt: { lte: new Date(filters.dateTo) },
      });
    }

    if (dateConditions.length > 0) {
      (whereClause.AND as Record<string, unknown>[]).push({
        AND: dateConditions,
      });
    }
  }

  return whereClause;
}

/**
 * GET /api/events/contracts/[id]/signatures
 * List all signatures for a contract
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const contractId = params.id;
    const { searchParams } = new URL(request.url);

    // Parse filters and pagination
    const filters = parseSignatureFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Verify contract exists and belongs to the tenant
    const contract = await database.eventContract.findFirst({
      where: {
        tenantId,
        id: contractId,
        deletedAt: null,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }

    // Build where clause for signatures
    const whereClause = buildSignatureWhereClause(
      tenantId,
      contractId,
      filters
    );

    // Fetch signatures with pagination
    const signatures = await database.contractSignature.findMany({
      where: whereClause,
      orderBy: [{ signedAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Fetch contract title for response
    const contractDetails = await database.eventContract.findFirst({
      where: {
        tenantId,
        id: contractId,
      },
      select: {
        title: true,
      },
    });

    // Format response data
    const responseData = signatures.map((signature) => ({
      id: signature.id,
      contractId: signature.contractId,
      signedAt: signature.signedAt,
      signatureData: signature.signatureData,
      signerName: signature.signerName,
      signerEmail: signature.signerEmail,
      ipAddress: signature.ipAddress,
      contractTitle: contractDetails?.title || "Contract",
    }));

    // Get total count for pagination
    const totalCount = await database.contractSignature.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    const response: SignatureListResponse = {
      data: responseData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing signatures:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
