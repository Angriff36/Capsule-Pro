/**
 * Inventory Audit Schedule Management API
 *
 * GET    /api/inventory/audit/schedule - List all audit schedules
 * POST   /api/inventory/audit/schedule - Create a new audit schedule
 * PATCH  /api/inventory/audit/schedule - Update an existing schedule
 * DELETE /api/inventory/audit/schedule - Remove a schedule (soft delete)
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";

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
    typeof value === "string" &&
    VALID_FREQUENCIES.includes(value as Frequency)
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
 * List all audit schedules for the current tenant
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
    console.error("Failed to get audit schedules:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/audit/schedule
 * Create a new audit schedule
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();
    const body: CreateScheduleBody = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { message: "name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!isValidFrequency(body.frequency)) {
      return NextResponse.json(
        { message: `frequency must be one of: ${VALID_FREQUENCIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isValidTime(body.time)) {
      return NextResponse.json(
        { message: "time must be in HH:MM format (24-hour)" },
        { status: 400 }
      );
    }

    // Validate frequency-specific fields
    if (body.frequency === "weekly") {
      if (body.dayOfWeek === undefined || body.dayOfWeek === null) {
        return NextResponse.json(
          { message: "dayOfWeek is required for weekly frequency" },
          { status: 400 }
        );
      }
      if (!isValidDayOfWeek(body.dayOfWeek)) {
        return NextResponse.json(
          { message: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" },
          { status: 400 }
        );
      }
    }

    if (body.frequency === "monthly") {
      if (body.dayOfMonth === undefined || body.dayOfMonth === null) {
        return NextResponse.json(
          { message: "dayOfMonth is required for monthly frequency" },
          { status: 400 }
        );
      }
      if (!isValidDayOfMonth(body.dayOfMonth)) {
        return NextResponse.json(
          { message: "dayOfMonth must be between 1 and 31" },
          { status: 400 }
        );
      }
    }

    const schedule = await database.auditSchedule.create({
      data: {
        tenantId,
        name: body.name,
        frequency: body.frequency,
        dayOfWeek: body.dayOfWeek ?? null,
        dayOfMonth: body.dayOfMonth ?? null,
        time: body.time,
        isActive: body.isActive ?? true,
        createdBy: user.id,
      },
    });

    return NextResponse.json(
      {
        data: {
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
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create audit schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/audit/schedule
 * Update an existing audit schedule
 */
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body: UpdateScheduleBody = await request.json();

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { message: "id is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if schedule exists and belongs to tenant
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
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return NextResponse.json(
          { message: "name must be a string" },
          { status: 400 }
        );
      }
      updateData.name = body.name;
    }

    if (body.frequency !== undefined) {
      if (!isValidFrequency(body.frequency)) {
        return NextResponse.json(
          { message: `frequency must be one of: ${VALID_FREQUENCIES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.frequency = body.frequency;
    }

    if (body.time !== undefined) {
      if (!isValidTime(body.time)) {
        return NextResponse.json(
          { message: "time must be in HH:MM format (24-hour)" },
          { status: 400 }
        );
      }
      updateData.time = body.time;
    }

    if (body.dayOfWeek !== undefined) {
      if (body.dayOfWeek !== null && !isValidDayOfWeek(body.dayOfWeek)) {
        return NextResponse.json(
          { message: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" },
          { status: 400 }
        );
      }
      updateData.dayOfWeek = body.dayOfWeek;
    }

    if (body.dayOfMonth !== undefined) {
      if (body.dayOfMonth !== null && !isValidDayOfMonth(body.dayOfMonth)) {
        return NextResponse.json(
          { message: "dayOfMonth must be between 1 and 31" },
          { status: 400 }
        );
      }
      updateData.dayOfMonth = body.dayOfMonth;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { message: "isActive must be a boolean" },
          { status: 400 }
        );
      }
      updateData.isActive = body.isActive;
    }

    const schedule = await database.auditSchedule.update({
      where: {
        tenantId_id: {
          tenantId,
          id: body.id,
        },
      },
      data: updateData,
    });

    return NextResponse.json({
      data: {
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
      },
    });
  } catch (error) {
    console.error("Failed to update audit schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/audit/schedule
 * Soft delete an audit schedule
 */
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body: DeleteScheduleBody = await request.json();

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { message: "id is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if schedule exists and belongs to tenant
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
        { status: 404 }
      );
    }

    // Soft delete
    await database.auditSchedule.update({
      where: {
        tenantId_id: {
          tenantId,
          id: body.id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete audit schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
