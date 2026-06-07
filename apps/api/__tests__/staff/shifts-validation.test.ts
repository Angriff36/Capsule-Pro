/**
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateShift } from "@/app/api/staff/shifts/validation";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";
const SCHEDULE_ID = "22222222-2222-2222-2222-222222222222";

const db = database as typeof database & {
  user: { findFirst: ReturnType<typeof vi.fn> };
  schedule: { findFirst: ReturnType<typeof vi.fn> };
  scheduleShift: { findMany: ReturnType<typeof vi.fn> };
  employeeCertification: { findMany: ReturnType<typeof vi.fn> };
  employeeAvailability: { findMany: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.resetAllMocks();
  db.user.findFirst.mockResolvedValue({
    id: EMPLOYEE_ID,
    role: "server",
    isActive: true,
  });
  db.schedule.findFirst.mockResolvedValue({
    id: SCHEDULE_ID,
    status: "draft",
  });
  db.scheduleShift.findMany.mockResolvedValue([]);
  db.employeeCertification.findMany.mockResolvedValue([]);
  db.employeeAvailability.findMany.mockResolvedValue([]);
});

describe("shift validation", () => {
  it("returns a concrete overlap error body without using Prisma raw SQL", async () => {
    const shiftStart = new Date("2026-08-03T16:00:00.000Z");
    const shiftEnd = new Date("2026-08-03T20:00:00.000Z");
    db.scheduleShift.findMany.mockResolvedValueOnce([
      {
        id: "shift-existing",
        shift_start: new Date("2026-08-03T18:00:00.000Z"),
        shift_end: new Date("2026-08-03T22:00:00.000Z"),
      },
    ]);

    const result = await validateShift(TENANT_ID, {
      scheduleId: SCHEDULE_ID,
      employeeId: EMPLOYEE_ID,
      shiftStart: shiftStart.getTime(),
      shiftEnd: shiftEnd.getTime(),
      roleDuringShift: "host",
    });

    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(422);
    const body = await result.error?.json();
    expect(body).toMatchObject({
      code: "shift_overlap",
      message: "Overlapping shifts detected",
      severity: "BLOCK",
    });
    expect(body.details.overlappingShifts[0]).toMatchObject({
      id: "shift-existing",
      start: "2026-08-03T18:00:00.000Z",
      end: "2026-08-03T22:00:00.000Z",
    });
  });
});
