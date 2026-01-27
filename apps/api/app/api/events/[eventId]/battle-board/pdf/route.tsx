import { auth } from "@repo/auth/server";
import { database, PrismaClient } from "@repo/database";
import { BattleBoardPDF } from "@repo/pdf";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  eventId: string;
}>;

type TimelineTask = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  priority: string;
  category: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  progress: number;
  dependencies: string[];
  is_on_critical_path: boolean;
  slack_minutes: number;
  notes: string | null;
};

type StaffMember = {
  id: string;
  name: string;
  role: string | null;
  assignment_count: bigint;
};

/**
 * Fetch event details
 */
function fetchEvent(
  database: PrismaClient,
  tenantId: string,
  eventId: string
): any {
  return database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
    include: {
      client: true,
      venue: true,
    },
  });
}

/**
 * Fetch timeline tasks with staff assignments
 */
function fetchTimelineTasks(
  database: PrismaClient,
  tenantId: string,
  eventId: string
): any {
  return database.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      description: string | null;
      start_time: string;
      end_time: string;
      status: string;
      priority: string;
      category: string | null;
      assignee_id: string | null;
      assignee_name: string | null;
      progress: number;
      dependencies: string[];
      is_on_critical_path: boolean;
      slack_minutes: number;
      notes: string | null;
    }>
  >(
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
}

/**
 * Fetch staff with assignment counts
 */
function fetchStaff(
  database: PrismaClient,
  tenantId: string
): any {
  return database.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      role: string | null;
      assignment_count: bigint;
    }>
  >(
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
}

/**
 * Fetch user for metadata
 */
function fetchUser(
  database: PrismaClient,
  tenantId: string,
  authUserId: string
): any {
  return database.user.findFirst({
    where: {
      tenantId,
      authUserId,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

/**
 * Format address from venue
 */
function formatVenueAddress(
  venue: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    stateProvince?: string | null;
    postalCode?: string | null;
  } | null,
  fallbackAddress: string | null | undefined
): string {
  if (!venue) {
    return fallbackAddress || "Address not specified";
  }

  const parts: string[] = [];

  if (venue.addressLine1) {
    parts.push(venue.addressLine1);
  }

  if (venue.addressLine2) {
    parts.push(venue.addressLine2);
  }

  if (venue.city) {
    parts.push(venue.city);
  }

  if (venue.stateProvince) {
    parts.push(venue.stateProvince);
  }

  if (venue.postalCode) {
    parts.push(venue.postalCode);
  }

  return parts.join(", ").trim() || "Address not specified";
}

/**
 * Format client name
 */
function formatClientName(
  client: {
    company_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null
): string {
  if (!client) {
    return "Client not specified";
  }

  if (client.company_name) {
    return client.company_name;
  }

  if (client.first_name && client.last_name) {
    return `${client.first_name} ${client.last_name}`;
  }

  return "Client not specified";
}

/**
 * Calculate task summary
 */
function calculateTaskSummary(tasks: TimelineTask[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;
  return {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
  };
}

/**
 * Transform timeline task for PDF
 */
function transformTaskForPdf(task: TimelineTask) {
  return {
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
  };
}

/**
 * Transform staff for PDF
 */
function transformStaffForPdf(staff: StaffMember) {
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role || undefined,
    assignments: Number(staff.assignment_count),
  };
}

/**
 * GET /api/events/[eventId]/battle-board/pdf
 *
 * Generate a PDF export of the Battle Board for an event.
 *
 * Query parameters:
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

    const event = await fetchEvent(database, tenantId, eventId);

    if (!event || event.deletedAt) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const [tasks, staff, user] = await Promise.all([
      fetchTimelineTasks(database, tenantId, eventId),
      fetchStaff(database, tenantId),
      fetchUser(database, tenantId, userId),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const summary = calculateTaskSummary(tasks);

    const pdfData = {
      event: {
        id: event.id,
        name: event.title,
        date: event.eventDate,
        venue: event.venue?.name || event.venueName || "Venue not specified",
        address: formatVenueAddress(event.venue, event.venueAddress),
        clientName: formatClientName(event.client),
      },
      tasks: tasks.map(transformTaskForPdf),
      summary,
      staff: staff.map(transformStaffForPdf),
      metadata: {
        generatedAt: new Date(),
        generatedBy: user.email || `${user.firstName} ${user.lastName}`,
        version: "1.0.0",
      },
    };

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";

    const pdfComponent = <BattleBoardPDF data={pdfData} />;

    if (shouldDownload) {
      return generateDownloadResponse(pdfComponent, event.title);
    }

    return generateBase64Response(pdfComponent, event.title);
  } catch (error) {
    console.error("Failed to generate Battle Board PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate downloadable PDF response
 */
async function generateDownloadResponse(
  pdfComponent: React.ReactElement<DocumentProps>,
  eventTitle: string
) {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await pdf(pdfComponent);
  const blob = await doc.toBlob();

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="battle-board-${eventTitle.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}

/**
 * Generate base64 PDF response
 */
async function generateBase64Response(
  pdfComponent: React.ReactElement,
  eventTitle: string
) {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await pdf(pdfComponent);
  const blob = await doc.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let binary = "";
  for (const byte of uint8Array) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);

  return NextResponse.json({
    dataUrl: `data:application/pdf;base64,${base64}`,
    filename: `battle-board-${eventTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`,
  });
}
