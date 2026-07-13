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
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit } from "@/lib/pagination";

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
  return d.toISOString().split("T")[0] ?? ""; // YYYY-MM-DD
}

/**
 * Generate CSV rows from events
 */
function generateCSVRows(
  events: Array<{
    id: string;
    eventNumber: string | null;
    title: string;
    eventDate: Date;
    eventType: string;
    status: string;
    guestCount: number;
    venueName: string | null;
    venueAddress: string | null;
    budget: number | null;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  }>,
  filters: {
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    eventType: string | null;
    venueId: string | null;
    search: string | null;
  }
): string[] {
  const rows: string[] = [];

  // Add BOM for Excel UTF-8 compatibility
  rows.push("\uFEFF");

  // Header row
  rows.push(
    "Event ID,Event Number,Title,Date,Type,Status,Guest Count,Venue,Address,Budget,Tags,Created,Updated"
  );

  // Data rows
  for (const event of events) {
    rows.push(
      [
        escapeCSV(event.id),
        escapeCSV(event.eventNumber),
        escapeCSV(event.title),
        formatDateForCSV(event.eventDate),
        escapeCSV(event.eventType),
        escapeCSV(event.status),
        escapeCSV(event.guestCount),
        escapeCSV(event.venueName),
        escapeCSV(event.venueAddress),
        escapeCSV(event.budget),
        escapeCSV(event.tags.join("; ")),
        formatDateForCSV(event.createdAt),
        formatDateForCSV(event.updatedAt),
      ].join(",")
    );
  }

  // Summary row
  rows.push(""); // Empty row
  rows.push("Summary");
  rows.push(`Total Events Exported,${events.length}`);
  rows.push(`Export Date,${formatDateForCSV(new Date())}`);
  rows.push(
    `Filters Applied,${Object.entries({
      start_date: filters.startDate || "N/A",
      end_date: filters.endDate || "N/A",
      status: filters.status || "N/A",
      event_type: filters.eventType || "N/A",
      venue_id: filters.venueId || "N/A",
      search: filters.search || "N/A",
    })
      .filter(([, v]) => v !== "N/A")
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ")}`
  );

  return rows;
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
    const shouldDownload = url.searchParams.get("download") === "true";

    const limit = clampLimit(url.searchParams.get("limit"), 5000, 1000);

    // Build Prisma where clause
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      const eventDateFilter: Record<string, Date> = {};
      if (startDate) {
        eventDateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        eventDateFilter.lte = new Date(endDate);
      }
      where.eventDate = eventDateFilter;
    }

    if (status) {
      where.status = status;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (venueId) {
      where.venueId = venueId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { eventNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch events with pagination via Prisma ORM. Select only the columns
    // emitted to the CSV (see generateCSVRows) — avoids pulling the full row
    // (heavy Text/JSON columns like description) for every exported event.
    const rawEvents = await database.event.findMany({
      where,
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        eventNumber: true,
        title: true,
        eventDate: true,
        eventType: true,
        status: true,
        guestCount: true,
        venueName: true,
        venueAddress: true,
        budget: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Map Prisma result (camelCase) to the shape expected by generateCSVRows
    const events = rawEvents.map((e) => ({
      id: e.id,
      eventNumber: e.eventNumber,
      title: e.title,
      eventDate: e.eventDate,
      eventType: e.eventType,
      status: e.status,
      guestCount: e.guestCount,
      venueName: e.venueName,
      venueAddress: e.venueAddress,
      budget: e.budget ? Number(e.budget) : null,
      tags: e.tags,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    if (events.length === 0) {
      return NextResponse.json(
        { error: "No events found matching criteria" },
        { status: 404 }
      );
    }

    // Build CSV content
    const csvRows = generateCSVRows(events, {
      startDate,
      endDate,
      status,
      eventType,
      venueId,
      search,
    });
    const csvContent = csvRows.join("\n");

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `events-export-${timestamp}.csv`;

    if (shouldDownload) {
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

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
    captureException(error);
    log.error("Failed to export events CSV:", error);
    return NextResponse.json(
      {
        error: "Failed to export events",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
