import { NextRequest, NextResponse } from "next/server";
import { database } from "@repo/database";
import { requireUser } from "@repo/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
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
        tenantId: user.tenantId,
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
        tenantId: user.tenantId,
        documentType: version.documentType,
        documentId: version.documentId,
      },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const restoredVersion = await database.documentVersion.create({
      data: {
        tenantId: user.tenantId,
        documentType: version.documentType,
        documentId: version.documentId,
        versionNumber: nextVersionNumber,
        content: version.content,
        changeSummary: `Restored from version ${version.versionNumber}`,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
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
