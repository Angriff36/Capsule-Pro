Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const pdf_1 = require("@repo/pdf");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
exports.runtime = "nodejs";
/**
 * GET /api/events/[eventId]/battle-board/pdf
 *
 * Generate a PDF export of the Battle Board for an event.
 *
 * Query parameters:
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
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
    // Fetch event details
    // TODO: Add client, venue relations to Prisma schema
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
    // Fetch timeline tasks with staff assignments
    const tasks = await database_1.database.$queryRawUnsafe(
      `SELECT
          t.id,
          t.title,
          t.description,
          t.start_time,
          t.end_time,
          t.status,
          t.priority,
          t.category,
          t.assignee_id,
          u.first_name || ' ' || u.last_name as assignee_name,
          t.progress,
          COALESCE(t.dependencies, ARRAY[]::text[]) as dependencies,
          t.is_on_critical_path,
          t.slack_minutes,
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
    // Fetch staff with assignment counts
    const staff = await database_1.database.$queryRawUnsafe(
      `SELECT
          u.id,
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
    // Fetch user info for metadata
    const user = await database_1.database.user.findFirst({
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
    if (!user) {
      return server_2.NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    // Prepare PDF data
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === "completed"
    ).length;
    const pendingTasks = totalTasks - completedTasks;
    const pdfData = {
      event: {
        id: event.id,
        name: event.title,
        date: event.eventDate,
        venue: event.venueName,
        address: event.venueAddress,
        clientName: undefined, // TODO: Fetch from client relation when added
      },
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        startTime: new Date(task.start_time),
        endTime: new Date(task.end_time),
        status: task.status,
        priority: task.priority,
        category: task.category || undefined,
        assignee: task.assignee_name || undefined,
        progress: task.progress,
        dependencies: task.dependencies,
        isOnCriticalPath: task.is_on_critical_path,
        slackMinutes: task.slack_minutes,
        notes: task.notes || undefined,
      })),
      summary: {
        totalTasks,
        completedTasks,
        pendingTasks,
      },
      staff: staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role || undefined,
        assignments: Number(s.assignment_count),
      })),
      metadata: {
        generatedAt: new Date(),
        generatedBy: user.email || `${user.firstName} ${user.lastName}`,
        version: "1.0.0",
      },
    };
    // Check if should return as download or base64
    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";
    // @ts-expect-error - React-PDF renderer needs proper types
    const pdfComponent = <pdf_1.BattleBoardPDF data={pdfData} />;
    if (shouldDownload) {
      // Return as downloadable file
      const { pdf } = await import("@react-pdf/renderer");
      const doc = await pdf(pdfComponent);
      const blob = await doc.toBlob();
      return new server_2.NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="battle-board-${event.title.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
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
    return server_2.NextResponse.json({
      dataUrl: `data:application/pdf;base64,${base64}`,
      filename: `battle-board-${event.title.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    });
  } catch (error) {
    console.error("Failed to generate Battle Board PDF:", error);
    return server_2.NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
