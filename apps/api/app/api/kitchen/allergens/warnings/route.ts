/**
 * @module AllergenWarningsAPI
 * @intent Fetch all allergen warnings with optional filtering
 * @responsibility List warnings across all events with filtering by acknowledgment status, severity
 * @domain Kitchen
 * @tags allergens, warnings, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const { searchParams } = new URL(request.url);
    const isAcknowledged = searchParams.get("is_acknowledged");
    const severity = searchParams.get("severity");
    const warningType = searchParams.get("warning_type");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Build query conditions
    const where: Prisma.AllergenWarningWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Filter by acknowledgment status if provided
    if (isAcknowledged !== null) {
      where.isAcknowledged = isAcknowledged === "true";
    }

    // Filter by severity if provided
    if (severity) {
      where.severity = severity;
    }

    // Filter by warning type if provided
    if (warningType) {
      where.warningType = warningType;
    }

    // Fetch warnings
    const warnings = await database.allergenWarning.findMany({
      where,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: limit ? Number.parseInt(limit, 10) : undefined,
      skip: offset ? Number.parseInt(offset, 10) : undefined,
    });

    // Get total count for pagination
    const totalCount = await database.allergenWarning.count({ where });

    return NextResponse.json({
      warnings,
      pagination: {
        total: totalCount,
        limit: limit ? Number.parseInt(limit, 10) : warnings.length,
        offset: offset ? Number.parseInt(offset, 10) : 0,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
