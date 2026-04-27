// List document versions with pagination clamps. Pagination policy is
// centralized in `@/lib/pagination` so a hostile or buggy client cannot
// request the entire version history of a document in one round trip.
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { clampLimit, clampOffset } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get("documentType");
    const documentId = searchParams.get("documentId");

    if (!(documentType && documentId)) {
      return NextResponse.json(
        { error: "documentType and documentId are required" },
        { status: 400 }
      );
    }

    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const versions = await database.documentVersion.findMany({
      where: {
        tenantId,
        documentType,
        documentId,
      },
      orderBy: { versionNumber: "desc" },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ versions, limit, offset });
  } catch (error) {
    captureException(error);
    console.error("Error listing document versions:", error);
    return NextResponse.json(
      { error: "Failed to list document versions" },
      { status: 500 }
    );
  }
}
