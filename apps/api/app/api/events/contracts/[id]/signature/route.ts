/**
 * Event Contract Signature API Endpoints
 *
 * POST   /api/events/contracts/[id]/signature - Capture new signature
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Define types
type CreateSignatureRequest = {
  signatureData: string;
  signerName: string;
  signerEmail?: string;
  ipAddress?: string;
};

type ContractStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "rejected"
  | "expired";

// Email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate create signature request body
 */
function validateCreateSignatureRequest(
  data: unknown
): asserts data is CreateSignatureRequest {
  invariant(data, "Request body is required");

  const body = data as CreateSignatureRequest;

  invariant(body.signatureData, "signatureData is required");
  invariant(body.signerName, "signerName is required");

  // Validate signatureData is not empty
  invariant(
    body.signatureData.trim().length > 0,
    "signatureData cannot be empty"
  );

  // Validate signerName is not empty
  invariant(body.signerName.trim().length > 0, "signerName cannot be empty");

  // Validate email format if provided
  if (body.signerEmail) {
    invariant(
      EMAIL_REGEX.test(body.signerEmail),
      "signerEmail must be a valid email address"
    );
  }
}

/**
 * POST /api/events/contracts/[id]/signature
 * Capture new signature for a contract
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: contractId } = await params;
    const body = await request.json();

    // Validate request body
    validateCreateSignatureRequest(body);

    const signatureData = body as CreateSignatureRequest;

    // Verify contract exists and belongs to the tenant
    const contract = await database.eventContract.findFirst({
      where: {
        tenantId,
        id: contractId,
        deletedAt: null,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }

    // Check if contract is already signed
    if (contract.status === "signed") {
      return NextResponse.json(
        { message: "Contract is already signed" },
        { status: 400 }
      );
    }

    // Create the signature
    const signature = await database.contractSignature.create({
      data: {
        tenantId,
        contractId,
        signatureData: signatureData.signatureData,
        signerName: signatureData.signerName.trim(),
        signerEmail: signatureData.signerEmail?.trim() || null,
        ipAddress: signatureData.ipAddress || null,
      },
    });

    // Auto-update contract status to 'signed' after signature
    await database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        status: "signed" as ContractStatus,
        updatedAt: new Date(),
      },
    });

    // Fetch contract details for the response
    const updatedContract = await database.eventContract.findFirst({
      where: {
        tenantId,
        id: contractId,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          ...signature,
          contractId,
          contractTitle: updatedContract?.title || "Contract",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating signature:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
