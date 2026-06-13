/**
 * AI Call Planner Proposal Send API Endpoint
 *
 * POST /api/call-planner/proposals/[id]/send - Send a proposal to the client
 *
 * Governed write: ProposalDraft.send via Manifest runtime (draft -> sent
 * transition; appends deliveryMethod to sentVia and extends the magic-token
 * expiry by expiresInDays). Reads are direct tenant-scoped Prisma queries
 * (constitution §10).
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { orgId, userId: clerkUserId } = await auth();
    if (!orgId || !clerkUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await resolveCurrentUser(request);
    const tenantId = user.tenantId;

    const body = (await request.json().catch(() => ({}))) as {
      deliveryMethod?: string;
      expiresInDays?: number;
    };

    const deliveryMethod = body.deliveryMethod ?? "link";
    if (!["email", "sms", "link"].includes(deliveryMethod)) {
      return NextResponse.json(
        { message: "Invalid delivery method. Must be 'email', 'sms', or 'link'" },
        { status: 400 }
      );
    }
    const expiresInDays =
      typeof body.expiresInDays === "number" &&
      Number.isInteger(body.expiresInDays)
        ? body.expiresInDays
        : 30;

    // Read path: confirm the proposal exists in this tenant before mutating
    const proposal = await database.proposalDraft.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    // Governed write: ProposalDraft.send via Manifest runtime (guards enforce
    // draft status, delivery method, and the 1-90 day expiry window)
    const sendResponse = await runCommand({
      entity: "ProposalDraft",
      command: "send",
      body: { id, deliveryMethod, expiresInDays },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
    if (!sendResponse.ok) {
      return sendResponse;
    }

    const payload = (await sendResponse.json()) as {
      result?: {
        id?: string;
        status?: string;
        sentAt?: unknown;
        sentVia?: string;
        magicToken?: string;
        magicTokenExpiresAt?: unknown;
      };
    };
    const sent = payload.result ?? {};

    return NextResponse.json({
      success: true,
      proposal: {
        id: sent.id ?? id,
        status: sent.status ?? "sent",
        sentAt: sent.sentAt ?? null,
        sentVia: sent.sentVia ?? deliveryMethod,
        magicToken: sent.magicToken,
        expiresAt: sent.magicTokenExpiresAt ?? null,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error sending proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
