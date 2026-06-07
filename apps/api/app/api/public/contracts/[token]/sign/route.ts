/**
 * Public Contract Signing API
 *
 * POST /api/public/contracts/[token]/sign - Sign a contract using signing token (no auth required)
 *
 * This endpoint allows clients to sign their contract without authentication.
 * Creates a ContractSignature and updates EventContract status via governed Manifest commands.
 * Pre-validation (expiry, duplicate, state checks) runs before dispatch per constitution §4.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import type { ManifestUserContext } from "@repo/manifest-runtime/run-manifest-command-core";

type Params = Promise<{ token: string }>;

interface SignContractBody {
  signatureData: string;
  signerName: string;
  signerEmail?: string;
}

/**
 * Build a synthetic system-user context for public (unauthenticated) operations.
 * Uses the tenant's admin user to satisfy Manifest's RBAC requirements.
 */
async function buildSystemUserContext(tenantId: string): Promise<ManifestUserContext> {
  const adminUser = await database.user.findFirst({
    where: { tenantId, role: { in: ["owner", "admin"] }, deletedAt: null },
    select: { id: true, role: true },
  });

  return {
    id: adminUser?.id ?? "system",
    tenantId,
    role: adminUser?.role ?? "admin",
  };
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

    // Find contract by signing token (read path, constitution §10)
    const contract = await database.eventContract.findFirst({
      where: { signingToken: token, deletedAt: null },
    });

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found or link has expired" },
        { status: 404 }
      );
    }

    // Pre-validation: expiry check
    if (contract.expiresAt && new Date(contract.expiresAt) < new Date()) {
      return NextResponse.json(
        { message: "This contract has expired and can no longer be signed" },
        { status: 410 }
      );
    }

    // Pre-validation: already signed
    if (contract.status === "signed") {
      return NextResponse.json(
        { message: "This contract has already been signed" },
        { status: 400 }
      );
    }

    // Pre-validation: cancelled/expired
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

    // Build synthetic user context for public signing (system user from tenant)
    const systemUser = await buildSystemUserContext(contract.tenantId);

    // Governed write: create signature via Manifest
    const signatureResult = await runManifestCommand({
      entity: "ContractSignature",
      command: "create",
      body: {
        tenantId: contract.tenantId,
        contractId: contract.id,
        signatureData,
        signerName,
        signerEmail: signerEmail || "",
        signerRole: "client",
        ipAddress,
      },
      user: systemUser,
    });

    if (!signatureResult.ok) {
      log.error("Failed to create signature via Manifest:", await signatureResult.text());
      return NextResponse.json(
        { message: "Failed to create signature" },
        { status: 500 }
      );
    }

    // Governed write: update contract status to signed
    const contractResult = await runManifestCommand({
      entity: "EventContract",
      command: "sign",
      body: {
        id: contract.id,
        tenantId: contract.tenantId,
      },
      user: systemUser,
    });

    if (!contractResult.ok) {
      log.error("Failed to sign contract via Manifest:", await contractResult.text());
      return NextResponse.json(
        { message: "Failed to sign contract" },
        { status: 500 }
      );
    }

    // Read back the signature for response (read path)
    const signature = await database.contractSignature.findFirst({
      where: { tenantId: contract.tenantId, contractId: contract.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      message: "Contract signed successfully",
      signature: signature
        ? { id: signature.id, signerName: signature.signerName, signedAt: signature.signedAt }
        : { id: "created", signerName, signedAt: new Date().toISOString() },
    });
  } catch (error) {
    captureException(error);
    log.error("Error signing contract:", error);
    return NextResponse.json(
      { message: "Failed to sign contract" },
      { status: 500 }
    );
  }
}
