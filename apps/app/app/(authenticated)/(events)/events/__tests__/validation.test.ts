import { describe, expect, it } from "vitest";
import { createEventSchema } from "../validation";

describe("createEventSchema", () => {
  describe("valid data", () => {
    it("passes with all required fields", () => {
      const validData = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: 50,
      };

      const result = createEventSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Test Event");
        expect(result.data.guestCount).toBe(50);
      }
    });

    it("passes with all optional fields", () => {
      const validData = {
        title: "Corporate Gala",
        eventType: "corporate",
        eventDate: "2024-12-31",
        guestCount: 100,
        status: "confirmed" as const,
        venueName: "Grand Ballroom",
        venueAddress: "123 Main St",
        notes: "VIP event",
        budget: 5000,
        tags: ["formal", "evening"],
      };

      const result = createEventSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.venueName).toBe("Grand Ballroom");
        expect(result.data.budget).toBe(5000);
        expect(result.data.tags).toEqual(["formal", "evening"]);
      }
    });

    it("uses default values when optional fields are omitted", () => {
      const minimalData = {
        title: "Minimal Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: 1,
      };

      const result = createEventSchema.safeParse(minimalData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("confirmed");
        expect(result.data.eventType).toBe("catering");
        expect(result.data.tags).toEqual([]);
      }
    });
  });

  describe("validation failures", () => {
    it("fails when title is empty", () => {
      const invalidData = {
        title: "",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: 50,
      };

      const result = createEventSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message.includes("title"))
        ).toBe(true);
      }
    });

    it("fails when eventDate is missing", () => {
      const invalidData = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "",
        guestCount: 50,
      };

      const result = createEventSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message.includes("date"))
        ).toBe(true);
      }
    });

    it("fails when guestCount is less than 1", () => {
      const invalidData = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: 0,
      };

      const result = createEventSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message.includes("Guest count"))
        ).toBe(true);
      }
    });

    it("fails when guestCount is negative", () => {
      const invalidData = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: -5,
      };

      const result = createEventSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("fails when budget is negative", () => {
      const invalidData = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: 50,
        budget: -100,
      };

      const result = createEventSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message.includes("Budget"))
        ).toBe(true);
      }
    });

    it("fails with invalid status value", () => {
      const invalidData = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: 50,
        status: "invalid-status" as never,
      };

      const result = createEventSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe("type coercion", () => {
    it("coerces guestCount string to number", () => {
      const data = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: "100" as unknown as number,
      };

      const result = createEventSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.guestCount).toBe(100);
      }
    });

    it("coerces budget string to number", () => {
      const data = {
        title: "Test Event",
        eventType: "catering",
        eventDate: "2024-12-31",
        guestCount: 50,
        budget: "2500.50" as unknown as number,
      };

      const result = createEventSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.budget).toBe(2500.5);
      }
    });
  });
});
