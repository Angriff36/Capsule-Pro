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
