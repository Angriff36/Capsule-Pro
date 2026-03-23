import { NextRequest, NextResponse } from "next/server";
import { database } from "@repo/database";
import { requireUser } from "@repo/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get("documentType") as "contract" | "proposal" | null;
    const documentId = searchParams.get("documentId");

    if (!documentType || !documentId) {
      return NextResponse.json(
        { error: "documentType and documentId are required" },
        { status: 400 }
      );
    }

    const versions = await database.documentVersion.findMany({
      where: {
        tenantId: user.tenantId,
        documentType,
        documentId,
      },
      orderBy: { versionNumber: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Error listing document versions:", error);
    return NextResponse.json(
      { error: "Failed to list document versions" },
      { status: 500 }
    );
  }
}
