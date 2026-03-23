import { NextRequest, NextResponse } from "next/server";
import { database } from "@repo/database";
import { requireUser } from "@repo/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
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
        tenantId: user.tenantId,
        documentType,
        documentId,
      },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const version = await database.documentVersion.create({
      data: {
        tenantId: user.tenantId,
        documentType,
        documentId,
        versionNumber: nextVersionNumber,
        content,
        changeSummary: changeSummary ?? `Version ${nextVersionNumber}`,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
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
