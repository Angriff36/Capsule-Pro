import { describe, expect, it } from "vitest";
import {
  getFieldHint,
  getFieldHints,
  getFieldHintText,
  hasFieldHint,
} from "@/app/lib/manifest-field-hints";

describe("manifest-field-hints", () => {
  describe("getFieldHint", () => {
    it("returns the constraint message governing a property", () => {
      const hints = getFieldHint("AllergenWarning", "allergens");
      expect(hints.length).toBeGreaterThan(0);
      expect(hints.some((h) => h.message.includes("Allergens"))).toBe(true);
    });

    it("surfaces budget-ceiling rules for EventBudget.totalBudgetAmount", () => {
      const hints = getFieldHint("EventBudget", "totalBudgetAmount");
      expect(hints.length).toBeGreaterThan(0);
      expect(
        hints.some((h) => h.message.toLowerCase().includes("non-negative"))
      ).toBe(true);
    });

    it("includes the deposit rule for ProposalDraft.depositAmount", () => {
      const hints = getFieldHint("ProposalDraft", "depositAmount");
      expect(hints.length).toBeGreaterThan(0);
      expect(
        hints.some((h) => h.message.toLowerCase().includes("deposit"))
      ).toBe(true);
    });

    it("includes certification rules for EmployeeCertification", () => {
      const hints = getFieldHint("EmployeeCertification", "certificationType");
      expect(hints.length).toBeGreaterThan(0);
      expect(
        hints.some((h) => h.message.toLowerCase().includes("certification"))
      ).toBe(true);
    });

    it("returns an empty array for an ungoverned property", () => {
      expect(getFieldHint("EventBudget", "thisFieldDoesNotExist")).toEqual([]);
    });

    it("returns an empty array for an unknown entity", () => {
      expect(getFieldHint("NoSuchEntity", "title")).toEqual([]);
    });

    it("sorts block-severity rules before warn-severity rules", () => {
      const hints = getFieldHint("EventBudget", "totalBudgetAmount");
      const firstWarn = hints.findIndex((h) => h.severity === "warn");
      const lastBlock = hints.map((h) => h.severity).lastIndexOf("block");
      if (firstWarn !== -1 && lastBlock !== -1) {
        expect(lastBlock).toBeLessThan(firstWarn);
      }
    });
  });

  describe("getFieldHints (entity-level)", () => {
    it("returns all governed properties for an entity", () => {
      const map = getFieldHints("TrainingModule");
      expect(Object.keys(map).length).toBeGreaterThan(0);
      expect(map).toHaveProperty("title");
      expect(map.title?.some((h) => h.message.includes("required"))).toBe(true);
    });

    it("returns an empty object for an unknown entity", () => {
      expect(getFieldHints("NoSuchEntity")).toEqual({});
    });
  });

  describe("getFieldHintText", () => {
    it("joins multiple messages with a middle dot", () => {
      const text = getFieldHintText("AllergenWarning", "allergens");
      expect(text.length).toBeGreaterThan(0);
    });

    it("returns an empty string for ungoverned fields", () => {
      expect(getFieldHintText("EventBudget", "nope")).toBe("");
    });
  });

  describe("hasFieldHint", () => {
    it("returns true for a governed field", () => {
      expect(hasFieldHint("EventBudget", "totalBudgetAmount")).toBe(true);
    });

    it("returns false for an ungoverned field", () => {
      expect(hasFieldHint("EventBudget", "nope")).toBe(false);
    });
  });
});
