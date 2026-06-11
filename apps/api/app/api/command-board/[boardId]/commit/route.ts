/**
 * Event Tree Command Board — atomic commit endpoint.
 *
 * POST /api/command-board/[boardId]/commit  body: { eventId }
 *
 * Executes EventStaff.assign for every draft card on the board AND flips each
 * card's draft envelope to "committed" — all governed commands threaded
 * through ONE Prisma transaction via `prismaOverride` (same shared-tx pattern
 * as ManifestPayrollDataSource). Any failure rolls everything back.
 *
 * Orchestration logic lives in lib/event-board/commit-event-board-drafts.ts
 * (pure, dependency-injected); this route owns auth + IO wiring only.
 */

import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { database, type Prisma } from "@repo/database";
import type { ManifestUserContext } from "@repo/manifest-runtime/run-manifest-command-core";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import type { PrismaTransactionClient } from "@repo/manifest-runtime/manifest-runtime-factory";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { manifestErrorResponse } from "@/lib/manifest-response";
import type { CommitDeps } from "@/lib/event-board/commit-event-board-drafts";
import { commitEventBoardDrafts } from "@/lib/event-board/commit-event-board-drafts";

export const runtime = "nodejs";

/**
 * Build runManifestCommandCore deps bound to the shared transaction client.
 * Mirrors makeCoreDeps in lib/payroll/manifest-payroll-data-source.ts: every
 * Manifest write (and entity read during command execution) routes through
 * `prismaOverride`, so all commands in the batch share ONE atomic transaction
 * with read-your-writes semantics.
 */
function makeCoreDeps(prismaOverride: PrismaTransactionClient) {
  return {
    createRuntime: ({
      user,
      entityName,
    }: {
      user: ManifestUserContext;
      entityName: string;
    }) => createManifestRuntime({ user, entityName, prismaOverride }),
  };
}

const deps: CommitDeps = {
  transact: (fn) => database.$transaction(fn, { timeout: 30_000 }),

  loadDraftCards: async (tx, boardId, tenantId) => {
    const rows = await (tx as Prisma.TransactionClient).commandBoardCard.findMany({
      where: { tenantId, boardId, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        cardType: true,
        status: true,
        color: true,
        groupId: true,
        metadata: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      content: row.content ?? "",
      cardType: row.cardType ?? "",
      status: row.status ?? "",
      color: row.color ?? "",
      groupId: row.groupId ?? "",
      metadata: row.metadata,
    }));
  },

  runCommand: async (tx, params) => {
    const result = await runManifestCommandCore(
      makeCoreDeps(tx as PrismaTransactionClient),
      {
        entity: params.entity,
        command: params.command,
        body: params.body,
        user: params.user,
        ...(params.instanceId ? { instanceId: params.instanceId } : {}),
      }
    );
    if (!result.ok) {
      return { success: false as const, error: result.message };
    }
    const createdId = (result.result as { id?: unknown } | null)?.id;
    return {
      success: true as const,
      ...(typeof createdId === "string" ? { instanceId: createdId } : {}),
    };
  },
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ boardId: string }> }
): Promise<Response> {
  try {
    const { boardId } = await context.params;
    const currentUser = await requireCurrentUser();

    const body = (await request.json().catch(() => null)) as {
      eventId?: unknown;
    } | null;
    const eventId = body?.eventId;
    if (typeof eventId !== "string" || eventId.length === 0) {
      return manifestErrorResponse("eventId is required", 400);
    }

    const result = await commitEventBoardDrafts(deps, {
      boardId,
      eventId,
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
    });

    return Response.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    // Auth/tenant resolution errors from requireCurrentUser should return 401.
    if (error instanceof Error && error.name === "InvariantError") {
      return manifestErrorResponse(error.message, 401);
    }
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
