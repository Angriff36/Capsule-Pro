/**
 * @module ContractDocumentAPI
 * @intent Handle contract document uploads
 * @responsibility Process document uploads with validation and storage
 * @domain Events
 * @tags contracts, api, document-upload
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * POST /api/events/contracts/[contractId]/document
 * Upload a contract document
 */
async function POST(request, context) {
  const { contractId } = await context.params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return server_2.NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return server_2.NextResponse.json(
        {
          error: "Invalid file type. Only PDF and Word documents are allowed.",
        },
        { status: 400 }
      );
    }
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return server_2.NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }
    // Check if contract exists and belongs to tenant
    const contract = await database_1.database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
    });
    if (!contract) {
      return server_2.NextResponse.json(
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
    await database_1.database.eventContract.update({
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
    return server_2.NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return server_2.NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
