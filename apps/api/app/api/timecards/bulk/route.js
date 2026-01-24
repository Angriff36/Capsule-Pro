Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function validateTimeEntries(tx, tenantId, timeEntryIds) {
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
function processApprovals(tx, tenantId, timeEntryIds, userId) {
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
function processRejections(tx, tenantId, timeEntryIds, rejectionReason) {
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
async function processEditRequests(tx, tenantId, editRequests) {
  for (const editRequest of editRequests) {
    await tx.$queryRaw(database_1.Prisma.sql`
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
      `);
  }
}
async function processExceptionFlags(tx, tenantId, flagExceptions) {
  for (const flag of flagExceptions) {
    await tx.$queryRaw(database_1.Prisma.sql`
        UPDATE tenant_staff.time_entries
        SET notes = COALESCE(notes, '') || ' [EXCEPTION: ' || ${flag.exceptionType} || '] ' || ${flag.notes},
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${flag.timeEntryId}
          AND deleted_at IS NULL
      `);
  }
}
async function POST(request) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!(orgId && userId)) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const body = await request.json();
  if (!body.timeEntryIds || body.timeEntryIds.length === 0) {
    return server_2.NextResponse.json(
      { message: "No time entry IDs provided" },
      { status: 400 }
    );
  }
  const isApprove = body.approve !== false;
  try {
    const results = await database_1.database.$transaction(async (tx) => {
      const timeEntries = await validateTimeEntries(
        tx,
        tenantId,
        body.timeEntryIds
      );
      const invalidEntries = timeEntries.filter((entry) => !entry.clockOut);
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
          tx,
          tenantId,
          body.timeEntryIds,
          userId
        );
        updatedCount = approvalResult.count;
      }
      if (!isApprove && body.rejectionReason) {
        await processRejections(
          tx,
          tenantId,
          body.timeEntryIds,
          body.rejectionReason
        );
      }
      if (body.editRequests && body.editRequests.length > 0) {
        await processEditRequests(tx, tenantId, body.editRequests);
        editRequestCount = body.editRequests.length;
      }
      if (body.flagExceptions && body.flagExceptions.length > 0) {
        await processExceptionFlags(tx, tenantId, body.flagExceptions);
        exceptionFlagCount = body.flagExceptions.length;
      }
      return {
        updatedCount,
        editRequestCount,
        exceptionFlagCount,
      };
    });
    return server_2.NextResponse.json({
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
    return server_2.NextResponse.json(
      { message: errorMessage, success: false },
      { status: 500 }
    );
  }
}
async function GET(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const editRequests = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
        ${status ? database_1.Prisma.sql`AND ter.status = ${status}` : database_1.Prisma.empty}
      ORDER BY ter.created_at DESC
    `);
  return server_2.NextResponse.json({ editRequests });
}
