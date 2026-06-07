import { auth } from "@repo/auth/server";
import { database, Prisma, type PrismaClient } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { withRateLimit } from "@/middleware/rate-limiter";

interface BulkApproveRequest {
  timeEntryIds: string[];
  approve?: boolean;
  rejectionReason?: string;
  editRequests?: Array<{
    timeEntryId: string;
    requestedClockIn?: string;
    requestedClockOut?: string;
    requestedBreakMinutes?: number;
    reason: string;
  }>;
  flagExceptions?: Array<{
    timeEntryId: string;
    exceptionType: string;
    notes: string;
  }>;
}

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

async function validateTimeEntries(
  tx: TxClient,
  tenantId: string,
  timeEntryIds: string[]
) {
  const timeEntries = await tx.timeEntry.findMany({
    where: {
      tenantId,
      id: { in: timeEntryIds },
      deletedAt: null,
    },
  });

  if (timeEntries.length === 0) {
    throw new Error("No valid time entries found");
  }

  return timeEntries;
}

function processApprovals(
  tx: TxClient,
  tenantId: string,
  timeEntryIds: string[],
  userId: string
) {
  return tx.timeEntry.updateMany({
    where: {
      tenantId,
      id: { in: timeEntryIds },
      deletedAt: null,
      clockOut: { not: null },
    },
    data: {
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });
}

function processRejections(
  tx: TxClient,
  tenantId: string,
  timeEntryIds: string[],
  rejectionReason: string
) {
  return tx.timeEntry.updateMany({
    where: {
      tenantId,
      id: { in: timeEntryIds },
      deletedAt: null,
    },
    data: {
      notes: rejectionReason,
    },
  });
}

async function processEditRequests(
  tx: TxClient,
  tenantId: string,
  editRequests: Array<{
    timeEntryId: string;
    requestedClockIn?: string;
    requestedClockOut?: string;
    requestedBreakMinutes?: number;
    reason: string;
  }>
) {
  for (const editRequest of editRequests) {
    const timeEntry = await tx.timeEntry.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: editRequest.timeEntryId,
        },
      },
      select: {
        employeeId: true,
      },
    });

    if (!timeEntry) {
      continue;
    }

    await tx.timecardEditRequest.upsert({
      where: {
        tenantId_timeEntryId: {
          tenantId,
          timeEntryId: editRequest.timeEntryId,
        },
      },
      create: {
        tenantId,
        timeEntryId: editRequest.timeEntryId,
        employeeId: timeEntry.employeeId,
        requestedClockIn: editRequest.requestedClockIn
          ? new Date(editRequest.requestedClockIn)
          : null,
        requestedClockOut: editRequest.requestedClockOut
          ? new Date(editRequest.requestedClockOut)
          : null,
        requestedBreakMinutes: editRequest.requestedBreakMinutes ?? null,
        reason: editRequest.reason,
        status: "pending",
      },
      update: {
        status: "pending",
        reason: editRequest.reason,
      },
    });
  }
}

async function processExceptionFlags(
  tx: TxClient,
  tenantId: string,
  flagExceptions: Array<{
    timeEntryId: string;
    exceptionType: string;
    notes: string;
  }>
) {
  for (const flag of flagExceptions) {
    const timeEntry = await tx.timeEntry.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: flag.timeEntryId,
        },
      },
      select: {
        notes: true,
      },
    });

    if (!timeEntry) {
      continue;
    }

    await tx.timeEntry.updateMany({
      where: {
        tenantId,
        id: flag.timeEntryId,
        deletedAt: null,
      },
      data: {
        notes: `${timeEntry.notes ?? ""} [EXCEPTION: ${flag.exceptionType}] ${flag.notes}`,
      },
    });
  }
}

export const POST = withRateLimit(
  async (request: Request) => {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body: BulkApproveRequest = await request.json();

    if (!body.timeEntryIds || body.timeEntryIds.length === 0) {
      return NextResponse.json(
        { message: "No time entry IDs provided" },
        { status: 400 }
      );
    }

    const isApprove = body.approve !== false;

    try {
      const results = await database.$transaction(async (tx) => {
        const timeEntries = await validateTimeEntries(
          tx as TxClient,
          tenantId,
          body.timeEntryIds
        );

        const invalidEntries = timeEntries.filter(
          (entry: { clockOut: Date | null }) => !entry.clockOut
        );
        if (invalidEntries.length > 0 && isApprove) {
          throw new Error(
            "Cannot approve time entries that haven't been clocked out"
          );
        }

        let updatedCount = 0;
        let editRequestCount = 0;
        let exceptionFlagCount = 0;

        if (isApprove) {
          const approvalResult = await processApprovals(
            tx as TxClient,
            tenantId,
            body.timeEntryIds,
            userId
          );
          updatedCount = approvalResult.count;
        }

        if (!isApprove && body.rejectionReason) {
          await processRejections(
            tx as TxClient,
            tenantId,
            body.timeEntryIds,
            body.rejectionReason
          );
        }

        if (body.editRequests && body.editRequests.length > 0) {
          await processEditRequests(
            tx as TxClient,
            tenantId,
            body.editRequests
          );
          editRequestCount = body.editRequests.length;
        }

        if (body.flagExceptions && body.flagExceptions.length > 0) {
          await processExceptionFlags(
            tx as TxClient,
            tenantId,
            body.flagExceptions
          );
          exceptionFlagCount = body.flagExceptions.length;
        }

        return {
          updatedCount,
          editRequestCount,
          exceptionFlagCount,
        };
      });

      return NextResponse.json({
        success: true,
        message: isApprove
          ? `${results.updatedCount} time entries approved`
          : "Time entries processed",
        results,
      });
    } catch (error) {
      captureException(error);
      log.error("Error in bulk timecard operation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process timecards";
      return NextResponse.json(
        { message: errorMessage, success: false },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);

export const GET = withRateLimit(
  async (request: Request) => {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const editRequests = await database.$queryRaw<
      Array<{
        id: string;
        time_entry_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        requested_clock_in: Date | null;
        requested_clock_out: Date | null;
        requested_break_minutes: number | null;
        reason: string;
        status: string;
        created_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          ter.id,
          ter.time_entry_id,
          ter.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          ter.requested_clock_in,
          ter.requested_clock_out,
          ter.requested_break_minutes,
          ter.reason,
          ter.status,
          ter.created_at
        FROM tenant_staff.timecard_edit_requests ter
        JOIN tenant_staff.employees e
          ON e.tenant_id = ter.tenant_id
         AND e.id = ter.employee_id
        WHERE ter.tenant_id = ${tenantId}
          ${status ? Prisma.sql`AND ter.status = ${status}` : Prisma.empty}
        ORDER BY ter.created_at DESC
      `
    );

    return NextResponse.json({ editRequests });
  },
  { limit: 10, window: "1m" }
);
