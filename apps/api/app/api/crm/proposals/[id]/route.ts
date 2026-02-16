/**
 * Single Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals/[id]      - Get a single proposal
 * PUT    /api/crm/proposals/[id]      - Update a proposal (via manifest command)
 * DELETE /api/crm/proposals/[id]      - Withdraw a proposal (via manifest command)
 */

import { auth } from "@repo/auth/server";
import { database, type PrismaClient } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ClientSelect {
  id: true;
  company_name: true;
  first_name: true;
  last_name: true;
  email: true;
  phone: true;
}

interface LeadSelect {
  id: true;
  companyName: true;
  contactName: true;
  contactEmail: true;
  contactPhone: true;
}

/**
 * Fetch client for a proposal
 */
function fetchClient(
  database: PrismaClient,
  tenantId: string,
  clientId: string | null
): Promise<Record<string, unknown> | null> {
  if (!clientId) {
    return Promise.resolve(null);
  }
  return database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
    select: {
      id: true,
      company_name: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
    } as ClientSelect,
  });
}

/**
 * Fetch lead for a proposal
 */
function fetchLead(
  database: PrismaClient,
  tenantId: string,
  leadId: string | null
): Promise<Record<string, unknown> | null> {
  if (!leadId) {
    return Promise.resolve(null);
  }
  return database.lead.findFirst({
    where: {
      AND: [{ tenantId }, { id: leadId }, { deletedAt: null }],
    },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    } as LeadSelect,
  });
}

/**
 * GET /api/crm/proposals/[id]
 * Get a single proposal by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    const proposal = await database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    const [client, lead, event, lineItems] = await Promise.all([
      fetchClient(database, tenantId, proposal.clientId),
      fetchLead(database, tenantId, proposal.leadId),
      proposal.eventId
        ? database.event.findFirst({
            where: {
              AND: [
                { tenantId },
                { id: proposal.eventId },
                { deletedAt: null },
              ],
            },
            select: { id: true, title: true },
          })
        : null,
      database.proposalLineItem.findMany({
        where: { proposalId: proposal.id },
        orderBy: [{ sortOrder: "asc" }],
      }),
    ]);

    return NextResponse.json({
      data: { ...proposal, client, lead, event, lineItems },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error getting proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/proposals/[id]
 * Update a proposal via manifest command
 */
export async function PUT(request: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  return executeManifestCommand(request, {
    entityName: "Proposal",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({ ...body, id }),
  });
}

/**
 * DELETE /api/crm/proposals/[id]
 * Withdraw a proposal via manifest command
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  return executeManifestCommand(request, {
    entityName: "Proposal",
    commandName: "withdraw",
    params: { id },
    transformBody: (_body) => ({ id }),
  });
}
