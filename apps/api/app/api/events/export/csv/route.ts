/**
 * @module EventsExportCSV
 * @intent Export multiple events to CSV format
 * @responsibility Generate CSV export for filtered event lists
 * @domain Events
 * @tags events, export, csv
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * GET /api/events/export/csv
 *
 * Export filtered event list to CSV format.
 *
 * Query parameters:
 * - start_date: string - Filter events from this date (YYYY-MM-DD)
 * - end_date: string - Filter events until this date (YYYY-MM-DD)
 * - status: string - Filter by event status (draft,confirmed,completed,cancelled)
 * - event_type: string - Filter by event type
 * - venue_id: string - Filter by venue ID
 * - search: string - Search in event title or event number
 * - limit: number - Maximum events to export (default: 1000)
 * - download: boolean - If true, returns as downloadable file; otherwise as JSON
 *
 * @example
 * // Export all confirmed events in 2024
 * GET /api/events/export/csv?start_date=2024-01-01&end_date=2024-12-31&status=confirmed
 *
 * @example
 * // Export events for a specific venue
 * GET /api/events/export/csv?venue_id=abc-123&download=true
 */
export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Parse query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const status = url.searchParams.get("status");
    const eventType = url.searchParams.get("event_type");
    const venueId = url.searchParams.get("venue_id");
    const search = url.searchParams.get("search");
    const limitParam = url.searchParams.get("limit") || "1000";
    const shouldDownload = url.searchParams.get("download") === "true";

    const limit = Math.min(Number.parseInt(limitParam, 10), 5000); // Cap at 5000

    // Build where clause
    const whereConditions: string[] = ["tenant_id = $1", "deleted_at IS NULL"];
    const queryParams: (string | Date | number)[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      whereConditions.push(`event_date >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`event_date <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (eventType) {
      whereConditions.push(`event_type = $${paramIndex++}`);
      queryParams.push(eventType);
    }

    if (venueId) {
      whereConditions.push(`venue_id = $${paramIndex++}`);
      queryParams.push(venueId);
    }

    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex++} OR event_number ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Fetch events with pagination
    const events = await database.$queryRawUnsafe<
      Array<{
        id: string;
        event_number: string | null;
        title: string;
        event_date: Date;
        event_type: string;
        status: string;
        guest_count: number;
        venue_name: string | null;
        venue_address: string | null;
        budget: number | null;
        notes: string | null;
        tags: string[];
        created_at: Date;
        updated_at: Date;
      }>
    >(
      `SELECT
          id,
          event_number,
          title,
          event_date,
          event_type,
          status,
          guest_count,
          venue_name,
          venue_address,
          budget,
          notes,
          tags,
          created_at,
          updated_at
        FROM tenant_events.events
        WHERE ${whereClause}
        ORDER BY event_date DESC, created_at DESC
        LIMIT $${paramIndex++}`,
      ...queryParams,
      limit
    );

    if (events.length === 0) {
      return NextResponse.json({ error: "No events found matching criteria" }, { status: 404 });
    }

    // Build CSV content
    const csvRows: string[] = [];

    // Add BOM for Excel UTF-8 compatibility
    csvRows.push("\uFEFF");

    // Header row
    csvRows.push(
      "Event ID,Event Number,Title,Date,Type,Status,Guest Count,Venue,Address,Budget,Tags,Created,Updated"
    );

    // Data rows
    for (const event of events) {
      csvRows.push(
        [
          escapeCSV(event.id),
          escapeCSV(event.event_number),
          escapeCSV(event.title),
          formatDateForCSV(event.event_date),
          escapeCSV(event.event_type),
          escapeCSV(event.status),
          escapeCSV(event.guest_count),
          escapeCSV(event.venue_name),
          escapeCSV(event.venue_address),
          escapeCSV(event.budget),
          escapeCSV(event.tags.join("; ")),
          formatDateForCSV(event.created_at),
          formatDateForCSV(event.updated_at),
        ].join(",")
      );
    }

    // Summary row
    csvRows.push(""); // Empty row
    csvRows.push("Summary");
    csvRows.push(`Total Events Exported,${events.length}`);
    csvRows.push(`Export Date,${formatDateForCSV(new Date())}`);
    csvRows.push(`Filters Applied,${Object.entries({
      start_date: startDate || "N/A",
      end_date: endDate || "N/A",
      status: status || "N/A",
      event_type: eventType || "N/A",
      venue_id: venueId || "N/A",
      search: search || "N/A",
    })
      .filter(([_, v]) => v !== "N/A")
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ")}`);

    // Combine rows with newlines
    const csvContent = csvRows.join("\n");

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `events-export-${timestamp}.csv`;

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
      eventsExported: events.length,
      filters: {
        start_date: startDate,
        end_date: endDate,
        status,
        event_type: eventType,
        venue_id: venueId,
        search,
      },
    });
  } catch (error) {
    console.error("Failed to export events CSV:", error);
    return NextResponse.json(
      {
        error: "Failed to export events",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
