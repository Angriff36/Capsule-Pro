/**
 * Inventory Audit Schedule Management API
 *
 * GET    /api/inventory/audit/schedule - List all audit schedules
 * POST   /api/inventory/audit/schedule - Create a new audit schedule via Manifest runtime
 * PATCH  /api/inventory/audit/schedule - Update an existing schedule via Manifest runtime
 * DELETE /api/inventory/audit/schedule - Soft delete a schedule via Manifest runtime
 *
 * Pre-validation (frequency, time format, day-of-week/month) is §10-compliant
 * read/validation — not governed writes. Only the final mutation routes through Manifest.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

// Valid frequency values
const VALID_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
type Frequency = (typeof VALID_FREQUENCIES)[number];

// Request body types
interface CreateScheduleBody {
  name: string;
  frequency: Frequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  time: string;
  isActive?: boolean;
}

interface UpdateScheduleBody {
  id: string;
  name?: string;
  frequency?: Frequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  time?: string;
  isActive?: boolean;
}

interface DeleteScheduleBody {
  id: string;
}

function isValidFrequency(value: unknown): value is Frequency {
  return (
    typeof value === "string" && VALID_FREQUENCIES.includes(value as Frequency)
  );
}

function isValidTime(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Validate HH:MM format (24-hour)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(value);
}

function isValidDayOfWeek(value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 6;
}

function isValidDayOfMonth(value: unknown): boolean {
  return typeof value === "number" && value >= 1 && value <= 31;
}

/**
 * GET /api/inventory/audit/schedule
 * List all audit schedules for the current tenant (read — bypasses Manifest per §10).
 */
export async function GET() {
  try {
    const tenantId = await requireTenantId();

    const schedules = await database.auditSchedule.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const mappedSchedules = schedules.map((schedule) => ({
      id: schedule.id,
      tenant_id: schedule.tenantId,
      name: schedule.name,
      frequency: schedule.frequency,
      day_of_week: schedule.dayOfWeek,
      day_of_month: schedule.dayOfMonth,
      time: schedule.time,
      is_active: schedule.isActive,
      created_by: schedule.createdBy,
      created_at: schedule.createdAt,
      updated_at: schedule.updatedAt,
    }));

    return NextResponse.json({ data: mappedSchedules });
  } catch (error) {
    captureException(error);
    log.error("Failed to get audit schedules", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/inventory/audit/schedule
 * Create a new audit schedule via Manifest runtime.
 * Input validation (frequency, time, day-of-week/month) is pre-processing per §10.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();
    const body: CreateScheduleBody = await request.json();

    // Validate required fields (pre-processing per §10)
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { message: "name is required and must be a string" },
        { status: 400 },
      );
    }

    if (!isValidFrequency(body.frequency)) {
      return NextResponse.json(
        {
          message: `frequency must be one of: ${VALID_FREQUENCIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!isValidTime(body.time)) {
      return NextResponse.json(
        { message: "time must be in HH:MM format (24-hour)" },
        { status: 400 },
      );
    }

    // Validate frequency-specific fields
    if (body.frequency === "weekly") {
      if (body.dayOfWeek === undefined || body.dayOfWeek === null) {
        return NextResponse.json(
          { message: "dayOfWeek is required for weekly frequency" },
          { status: 400 },
        );
      }
      if (!isValidDayOfWeek(body.dayOfWeek)) {
        return NextResponse.json(
          { message: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" },
          { status: 400 },
        );
      }
    }

    if (body.frequency === "monthly") {
      if (body.dayOfMonth === undefined || body.dayOfMonth === null) {
        return NextResponse.json(
          { message: "dayOfMonth is required for monthly frequency" },
          { status: 400 },
        );
      }
      if (!isValidDayOfMonth(body.dayOfMonth)) {
        return NextResponse.json(
          { message: "dayOfMonth must be between 1 and 31" },
          { status: 400 },
        );
      }
    }

    // Delegate creation to Manifest runtime
    return runManifestCommand({
      entity: "AuditSchedule",
      command: "create",
      body: {
        name: body.name,
        frequency: body.frequency,
        dayOfWeek: body.dayOfWeek ?? null,
        dayOfMonth: body.dayOfMonth ?? null,
        time: body.time,
        isActive: body.isActive ?? true,
        createdBy: user.id,
      },
      user: { id: user.id, tenantId, role: user.role ?? "" },
    });
  } catch (error) {
    captureException(error);
    log.error("Failed to create audit schedule", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/inventory/audit/schedule
 * Update an existing audit schedule via Manifest runtime.
 * Pre-validation reads and field validation are §10-compliant.
 */
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();
    const body: UpdateScheduleBody = await request.json();

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { message: "id is required and must be a string" },
        { status: 400 },
      );
    }

    // Pre-validation: check schedule exists (read per §10)
    const existing = await database.auditSchedule.findFirst({
      where: {
        tenantId,
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Audit schedule not found" },
        { status: 404 },
      );
    }

    // Validate provided fields (pre-processing per §10)
    if (body.name !== undefined && typeof body.name !== "string") {
      return NextResponse.json(
        { message: "name must be a string" },
        { status: 400 },
      );
    }

    if (body.frequency !== undefined && !isValidFrequency(body.frequency)) {
      return NextResponse.json(
        {
          message: `frequency must be one of: ${VALID_FREQUENCIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (body.time !== undefined && !isValidTime(body.time)) {
      return NextResponse.json(
        { message: "time must be in HH:MM format (24-hour)" },
        { status: 400 },
      );
    }

    if (
      body.dayOfWeek !== undefined &&
      body.dayOfWeek !== null &&
      !isValidDayOfWeek(body.dayOfWeek)
    ) {
      return NextResponse.json(
        { message: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" },
        { status: 400 },
      );
    }

    if (
      body.dayOfMonth !== undefined &&
      body.dayOfMonth !== null &&
      !isValidDayOfMonth(body.dayOfMonth)
    ) {
      return NextResponse.json(
        { message: "dayOfMonth must be between 1 and 31" },
        { status: 400 },
      );
    }

    if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { message: "isActive must be a boolean" },
        { status: 400 },
      );
    }

    // Build command body — only include fields that were provided
    const commandBody: Record<string, unknown> = {};
    if (body.name !== undefined) commandBody.name = body.name;
    if (body.frequency !== undefined) commandBody.frequency = body.frequency;
    if (body.time !== undefined) commandBody.time = body.time;
    if (body.dayOfWeek !== undefined) commandBody.dayOfWeek = body.dayOfWeek;
    if (body.dayOfMonth !== undefined) commandBody.dayOfMonth = body.dayOfMonth;
    if (body.isActive !== undefined) commandBody.isActive = body.isActive;

    // Delegate update to Manifest runtime
    return runManifestCommand({
      entity: "AuditSchedule",
      command: "update",
      body: commandBody,
      user: { id: user.id, tenantId, role: user.role ?? "" },
      instanceId: body.id,
    });
  } catch (error) {
    captureException(error);
    log.error("Failed to update audit schedule", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/inventory/audit/schedule
 * Soft delete an audit schedule via Manifest runtime (deactivate command).
 * Pre-validation read is §10-compliant.
 */
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();
    const body: DeleteScheduleBody = await request.json();

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { message: "id is required and must be a string" },
        { status: 400 },
      );
    }

    // Pre-validation: check schedule exists (read per §10)
    const existing = await database.auditSchedule.findFirst({
      where: {
        tenantId,
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Audit schedule not found" },
        { status: 404 },
      );
    }

    // Delegate soft-delete to Manifest runtime (deactivate)
    return runManifestCommand({
      entity: "AuditSchedule",
      command: "deactivate",
      body: {},
      user: { id: user.id, tenantId, role: user.role ?? "" },
      instanceId: body.id,
    });
  } catch (error) {
    captureException(error);
    log.error("Failed to delete audit schedule", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
