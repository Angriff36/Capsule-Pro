/**
 * Nowsta Sync Service
 *
 * Handles synchronization of employees and shifts from Nowsta to Convoy.
 * Implements employee mapping and shift synchronization with duplicate prevention.
 */

import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { createManifestRuntime } from "@/lib/manifest-runtime";
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

  const matchingEmployee = await database.user.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
      email: { equals: nowstaEmployee.email, mode: "insensitive" },
    },
    select: { id: true },
  });

  return matchingEmployee?.id ?? null;
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
    const schedule = await database.schedule.findFirst({
      where: {
        tenantId,
        schedule_date: shiftDate,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (schedule) {
      scheduleId = schedule.id;
    } else {
      // Create schedule via Manifest runtime
      const result = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "Schedule",
          command: "create",
          user: { id: "system", tenantId, role: "admin" },
          body: {
            tenantId,
            scheduleDate: shiftDate,
            status: "draft",
            locationId: "",
          },
        }
      );
      if (!result.ok) {
        throw new Error(`Failed to create schedule: ${result.message}`);
      }
      scheduleId = (result.result as { id?: string }).id!;
    }

    // Get default location
    const defaultLocation = await database.location.findFirst({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { isPrimary: "desc" },
      select: { id: true },
    });

    const locationId = defaultLocation?.id ?? null;

    if (!locationId) {
      throw new Error("No active location found for shift");
    }

    // Create or update shift
    if (existingSync?.convoyShiftId) {
      // Update existing shift via Manifest runtime
      await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "ScheduleShift",
          command: "update",
          instanceId: existingSync.convoyShiftId,
          user: { id: "system", tenantId, role: "admin" },
          body: {
            id: existingSync.convoyShiftId,
            tenantId,
            scheduleId,
            employeeId: mapping.convoyEmployeeId,
            locationId,
            shiftStart: new Date(nowstaShift.start_time),
            shiftEnd: new Date(nowstaShift.end_time),
            roleDuringShift: nowstaShift.role ?? "",
            notes: nowstaShift.notes ?? "",
          },
        }
      );
    } else {
      // Create new shift via Manifest runtime
      const shiftResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "ScheduleShift",
          command: "create",
          user: { id: "system", tenantId, role: "admin" },
          body: {
            tenantId,
            scheduleId,
            employeeId: mapping.convoyEmployeeId,
            locationId,
            shiftStart: new Date(nowstaShift.start_time),
            shiftEnd: new Date(nowstaShift.end_time),
            roleDuringShift: nowstaShift.role ?? "",
            notes: nowstaShift.notes ?? "",
          },
        }
      );
      if (!shiftResult.ok) {
        throw new Error(`Failed to create shift: ${shiftResult.message}`);
      }
      const newShiftId = (shiftResult.result as { id?: string }).id!;

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
            convoyShiftId: newShiftId,
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
            convoyShiftId: newShiftId,
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
