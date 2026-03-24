import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: "versionId is required" },
        { status: 400 }
      );
    }

    // Get the version to restore
    const version = await database.documentVersion.findFirst({
      where: {
        id: versionId,
        tenantId,
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Create a new version with the old content (effectively restoring)
    const latestVersion = await database.documentVersion.findFirst({
      where: {
        tenantId,
        documentType: version.documentType,
        documentId: version.documentId,
      },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const restoredVersion = await database.documentVersion.create({
      data: {
        tenantId,
        documentType: version.documentType,
        documentId: version.documentId,
        versionNumber: nextVersionNumber,
        content: version.content,
        changeSummary: `Restored from version ${version.versionNumber}`,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ version: restoredVersion });
  } catch (error) {
    console.error("Error restoring document version:", error);
    return NextResponse.json(
      { error: "Failed to restore document version" },
      { status: 500 }
    );
  }
}