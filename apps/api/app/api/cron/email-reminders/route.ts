/**
 * POST /api/cron/email-reminders
 *
 * Cron endpoint to process scheduled email reminders for tasks and shifts.
 * This should be called periodically (e.g., every 15 minutes) by a cron scheduler.
 *
 * Trigger types processed:
 * - task_reminder: Reminders for tasks due soon
 * - shift_reminder: Reminders for upcoming shifts
 */

import { database } from "@repo/database";
import { triggerEmailWorkflows } from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured - cron endpoints are unprotected");
    return true;
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }

  return true;
}

/**
 * POST /api/cron/email-reminders
 * Process scheduled email reminders
 */
export async function POST(request: NextRequest) {
  // Verify cron authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    taskReminders: { processed: 0, sent: 0, errors: [] as string[] },
    shiftReminders: { processed: 0, sent: 0, errors: [] as string[] },
  };

  try {
    // Process task reminders
    const taskResult = await processTaskReminders();
    results.taskReminders = taskResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    results.taskReminders.errors.push(message);
    console.error("Failed to process task reminders:", error);
  }

  try {
    // Process shift reminders
    const shiftResult = await processShiftReminders();
    results.shiftReminders = shiftResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    results.shiftReminders.errors.push(message);
    console.error("Failed to process shift reminders:", error);
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

/**
 * Process task reminders for tasks due within the next 24 hours
 * Uses KitchenTask with KitchenTaskClaim for assignments
 * Note: KitchenTask and KitchenTaskClaim don't have direct relations - need manual joins
 */
async function processTaskReminders() {
  const result = { processed: 0, sent: 0, errors: [] as string[] };

  // Find tasks due within the next 24 hours that haven't had a reminder sent
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find active task reminder workflows
  const workflows = await database.emailWorkflow.findMany({
    where: {
      triggerType: "task_reminder",
      isActive: true,
      deletedAt: null,
    },
    select: {
      tenantId: true,
      triggerConfig: true,
    },
  });

  if (workflows.length === 0) {
    return result;
  }

  // Get unique tenant IDs
  const tenantIds = [...new Set(workflows.map((w) => w.tenantId))];

  for (const tenantId of tenantIds) {
    try {
      // Find tasks due soon
      const tasks = await database.kitchenTask.findMany({
        where: {
          tenantId,
          dueDate: {
            gte: now,
            lte: twentyFourHoursFromNow,
          },
          status: {
            notIn: ["completed", "cancelled"],
          },
          deletedAt: null,
        },
      });

      if (tasks.length === 0) {
        continue;
      }

      const taskIds = tasks.map((t) => t.id);

      // Find active claims for these tasks
      const claims = await database.kitchenTaskClaim.findMany({
        where: {
          tenantId,
          taskId: { in: taskIds },
          releasedAt: null, // Only active claims
        },
      });

      if (claims.length === 0) {
        continue;
      }

      // Get unique employee IDs from claims
      const employeeIds = [...new Set(claims.map((c) => c.employeeId))];

      // Fetch employees
      const employees = await database.user.findMany({
        where: {
          tenantId,
          id: { in: employeeIds },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      // Create lookup maps
      const taskMap = new Map(tasks.map((t) => [t.id, t]));
      const employeeMap = new Map(employees.map((e) => [e.id, e]));

      // Process each claim
      for (const claim of claims) {
        const task = taskMap.get(claim.taskId);
        const employee = employeeMap.get(claim.employeeId);

        if (!task || !employee?.email) {
          continue;
        }

        result.processed++;

        const triggerResult = await triggerEmailWorkflows(database, {
          tenantId,
          triggerType: "task_reminder",
          entity: {
            id: task.id,
            type: "task",
          },
          templateData: {
            taskName: task.title,
            taskDescription: task.summary,
            taskDueDate: task.dueDate
              ? task.dueDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : undefined,
            taskPriority: task.priority.toString(),
            dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
              ? `${process.env.NEXT_PUBLIC_APP_URL}/kitchen/tasks`
              : undefined,
          },
          recipients: [
            {
              email: employee.email,
              employeeId: employee.id,
              name: [employee.firstName, employee.lastName]
                .filter(Boolean)
                .join(" "),
            },
          ],
        });

        if (triggerResult.triggered > 0) {
          result.sent += triggerResult.triggered;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Tenant ${tenantId}: ${message}`);
    }
  }

  return result;
}

/**
 * Process shift reminders for shifts starting within the next 2-12 hours
 * Uses ScheduleShift which has employeeId/locationId (no direct relations)
 */
async function processShiftReminders() {
  const result = { processed: 0, sent: 0, errors: [] as string[] };

  // Find shifts starting within 2-12 hours
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  // Find active shift reminder workflows
  const workflows = await database.emailWorkflow.findMany({
    where: {
      triggerType: "shift_reminder",
      isActive: true,
      deletedAt: null,
    },
    select: {
      tenantId: true,
    },
  });

  if (workflows.length === 0) {
    return result;
  }

  const tenantIds = [...new Set(workflows.map((w) => w.tenantId))];

  for (const tenantId of tenantIds) {
    try {
      // Find upcoming shifts
      const shifts = await database.scheduleShift.findMany({
        where: {
          tenantId,
          shift_start: {
            gte: twoHoursFromNow,
            lte: twelveHoursFromNow,
          },
          deletedAt: null,
        },
      });

      if (shifts.length === 0) {
        continue;
      }

      // Get unique employee IDs and location IDs
      const employeeIds = [...new Set(shifts.map((s) => s.employeeId))];
      const locationIds = [...new Set(shifts.map((s) => s.locationId))];

      // Fetch employees and locations separately
      const employees = await database.user.findMany({
        where: {
          tenantId,
          id: { in: employeeIds },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      const locations = await database.location.findMany({
        where: {
          tenantId,
          id: { in: locationIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Create lookup maps
      const employeeMap = new Map(employees.map((e) => [e.id, e]));
      const locationMap = new Map(locations.map((l) => [l.id, l]));

      for (const shift of shifts) {
        result.processed++;

        const employee = employeeMap.get(shift.employeeId);
        const location = locationMap.get(shift.locationId);

        if (!employee?.email) {
          continue;
        }

        const triggerResult = await triggerEmailWorkflows(database, {
          tenantId,
          triggerType: "shift_reminder",
          entity: {
            id: shift.id,
            type: "shift",
          },
          templateData: {
            shiftDate: shift.shift_start.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            shiftTime: shift.shift_start.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            shiftEndTime: shift.shift_end?.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            location: location?.name ?? "TBD",
            role: shift.role_during_shift ?? undefined,
            recipientName: [employee.firstName, employee.lastName]
              .filter(Boolean)
              .join(" "),
            dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
              ? `${process.env.NEXT_PUBLIC_APP_URL}/schedule`
              : undefined,
          },
          recipients: [
            {
              email: employee.email,
              employeeId: employee.id,
              name: [employee.firstName, employee.lastName]
                .filter(Boolean)
                .join(" "),
            },
          ],
        });

        if (triggerResult.triggered > 0) {
          result.sent += triggerResult.triggered;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Tenant ${tenantId}: ${message}`);
    }
  }

  return result;
}
