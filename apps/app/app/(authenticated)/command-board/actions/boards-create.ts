"use server";

import "server-only";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import { getTemplateById } from "../config/board-templates";
import { withRetry } from "../lib/retry-utils";
import type { BoardResult, BoardStatus, CommandBoard } from "./boards-crud";

export interface CreateBoardInput {
  name: string;
  description?: string;
  eventId?: string;
  isTemplate?: boolean;
  tags?: string[];
  templateId?: string;
}

function dbBoardToBoard(board: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  eventId: string | null;
}): CommandBoard {
  return {
    id: board.id,
    tenantId: board.tenantId,
    eventId: board.eventId,
    name: board.name,
    description: board.description,
    status: (board.status as BoardStatus) || "draft",
    isTemplate: board.isTemplate,
    tags: board.tags,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    deletedAt: board.deletedAt,
  };
}

export async function createCommandBoard(
  input: CreateBoardInput
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    const template = input.templateId
      ? getTemplateById(input.templateId)
      : undefined;

    const scope = template?.scope ?? undefined;
    const autoPopulate = template?.autoPopulate ?? false;
    const tags = input.tags ?? template?.tags ?? [];
    const name = input.name;

    const board = await withRetry(
      () =>
        database.commandBoard.create({
          data: {
            tenantId,
            id: crypto.randomUUID(),
            name,
            description: input.description || null,
            eventId: input.eventId || null,
            isTemplate: input.isTemplate,
            tags,
            scope: scope ? JSON.parse(JSON.stringify(scope)) : undefined,
            autoPopulate,
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    return {
      success: true,
      board: dbBoardToBoard(board),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create board";
    console.error("[createCommandBoard] Failed to create board:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
