import { auth } from "@repo/auth/server";
import { database, Prisma, type PrismaClient } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type BulkApproveRequest = {
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
};

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
      deleted_at: null,
    },
  });

  if (timeEntries.length === 0) {
    throw new Error("No valid time entries found");
  }

  return timeEntries;
}

async function processApprovals(
  tx: TxClient,
  tenantId: string,
  timeEntryIds: string[],
  userId: string
) {
  return tx.timeEntry.updateMany({
    where: {
      tenantId,
      id: { in: timeEntryIds },
      deleted_at: null,
      clockOut: { not: null },
    },
    data: {
      approved_by: userId,
      approved_at: new Date(),
    },
  });
}

async function processRejections(
  tx: TxClient,
  tenantId: string,
  timeEntryIds: string[],
  rejectionReason: string
) {
  return tx.timeEntry.updateMany({
    where: {
      tenantId,
      id: { in: timeEntryIds },
      deleted_at: null,
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
    await tx.$queryRaw(
      Prisma.sql`
        INSERT INTO tenant_staff.timecard_edit_requests
        (tenant_id, time_entry_id, employee_id, requested_clock_in,
         requested_clock_out, requested_break_minutes, reason, status,
         created_at, updated_at)
        VALUES (
          ${tenantId},
          ${editRequest.timeEntryId},
          (SELECT employee_id FROM tenant_staff.time_entries WHERE id = ${editRequest.timeEntryId} AND tenant_id = ${tenantId}),
          ${editRequest.requestedClockIn ? new Date(editRequest.requestedClockIn) : null},
          ${editRequest.requestedClockOut ? new Date(editRequest.requestedClockOut) : null},
          ${editRequest.requestedBreakMinutes ?? null},
          ${editRequest.reason},
          'pending',
          NOW(),
          NOW()
        )
        ON CONFLICT (tenant_id, time_entry_id) DO UPDATE
        SET status = 'pending',
            reason = ${editRequest.reason},
            updated_at = NOW()
      `
    );
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
    await tx.$queryRaw(
      Prisma.sql`
        UPDATE tenant_staff.time_entries
        SET notes = COALESCE(notes, '') || ' [EXCEPTION: ' || ${flag.exceptionType} || '] ' || ${flag.notes},
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${flag.timeEntryId}
          AND deleted_at IS NULL
      `
    );
  }
}

export async function POST(request: Request) {
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
        await processEditRequests(tx as TxClient, tenantId, body.editRequests);
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
    console.error("Error in bulk timecard operation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process timecards";
    return NextResponse.json(
      { message: errorMessage, success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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
}
