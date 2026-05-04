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
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_role: string;
  request_type: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: string;
  submitted_at: Date;
}

interface TimecardEditRow {
  id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_role: string;
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

  const timeOffRequests = await database.$queryRaw<TimeOffRequestRow[]>(
    Prisma.sql`
      SELECT
        tor.id,
        tor.employee_id,
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
      JOIN public.users u
        ON u.id = tor.employee_id::uuid
       AND u.tenant_id = tor.tenant_id
      WHERE tor.tenant_id = ${tenantId}
        AND tor.deleted_at IS NULL
      ORDER BY tor.submitted_at DESC
      LIMIT 50
    `
  );

  const timecardEdits = await database.$queryRaw<TimecardEditRow[]>(
    Prisma.sql`
      SELECT
        ter.id,
        ter.employee_id,
        u.first_name AS employee_first_name,
        u.last_name AS employee_last_name,
        u.role AS employee_role,
        ter.reason,
        ter.status,
        ter.created_at
      FROM tenant_staff.timecard_edit_requests ter
      JOIN public.users u
        ON u.id = ter.employee_id::uuid
       AND u.tenant_id = ter.tenant_id
      WHERE ter.tenant_id = ${tenantId}
      ORDER BY ter.created_at DESC
      LIMIT 50
    `
  );

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
        [r.employee_first_name, r.employee_last_name]
          .filter(Boolean)
          .join(" ") || "Unknown",
      employeeRole: r.employee_role || "Staff",
      detail: `${formatRequestType(r.request_type)} · ${new Date(r.start_date).toLocaleDateString()}${r.start_date.toDateString() !== r.end_date.toDateString() ? ` – ${new Date(r.end_date).toLocaleDateString()}` : ""}`,
      submitted: timeAgo(r.submitted_at),
      status: r.status,
      reason: r.reason,
    })),
    ...timecardEdits.map((r) => ({
      id: r.id,
      type: "timecard_edit" as const,
      employee:
        [r.employee_first_name, r.employee_last_name]
          .filter(Boolean)
          .join(" ") || "Unknown",
      employeeRole: r.employee_role || "Staff",
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
      <RequestsClient requests={unified} />
    </div>
  );
}
