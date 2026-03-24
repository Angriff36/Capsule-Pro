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
    const { documentType, documentId, content, changeSummary } = body;

    if (!documentType || !documentId || !content) {
      return NextResponse.json(
        { error: "documentType, documentId, and content are required" },
        { status: 400 }
      );
    }

    // Get the latest version number
    const latestVersion = await database.documentVersion.findFirst({
      where: {
        tenantId,
        documentType,
        documentId,
      },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const version = await database.documentVersion.create({
      data: {
        tenantId,
        documentType,
        documentId,
        versionNumber: nextVersionNumber,
        content,
        changeSummary: changeSummary ?? `Version ${nextVersionNumber}`,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ version });
  } catch (error) {
    console.error("Error creating document version:", error);
    return NextResponse.json(
      { error: "Failed to create document version" },
      { status: 500 }
    );
  }
}