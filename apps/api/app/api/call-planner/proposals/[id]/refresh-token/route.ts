/**
 * AI Call Planner Proposal Magic-Link Refresh API Endpoint
 *
 * POST /api/call-planner/proposals/[id]/refresh-token - Regenerate the magic token
 *
 * Governed write: ProposalDraft.refreshToken via Manifest runtime (new token
 * via the uuid() builtin, expiry reset to addDays(now(), 30)). Reads are
 * direct tenant-scoped Prisma queries (constitution §10).
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

    // Governed write: ProposalDraft.refreshToken via Manifest runtime
    // (guard: only draft or sent proposals can refresh their token)
    const refreshResponse = await runCommand({
      entity: "ProposalDraft",
      command: "refreshToken",
      body: { id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
    if (!refreshResponse.ok) {
      return refreshResponse;
    }

    const payload = (await refreshResponse.json()) as {
      result?: {
        id?: string;
        magicToken?: string;
        magicTokenExpiresAt?: unknown;
      };
    };
    const refreshed = payload.result ?? {};

    return NextResponse.json({
      success: true,
      proposal: {
        id: refreshed.id ?? id,
        magicToken: refreshed.magicToken,
        expiresAt: refreshed.magicTokenExpiresAt ?? null,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error refreshing proposal token:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
