/**
 * Event proposal automation — list events missing proposals and batch-generate.
 *
 * GET  — events eligible for auto-proposal
 * POST — { eventIds: string[] } generate proposals for selected events
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

async function nextProposalNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastProposal = await database.proposal.findFirst({
    where: { tenantId, proposalNumber: { startsWith: `PROP-${year}-` } },
    orderBy: { proposalNumber: "desc" },
    select: { proposalNumber: true },
  });
  const lastSeq = lastProposal?.proposalNumber
    ? Number.parseInt(lastProposal.proposalNumber.split("-").pop() ?? "0", 10)
    : 0;
  return `PROP-${year}-${String(lastSeq + 1).padStart(4, "0")}`;
}

async function generateForEvent(
  tenantId: string,
  user: { id: string; tenantId: string; role: string },
  eventId: string
): Promise<{
  eventId: string;
  ok: boolean;
  proposalId?: string;
  error?: string;
}> {
  const event = await database.event.findFirst({
    where: { id: eventId, tenantId, deletedAt: null },
    select: {
      id: true,
      title: true,
      eventDate: true,
      eventType: true,
      guestCount: true,
      venueName: true,
      venueAddress: true,
      clientId: true,
    },
  });

  if (!event) {
    return { eventId, ok: false, error: "Event not found" };
  }

  const existing = await database.proposal.findFirst({
    where: { tenantId, eventId, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { eventId, ok: false, error: "Proposal already exists" };
  }

  const proposalNumber = await nextProposalNumber(tenantId);
  const validUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;

  const result = await runManifestCommandCore(
    {
      createRuntime: ({ user: u, entityName }) =>
        createManifestRuntime({
          user: { id: u.id, tenantId: u.tenantId, role: u.role },
          entityName,
        }),
    },
    {
      entity: "Proposal",
      command: "create",
      body: {
        proposalNumber,
        leadId: "",
        eventId,
        title: `Proposal: ${event.title}`,
        guestCount: event.guestCount ?? 0,
        taxRate: 0,
        validUntil,
        notes: `Auto-generated proposal for ${event.title}`,
        termsAndConditions: "",
        clientId: event.clientId ?? "",
        eventDate: event.eventDate ? new Date(event.eventDate).getTime() : null,
        eventType: event.eventType ?? "",
        venueName: event.venueName ?? "",
        venueAddress: event.venueAddress ?? "",
      },
      user,
    }
  );

  if (!result.ok) {
    return { eventId, ok: false, error: result.message ?? "Create failed" };
  }

  const proposalId =
    typeof result.result === "object" &&
    result.result !== null &&
    "id" in result.result
      ? String((result.result as { id: string }).id)
      : undefined;

  return { eventId, ok: true, proposalId };
}

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const events = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ["draft", "confirmed"] },
    },
    select: {
      id: true,
      title: true,
      eventDate: true,
      guestCount: true,
      clientId: true,
      status: true,
    },
    orderBy: { eventDate: "asc" },
    take: 100,
  });

  const eventIds = events.map((e) => e.id);
  const proposals =
    eventIds.length > 0
      ? await database.proposal.findMany({
          where: { tenantId, eventId: { in: eventIds }, deletedAt: null },
          select: { eventId: true },
        })
      : [];
  const withProposal = new Set(proposals.map((p) => p.eventId));

  const eligible = events
    .filter((e) => !withProposal.has(e.id))
    .map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate?.toISOString() ?? null,
      guestCount: e.guestCount,
      status: e.status,
      hasClient: Boolean(e.clientId),
    }));

  return NextResponse.json({
    success: true,
    eligible,
    summary: { totalEligible: eligible.length },
  });
}

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const user = await resolveCurrentUser(request);
  const body = (await request.json()) as { eventIds?: string[] };

  if (!Array.isArray(body.eventIds) || body.eventIds.length === 0) {
    return NextResponse.json(
      { message: "eventIds array is required" },
      { status: 400 }
    );
  }

  const userCtx = { id: user.id, tenantId: user.tenantId, role: user.role };
  const results: Array<{
    eventId: string;
    ok: boolean;
    proposalId?: string;
    error?: string;
  }> = [];

  for (const eventId of body.eventIds) {
    try {
      results.push(await generateForEvent(tenantId, userCtx, eventId));
    } catch (error) {
      log.error("Proposal automation failed", { eventId, error });
      results.push({ eventId, ok: false, error: "Unexpected error" });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({
    success: succeeded === results.length,
    generated: succeeded,
    failed: results.length - succeeded,
    results,
  });
}
