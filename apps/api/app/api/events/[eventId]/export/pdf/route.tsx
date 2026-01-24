/**
 * @module EventExportPDF
 * @intent Export event details to PDF format
 * @responsibility Generate PDF export for a single event
 * @domain Events
 * @tags events, export, pdf
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { EventDetailPDF } from "@repo/pdf";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  eventId: string;
}>;

/**
 * GET /api/events/[eventId]/export/pdf
 *
 * Generate a PDF export of event details.
 *
 * Query parameters:
 * - include: string - Comma-separated list of sections to include (summary,menu,staff,guests,tasks)
 *   Default: "summary,menu,staff"
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
export async function GET(
  request: NextRequest,
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
    const includeParam = url.searchParams.get("include") || "summary,menu,staff";
    const sections = includeParam.split(",").map((s) => s.trim());
    const shouldDownload = url.searchParams.get("download") === "true";

    const includeSummary = sections.includes("summary");
    const includeMenu = sections.includes("menu");
    const includeStaff = sections.includes("staff");
    const includeGuests = sections.includes("guests");
    const includeTasks = sections.includes("tasks");

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

    // Prepare data for PDF
    const pdfData: {
      event: {
        id: string;
        name: string;
        date: Date | string;
        type: string;
        status: string;
        guestCount: number;
        venue: string | null;
        address: string | null;
        budget: number | null;
        notes: string | null;
        tags: string[];
      };
      dishes?: Array<{
        name: string;
        servings: number;
        instructions: string | null;
      }>;
      tasks?: Array<{
        title: string;
        assignee: string | null;
        startTime: string;
        endTime: string;
        status: string;
        priority: string;
        notes: string | null;
      }>;
      guests?: Array<{
        name: string;
        dietaryRestrictions: string | null;
        mealChoice: string | null;
        tableNumber: string | null;
      }>;
      staff?: Array<{
        name: string;
        role: string | null;
        assignments: number;
      }>;
      metadata: {
        generatedAt: Date;
        generatedBy: string;
        version: string;
      };
    } = {
      event: {
        id: event.id,
        name: event.title,
        date: event.eventDate,
        type: event.eventType,
        status: event.status,
        guestCount: event.guestCount,
        venue: event.venueName,
        address: event.venueAddress,
        budget: event.budget ? Number(event.budget) : null,
        notes: event.notes,
        tags: event.tags,
      },
      metadata: {
        generatedAt: new Date(),
        generatedBy: userId,
        version: "1.0.0",
      },
    };

    // Fetch dishes if requested
    if (includeMenu) {
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

      pdfData.dishes = dishes.map((d) => ({
        name: d.dish_name,
        servings: d.quantity_servings,
        instructions: d.special_instructions,
      }));
    }

    // Fetch tasks if requested
    if (includeTasks) {
      const tasks = await database.$queryRawUnsafe<
        Array<{
          title: string;
          assignee_name: string | null;
          start_time: string;
          end_time: string;
          status: string;
          priority: string;
          notes: string | null;
        }>
      >(
        `SELECT
            t.title,
            u.first_name || ' ' || u.last_name as assignee_name,
            t.start_time,
            t.end_time,
            t.status,
            t.priority,
            t.notes
          FROM tenant_events.timeline_tasks t
          LEFT JOIN tenant_staff.employees u ON u.tenant_id = t.tenant_id AND u.id = t.assignee_id
          WHERE t.tenant_id = $1
            AND t.event_id = $2
            AND t.deleted_at IS NULL
          ORDER BY t.start_time ASC`,
        tenantId,
        eventId
      );

      pdfData.tasks = tasks.map((t) => ({
        title: t.title,
        assignee: t.assignee_name,
        startTime: t.start_time,
        endTime: t.end_time,
        status: t.status,
        priority: t.priority,
        notes: t.notes,
      }));
    }

    // Fetch guests if requested
    if (includeGuests) {
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

      pdfData.guests = guests.map((g) => ({
        name: g.guest_name,
        dietaryRestrictions: g.dietary_restrictions,
        mealChoice: g.meal_choice,
        tableNumber: g.table_number,
      }));
    }

    // Fetch staff if requested
    if (includeStaff) {
      const staff = await database.$queryRawUnsafe<
        Array<{
          name: string;
          role: string | null;
          assignment_count: bigint;
        }>
      >(
        `SELECT
            u.first_name || ' ' || u.last_name as name,
            u.role,
            COUNT(DISTINCT t.id) as assignment_count
          FROM tenant_staff.employees u
          LEFT JOIN tenant_events.timeline_tasks t ON t.tenant_id = u.tenant_id AND t.assignee_id = u.id AND t.deleted_at IS NULL
          WHERE u.tenant_id = $1
            AND u.deleted_at IS NULL
          GROUP BY u.id, u.first_name, u.last_name, u.role
          HAVING COUNT(DISTINCT t.id) > 0
          ORDER BY u.first_name, u.last_name`,
        tenantId
      );

      pdfData.staff = staff.map((s) => ({
        name: s.name,
        role: s.role,
        assignments: Number(s.assignment_count),
      }));
    }

    // Fetch user info for metadata
    const user = await database.user.findFirst({
      where: {
        tenantId,
        authUserId: userId,
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (user) {
      pdfData.metadata.generatedBy = user.email || `${user.firstName} ${user.lastName}`;
    }

    const pdfComponent = <EventDetailPDF data={pdfData} />;

    if (shouldDownload) {
      // Return as downloadable file
      const { pdf } = await import("@react-pdf/renderer");
      const doc = await pdf(pdfComponent);
      const blob = await doc.toBlob();

      const sanitizedTitle = event.title
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()
        .replace(/^-+|-+$/g, "");

      return new NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="event-${sanitizedTitle}-${event.id.slice(0, 8)}.pdf"`,
        },
      });
    }

    // Return as base64 for client-side handling
    const { pdf } = await import("@react-pdf/renderer");
    const doc = await pdf(pdfComponent);
    const blob = await doc.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    const sanitizedTitle = event.title
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .replace(/^-+|-+$/g, "");

    return NextResponse.json({
      dataUrl: `data:application/pdf;base64,${base64}`,
      filename: `event-${sanitizedTitle}-${event.id.slice(0, 8)}.pdf`,
    });
  } catch (error) {
    console.error("Failed to generate Event PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
