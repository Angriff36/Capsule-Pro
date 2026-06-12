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

import { database, type Prisma } from "@repo/database";
import type { PrismaTransactionClient } from "@repo/manifest-runtime/manifest-runtime-factory";
import type { ManifestUserContext } from "@repo/manifest-runtime/run-manifest-command-core";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import type { CommitDeps } from "@/lib/event-board/commit-event-board-drafts";
import { commitEventBoardDrafts } from "@/lib/event-board/commit-event-board-drafts";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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
  transact: (fn) =>
    database.$transaction(fn, { timeout: 30_000, maxWait: 15_000 }),

  /**
   * Row-lock the board for the transaction's duration (FOR UPDATE) and return
   * its eventId for board↔event validation. Physical table is
   * tenant_events.command_boards (model CommandBoard @@map/@@schema in
   * packages/database/prisma/schema.prisma); tenant_id / event_id / deleted_at
   * are snake_case via @map, id is unmapped.
   */
  lockBoard: async (tx, boardId, tenantId) => {
    const rows = await (tx as Prisma.TransactionClient).$queryRaw<
      Array<{ event_id: string | null }>
    >`
      SELECT "event_id"
      FROM "tenant_events"."command_boards"
      WHERE "tenant_id" = ${tenantId}::uuid
        AND "id" = ${boardId}::uuid
        AND "deleted_at" IS NULL
      FOR UPDATE
    `;
    if (rows.length === 0) {
      return null;
    }
    return { eventId: rows[0].event_id };
  },

  /**
   * Active assignments for the event — the commit dedupe baseline. The status
   * filter mirrors the committed-roster query in the app's getEventBoardData
   * (apps/app .../events/[eventId]/board/actions.ts).
   */
  loadActiveStaff: async (tx, eventId, tenantId) => {
    const rows = await (tx as Prisma.TransactionClient).eventStaff.findMany({
      where: {
        tenantId,
        eventId,
        status: { in: ["assigned", "confirmed", "checked_in"] },
        deletedAt: null,
      },
      select: { id: true, staffMemberId: true },
    });
    return rows;
  },

  loadDraftCards: async (tx, boardId, tenantId) => {
    const rows = await (
      tx as Prisma.TransactionClient
    ).commandBoardCard.findMany({
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

    // Error classification: expected commit failures (governed-command
    // rejections, board validation) come back as { success: false } → 422
    // with a client-safe message. Unexpected throws (tx timeout, connection
    // failure, programming bug) propagate out of the orchestrator → capture
    // to Sentry and mask behind a generic 500.
    let result;
    try {
      result = await commitEventBoardDrafts(deps, {
        boardId,
        eventId,
        user: {
          id: currentUser.id,
          tenantId: currentUser.tenantId,
          role: currentUser.role,
        },
      });
    } catch (error) {
      captureException(error);
      return Response.json(
        { success: false, error: "Internal error during commit" },
        { status: 500 }
      );
    }

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
