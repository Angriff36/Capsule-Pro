import { database } from "@repo/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkCertificationRequirements,
  checkOvertimeHours,
  validateShift,
} from "./validation";

// Mock database
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
  },
  Prisma: {
    sql: vi.fn((strings, ...values) => ({ strings, values })),
    empty: Symbol("empty"),
  },
}));

describe("Shift Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("checkOvertimeHours", () => {
    const tenantId = "test-tenant";
    const employeeId = "test-employee";
    const shiftStart = new Date("2024-01-15T09:00:00Z"); // Monday
    const shiftEnd = new Date("2024-01-15T17:00:00Z"); // 8 hour shift

    it("returns OK when projected hours are within threshold", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([]);

      const result = await checkOvertimeHours(
        tenantId,
        employeeId,
        shiftStart,
        shiftEnd
      );

      expect(result.severity).toBe("OK");
      expect(result.projectedHours).toBe(8);
      expect(result.error).toBeNull();
    });

    it("returns WARN when projected hours exceed warning threshold", async () => {
      // Mock existing 35 hours
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        {
          id: "shift-1",
          shift_start: new Date("2024-01-15T08:00:00Z"),
          shift_end: new Date("2024-01-15T16:00:00Z"),
        },
        {
          id: "shift-2",
          shift_start: new Date("2024-01-16T08:00:00Z"),
          shift_end: new Date("2024-01-16T16:00:00Z"),
        },
        {
          id: "shift-3",
          shift_start: new Date("2024-01-17T08:00:00Z"),
          shift_end: new Date("2024-01-17T16:00:00Z"),
        },
        {
          id: "shift-4",
          shift_start: new Date("2024-01-18T08:00:00Z"),
          shift_end: new Date("2024-01-18T16:00:00Z"),
        },
        {
          id: "shift-5",
          shift_start: new Date("2024-01-19T03:00:00Z"),
          shift_end: new Date("2024-01-19T06:00:00Z"),
        }, // 3 hours = 35 total
      ]);

      // Add 8 more hours = 43 total (exceeds 40)
      const result = await checkOvertimeHours(
        tenantId,
        employeeId,
        shiftStart,
        shiftEnd
      );

      expect(result.severity).toBe("WARN");
      expect(result.projectedHours).toBeCloseTo(43, 0);
      expect(result.error).toBeNull();
    });

    it("returns BLOCK when projected hours exceed max threshold", async () => {
      // Mock existing 55 hours
      const shifts = [];
      for (let i = 0; i < 6; i++) {
        shifts.push({
          id: `shift-${i}`,
          shift_start: new Date(`2024-01-${15 + i}T08:00:00Z`),
          shift_end: new Date(`2024-01-${15 + i}T17:00:00Z`), // 9 hours each
        });
      }
      shifts.push({
        id: "shift-6",
        shift_start: new Date("2024-01-21T08:00:00Z"),
        shift_end: new Date("2024-01-21T12:00:00Z"), // 4 hours = 58 total
      });

      vi.mocked(database.$queryRaw).mockResolvedValueOnce(shifts);

      // Add 8 more hours = 66 total (exceeds 60)
      const result = await checkOvertimeHours(
        tenantId,
        employeeId,
        shiftStart,
        shiftEnd
      );

      expect(result.severity).toBe("BLOCK");
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(422);
    });

    it("excludes specified shift from calculation", async () => {
      const excludeShiftId = "shift-to-exclude";

      vi.mocked(database.$queryRaw).mockResolvedValueOnce([]);

      await checkOvertimeHours(
        tenantId,
        employeeId,
        shiftStart,
        shiftEnd,
        excludeShiftId
      );

      // Verify the query was called (excludeShiftId should be in the query)
      expect(database.$queryRaw).toHaveBeenCalled();
    });
  });

  describe("checkCertificationRequirements", () => {
    const tenantId = "test-tenant";
    const employeeId = "test-employee";

    it("returns OK when role has no certification requirements", async () => {
      const result = await checkCertificationRequirements(
        tenantId,
        employeeId,
        "dishwasher"
      );

      expect(result.severity).toBe("OK");
      expect(result.hasRequiredCerts).toBe(true);
    });

    it("returns OK when employee has all required certifications", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        {
          id: "cert-1",
          certification_type: "food_safety",
          certification_name: "Food Handler Card",
          expiry_date: new Date("2027-12-31"),
        },
      ]);

      const result = await checkCertificationRequirements(
        tenantId,
        employeeId,
        "chef"
      );

      expect(result.severity).toBe("OK");
      expect(result.hasRequiredCerts).toBe(true);
    });

    it("returns BLOCK when required certification is missing", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([]);

      const result = await checkCertificationRequirements(
        tenantId,
        employeeId,
        "chef"
      );

      expect(result.severity).toBe("BLOCK");
      expect(result.hasRequiredCerts).toBe(false);
      expect(result.missingCerts).toContain("food_safety");
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(422);
    });

    it("returns BLOCK when certification is expired", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        {
          id: "cert-1",
          certification_type: "food_safety",
          certification_name: "Food Handler Card",
          expiry_date: new Date("2020-01-01"), // Expired
        },
      ]);

      const result = await checkCertificationRequirements(
        tenantId,
        employeeId,
        "chef"
      );

      expect(result.severity).toBe("BLOCK");
      expect(result.expiredCerts).toHaveLength(1);
      expect(result.expiredCerts[0].type).toBe("food_safety");
    });

    it("handles multiple required certifications", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        {
          id: "cert-1",
          certification_type: "food_safety",
          certification_name: "Food Handler Card",
          expiry_date: new Date("2027-12-31"),
        },
        // Missing: culinary_certification, management_certification
      ]);

      const result = await checkCertificationRequirements(
        tenantId,
        employeeId,
        "sous_chef"
      );

      expect(result.severity).toBe("BLOCK");
      expect(result.missingCerts).toContain("culinary_certification");
    });

    it("normalizes role names", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        {
          id: "cert-1",
          certification_type: "food_safety",
          certification_name: "Food Handler Card",
          expiry_date: new Date("2027-12-31"),
        },
      ]);

      // Test with different case and spacing
      const result = await checkCertificationRequirements(
        tenantId,
        employeeId,
        "Line Cook"
      );

      expect(result.severity).toBe("OK");
    });
  });

  describe("validateShift", () => {
    const tenantId = "test-tenant";
    const validBody = {
      scheduleId: "schedule-1",
      employeeId: "employee-1",
      shiftStart: Date.now(),
      shiftEnd: Date.now() + 8 * 60 * 60 * 1000, // 8 hours later
      roleDuringShift: "chef",
    };

    it("returns error when employee not found", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([]); // employee query

      const result = await validateShift(tenantId, validBody);

      expect(result.valid).toBe(false);
      expect(result.employee).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
    });

    it("returns error when employee is inactive", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        { id: "employee-1", role: "staff", is_active: false },
      ]);

      const result = await validateShift(tenantId, validBody);

      expect(result.valid).toBe(false);
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(400);
    });

    it("returns error when schedule not found", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([
          { id: "employee-1", role: "staff", is_active: true },
        ]) // employee
        .mockResolvedValueOnce([]); // schedule

      const result = await validateShift(tenantId, validBody);

      expect(result.valid).toBe(false);
      expect(result.schedule).toBeNull();
      expect(result.error?.status).toBe(404);
    });

    it("returns error when shifts overlap", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([
          { id: "employee-1", role: "staff", is_active: true },
        ]) // employee
        .mockResolvedValueOnce([{ id: "schedule-1", status: "draft" }]) // schedule
        .mockResolvedValueOnce([
          {
            id: "existing-shift",
            shift_start: new Date(validBody.shiftStart),
            shift_end: new Date(validBody.shiftEnd),
          },
        ]); // overlapping shifts

      const result = await validateShift(tenantId, validBody);

      expect(result.valid).toBe(false);
      expect(result.overlaps).toHaveLength(1);
      expect(result.error?.status).toBe(422);
    });

    it("returns valid with warnings when overtime threshold exceeded", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([
          { id: "employee-1", role: "staff", is_active: true },
        ]) // employee
        .mockResolvedValueOnce([{ id: "schedule-1", status: "draft" }]) // schedule
        .mockResolvedValueOnce([]) // no overlaps
        .mockResolvedValueOnce([
          // 35 hours of existing shifts
          {
            id: "s1",
            shift_start: new Date(),
            shift_end: new Date(Date.now() + 9 * 60 * 60 * 1000),
          },
          {
            id: "s2",
            shift_start: new Date(),
            shift_end: new Date(Date.now() + 9 * 60 * 60 * 1000),
          },
          {
            id: "s3",
            shift_start: new Date(),
            shift_end: new Date(Date.now() + 9 * 60 * 60 * 1000),
          },
          {
            id: "s4",
            shift_start: new Date(),
            shift_end: new Date(Date.now() + 8 * 60 * 60 * 1000),
          },
        ]) // 35 hours
        .mockResolvedValueOnce([
          {
            id: "cert-1",
            certification_type: "food_safety",
            certification_name: "Food Handler",
            expiry_date: new Date("2027-12-31"),
          },
        ]); // certifications

      const result = await validateShift(tenantId, validBody);

      expect(result.valid).toBe(true);
      expect(result.overtime.severity).toBe("WARN");
    });

    it("returns valid when all checks pass", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([
          { id: "employee-1", role: "staff", is_active: true },
        ]) // employee
        .mockResolvedValueOnce([{ id: "schedule-1", status: "draft" }]) // schedule
        .mockResolvedValueOnce([]) // no overlaps
        .mockResolvedValueOnce([]) // no existing shifts (overtime OK)
        .mockResolvedValueOnce([
          {
            id: "cert-1",
            certification_type: "food_safety",
            certification_name: "Food Handler",
            expiry_date: new Date("2027-12-31"),
          },
        ]); // certifications

      const result = await validateShift(tenantId, validBody);

      expect(result.valid).toBe(true);
      expect(result.employee).not.toBeNull();
      expect(result.schedule).not.toBeNull();
      expect(result.overlaps).toHaveLength(0);
      expect(result.overtime.severity).toBe("OK");
      expect(result.certifications.severity).toBe("OK");
      expect(result.error).toBeNull();
    });
  });
});
