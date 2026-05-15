import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { Metadata } from "next";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { RequestsClient } from "./requests-client";

export const metadata: Metadata = {
  title: "Scheduling Requests",
  description:
    "Review and approve time-off requests, timecard edits, and shift changes.",
};

interface TimeOffRequestRow {
  id: string;
  employeeId: string;
  employeeFirstName: string | null;
  employeeLastName: string | null;
  employeeRole: string;
  request_type: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: string;
  submitted_at: Date;
}

interface TimecardEditRow {
  id: string;
  employeeId: string;
  employeeFirstName: string | null;
  employeeLastName: string | null;
  employeeRole: string;
  reason: string;
  status: string;
  created_at: Date;
}

export interface UnifiedRequest {
  id: string;
  type: "time_off" | "timecard_edit";
  employee: string;
  employeeRole: string;
  detail: string;
  submitted: string;
  status: string;
  reason: string | null;
}

export default async function SchedulingRequestsPage() {
  const { orgId } = await auth();
  if (!orgId) {
    return (
      <div className="px-4 pt-8">
        <p className="text-red-500">Unauthorized: no organization found</p>
      </div>
    );
  }

  const tenantId = await getTenantIdForOrg(orgId);

  let timeOffRequests: TimeOffRequestRow[] = [];
  let timecardEdits: TimecardEditRow[] = [];
  let loadError: string | null = null;

  try {
    timeOffRequests = await database.$queryRaw<TimeOffRequestRow[]>(
      Prisma.sql`
      SELECT
        tor.id,
        tor.employeeId,
        u.first_name AS employee_first_name,
        u.last_name AS employee_last_name,
        u.role AS employee_role,
        tor.request_type,
        tor.start_date,
        tor.end_date,
        tor.reason,
        tor.status,
        tor.submitted_at
      FROM tenant_staff.employee_time_off_requests tor
      LEFT JOIN public.users u
        ON u.id = tor.employeeId::uuid
       AND u.tenant_id = tor.tenant_id
      WHERE tor.tenant_id = ${tenantId}
        AND tor.deleted_at IS NULL
      ORDER BY tor.submitted_at DESC
      LIMIT 50
    `
    );
  } catch (err) {
    console.error("Failed to load time-off requests:", err);
    loadError = "Failed to load time-off requests";
  }

  try {
    timecardEdits = await database.$queryRaw<TimecardEditRow[]>(
      Prisma.sql`
      SELECT
        ter.id,
        ter.employeeId,
        u.first_name AS employee_first_name,
        u.last_name AS employee_last_name,
        u.role AS employee_role,
        ter.reason,
        ter.status,
        ter.created_at
      FROM tenant_staff.timecard_edit_requests ter
      LEFT JOIN public.users u
        ON u.id = ter.employeeId::uuid
       AND u.tenant_id = ter.tenant_id
      WHERE ter.tenant_id = ${tenantId}
      ORDER BY ter.created_at DESC
      LIMIT 50
    `
    );
  } catch (err) {
    console.error("Failed to load timecard edits:", err);
    loadError = loadError
      ? `${loadError}; timecard edits`
      : "Failed to load timecard edits";
  }

  const formatRequestType = (rt: string) =>
    rt
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const timeAgo = (date: Date): string => {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const unified: UnifiedRequest[] = [
    ...timeOffRequests.map((r) => ({
      id: r.id,
      type: "time_off" as const,
      employee:
        [r.employeeFirstName, r.employeeLastName].filter(Boolean).join(" ") ||
        "Unknown",
      employeeRole: r.employeeRole || "Staff",
      detail: `${formatRequestType(r.request_type)} · ${new Date(r.start_date).toLocaleDateString()}${r.start_date.toDateString() !== r.end_date.toDateString() ? ` – ${new Date(r.end_date).toLocaleDateString()}` : ""}`,
      submitted: timeAgo(r.submitted_at),
      status: r.status,
      reason: r.reason,
    })),
    ...timecardEdits.map((r) => ({
      id: r.id,
      type: "timecard_edit" as const,
      employee:
        [r.employeeFirstName, r.employeeLastName].filter(Boolean).join(" ") ||
        "Unknown",
      employeeRole: r.employeeRole || "Staff",
      detail: "Timecard edit request",
      submitted: timeAgo(r.created_at),
      status: r.status,
      reason: r.reason,
    })),
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Request Queue</h1>
        <p className="text-muted-foreground">
          Review and approve time-off requests, timecard edits, and shift
          changes.
        </p>
      </div>
      {loadError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {loadError}. The page shows available data below.
        </div>
      )}
      <RequestsClient requests={unified} />
    </div>
  );
}
