/**
 * Public Contract Access API
 *
 * GET /api/public/contracts/[token] - Get contract info by signing token (no auth required)
 *
 * This endpoint allows clients to access their contract for signing without authentication.
 */

import { database } from "@repo/database";
import { NextResponse } from "next/server";

type Params = Promise<{ token: string }>;

/**
 * GET /api/public/contracts/[token]
 * Get contract info by signing token
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: "Invalid signing link" },
        { status: 400 }
      );
    }

    // Find contract by signing token
    const contract = await database.eventContract.findFirst({
      where: {
        signingToken: token,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        documentUrl: true,
        documentType: true,
        notes: true,
        expiresAt: true,
        createdAt: true,
        contractNumber: true,
        tenantId: true,
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
        { message: "This contract has expired", expired: true },
        { status: 410 }
      );
    }

    // Get event details
    const event = await database.event.findFirst({
      where: {
        tenantId: contract.tenantId,
        id: (
          await database.eventContract.findFirst({
            where: { signingToken: token },
            select: { eventId: true },
          })
        )?.eventId,
      },
      select: {
        title: true,
        eventDate: true,
        venueName: true,
      },
    });

    // Get client details using raw query for composite key
    const contractWithClient = await database.eventContract.findFirst({
      where: { signingToken: token },
      select: { clientId: true },
    });

    const client = contractWithClient
      ? await database.$queryRaw<
          Array<{
            company_name: string | null;
            first_name: string | null;
            last_name: string | null;
            email: string | null;
          }>
        >`
        SELECT company_name, first_name, last_name, email
        FROM tenant_crm.clients
        WHERE id = ${contractWithClient.clientId}
          AND tenant_id = ${contract.tenantId}
          AND deleted_at IS NULL
      `
      : null;

    // Get existing signatures
    const signatures = await database.contractSignature.findMany({
      where: {
        contractId: contract.id,
        tenantId: contract.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        signerName: true,
        signerEmail: true,
        signedAt: true,
      },
      orderBy: {
        signedAt: "desc",
      },
    });

    // Get tenant/organization info
    const tenant = await database.account.findFirst({
      where: {
        id: contract.tenantId,
      },
      select: {
        name: true,
      },
    });

    return NextResponse.json({
      contract: {
        id: contract.id,
        title: contract.title,
        status: contract.status,
        documentUrl: contract.documentUrl,
        documentType: contract.documentType,
        notes: contract.notes,
        expiresAt: contract.expiresAt,
        contractNumber: contract.contractNumber,
      },
      event: event || null,
      client: client?.[0] || null,
      signatures,
      organization: tenant?.name || "Unknown Organization",
    });
  } catch (error) {
    console.error("Error fetching public contract:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
