/**
 * @module ContractDocumentAPI
 * @intent Handle contract document uploads
 * @responsibility Process document uploads with validation and storage
 * @domain Events
 * @tags contracts, api, document-upload
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type ContractDocumentAPIContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * POST /api/events/contracts/[id]/document
 * Upload a contract document
 */
export async function POST(
  request: NextRequest,
  context: ContractDocumentAPIContext
) {
  const { id: contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only PDF and Word documents are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Check if contract exists and belongs to tenant
    const contract = await database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Convert file to base64 for storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Determine document type
    let documentType = "PDF";
    if (file.type.includes("word") || file.type.includes("document")) {
      documentType = "Word";
    }

    // Update contract with document URL
    // Note: In production, you would upload to a storage service (S3, Blob, etc.)
    // and store the URL. For now, we're storing a data URL.
    const dataUrl = `data:${file.type};base64,${base64}`;

    await database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        documentUrl: dataUrl,
        documentType,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
