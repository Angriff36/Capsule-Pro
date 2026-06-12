"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/app/lib/tenant";
import type {
  BattleBoardFull,
  BattleBoardImport,
} from "@/lib/battle-boards/types";
import { runManifestCommand } from "@/lib/manifest-command";
import { getTenantIdForOrg } from "../../../lib/tenant";

// ── Shape stored in boardData JSON ───────────────────────────────────────────

interface StoredBoardData {
  headcount?: number;
  imports?: unknown[];
  layouts?: unknown[];
  meta?: {
    eventName?: string;
    eventNumber?: string;
    eventDate?: string;
    staffParking?: string;
    staffRestrooms?: string;
  };
  service_style?: string;
  staff?: unknown[];
  timeline?: unknown[];
  venue_address?: string;
  venue_name?: string;
}

// ── Converters ───────────────────────────────────────────────────────────────

function prismaToFull(board: {
  id: string;
  tenantId: string;
  status: string;
  notes: string | null;
  boardData: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): BattleBoardFull {
  const d = (board.boardData as StoredBoardData) ?? {};
  const meta = d.meta ?? {};
  return {
    id: board.id,
    tenant_id: board.tenantId,
    event_name: meta.eventName ?? "",
    event_number: meta.eventNumber ?? "",
    event_date: meta.eventDate ?? null,
    venue_name: d.venue_name ?? "",
    venue_address: d.venue_address ?? "",
    headcount: d.headcount ?? 0,
    service_style: d.service_style ?? "",
    staff_parking: meta.staffParking ?? "",
    staff_restrooms: meta.staffRestrooms ?? "",
    notes: board.notes ?? "",
    status: board.status as BattleBoardFull["status"],
    created_at: board.createdAt.toISOString(),
    updated_at: board.updatedAt.toISOString(),
    deleted_at: board.deletedAt?.toISOString() ?? null,
    staff: (d.staff ?? []) as BattleBoardFull["staff"],
    timeline: (d.timeline ?? []) as BattleBoardFull["timeline"],
    layouts: (d.layouts ?? []) as BattleBoardFull["layouts"],
    imports: (d.imports ?? []) as BattleBoardFull["imports"],
  };
}

function fullToBoardData(full: BattleBoardFull): StoredBoardData {
  return {
    meta: {
      eventName: full.event_name,
      eventNumber: full.event_number,
      eventDate: full.event_date ?? undefined,
      staffParking: full.staff_parking,
      staffRestrooms: full.staff_restrooms,
    },
    venue_name: full.venue_name,
    venue_address: full.venue_address,
    headcount: full.headcount,
    service_style: full.service_style,
    staff: full.staff,
    timeline: full.timeline,
    layouts: full.layouts,
    imports: full.imports,
  };
}

// ── Server Actions ────────────────────────────────────────────────────────────

export async function getBoardFull(boardId: string): Promise<BattleBoardFull> {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }
  const tenantId = await getTenantIdForOrg(orgId);

  const board = await database.battleBoard.findFirst({
    where: { id: boardId, tenantId, deletedAt: null },
  });
  if (!board) {
    notFound();
  }

  return prismaToFull(board);
}

export async function saveBoardFull(
  boardId: string,
  full: BattleBoardFull
): Promise<void> {
  const user = await requireCurrentUser();

  // Governed write: BattleBoard.update runs through Manifest runtime.
  // boardData is stored as a JSON string in Manifest (property type is string).
  const result = await runManifestCommand({
    entity: "BattleBoard",
    command: "update",
    instanceId: boardId,
    body: {
      boardName: full.event_name || "Untitled",
      status: full.status,
      notes: full.notes,
      boardData: JSON.stringify(fullToBoardData(full)),
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to save battle board");
  }

  revalidatePath(`/events/battle-boards/${boardId}`);
}

export async function recordImportAction(
  boardId: string,
  entry: Omit<
    BattleBoardImport,
    "id" | "board_id" | "tenant_id" | "imported_at"
  >
): Promise<void> {
  const user = await requireCurrentUser();

  // Read current boardData to append the import entry (constitution §10: reads bypass runtime).
  const board = await database.battleBoard.findFirst({
    where: { id: boardId, tenantId: user.tenantId, deletedAt: null },
    select: { boardData: true },
  });
  if (!board) {
    return;
  }

  const data = (board.boardData as StoredBoardData) ?? {};
  const existingImports = (data.imports ?? []) as BattleBoardImport[];
  const newImport: BattleBoardImport = {
    id: crypto.randomUUID(),
    board_id: boardId,
    tenant_id: user.tenantId,
    imported_at: new Date().toISOString(),
    ...entry,
  };

  // Governed write: BattleBoard.recordImport mutates boardData via Manifest runtime.
  const result = await runManifestCommand({
    entity: "BattleBoard",
    command: "recordImport",
    instanceId: boardId,
    body: {
      boardData: JSON.stringify({
        ...data,
        imports: [...existingImports, newImport],
      }),
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to record import");
  }
}
