"use server";

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../lib/tenant";

export type CreateBoardResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Create a Command Board and redirect to its detail page. Governed via CommandBoard.create. */
export const createCommandBoard = async (formData: FormData) => {
  const user = await requireCurrentUser();

  const name = (formData.get("name") ?? "").toString().trim();
  const description = (formData.get("description") ?? "").toString().trim();

  if (!name) {
    throw new Error("Board name is required");
  }

  const result = await runManifestCommand({
    entity: "CommandBoard",
    command: "create",
    body: {
      name,
      description: description || "",
      eventId: "",
      isTemplate: false,
      tags: [],
      autoPopulate: false,
      scope: "{}",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create board");
  }

  const id = (result.result as { id?: string } | null)?.id;
  if (!id) {
    throw new Error("CommandBoard.create did not return an id");
  }

  revalidatePath("/command-board");
  redirect(`/command-board/${id}`);
};

/** Move a card to new canvas coordinates. Governed via CommandBoardCard.move. */
export const moveCardAction = async (
  cardId: string,
  positionX: number,
  positionY: number
) => {
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "CommandBoardCard",
    command: "move",
    instanceId: cardId,
    body: {
      newPositionX: positionX,
      newPositionY: positionY,
      newZIndex: 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to move card");
  }
};

/**
 * Bulk-update properties on multiple cards (status, color, cardType).
 *
 * TODO: No bulk governed command exists — CommandBoardCard.update operates on a
 * single instance. Migrating to per-card commands would change this from one
 * UPDATE … WHERE id IN (…) to N individual governed commands, which changes
 * the atomicity guarantee. Keep as direct Prisma until a bulk command is added
 * to the IR.
 */
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

/**
 * Restore cards to previous state (undo support).
 *
 * TODO: Multi-entity $transaction spanning N cards. No bulk governed command
 * exists. Keep as direct Prisma — migrating would require N sequential
 * CommandBoardCard.update calls without transactional guarantees.
 */
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
  const user = await requireCurrentUser();

  // Governed write: CommandBoardGroup.create
  const result = await runManifestCommand({
    entity: "CommandBoardGroup",
    command: "create",
    body: {
      boardId,
      name,
      color: color || "",
      positionX,
      positionY,
      width,
      height,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create group");
  }

  const groupId = (result.result as { id?: string } | null)?.id;
  if (!groupId) {
    throw new Error("CommandBoardGroup.create did not return an id");
  }

  // TODO: Card group assignment is a bulk updateMany with no governed equivalent.
  // Keep as direct Prisma until a bulk assign-to-group command is added.
  if (cardIds.length > 0) {
    await database.commandBoardCard.updateMany({
      where: { tenantId: user.tenantId, id: { in: cardIds }, deletedAt: null },
      data: { groupId },
    });
  }

  return { id: groupId };
};

/**
 * Remove cards from their group (set groupId to null).
 *
 * TODO: Bulk updateMany with no governed equivalent. Keep as direct Prisma.
 */
export const ungroupCardsAction = async (cardIds: string[]) => {
  if (cardIds.length === 0) return;

  const tenantId = await requireTenantId();

  await database.commandBoardCard.updateMany({
    where: { tenantId, id: { in: cardIds }, deletedAt: null },
    data: { groupId: null },
  });
};

/**
 * Assign cards to an existing group.
 *
 * TODO: Bulk updateMany with no governed equivalent. Keep as direct Prisma.
 */
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

/** Toggle group collapsed state. Governed via CommandBoardGroup.update. */
export const toggleGroupCollapseAction = async (
  groupId: string,
  collapsed: boolean
) => {
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "CommandBoardGroup",
    command: "update",
    instanceId: groupId,
    body: {
      newName: "", // unchanged — IR requires all params; store ignores empty
      newColor: "",
      newCollapsed: collapsed,
      newPositionX: 0,
      newPositionY: 0,
      newWidth: 0,
      newHeight: 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to toggle group collapse");
  }
};

/** Delete a group (soft delete) and unassign its cards. */
export const deleteGroupAction = async (groupId: string) => {
  const user = await requireCurrentUser();

  // TODO: Card unassignment is bulk updateMany with no governed equivalent.
  await database.commandBoardCard.updateMany({
    where: { tenantId: user.tenantId, groupId, deletedAt: null },
    data: { groupId: null },
  });

  // Governed write: CommandBoardGroup.remove performs soft delete
  const result = await runManifestCommand({
    entity: "CommandBoardGroup",
    command: "remove",
    instanceId: groupId,
    body: {
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete group");
  }
};
