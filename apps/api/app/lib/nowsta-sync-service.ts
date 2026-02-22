/**
 * Nowsta Sync Service
 *
 * Handles synchronization of employees and shifts from Nowsta to Convoy.
 * Implements employee mapping and shift synchronization with duplicate prevention.
 */

import { database, Prisma } from "@repo/database";
import {
  createNowstaClient,
  type NowstaClient,
  type NowstaEmployee,
  type NowstaShift,
  type NowstaSyncResult,
} from "./nowsta-client";

export interface SyncOptions {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  dryRun?: boolean;
}

export interface EmployeeMappingResult {
  nowstaEmployeeId: string;
  convoyEmployeeId: string | null;
  autoMapped: boolean;
  reason: string;
}

/**
 * Auto-map a Nowsta employee to a Convoy employee by email match
 */
export async function findMatchingEmployee(
  tenantId: string,
  nowstaEmployee: NowstaEmployee
): Promise<string | null> {
  const existingMapping = await database.nowstaEmployeeMapping.findUnique({
    where: {
      tenantId_nowstaEmployeeId: {
        tenantId,
        nowstaEmployeeId: nowstaEmployee.id,
      },
    },
  });

  if (existingMapping) {
    return existingMapping.convoyEmployeeId;
  }

  // Try to find by email
  const matchingEmployee = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
        AND LOWER(email) = LOWER(${nowstaEmployee.email})
      LIMIT 1
    `
  );

  return matchingEmployee.length > 0 ? matchingEmployee[0].id : null;
}

/**
 * Create or update employee mapping
 */
export async function upsertEmployeeMapping(
  tenantId: string,
  nowstaEmployee: NowstaEmployee,
  convoyEmployeeId: string,
  autoMapped: boolean
): Promise<void> {
  await database.nowstaEmployeeMapping.upsert({
    where: {
      tenantId_nowstaEmployeeId: {
        tenantId,
        nowstaEmployeeId: nowstaEmployee.id,
      },
    },
    update: {
      convoyEmployeeId,
      nowstaEmployeeName: `${nowstaEmployee.first_name} ${nowstaEmployee.last_name}`,
      nowstaEmployeeEmail: nowstaEmployee.email,
      autoMapped,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      nowstaEmployeeId: nowstaEmployee.id,
      convoyEmployeeId,
      nowstaEmployeeName: `${nowstaEmployee.first_name} ${nowstaEmployee.last_name}`,
      nowstaEmployeeEmail: nowstaEmployee.email,
      autoMapped,
    },
  });
}

/**
 * Sync employees from Nowsta and create mappings
 */
export async function syncEmployees(
  client: NowstaClient,
  tenantId: string,
  dryRun = false
): Promise<{
  mappings: EmployeeMappingResult[];
  unmapped: NowstaEmployee[];
}> {
  const nowstaEmployees = await client.getAllEmployees();
  const mappings: EmployeeMappingResult[] = [];
  const unmapped: NowstaEmployee[] = [];

  for (const nowstaEmployee of nowstaEmployees) {
    const convoyEmployeeId = await findMatchingEmployee(
      tenantId,
      nowstaEmployee
    );

    if (convoyEmployeeId) {
      mappings.push({
        nowstaEmployeeId: nowstaEmployee.id,
        convoyEmployeeId,
        autoMapped: true,
        reason: "Matched by email",
      });

      if (!dryRun) {
        await upsertEmployeeMapping(
          tenantId,
          nowstaEmployee,
          convoyEmployeeId,
          true
        );
      }
    } else {
      unmapped.push(nowstaEmployee);
    }
  }

  return { mappings, unmapped };
}

/**
 * Sync shifts from Nowsta to Convoy
 */
export async function syncShifts(
  client: NowstaClient,
  tenantId: string,
  options: SyncOptions
): Promise<NowstaSyncResult> {
  const result: NowstaSyncResult = {
    success: true,
    employeesImported: 0,
    employeesSkipped: 0,
    shiftsImported: 0,
    shiftsSkipped: 0,
    errors: [],
  };

  try {
    // First, sync employees to ensure mappings exist
    const { mappings, unmapped } = await syncEmployees(
      client,
      tenantId,
      options.dryRun
    );
    result.employeesImported = mappings.length;
    result.employeesSkipped = unmapped.length;

    if (unmapped.length > 0) {
      result.errors.push(
        `${unmapped.length} employees could not be auto-mapped: ${unmapped
          .map((e) => e.email)
          .join(", ")}`
      );
    }

    // Fetch shifts from Nowsta
    const nowstaShifts = await client.getAllShifts(
      options.startDate,
      options.endDate
    );

    // Process each shift
    for (const shift of nowstaShifts) {
      try {
        await processShift(tenantId, shift, options.dryRun ?? false);
        result.shiftsImported++;
      } catch (error) {
        result.shiftsSkipped++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Shift ${shift.id}: ${errorMessage}`);
      }
    }

    // Update last sync status
    if (!options.dryRun) {
      await database.nowstaConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: result.errors.length > 0 ? "partial" : "success",
          lastSyncError:
            result.errors.length > 0 ? result.errors.join("\n") : null,
        },
      });
    }
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Sync failed: ${errorMessage}`);

    if (!options.dryRun) {
      await database.nowstaConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncError: errorMessage,
        },
      });
    }
  }

  return result;
}

/**
 * Process a single shift from Nowsta
 */
async function processShift(
  tenantId: string,
  nowstaShift: NowstaShift,
  dryRun: boolean
): Promise<void> {
  // Check if shift already exists
  const existingSync = await database.nowstaShiftSync.findUnique({
    where: {
      tenantId_nowstaShiftId: {
        tenantId,
        nowstaShiftId: nowstaShift.id,
      },
    },
  });

  // Check if shift has been updated since last sync
  const nowstaUpdatedAt = new Date(nowstaShift.updated_at);
  if (
    existingSync?.lastSyncedAt &&
    existingSync.nowstaUpdatedAt &&
    nowstaUpdatedAt <= existingSync.nowstaUpdatedAt
  ) {
    // No changes, skip
    return;
  }

  // Get employee mapping
  const mapping = await database.nowstaEmployeeMapping.findUnique({
    where: {
      tenantId_nowstaEmployeeId: {
        tenantId,
        nowstaEmployeeId: nowstaShift.employee_id,
      },
    },
  });

  if (!mapping) {
    throw new Error(
      `No employee mapping found for Nowsta employee ${nowstaShift.employee_id}`
    );
  }

  // Get or create schedule for the shift date
  const shiftDate = new Date(nowstaShift.start_time);
  shiftDate.setHours(0, 0, 0, 0);

  let scheduleId: string;

  if (!dryRun) {
    const schedule = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
        FROM tenant_staff.schedules
        WHERE tenant_id = ${tenantId}
          AND schedule_date = ${shiftDate}
          AND deleted_at IS NULL
        LIMIT 1
      `
    );

    if (schedule.length > 0) {
      scheduleId = schedule[0].id;
    } else {
      // Create schedule
      const newSchedule = await database.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          INSERT INTO tenant_staff.schedules (tenant_id, id, schedule_date, status, created_at, updated_at)
          VALUES (
            ${tenantId},
            gen_random_uuid(),
            ${shiftDate},
            'draft',
            NOW(),
            NOW()
          )
          RETURNING id
        `
      );
      scheduleId = newSchedule[0].id;
    }

    // Get default location
    const defaultLocation = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
        FROM tenant.locations
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND is_active = true
        ORDER BY is_primary DESC
        LIMIT 1
      `
    );

    const locationId =
      defaultLocation.length > 0 ? defaultLocation[0].id : null;

    if (!locationId) {
      throw new Error("No active location found for shift");
    }

    // Create or update shift
    if (existingSync?.convoyShiftId) {
      // Update existing shift
      await database.$executeRaw`
        UPDATE tenant_staff.schedule_shifts
        SET
          shift_start = ${new Date(nowstaShift.start_time)},
          shift_end = ${new Date(nowstaShift.end_time)},
          role_during_shift = ${nowstaShift.role ?? null},
          notes = ${nowstaShift.notes ?? null},
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${existingSync.convoyShiftId}
      `;
    } else {
      // Create new shift
      const newShift = await database.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          INSERT INTO tenant_staff.schedule_shifts (
            tenant_id, id, schedule_id, employee_id, location_id,
            shift_start, shift_end, role_during_shift, notes,
            created_at, updated_at
          )
          VALUES (
            ${tenantId},
            gen_random_uuid(),
            ${scheduleId},
            ${mapping.convoyEmployeeId},
            ${locationId},
            ${new Date(nowstaShift.start_time)},
            ${new Date(nowstaShift.end_time)},
            ${nowstaShift.role ?? null},
            ${nowstaShift.notes ?? null},
            NOW(),
            NOW()
          )
          RETURNING id
        `
      );

      // Update sync record with convoy shift ID
      if (existingSync) {
        await database.nowstaShiftSync.update({
          where: {
            tenantId_id: {
              tenantId,
              id: existingSync.id,
            },
          },
          data: {
            convoyShiftId: newShift[0].id,
            status: "synced",
            lastSyncedAt: new Date(),
            nowstaUpdatedAt,
          },
        });
      } else {
        await database.nowstaShiftSync.create({
          data: {
            tenantId,
            nowstaShiftId: nowstaShift.id,
            convoyShiftId: newShift[0].id,
            nowstaEmployeeId: nowstaShift.employee_id,
            locationId,
            shiftStart: new Date(nowstaShift.start_time),
            shiftEnd: new Date(nowstaShift.end_time),
            roleDuringShift: nowstaShift.role,
            status: "synced",
            lastSyncedAt: new Date(),
            nowstaUpdatedAt,
          },
        });
      }
    }
  }
}

/**
 * Run a full Nowsta sync
 */
export async function runNowstaSync(
  tenantId: string,
  options: Omit<SyncOptions, "tenantId">
): Promise<NowstaSyncResult> {
  const config = await database.nowstaConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return {
      success: false,
      employeesImported: 0,
      employeesSkipped: 0,
      shiftsImported: 0,
      shiftsSkipped: 0,
      errors: ["Nowsta integration not configured"],
    };
  }

  if (!config.syncEnabled) {
    return {
      success: false,
      employeesImported: 0,
      employeesSkipped: 0,
      shiftsImported: 0,
      shiftsSkipped: 0,
      errors: ["Nowsta sync is disabled"],
    };
  }

  const client = createNowstaClient({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    organizationId: config.organizationId,
  });

  return syncShifts(client, tenantId, {
    ...options,
    tenantId,
  });
}
