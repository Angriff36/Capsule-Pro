/**
 * @module ContractDocumentAPI
 * @intent Handle contract document uploads
 * @responsibility Process document uploads with validation and object storage
 * @domain Events
 * @tags contracts, api, document-upload
 * @canonical true
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
// @boundaries-ignore automatically added by `turbo boundaries --ignore=all`
"@repo/storage";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface ContractDocumentAPIContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/events/contracts/[id]/document
 * Upload a contract document to object storage
 */
export async function POST(
  request: NextRequest,
  context: ContractDocumentAPIContext
) {
  const { id: contractId } = await context.params;

  try {
    const user = await resolveCurrentUser(request);
    const manifestUser = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Read — bypasses Manifest per constitution §10
    const contract = await database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId: user.tenantId,
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

    let documentType = "PDF";
    if (file.type.includes("word") || file.type.includes("document")) {
      documentType = "Word";
    }

    const ext = documentType === "PDF" ? "pdf" : "docx";
    const storagePath = `contracts/${contractId}/document.${ext}`;

    const result = await uploadFile({
      tenantId: user.tenantId,
      path: storagePath,
      body: file,
      contentType: file.type,
    });

    if (contract.documentUrl) {
      try {
        await deleteFile(contract.documentUrl);
      } catch {
        // Previous file may no longer exist in storage
      }
    }

    // Governed write — update document fields via Manifest runtime
    await runManifestCommand({
      entity: "EventContract",
      command: "update",
      body: {
        id: contractId,
        tenantId: user.tenantId,
        title: contract.title ?? "",
        documentUrl: result.url,
        documentType,
        notes: contract.notes ?? "",
        expiresAt: contract.expiresAt ?? "",
      },
      user: manifestUser,
    });

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      documentUrl: result.url,
    });
  } catch (error) {
    captureException(error);
    log.error("Error uploading document:", error);

    const message =
      error instanceof Error ? error.message : "Failed to upload document";
    const status = message.includes("BLOB_READ_WRITE_TOKEN") ? 503 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
