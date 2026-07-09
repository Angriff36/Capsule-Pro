/**
 * @vitest-environment node
 *
 * Pins QA Checks "New Check" to Manifest QACheck.create
 * (location, checkType, inspector, notes) — not legacy QualityCheck fields.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/manifest-client.generated", () => ({
  qACheckCreate: vi.fn(),
}));

import { qACheckCreate } from "@/app/lib/manifest-client.generated";
import {
  createQACheck,
  isAllowedQACheckType,
  QA_CHECK_TYPES,
} from "../../app/(authenticated)/(operations)/kitchen/quality-assurance/create-qa-check";
import { qaCheckListTitle } from "../../app/(authenticated)/(operations)/kitchen/quality-assurance/qa-check-catalog";

const createMock = qACheckCreate as ReturnType<typeof vi.fn>;

describe("createQACheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls QACheck.create with the Manifest contract only", async () => {
    createMock.mockResolvedValue({
      id: "qa-check-1",
      location: "Walk-in cooler A",
      checkType: "temperature",
      inspector: "Alex",
      notes: "morning round",
      status: "pending",
      result: "pass",
    });

    const result = await createQACheck({
      location: "  Walk-in cooler A  ",
      checkType: "temperature",
      inspector: "  Alex  ",
      notes: "  morning round  ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.check.id).toBe("qa-check-1");
      expect(qaCheckListTitle(result.check)).toBe(
        "Temperature — Walk-in cooler A"
      );
    }

    expect(createMock).toHaveBeenCalledWith({
      location: "Walk-in cooler A",
      checkType: "temperature",
      inspector: "Alex",
      notes: "morning round",
    });

    const sent = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("title");
    expect(sent).not.toHaveProperty("description");
    expect(sent).not.toHaveProperty("scheduledAt");
    expect(sent).not.toHaveProperty("assignedTo");
    expect(sent).not.toHaveProperty("checklistItems");
    expect(sent).not.toHaveProperty("checkNumber");
    expect(sent).not.toHaveProperty("completedBy");
  });

  it("rejects legacy check types that QACheck.create does not allow", async () => {
    const result = await createQACheck({
      location: "Prep",
      checkType: "receiving",
      inspector: "Alex",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/check type/i);
    }
    expect(createMock).not.toHaveBeenCalled();
    expect(isAllowedQACheckType("receiving")).toBe(false);
    expect(QA_CHECK_TYPES.map((t) => t.value)).toEqual([
      "temperature",
      "sanitation",
      "storage",
      "labeling",
      "equipment",
    ]);
  });

  it("does not report success when create returns no id", async () => {
    createMock.mockResolvedValue({ location: "orphan" });

    const result = await createQACheck({
      location: "orphan",
      checkType: "storage",
      inspector: "Alex",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/persisted id/i);
    }
  });
});
