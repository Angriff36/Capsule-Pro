/**
 * @module EventExportCSV
 * @intent Export event data to CSV format
 * @responsibility Generate CSV export for a single event
 * @domain Events
 * @tags events, export, csv
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * Helper function to escape CSV values
 */
function escapeCSV(value) {
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
function formatDateForCSV(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
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
async function GET(request, { params }) {
  try {
    const { eventId } = await params;
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Parse include parameter
    const url = new URL(request.url);
    const includeParam = url.searchParams.get("include") || "summary";
    const sections = includeParam.split(",").map((s) => s.trim());
    const shouldDownload = url.searchParams.get("download") === "true";
    // Fetch event details
    const event = await database_1.database.event.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: eventId,
        },
      },
    });
    if (!event || event.deletedAt) {
      return server_2.NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }
    // Build CSV content
    const csvRows = [];
    // Add BOM for Excel UTF-8 compatibility
    csvRows.push("\uFEFF");
    // Section 1: Event Summary (always included)
    csvRows.push("Event Summary");
    csvRows.push("Field,Value");
    csvRows.push(`Event ID,${escapeCSV(event.id)}`);
    csvRows.push(`Event Number,${escapeCSV(event.eventNumber || "")}`);
    csvRows.push(`Title,${escapeCSV(event.title)}`);
    csvRows.push(`Date,${formatDateForCSV(event.eventDate)}`);
    csvRows.push(`Type,${escapeCSV(event.eventType)}`);
    csvRows.push(`Status,${escapeCSV(event.status)}`);
    csvRows.push(`Guest Count,${escapeCSV(event.guestCount)}`);
    csvRows.push(`Venue,${escapeCSV(event.venueName || "")}`);
    csvRows.push(`Address,${escapeCSV(event.venueAddress || "")}`);
    csvRows.push(`Budget,${escapeCSV(event.budget?.toString() || "")}`);
    csvRows.push(`Notes,${escapeCSV(event.notes || "")}`);
    csvRows.push(`Tags,${escapeCSV(event.tags.join("; "))}`);
    csvRows.push(`Created,${formatDateForCSV(event.createdAt)}`);
    csvRows.push(`Updated,${formatDateForCSV(event.updatedAt)}`);
    csvRows.push(""); // Empty row separator
    // Section 2: Menu/Dishes (if requested)
    if (sections.includes("menu")) {
      const dishes = await database_1.database.$queryRawUnsafe(
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
        csvRows.push("Menu / Dishes");
        csvRows.push("Dish Name,Servings,Special Instructions");
        for (const dish of dishes) {
          csvRows.push(
            `${escapeCSV(dish.dish_name)},${escapeCSV(dish.quantity_servings)},${escapeCSV(dish.special_instructions)}`
          );
        }
        csvRows.push("");
      }
    }
    // Section 3: Staff Assignments (if requested)
    if (sections.includes("staff")) {
      const tasks = await database_1.database.$queryRawUnsafe(
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
        csvRows.push("Staff Assignments");
        csvRows.push("Task,Assigned To,Start Time,End Time,Status,Priority");
        for (const task of tasks) {
          csvRows.push(
            `${escapeCSV(task.title)},${escapeCSV(task.assignee_name || "")},${escapeCSV(task.start_time)},${escapeCSV(task.end_time)},${escapeCSV(task.status)},${escapeCSV(task.priority)}`
          );
        }
        csvRows.push("");
      }
    }
    // Section 4: Guest List (if requested)
    if (sections.includes("guests")) {
      const guests = await database_1.database.$queryRawUnsafe(
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
        csvRows.push("Guest List");
        csvRows.push(
          "Guest Name,Dietary Restrictions,Meal Choice,Table Number"
        );
        for (const guest of guests) {
          csvRows.push(
            `${escapeCSV(guest.guest_name)},${escapeCSV(guest.dietary_restrictions)},${escapeCSV(guest.meal_choice)},${escapeCSV(guest.table_number)}`
          );
        }
        csvRows.push("");
      }
    }
    // Combine rows with newlines
    const csvContent = csvRows.join("\n");
    // Generate filename
    const sanitizedTitle = event.title
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .replace(/^-+|-+$/g, "");
    const filename = `event-${sanitizedTitle}-${event.id.slice(0, 8)}.csv`;
    if (shouldDownload) {
      // Return as downloadable file
      return new server_2.NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    // Return as JSON with content
    return server_2.NextResponse.json({
      filename,
      content: csvContent,
      contentType: "text/csv; charset=utf-8",
    });
  } catch (error) {
    console.error("Failed to export event CSV:", error);
    return server_2.NextResponse.json(
      {
        error: "Failed to export event",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
