"use server";

import { randomUUID } from "node:crypto";
import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import { runManifestSaga } from "@/lib/manifest-saga";
import { requireCurrentUser } from "@/app/lib/tenant";

export type SagaActionResult = { ok: true } | { ok: false; error: string };

/**
 * Finalize a confirmed event and run profitability + summary reporting
 * through the governed `FinalizeEventWithReporting` saga.
 */
export async function finalizeEventWithReporting(
  eventId: string
): Promise<SagaActionResult> {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  let profitabilityId = (
    await database.eventProfitability.findFirst({
      where: { tenantId, eventId, deletedAt: null },
      select: { id: true },
    })
  )?.id;

  if (!profitabilityId) {
    const created = await runManifestCommand({
      entity: "EventProfitability",
      command: "create",
      body: {
        eventId,
        budgetedRevenue: 0,
        budgetedFoodCost: 0,
        budgetedLaborCost: 0,
        budgetedOverhead: 0,
        notes: "",
      },
      user: { id: user.id, tenantId, role: user.role },
    });
    if (!created.ok) {
      return {
        ok: false,
        error: created.message ?? "Failed to create event profitability record",
      };
    }
    profitabilityId = (created.result as { id?: string } | null)?.id;
  }

  const sagaResult = await runManifestSaga({
    saga: "FinalizeEventWithReporting",
    steps: {
      finalize: {
        instanceId: eventId,
        input: { userId: user.id },
      },
      calculateProfitability: {
        instanceId: profitabilityId,
        input: {
          calculationMethod: "auto",
          budgetedRevenue: 0,
          budgetedFoodCost: 0,
          budgetedLaborCost: 0,
          budgetedOverhead: 0,
          actualRevenue: 0,
          actualFoodCost: 0,
          actualLaborCost: 0,
          actualOverhead: 0,
        },
      },
      generateSummary: {
        input: {
          eventId,
          highlights: "[]",
          issues: "[]",
          financialPerformance: "[]",
          clientFeedback: "[]",
          insights: "[]",
          overallSummary: "",
        },
      },
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!sagaResult.ok) {
    return { ok: false, error: sagaResult.message };
  }

  return { ok: true };
}

export interface AutoGeneratePrepListInput {
  eventId: string;
  name: string;
  menuGroupsJson: string;
  totalInstructionLines: number;
  validInstructionLines: number;
  batchMultiplier?: number;
  dietaryRestrictions?: string;
  notes?: string;
}

/**
 * Run the `AutoGeneratePrepList` saga (createFromSeed → finalize) when seed
 * payload is already available (e.g. after event setup import).
 */
export async function autoGeneratePrepListForEvent(
  input: AutoGeneratePrepListInput
): Promise<SagaActionResult & { prepListId?: string }> {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const prepListId = randomUUID();
  const shell = await runManifestCommand({
    entity: "PrepList",
    command: "create",
    body: {
      id: prepListId,
      eventId: input.eventId,
      name: input.name,
      batchMultiplier: input.batchMultiplier ?? 1,
      dietaryRestrictions: input.dietaryRestrictions ?? "",
      totalItems: input.validInstructionLines,
      totalEstimatedTime: 0,
      notes: input.notes ?? "",
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!shell.ok) {
    return { ok: false, error: shell.message ?? "Failed to create prep list shell" };
  }

  const sagaResult = await runManifestSaga({
    saga: "AutoGeneratePrepList",
    steps: {
      createFromSeed: {
        instanceId: prepListId,
        input: {
          eventId: input.eventId,
          name: input.name,
          batchMultiplier: input.batchMultiplier ?? 1,
          dietaryRestrictions: input.dietaryRestrictions ?? "",
          notes: input.notes ?? "",
          menuGroupsJson: input.menuGroupsJson,
          totalInstructionLines: input.totalInstructionLines,
          validInstructionLines: input.validInstructionLines,
        },
      },
      finalize: {
        instanceId: prepListId,
        input: {},
      },
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!sagaResult.ok) {
    return { ok: false, error: sagaResult.message };
  }

  return { ok: true, prepListId };
}

/**
 * Confirm an event, then optionally kick off prep-list auto-generation when
 * seed metadata is supplied.
 */
export async function confirmEventWithOptionalPrepList(
  eventId: string,
  prepSeed?: AutoGeneratePrepListInput
): Promise<SagaActionResult> {
  const user = await requireCurrentUser();

  const confirmResult = await runManifestCommand({
    entity: "Event",
    command: "confirm",
    instanceId: eventId,
    body: { id: eventId, userId: user.id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!confirmResult.ok) {
    return { ok: false, error: confirmResult.message ?? "Failed to confirm event" };
  }

  if (!prepSeed) {
    return { ok: true };
  }

  const prepResult = await autoGeneratePrepListForEvent(prepSeed);
  if (!prepResult.ok) {
    return { ok: false, error: prepResult.error };
  }

  return { ok: true };
}
