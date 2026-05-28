'use server';

import { auth } from '@repo/auth/server';
import { database } from '@repo/database';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTenantIdForOrg } from '../../../lib/tenant';
import type { BattleBoardFull, BattleBoardImport } from '@/lib/battle-boards/types';

// ── Shape stored in boardData JSON ───────────────────────────────────────────

interface StoredBoardData {
  meta?: {
    eventName?: string; eventNumber?: string; eventDate?: string;
    staffParking?: string; staffRestrooms?: string;
  };
  venue_name?: string; venue_address?: string;
  headcount?: number; service_style?: string;
  staff?: unknown[]; timeline?: unknown[]; layouts?: unknown[]; imports?: unknown[];
}

// ── Converters ───────────────────────────────────────────────────────────────

function prismaToFull(board: {
  id: string; tenantId: string; status: string; notes: string | null;
  boardData: unknown; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}): BattleBoardFull {
  const d = (board.boardData as StoredBoardData) ?? {};
  const meta = d.meta ?? {};
  return {
    id: board.id,
    tenant_id: board.tenantId,
    event_name: meta.eventName ?? '',
    event_number: meta.eventNumber ?? '',
    event_date: meta.eventDate ?? null,
    venue_name: d.venue_name ?? '',
    venue_address: d.venue_address ?? '',
    headcount: d.headcount ?? 0,
    service_style: d.service_style ?? '',
    staff_parking: meta.staffParking ?? '',
    staff_restrooms: meta.staffRestrooms ?? '',
    notes: board.notes ?? '',
    status: board.status as BattleBoardFull['status'],
    created_at: board.createdAt.toISOString(),
    updated_at: board.updatedAt.toISOString(),
    deleted_at: board.deletedAt?.toISOString() ?? null,
    staff: (d.staff ?? []) as BattleBoardFull['staff'],
    timeline: (d.timeline ?? []) as BattleBoardFull['timeline'],
    layouts: (d.layouts ?? []) as BattleBoardFull['layouts'],
    imports: (d.imports ?? []) as BattleBoardFull['imports'],
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
  if (!orgId) notFound();
  const tenantId = await getTenantIdForOrg(orgId);

  const board = await database.battleBoard.findFirst({
    where: { id: boardId, tenantId, deletedAt: null },
  });
  if (!board) notFound();

  return prismaToFull(board);
}

export async function saveBoardFull(boardId: string, full: BattleBoardFull): Promise<void> {
  const { orgId } = await auth();
  if (!orgId) throw new Error('Unauthorized');
  const tenantId = await getTenantIdForOrg(orgId);

  await database.battleBoard.updateMany({
    where: { id: boardId, tenantId, deletedAt: null },
    data: {
      board_name: full.event_name || 'Untitled',
      status: full.status,
      notes: full.notes,
      boardData: fullToBoardData(full) as never,
    },
  });

  revalidatePath(`/events/battle-boards/${boardId}`);
}

export async function recordImportAction(
  boardId: string,
  entry: Omit<BattleBoardImport, 'id' | 'board_id' | 'tenant_id' | 'imported_at'>
): Promise<void> {
  const { orgId } = await auth();
  if (!orgId) throw new Error('Unauthorized');
  const tenantId = await getTenantIdForOrg(orgId);

  const board = await database.battleBoard.findFirst({
    where: { id: boardId, tenantId, deletedAt: null },
    select: { boardData: true },
  });
  if (!board) return;

  const data = (board.boardData as StoredBoardData) ?? {};
  const existingImports = (data.imports ?? []) as BattleBoardImport[];
  const newImport: BattleBoardImport = {
    id: crypto.randomUUID(),
    board_id: boardId,
    tenant_id: tenantId,
    imported_at: new Date().toISOString(),
    ...entry,
  };

  await database.battleBoard.updateMany({
    where: { id: boardId, tenantId, deletedAt: null },
    data: { boardData: { ...data, imports: [...existingImports, newImport] } as never },
  });
}
