import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { Metadata } from "next";
import { OperationalPageShell } from "@/app/(authenticated)/components/operational-page-shell";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { RequestsClient } from "./requests-client";

export const metadata: Metadata = {
  title: "Scheduling Requests",
  description:
    "Review and approve time-off requests, timecard edits, and shift changes.",
};

interface TimeOffRequestRow {
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  end_date: Date;
  id: string;
  reason: string | null;
  request_type: string;
  start_date: Date;
  status: string;
  submitted_at: Date;
}

interface TimecardEditRow {
  created_at: Date;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  id: string;
  reason: string;
  status: string;
}

export interface UnifiedRequest {
  detail: string;
  employee: string;
  employeeRole: string;
  id: string;
  reason: string | null;
  status: string;
  submitted: string;
  type: "time_off" | "timecard_edit";
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
    const rows = await database.timeOffRequest.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { submittedAt: "desc" },
      take: 50,
    });
    const employees = await database.user.findMany({
      where: {
        tenantId,
        id: { in: rows.map((row) => row.employeeId) },
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const employeesById = new Map(
      employees.map((employee) => [employee.id, employee])
    );
    timeOffRequests = rows.map((row) => {
      const employee = employeesById.get(row.employeeId);
      return {
        id: row.id,
        employeeId: row.employeeId,
        employeeFirstName: employee?.firstName ?? null,
        employeeLastName: employee?.lastName ?? null,
        employeeRole: employee?.role ?? "Staff",
        request_type: row.requestType,
        start_date: row.startDate,
        end_date: row.endDate,
        reason: row.reason,
        status: row.status,
        submitted_at: row.submittedAt,
      };
    });
  } catch (err) {
    console.error("Failed to load time-off requests:", err);
    loadError = "Failed to load time-off requests";
  }

  try {
    const rows = await database.timecardEditRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const employees = await database.user.findMany({
      where: {
        tenantId,
        id: { in: rows.map((row) => row.employeeId) },
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const employeesById = new Map(
      employees.map((employee) => [employee.id, employee])
    );
    timecardEdits = rows.map((row) => {
      const employee = employeesById.get(row.employeeId);
      return {
        id: row.id,
        employeeId: row.employeeId,
        employeeFirstName: employee?.firstName ?? null,
        employeeLastName: employee?.lastName ?? null,
        employeeRole: employee?.role ?? "Staff",
        reason: row.reason,
        status: row.status,
        created_at: row.createdAt,
      };
    });
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
    if (mins < 1) {
      return "just now";
    }
    if (mins < 60) {
      return `${mins}m ago`;
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
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
      detail: `${formatRequestType(r.request_type)} · ${new Date(r.start_date).toLocaleDateString()}${r.start_date.toDateString() === r.end_date.toDateString() ? "" : ` – ${new Date(r.end_date).toLocaleDateString()}`}`,
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
    <OperationalPageShell
      description="Review and approve time-off requests, timecard edits, and shift changes."
      eyebrow="Scheduling / Requests"
      title="Request queue"
    >
      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          {loadError}. The page shows available data below.
        </div>
      ) : null}
      <RequestsClient requests={unified} />
    </OperationalPageShell>
  );
}
