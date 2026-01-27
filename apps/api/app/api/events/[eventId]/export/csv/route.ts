/**
 * @module EventExportCSV
 * @intent Export event data to CSV format
 * @responsibility Generate CSV export for a single event
 * @domain Events
 * @tags events, export, csv
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import type { Database } from "@repo/database";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type RouteParams = Promise<{
  eventId: string;
}>;

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const strValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    strValue.includes(",") ||
    strValue.includes('"') ||
    strValue.includes("\n")
  ) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

/**
 * Helper function to convert date to CSV-safe format
 */
function formatDateForCSV(date: Date | string | null): string {
  if (!date) {
    return "";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Helper function to build event summary section
 */
function buildEventSummarySection(
  event: Awaited<ReturnType<typeof database.event.findUnique>>
): string[] {
  if (!event) {
    return [];
  }
  const rows: string[] = [];
  rows.push("Event Summary");
  rows.push("Field,Value");
  rows.push(`Event ID,${escapeCSV(event.id)}`);
  rows.push(`Event Number,${escapeCSV(event.eventNumber || "")}`);
  rows.push(`Title,${escapeCSV(event.title)}`);
  rows.push(`Date,${formatDateForCSV(event.eventDate)}`);
  rows.push(`Type,${escapeCSV(event.eventType)}`);
  rows.push(`Status,${escapeCSV(event.status)}`);
  rows.push(`Guest Count,${escapeCSV(event.guestCount)}`);
  rows.push(`Venue,${escapeCSV(event.venueName || "")}`);
  rows.push(`Address,${escapeCSV(event.venueAddress || "")}`);
  rows.push(`Budget,${escapeCSV(event.budget?.toString() || "")}`);
  rows.push(`Notes,${escapeCSV(event.notes || "")}`);
  rows.push(`Tags,${escapeCSV(event.tags.join("; "))}`);
  rows.push(`Created,${formatDateForCSV(event.createdAt)}`);
  rows.push(`Updated,${formatDateForCSV(event.updatedAt)}`);
  rows.push(""); // Empty row separator
  return rows;
}

/**
 * Helper function to build menu/dishes section
 */
async function buildMenuSection(
  database: Database,
  tenantId: string,
  eventId: string
): Promise<string[]> {
  const rows: string[] = [];

  const dishes = await database.$queryRawUnsafe<
    Array<{
      dish_name: string;
      quantity_servings: number;
      special_instructions: string | null;
    }>
  >(
    `SELECT
        d.name as dish_name,
        ed.quantity_servings,
        ed.special_instructions
      FROM tenant_events.event_dishes ed
      JOIN tenant_kitchen.dishes d ON d.id = ed.dish_id
      WHERE ed.tenant_id = $1
        AND ed.event_id = $2
        AND ed.deleted_at IS NULL
      ORDER BY d.name`,
    tenantId,
    eventId
  );

  if (dishes.length > 0) {
    rows.push("Menu / Dishes");
    rows.push("Dish Name,Servings,Special Instructions");
    for (const dish of dishes) {
      rows.push(
        `${escapeCSV(dish.dish_name)},${escapeCSV(dish.quantity_servings)},${escapeCSV(dish.special_instructions)}`
      );
    }
    rows.push("");
  }

  return rows;
}

/**
 * Helper function to build staff assignments section
 */
async function buildStaffSection(
  database: Database,
  tenantId: string,
  eventId: string
): Promise<string[]> {
  const rows: string[] = [];

  const tasks = await database.$queryRawUnsafe<
    Array<{
      title: string;
      assignee_name: string;
      start_time: string;
      end_time: string;
      status: string;
      priority: string;
    }>
  >(
    `SELECT
        t.title,
        u.first_name || ' ' || u.last_name as assignee_name,
        t.start_time,
        t.end_time,
        t.status,
        t.priority
      FROM tenant_events.timeline_tasks t
      LEFT JOIN tenant_staff.employees u ON u.tenant_id = t.tenant_id AND u.id = t.assignee_id
      WHERE t.tenant_id = $1
        AND t.event_id = $2
        AND t.deleted_at IS NULL
      ORDER BY t.start_time ASC`,
    tenantId,
    eventId
  );

  if (tasks.length > 0) {
    rows.push("Staff Assignments");
    rows.push("Task,Assigned To,Start Time,End Time,Status,Priority");
    for (const task of tasks) {
      rows.push(
        `${escapeCSV(task.title)},${escapeCSV(task.assignee_name || "")},${escapeCSV(task.start_time)},${escapeCSV(task.end_time)},${escapeCSV(task.status)},${escapeCSV(task.priority)}`
      );
    }
    rows.push("");
  }

  return rows;
}

/**
 * Helper function to build guest list section
 */
async function buildGuestsSection(
  database: Database,
  tenantId: string,
  eventId: string
): Promise<string[]> {
  const rows: string[] = [];

  const guests = await database.$queryRawUnsafe<
    Array<{
      guest_name: string;
      dietary_restrictions: string | null;
      meal_choice: string | null;
      table_number: string | null;
    }>
  >(
    `SELECT
        name as guest_name,
        dietary_restrictions,
        meal_choice,
        table_number
      FROM tenant_events.event_guests
      WHERE tenant_id = $1
        AND event_id = $2
        AND deleted_at IS NULL
      ORDER BY table_number NULLS LAST, name`,
    tenantId,
    eventId
  );

  if (guests.length > 0) {
    rows.push("Guest List");
    rows.push("Guest Name,Dietary Restrictions,Meal Choice,Table Number");
    for (const guest of guests) {
      rows.push(
        `${escapeCSV(guest.guest_name)},${escapeCSV(guest.dietary_restrictions)},${escapeCSV(guest.meal_choice)},${escapeCSV(guest.table_number)}`
      );
    }
    rows.push("");
  }

  return rows;
}

/**
 * Helper function to generate CSV filename
 */
function generateFilename(
  event: Awaited<ReturnType<typeof database.event.findUnique>>
): string {
  if (!event) {
    return "event-unknown.csv";
  }
  const sanitizedTitle = event.title
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
  return `event-${sanitizedTitle}-${event.id.slice(0, 8)}.csv`;
}

/**
 * GET /api/events/[eventId]/export/csv
 *
 * Export event data to CSV format.
 *
 * Query parameters:
 * - include: string - Comma-separated list of sections to include (summary,menu,staff,guests)
 *   Default: "summary"
 * - download: boolean - If true, returns as downloadable file; otherwise as text
 */
export async function GET(
  request: Request,
  { params }: { params: RouteParams }
) {
  try {
    const { eventId } = await params;
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Parse include parameter
    const url = new URL(request.url);
    const includeParam = url.searchParams.get("include") || "summary";
    const sections = includeParam.split(",").map((s) => s.trim());
    const shouldDownload = url.searchParams.get("download") === "true";

    // Fetch event details
    const event = await database.event.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: eventId,
        },
      },
    });

    if (!event || event.deletedAt) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Build CSV content
    const csvRows: string[] = [];

    // Add BOM for Excel UTF-8 compatibility
    csvRows.push("\uFEFF");

    // Always include event summary
    csvRows.push(...buildEventSummarySection(event));

    // Build additional sections based on query parameters
    if (sections.includes("menu")) {
      csvRows.push(...(await buildMenuSection(database, tenantId, eventId)));
    }

    if (sections.includes("staff")) {
      csvRows.push(...(await buildStaffSection(database, tenantId, eventId)));
    }

    if (sections.includes("guests")) {
      csvRows.push(...(await buildGuestsSection(database, tenantId, eventId)));
    }

    // Combine rows with newlines
    const csvContent = csvRows.join("\n");

    // Generate filename
    const filename = generateFilename(event);

    if (shouldDownload) {
      // Return as downloadable file
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Return as JSON with content
    return NextResponse.json({
      filename,
      content: csvContent,
      contentType: "text/csv; charset=utf-8",
    });
  } catch (error) {
    console.error("Failed to export event CSV:", error);
    return NextResponse.json(
      {
        error: "Failed to export event",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
