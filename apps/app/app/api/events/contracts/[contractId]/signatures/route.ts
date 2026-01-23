/**
 * @module ContractSignaturesAPI
 * @intent Handle contract signature creation
 * @responsibility Process signature captures with validation and storage
 * @domain Events
 * @tags contracts, api, signatures
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type ContractSignaturesAPIContext = {
  params: Promise<{
    contractId: string;
  }>;
};

type CreateSignatureBody = {
  signatureData: string;
  signerName: string;
  signerEmail?: string;
};

/**
 * POST /api/events/contracts/[contractId]/signatures
 * Create a new signature for a contract
 */
export async function POST(
  request: NextRequest,
  context: ContractSignaturesAPIContext
) {
  const { contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = (await request.json()) as CreateSignatureBody;
    const { signatureData, signerName, signerEmail } = body;

    // Validate required fields
    if (!(signatureData && signerName)) {
      return NextResponse.json(
        { error: "Signature data and signer name are required" },
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

    // Get client IP address
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Create signature record
    const signature = await database.contractSignature.create({
      data: {
        tenantId,
        contractId,
        signatureData,
        signerName,
        signerEmail: signerEmail || null,
        ipAddress,
      },
    });

    return NextResponse.json({
      success: true,
      signature,
    });
  } catch (error) {
    console.error("Error creating signature:", error);
    return NextResponse.json(
      { error: "Failed to create signature" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/contracts/[contractId]/signatures
 * Get all signatures for a contract
 */
export async function GET(
  request: NextRequest,
  context: ContractSignaturesAPIContext
) {
  const { contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const signatures = await database.contractSignature.findMany({
      where: {
        tenantId,
        contractId,
        deletedAt: null,
      },
      orderBy: {
        signedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      signatures,
    });
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return NextResponse.json(
      { error: "Failed to fetch signatures" },
      { status: 500 }
    );
  }
}
