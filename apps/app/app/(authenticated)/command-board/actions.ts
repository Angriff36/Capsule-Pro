"use server";

import { randomUUID } from "node:crypto";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "../../lib/tenant";

export type CreateBoardResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Create a Command Board and redirect to its detail page.
 *
 * Why direct Prisma write: the manifest runtime in `apps/api` enforces guards
 * for command-board commands, but the apps/app side already does direct
 * Prisma writes for other server actions (events/clients) — the runtime is
 * an apps/api concern. RLS is enabled on `tenant_events.command_boards` and
 * `tenantId` scoping prevents cross-tenant writes.
 */
export const createCommandBoard = async (formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = (formData.get("name") ?? "").toString().trim();
  const description = (formData.get("description") ?? "").toString().trim();

  if (!name) {
    throw new Error("Board name is required");
  }

  const id = randomUUID();

  await database.commandBoard.create({
    data: {
      tenantId,
      id,
      name,
      description: description || null,
      status: "draft",
      isTemplate: false,
      tags: [],
      autoPopulate: false,
    },
  });

  revalidatePath("/command-board");
  redirect(`/command-board/${id}`);
};

/** Move a card to new canvas coordinates. */
export const moveCardAction = async (
  cardId: string,
  positionX: number,
  positionY: number
) => {
  const tenantId = await requireTenantId();

  await database.commandBoardCard.update({
    where: { tenantId_id: { tenantId, id: cardId } },
    data: { positionX, positionY },
  });
};

/** Bulk-update properties on multiple cards (status, color, cardType). */
export const bulkUpdateCardsAction = async (
  cardIds: string[],
  updates: { status?: string; color?: string; cardType?: string }
) => {
  if (cardIds.length === 0) return;

  const tenantId = await requireTenantId();

  await database.commandBoardCard.updateMany({
    where: { tenantId, id: { in: cardIds }, deletedAt: null },
    data: updates,
  });
};

/** Restore cards to previous state (undo support). */
export const bulkRestoreCardsAction = async (
  cards: Array<{
    id: string;
    status: string;
    color: string | null;
    cardType: string;
  }>
) => {
  if (cards.length === 0) return;

  const tenantId = await requireTenantId();

  await database.$transaction(
    cards.map((card) =>
      database.commandBoardCard.update({
        where: { tenantId_id: { tenantId, id: card.id } },
        data: {
          status: card.status,
          color: card.color,
          cardType: card.cardType,
        },
      })
    )
  );
};

/** Create a group and optionally assign cards to it. */
export const createGroupAction = async (
  boardId: string,
  name: string,
  color: string,
  cardIds: string[],
  positionX: number,
  positionY: number,
  width: number,
  height: number
) => {
  const tenantId = await requireTenantId();

  const groupId = randomUUID();

  await database.commandBoardGroup.create({
    data: {
      tenantId,
      id: groupId,
      boardId,
      name,
      color: color || null,
      collapsed: false,
      positionX,
      positionY,
      width,
      height,
    },
  });

  if (cardIds.length > 0) {
    await database.commandBoardCard.updateMany({
      where: { tenantId, id: { in: cardIds }, deletedAt: null },
      data: { groupId },
    });
  }

  return { id: groupId };
};

/** Remove cards from their group (set groupId to null). */
export const ungroupCardsAction = async (cardIds: string[]) => {
  if (cardIds.length === 0) return;

  const tenantId = await requireTenantId();

  await database.commandBoardCard.updateMany({
    where: { tenantId, id: { in: cardIds }, deletedAt: null },
    data: { groupId: null },
  });
};

/** Assign cards to an existing group. */
export const assignToGroupAction = async (
  cardIds: string[],
  groupId: string
) => {
  if (cardIds.length === 0) return;

  const tenantId = await requireTenantId();

  await database.commandBoardCard.updateMany({
    where: { tenantId, id: { in: cardIds }, deletedAt: null },
    data: { groupId },
  });
};

/** Toggle group collapsed state. */
export const toggleGroupCollapseAction = async (
  groupId: string,
  collapsed: boolean
) => {
  const tenantId = await requireTenantId();

  await database.commandBoardGroup.update({
    where: { tenantId_id: { tenantId, id: groupId } },
    data: { collapsed },
  });
};

/** Delete a group (soft delete) and unassign its cards. */
export const deleteGroupAction = async (groupId: string) => {
  const tenantId = await requireTenantId();
  const now = new Date();

  await database.commandBoardCard.updateMany({
    where: { tenantId, groupId, deletedAt: null },
    data: { groupId: null },
  });

  await database.commandBoardGroup.update({
    where: { tenantId_id: { tenantId, id: groupId } },
    data: { deletedAt: now },
  });
};
