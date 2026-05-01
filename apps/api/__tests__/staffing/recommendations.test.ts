/**
 * Tests for Staffing Recommendations API
 * Pure computation route — no auth or database mocks needed.
 * Covers: POST recommendation generation, input validation,
 * service-style multipliers, role allocation, labor cost, and GET 405.
 */

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/staffing/recommendations/route";

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/staffing/recommendations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("Staffing Recommendations API", () => {
  // ── POST: happy path ─────────────────────────────────────────────

  describe("POST /api/staffing/recommendations", () => {
    it("returns 200 with valid guest count and defaults", async () => {
      const res = await POST(postRequest({ guestCount: 100 }));
      expect(res.status).toBe(200);

      const { recommendation } = await res.json();
      // Defaults: serviceStyle=plated (1.2x), eventType=corporate, duration=4
      expect(recommendation.guestCount).toBe(100);
      expect(recommendation.eventType).toBe("corporate");

      // baseStaff = max(3, ceil(100/18)) = max(3, 6) = 6
      // totalStaff = ceil(6 * 1.2) = ceil(7.2) = 8
      expect(recommendation.totalStaff).toBe(8);
      expect(recommendation.roles).toHaveLength(4);
      expect(recommendation.notes).toBeInstanceOf(Array);
      expect(recommendation.totalLaborCost).toBeGreaterThan(0);
    });

    // ── Service style multipliers ─────────────────────────────────

    it("applies buffet multiplier (1x)", async () => {
      const res = await POST(
        postRequest({ guestCount: 54, serviceStyle: "buffet" }),
      );
      const { recommendation } = await res.json();

      // baseStaff = max(3, ceil(54/18)) = 3
      // totalStaff = ceil(3 * 1) = 3
      expect(recommendation.totalStaff).toBe(3);
    });

    it("applies plated multiplier (1.2x)", async () => {
      const res = await POST(
        postRequest({ guestCount: 54, serviceStyle: "plated" }),
      );
      const { recommendation } = await res.json();

      // baseStaff = 3, totalStaff = ceil(3 * 1.2) = ceil(3.6) = 4
      expect(recommendation.totalStaff).toBe(4);
    });

    it("applies family_style multiplier (1.1x)", async () => {
      const res = await POST(
        postRequest({ guestCount: 54, serviceStyle: "family_style" }),
      );
      const { recommendation } = await res.json();

      // baseStaff = 3, totalStaff = ceil(3 * 1.1) = ceil(3.3) = 4
      expect(recommendation.totalStaff).toBe(4);
    });

    it("applies cocktail multiplier (0.9x)", async () => {
      const res = await POST(
        postRequest({ guestCount: 54, serviceStyle: "cocktail" }),
      );
      const { recommendation } = await res.json();

      // baseStaff = 3, totalStaff = ceil(3 * 0.9) = ceil(2.7) = 3
      expect(recommendation.totalStaff).toBe(3);
    });

    it("applies food_truck multiplier (0.75x)", async () => {
      const res = await POST(
        postRequest({ guestCount: 54, serviceStyle: "food_truck" }),
      );
      const { recommendation } = await res.json();

      // baseStaff = 3, totalStaff = ceil(3 * 0.75) = ceil(2.25) = 3
      expect(recommendation.totalStaff).toBe(3);
    });

    it("defaults to multiplier 1 for unknown service style", async () => {
      const res = await POST(
        postRequest({ guestCount: 54, serviceStyle: "mystery" }),
      );
      const { recommendation } = await res.json();

      // Unknown style falls back to multiplier 1, same as buffet
      // baseStaff = 3, totalStaff = ceil(3 * 1) = 3
      expect(recommendation.totalStaff).toBe(3);
    });

    // ── Role allocation and labor costs ───────────────────────────

    it("computes correct role counts for a small event", async () => {
      const res = await POST(
        postRequest({ guestCount: 10, serviceStyle: "buffet", duration: 5 }),
      );
      const { recommendation } = await res.json();

      // baseStaff = max(3, ceil(10/18)) = max(3, 1) = 3
      // totalStaff = ceil(3 * 1) = 3
      expect(recommendation.totalStaff).toBe(3);

      const roles = recommendation.roles as Array<{
        role: string;
        count: number;
        hourlyRate: number;
        hoursNeeded: number;
      }>;

      const captain = roles.find((r) => r.role === "captain")!;
      const server = roles.find((r) => r.role === "server")!;
      const bartender = roles.find((r) => r.role === "bartender")!;
      const culinary = roles.find((r) => r.role === "culinary_support")!;

      // captain = max(1, ceil(3 * 0.1)) = max(1, 1) = 1
      expect(captain.count).toBe(1);
      expect(captain.hourlyRate).toBe(32);
      expect(captain.hoursNeeded).toBe(5);

      // server = max(2, ceil(3 * 0.45)) = max(2, 2) = 2
      expect(server.count).toBe(2);
      expect(server.hourlyRate).toBe(24);

      // bartender = max(1, ceil(3 * 0.15)) = max(1, 1) = 1
      expect(bartender.count).toBe(1);
      expect(bartender.hourlyRate).toBe(26);

      // culinary = max(1, ceil(3 * 0.3)) = max(1, 1) = 1
      expect(culinary.count).toBe(1);
      expect(culinary.hourlyRate).toBe(22);
    });

    it("computes total labor cost correctly", async () => {
      const duration = 6;
      const res = await POST(
        postRequest({
          guestCount: 10,
          serviceStyle: "buffet",
          duration,
        }),
      );
      const { recommendation } = await res.json();

      const roles = recommendation.roles as Array<{
        count: number;
        hourlyRate: number;
        hoursNeeded: number;
      }>;

      const expected = roles.reduce(
        (sum, r) => sum + r.count * r.hourlyRate * r.hoursNeeded,
        0,
      );

      expect(recommendation.totalLaborCost).toBe(expected);
      // Sanity: all roles share the same hoursNeeded = duration
      for (const r of roles) {
        expect(r.hoursNeeded).toBe(duration);
      }
    });

    it("scales roles up for large guest counts", async () => {
      const res = await POST(
        postRequest({ guestCount: 500, serviceStyle: "buffet" }),
      );
      const { recommendation } = await res.json();

      // baseStaff = max(3, ceil(500/18)) = ceil(27.78) = 28
      // totalStaff = ceil(28 * 1) = 28
      expect(recommendation.totalStaff).toBe(28);

      const roles = recommendation.roles as Array<{
        role: string;
        count: number;
      }>;

      const server = roles.find((r) => r.role === "server")!;
      // server = max(2, ceil(28 * 0.45)) = max(2, 13) = 13
      expect(server.count).toBe(13);

      const captain = roles.find((r) => r.role === "captain")!;
      // captain = max(1, ceil(28 * 0.1)) = max(1, 3) = 3
      expect(captain.count).toBe(3);
    });

    // ── Service-style specific notes ──────────────────────────────

    it("includes plated-specific server notes", async () => {
      const res = await POST(
        postRequest({ guestCount: 50, serviceStyle: "plated" }),
      );
      const { recommendation } = await res.json();

      const server = (
        recommendation.roles as Array<{
          role: string;
          notes: string;
        }>
      ).find((r) => r.role === "server")!;
      expect(server.notes).toBe("Higher table service coverage recommended");
    });

    it("includes cocktail-specific server notes", async () => {
      const res = await POST(
        postRequest({ guestCount: 50, serviceStyle: "cocktail" }),
      );
      const { recommendation } = await res.json();

      const server = (
        recommendation.roles as Array<{
          role: string;
          notes: string;
        }>
      ).find((r) => r.role === "server")!;
      expect(server.notes).toBe(
        "Lean service team with stronger bar support",
      );
    });

    it("includes default server notes for buffet and other styles", async () => {
      const res = await POST(
        postRequest({ guestCount: 50, serviceStyle: "buffet" }),
      );
      const { recommendation } = await res.json();

      const server = (
        recommendation.roles as Array<{
          role: string;
          notes: string;
        }>
      ).find((r) => r.role === "server")!;
      expect(server.notes).toBe("Balanced service coverage");
    });

    // ── Notes array content ───────────────────────────────────────

    it("capitalizes eventType in notes and formats service style", async () => {
      const res = await POST(
        postRequest({
          guestCount: 30,
          eventType: "wedding",
          serviceStyle: "family_style",
        }),
      );
      const { recommendation } = await res.json();

      const notes = recommendation.notes as string[];
      expect(notes[0]).toContain("Wedding");
      expect(notes[0]).toContain("30 guests");
      expect(notes[1]).toContain("family style");
    });

    // ── Optional fields ───────────────────────────────────────────

    it("uses provided eventType and duration", async () => {
      const res = await POST(
        postRequest({
          guestCount: 60,
          eventType: "gala",
          duration: 8,
        }),
      );
      const { recommendation } = await res.json();

      expect(recommendation.eventType).toBe("gala");
      const roles = recommendation.roles as Array<{
        hoursNeeded: number;
      }>;
      for (const r of roles) {
        expect(r.hoursNeeded).toBe(8);
      }
    });

    // ── Validation: guestCount ────────────────────────────────────

    it("returns 400 when guestCount is 0", async () => {
      const res = await POST(postRequest({ guestCount: 0 }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Guest count is required");
    });

    it("returns 400 when guestCount is negative", async () => {
      const res = await POST(postRequest({ guestCount: -5 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when guestCount is missing", async () => {
      const res = await POST(postRequest({}));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Guest count is required");
    });

    it("returns 400 when guestCount is non-finite (NaN)", async () => {
      const res = await POST(postRequest({ guestCount: "abc" }));
      expect(res.status).toBe(400);
    });

    // ── Validation: duration ──────────────────────────────────────

    it("returns 400 when duration is 0", async () => {
      const res = await POST(
        postRequest({ guestCount: 50, duration: 0 }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Duration must be greater than 0");
    });

    it("returns 400 when duration is negative", async () => {
      const res = await POST(
        postRequest({ guestCount: 50, duration: -3 }),
      );
      expect(res.status).toBe(400);
    });

    // ── Malformed input ───────────────────────────────────────────

    it("returns 500 when request body is not valid JSON", async () => {
      const req = new NextRequest(
        "http://localhost/api/staffing/recommendations",
        {
          method: "POST",
          body: "not-json",
          headers: { "Content-Type": "application/json" },
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Failed to generate staffing recommendations");
    });
  });

  // ── GET: method not allowed ───────────────────────────────────────

  describe("GET /api/staffing/recommendations", () => {
    it("returns 405 Method Not Allowed", async () => {
      const res = await GET();
      expect(res.status).toBe(405);
      const body = await res.json();
      expect(body.error).toBe("Use POST to generate staffing recommendations");
    });
  });
});
