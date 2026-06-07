import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  type AutoAssignmentResult,
  getAssignmentSuggestionsForMultipleShifts,
  type ShiftRequirement,
} from "@/lib/staff/auto-assignment";
import { withRateLimit } from "@/middleware/rate-limiter";

/**
 * POST /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for multiple shifts at once.
 *
 * Body:
 * - shifts: Array of shift requirements
 *   - shiftId: string
 *   - locationId: string (optional)
 *   - requiredSkills: string[] (optional)
 */
export const POST = withRateLimit(
  async (request: Request) => {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    try {
      const body = await request.json();
      const { shifts } = body as {
        shifts: Array<{
          shiftId: string;
          locationId?: string;
          requiredSkills?: string[];
        }>;
      };

      if (!(shifts && Array.isArray(shifts))) {
        return NextResponse.json(
          { message: "Invalid request body" },
          { status: 400 }
        );
      }

      // Handle empty shifts array
      if (shifts.length === 0) {
        return NextResponse.json({
          results: [],
          summary: {
            total: 0,
            canAutoAssign: 0,
            hasSuggestions: 0,
            noSuggestions: 0,
          },
        });
      }

      // Get all shift details.
      const shiftIds = shifts.map((s) => s.shiftId);
      const shiftsFromDb = await database.scheduleShift.findMany({
        where: {
          tenantId,
          id: { in: shiftIds },
          deletedAt: null,
        },
        select: {
          id: true,
          scheduleId: true,
          locationId: true,
          shift_start: true,
          shift_end: true,
          role_during_shift: true,
        },
      });

      // Build requirements
      const requirements: ShiftRequirement[] = shiftsFromDb.map((shift) => {
        const requestShift = shifts.find((s) => s.shiftId === shift.id);
        return {
          shiftId: shift.id,
          scheduleId: shift.scheduleId,
          locationId: requestShift?.locationId || shift.locationId || "",
          shiftStart: shift.shift_start,
          shiftEnd: shift.shift_end,
          roleDuringShift: shift.role_during_shift || undefined,
          requiredSkills: requestShift?.requiredSkills || [],
        };
      });

      const results = await getAssignmentSuggestionsForMultipleShifts(
        tenantId,
        requirements
      );

      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          canAutoAssign: results.filter(
            (r: AutoAssignmentResult) => r.canAutoAssign
          ).length,
          hasSuggestions: results.filter(
            (r: AutoAssignmentResult) => r.suggestions.length > 0
          ).length,
          noSuggestions: results.filter(
            (r: AutoAssignmentResult) => r.suggestions.length === 0
          ).length,
        },
      });
    } catch (error) {
      captureException(error);
      log.error("Error getting bulk assignment suggestions:", error);
      return NextResponse.json(
        { message: "Failed to get bulk assignment suggestions" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);

/**
 * GET /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for all open shifts (shifts without an assigned employee).
 *
 * Query params:
 * - scheduleId: Optional schedule ID to filter
 * - locationId: Optional location ID to filter
 * - startDate: Optional start date filter (ISO 8601)
 * - endDate: Optional end date filter (ISO 8601)
 */
export const GET = withRateLimit(
  async (request: Request) => {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const scheduleId = searchParams.get("scheduleId");
    const locationId = searchParams.get("locationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    try {
      // Get open shifts (shifts without assigned employees).
      // TODO: employeeId is a required (non-nullable) field in the Prisma schema,
      // so filtering for `null` will never match rows. This should be updated once
      // the schema supports unassigned shifts (e.g. nullable employeeId).
      // For now, omit the employeeId filter to return all non-deleted shifts.
      const openShifts = await database.scheduleShift.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(scheduleId ? { scheduleId } : {}),
          ...(locationId ? { locationId } : {}),
          ...(startDate ? { shift_start: { gte: new Date(startDate) } } : {}),
          ...(endDate ? { shift_end: { lte: new Date(endDate) } } : {}),
        },
        orderBy: { shift_start: "asc" },
        take: 50,
        select: {
          id: true,
          scheduleId: true,
          locationId: true,
          shift_start: true,
          shift_end: true,
          role_during_shift: true,
        },
      });

      if (openShifts.length === 0) {
        return NextResponse.json({
          results: [],
          summary: {
            total: 0,
            canAutoAssign: 0,
            hasSuggestions: 0,
            noSuggestions: 0,
          },
        });
      }

      // Build requirements
      const requirements: ShiftRequirement[] = openShifts.map((shift) => ({
        shiftId: shift.id,
        scheduleId: shift.scheduleId,
        locationId: locationId || shift.locationId || "",
        shiftStart: shift.shift_start,
        shiftEnd: shift.shift_end,
        roleDuringShift: shift.role_during_shift || undefined,
      }));

      const results = await getAssignmentSuggestionsForMultipleShifts(
        tenantId,
        requirements
      );

      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          canAutoAssign: results.filter(
            (r: AutoAssignmentResult) => r.canAutoAssign
          ).length,
          hasSuggestions: results.filter(
            (r: AutoAssignmentResult) => r.suggestions.length > 0
          ).length,
          noSuggestions: results.filter(
            (r: AutoAssignmentResult) => r.suggestions.length === 0
          ).length,
        },
      });
    } catch (error) {
      captureException(error);
      log.error("Error getting open shifts suggestions:", error);
      return NextResponse.json(
        { message: "Failed to get open shifts suggestions" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
