import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { withRateLimit } from "@/middleware/rate-limiter";
import type { CreateBatchAvailabilityInput } from "../types";
import {
  checkOverlappingAvailability,
  validateBatchAvailabilityInput,
  validateEffectiveDates,
  verifyEmployee,
} from "../validation";

/**
 * POST /api/staff/availability/batch
 * Create multiple availability records at once (for recurring weekly patterns)
 *
 * Required fields:
 * - employeeId: Employee to set availability for
 * - patterns: Array of availability patterns
 *   - dayOfWeek: Day of week (0-6)
 *   - startTime: Start time in HH:MM format
 *   - endTime: End time in HH:MM format
 *   - isAvailable: (optional) Whether available (defaults to true)
 *
 * Optional fields:
 * - effectiveFrom: Date when availability starts (YYYY-MM-DD, defaults to today)
 * - effectiveUntil: Date when availability ends (YYYY-MM-DD or null for ongoing)
 */
export const POST = withRateLimit(
  async (request: Request) => {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = (await request.json()) as CreateBatchAvailabilityInput;

    // Validate required fields
    if (!(body.employeeId && body.patterns && body.patterns.length > 0)) {
      return NextResponse.json(
        {
          message:
            "Employee ID and at least one availability pattern are required",
        },
        { status: 400 }
      );
    }

    // Validate batch input
    const batchError = validateBatchAvailabilityInput(body.patterns);
    if (batchError) {
      return batchError;
    }

    // Set defaults for effective dates
    const effectiveFrom = body.effectiveFrom
      ? new Date(body.effectiveFrom)
      : new Date();
    effectiveFrom.setHours(0, 0, 0, 0);

    const effectiveUntil = body.effectiveUntil
      ? new Date(body.effectiveUntil)
      : null;
    if (effectiveUntil) {
      effectiveUntil.setHours(0, 0, 0, 0);
    }

    // Validate effective dates
    const dateError = validateEffectiveDates(effectiveFrom, effectiveUntil);
    if (dateError) {
      return dateError;
    }

    // Verify employee exists and is active
    const { error: employeeError } = await verifyEmployee(
      tenantId,
      body.employeeId
    );
    if (employeeError) {
      return employeeError;
    }

    // Check for overlapping availability for each pattern
    const errors: Array<{
      pattern: { dayOfWeek: number; startTime: string; endTime: string };
      error: string;
    }> = [];

    for (const pattern of body.patterns) {
      const { hasOverlap } = await checkOverlappingAvailability(
        tenantId,
        body.employeeId,
        pattern.dayOfWeek,
        pattern.startTime,
        pattern.endTime,
        effectiveFrom,
        effectiveUntil
      );

      if (hasOverlap) {
        errors.push({
          pattern: {
            dayOfWeek: pattern.dayOfWeek,
            startTime: pattern.startTime,
            endTime: pattern.endTime,
          },
          error: "Overlapping availability exists for this day and time",
        });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: "Some patterns have overlapping availability",
          errors,
        },
        { status: 409 }
      );
    }

    try {
      // Create all availability records via Manifest runtime
      const user = await resolveCurrentUser(request);
      let created = 0;

      for (const pattern of body.patterns) {
        const [startHour, startMinute] = pattern.startTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = pattern.endTime.split(":").map(Number);

        // Build ISO datetime strings for @db.Time columns (GenericPrismaStore needs ISO, not bare HH:MM)
        const startTime = new Date(
          1970,
          0,
          1,
          startHour,
          startMinute,
          0,
          0
        ).toISOString();
        const endTime = new Date(
          1970,
          0,
          1,
          endHour,
          endMinute,
          0,
          0
        ).toISOString();

        const response = await runManifestCommand({
          entity: "EmployeeAvailability",
          command: "create",
          body: {
            employeeId: body.employeeId,
            dayOfWeek: pattern.dayOfWeek,
            startTime,
            endTime,
            isAvailable: pattern.isAvailable ?? true,
            effectiveFrom: effectiveFrom.toISOString().split("T")[0],
            effectiveUntil: effectiveUntil
              ? effectiveUntil.toISOString().split("T")[0]
              : "",
          },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
        });
        if (response.ok) {
          created++;
        } else {
          const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
          const message = typeof errorBody.message === "string" ? errorBody.message : `HTTP ${response.status}`;
          log.error(`[BatchAvailability] Manifest create failed for day ${pattern.dayOfWeek}: ${message}`);
          errors.push({
            pattern: {
              dayOfWeek: pattern.dayOfWeek,
              startTime: pattern.startTime,
              endTime: pattern.endTime,
            },
            error: `Create failed: ${message}`,
          });
        }
      }

      if (created === 0) {
        return NextResponse.json(
          { message: "Failed to create any availability records", errors },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: `Created ${created} availability records${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
          errors: errors.length > 0 ? errors : undefined,
        },
        { status: errors.length > 0 ? 207 : 201 }
      );
    } catch (error) {
      captureException(error);
      log.error("Error creating batch availability:", error);
      return NextResponse.json(
        { message: "Failed to create availability records" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
