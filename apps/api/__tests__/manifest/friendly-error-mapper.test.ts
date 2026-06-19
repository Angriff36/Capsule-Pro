/**
 * Unit tests for the friendly-error-mapper.
 *
 * The mapper is pure (no runtime, no DB), so these tests cover every failure
 * kind and the key parsing/branching paths.
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import {
  type FriendlyFailureInput,
  mapFailureToExplanation,
} from "@/lib/manifest/friendly-error-mapper";

function guardFailure(
  overrides: Partial<FriendlyFailureInput> = {}
): FriendlyFailureInput {
  return {
    entity: "Invoice",
    command: "send",
    kind: "guard_failed",
    message: "Guard 0 failed: Can only send draft invoices",
    guardFailure: {
      index: 0,
      expression: 'self.status == "DRAFT"',
      formatted: "Can only send draft invoices",
      resolved: [{ expression: "self.status", value: "SENT" }],
    },
    ...overrides,
  };
}

describe("mapFailureToExplanation", () => {
  describe("guard_failed — self status transition", () => {
    it("explains a self.status == guard using the resolved current value", () => {
      const result = mapFailureToExplanation(guardFailure(), {
        body: { id: "inv_123", invoiceNumber: "INV-0001" },
      });

      expect(result.category).toBe("wrong_status");
      expect(result.severity).toBe("warning");
      expect(result.title).toContain("invoice");
      expect(result.title).toContain("sent");
      expect(result.message).toContain("sent");
      expect(result.message).toContain("draft");
      expect(result.message).toContain("needs to be");
      expect(result.suggestedFix).toContain("draft");
      expect(result.suggestedFix).toContain("send it again");
      expect(result.blockingEntity).toBeDefined();
      expect(result.blockingEntity?.type).toBe("Invoice");
      expect(result.blockingEntity?.id).toBe("inv_123");
      expect(result.blockingEntity?.link).toBe("/accounting/invoices/inv_123");
      expect(result.blockingEntity?.label).toContain("INV-0001");
    });

    it("handles self.status in [...] multi-value guards", () => {
      const result = mapFailureToExplanation(
        guardFailure({
          command: "applyPayment",
          message: "Guard failed",
          guardFailure: {
            index: 0,
            expression: 'self.status in ["SENT", "VIEWED", "OVERDUE"]',
            resolved: [{ expression: "self.status", value: "PAID" }],
          },
        })
      );

      expect(result.message).toContain("paid");
      expect(result.message).toContain("sent");
      expect(result.message).toContain("viewed");
      expect(result.message).toContain("overdue");
      expect(result.message).toContain("or");
      expect(result.title).toContain("had a payment applied");
    });

    it("handles self.status != guard (negated)", () => {
      const result = mapFailureToExplanation(
        guardFailure({
          command: "voidInvoice",
          guardFailure: {
            index: 0,
            expression: 'self.status != "VOID"',
            resolved: [{ expression: "self.status", value: "VOID" }],
          },
        })
      );

      expect(result.message).toContain("void");
      expect(result.message).toContain("blocks");
      expect(result.suggestedFix).toContain("away from");
    });

    it("humanises SCREAMING_SNAKE status values", () => {
      const result = mapFailureToExplanation(
        guardFailure({
          guardFailure: {
            index: 0,
            expression: 'self.status == "DRAFT"',
            resolved: [{ expression: "self.status", value: "PARTIALLY_PAID" }],
          },
        })
      );

      expect(result.message).toContain("partially paid");
      expect(result.message).toContain("draft");
    });
  });

  describe("guard_failed — cross-entity reference", () => {
    it("links the blocking parent entity when the guard references a relationship status", () => {
      const result = mapFailureToExplanation(
        guardFailure({
          entity: "Invoice",
          command: "markAsPaid",
          message: "guard failed",
          guardFailure: {
            index: 0,
            expression: 'self.linkedEvent.status == "confirmed"',
            resolved: [
              { expression: "self.linkedEvent.status", value: "draft" },
            ],
          },
        }),
        { body: { id: "inv_1", eventId: "evt_42" } }
      );

      expect(result.category).toBe("wrong_status");
      expect(result.message).toContain("linked event");
      expect(result.message).toContain("confirmed");
      expect(result.blockingEntity?.type).toBe("Event");
      expect(result.blockingEntity?.id).toBe("evt_42");
      expect(result.blockingEntity?.link).toBe("/events/evt_42");
      expect(result.suggestedFix).toContain("Open the event");
    });

    it("still produces an explanation when the FK is missing", () => {
      const result = mapFailureToExplanation(
        guardFailure({
          entity: "Invoice",
          command: "markAsPaid",
          guardFailure: {
            index: 0,
            expression: 'self.linkedEvent.status == "confirmed"',
            resolved: [
              { expression: "self.linkedEvent.status", value: "draft" },
            ],
          },
        }),
        { body: { id: "inv_1" } }
      );

      expect(result.blockingEntity?.type).toBe("Event");
      expect(result.blockingEntity?.id).toBeUndefined();
    });
  });

  describe("guard_failed — generic (non-status)", () => {
    it("surfaces the authored guard message when no status pattern is detected", () => {
      const result = mapFailureToExplanation(
        guardFailure({
          guardFailure: {
            index: 0,
            expression: "paymentAmount > 0",
            formatted: "Payment amount must be positive",
            resolved: [{ expression: "paymentAmount", value: 0 }],
          },
        })
      );

      expect(result.category).toBe("validation");
      expect(result.message).toContain("Payment amount must be positive");
      expect(result.suggestedFix).toContain("requirement");
    });
  });

  describe("policy_denied", () => {
    it("explains a permission denial with the policy name", () => {
      const result = mapFailureToExplanation({
        entity: "Invoice",
        command: "send",
        kind: "policy_denied",
        message: "Access denied: InvoiceDefaultAccess",
        policyDenial: {
          policyName: "InvoiceDefaultAccess",
          message: "Invoice management",
        },
      });

      expect(result.category).toBe("permission");
      expect(result.title).toContain("permission");
      expect(result.message).toContain("InvoiceDefaultAccess");
      expect(result.message).toContain("send");
      expect(result.suggestedFix).toContain("administrator");
    });
  });

  describe("constraint_blocked", () => {
    it("surfaces the blocked constraint message", () => {
      const result = mapFailureToExplanation({
        entity: "Invoice",
        command: "update",
        kind: "constraint_blocked",
        message: "Amounts cannot be negative",
        constraintOutcomes: [
          {
            code: "amount_non_negative",
            constraintName: "amount_non_negative",
            severity: "block",
            message: "Amounts cannot be negative",
            passed: false,
          },
        ],
      });

      expect(result.category).toBe("validation");
      expect(result.title).toContain("can't be saved");
      expect(result.message).toContain("Amounts cannot be negative");
      expect(result.suggestedFix).toContain("override");
    });

    it("falls back to the failure message when no block outcome is present", () => {
      const result = mapFailureToExplanation({
        entity: "Invoice",
        command: "update",
        kind: "constraint_blocked",
        message: "Something went wrong",
      });

      expect(result.message).toContain("Something went wrong");
    });
  });

  describe("unknown_command / bootstrap_failed", () => {
    it("treats unknown_command as a not-found category", () => {
      const result = mapFailureToExplanation({
        entity: "Widget",
        command: "frobnicate",
        kind: "unknown_command",
        message: "Unknown command: Widget.frobnicate",
      });

      expect(result.category).toBe("not_found");
      expect(result.severity).toBe("info");
      expect(result.message).toContain("frobnicate");
      expect(result.message).toContain("widget");
    });

    it("treats bootstrap_failed as not-found too", () => {
      const result = mapFailureToExplanation({
        entity: "Invoice",
        command: "send",
        kind: "bootstrap_failed",
        message: "runtime bootstrap failed",
      });

      expect(result.category).toBe("not_found");
    });
  });

  describe("runtime_error", () => {
    it("produces a system error explanation", () => {
      const result = mapFailureToExplanation({
        entity: "Invoice",
        command: "send",
        kind: "runtime_error",
        message: "TypeError: cannot read properties of undefined",
      });

      expect(result.category).toBe("system");
      expect(result.severity).toBe("error");
      expect(result.title).toContain("our end");
      expect(result.suggestedFix).toContain("Invoice.send");
    });
  });

  describe("command_failed", () => {
    it("produces a generic validation explanation with the failure message", () => {
      const result = mapFailureToExplanation({
        entity: "Invoice",
        command: "send",
        kind: "command_failed",
        message: "Concurrency conflict on version",
      });

      expect(result.category).toBe("validation");
      expect(result.message).toContain("Concurrency conflict");
      expect(result.blockingEntity?.type).toBe("Invoice");
    });
  });

  describe("robustness", () => {
    it("falls back to a system error when the mapper would throw", () => {
      // Pass a malformed guard with a non-array resolved to trigger a path
      // that would throw inside parseStatusGuard if it weren't defensive.
      const result = mapFailureToExplanation({
        entity: "Invoice",
        command: "send",
        kind: "guard_failed",
        message: "Boom",
        guardFailure: { index: 0, expression: null, resolved: "nope" },
      });

      expect(result).toBeDefined();
      expect(result.title.length).toBeGreaterThan(0);
    });

    it("omits blockingEntity link for unknown entities with no id", () => {
      const result = mapFailureToExplanation({
        entity: "MysteryEntity",
        command: "send",
        kind: "command_failed",
        message: "fail",
      });

      expect(result.blockingEntity).toBeUndefined();
    });

    it("uses the entity noun when no display field is present", () => {
      const result = mapFailureToExplanation(
        guardFailure({ entity: "Shipment" }),
        { body: { id: "ship_1" } }
      );

      expect(result.blockingEntity?.label).toContain("shipment");
    });
  });
});
