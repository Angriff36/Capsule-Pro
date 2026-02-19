/**
 * Public Contract Signing API
 *
 * POST /api/public/contracts/[token]/sign - Sign a contract using signing token (no auth required)
 *
 * This endpoint allows clients to sign their contract without authentication.
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

type Params = Promise<{ token: string }>;

interface SignContractBody {
  signatureData: string;
  signerName: string;
  signerEmail?: string;
}

/**
 * POST /api/public/contracts/[token]/sign
 * Sign a contract using the signing token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: "Invalid signing link" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as SignContractBody;
    const { signatureData, signerName, signerEmail } = body;

    // Validate required fields
    if (!(signatureData && signerName)) {
      return NextResponse.json(
        { message: "Signature data and signer name are required" },
        { status: 400 }
      );
    }

    // Find contract by signing token
    const contract = await database.eventContract.findFirst({
      where: {
        signingToken: token,
        deletedAt: null,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found or link has expired" },
        { status: 404 }
      );
    }

    // Check if contract has expired
    if (contract.expiresAt && new Date(contract.expiresAt) < new Date()) {
      return NextResponse.json(
        { message: "This contract has expired and can no longer be signed" },
        { status: 410 }
      );
    }

    // Check if contract is in a signable state
    if (contract.status === "signed") {
      return NextResponse.json(
        { message: "This contract has already been signed" },
        { status: 400 }
      );
    }

    if (contract.status === "cancelled" || contract.status === "expired") {
      return NextResponse.json(
        { message: `This contract is ${contract.status} and cannot be signed` },
        { status: 400 }
      );
    }

    // Get client IP address
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Create signature record
    const signature = await database.contractSignature.create({
      data: {
        tenantId: contract.tenantId,
        contractId: contract.id,
        signatureData,
        signerName,
        signerEmail: signerEmail || null,
        ipAddress,
      },
    });

    // Update contract status to signed
    await database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId: contract.tenantId,
          id: contract.id,
        },
      },
      data: {
        status: "signed",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Contract signed successfully",
      signature: {
        id: signature.id,
        signerName: signature.signerName,
        signedAt: signature.signedAt,
      },
    });
  } catch (error) {
    console.error("Error signing contract:", error);
    return NextResponse.json(
      { message: "Failed to sign contract" },
      { status: 500 }
    );
  }
}
