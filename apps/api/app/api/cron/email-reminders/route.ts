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
import {
  buildTaskRecipients,
  buildTaskTemplateData,
  triggerEmailWorkflows,
} from "@repo/notifications";
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
      // Find tasks due soon that have assigned employees
      const tasks = await database.kitchen_tasks.findMany({
        where: {
          tenant_id: tenantId,
          due_date: {
            gte: now,
            lte: twentyFourHoursFromNow,
          },
          status: {
            notIn: ["completed", "cancelled"],
          },
          assigned_employee_id: { not: null },
        },
        include: {
          employee: {
            select: {
              email: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      for (const task of tasks) {
        result.processed++;

        if (!task.employee?.email) {
          continue;
        }

        const triggerResult = await triggerEmailWorkflows(database, {
          tenantId,
          triggerType: "task_reminder",
          entity: {
            id: task.id,
            type: "task",
          },
          templateData: buildTaskTemplateData({
            name: task.task_name,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority,
          }),
          recipients: buildTaskRecipients({
            assigned_employee_id: task.assigned_employee_id,
            employee: task.employee,
          }),
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
      const shifts = await database.scheduled_shifts.findMany({
        where: {
          tenant_id: tenantId,
          start_time: {
            gte: twoHoursFromNow,
            lte: twelveHoursFromNow,
          },
          status: "scheduled",
        },
        include: {
          employee: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          location: {
            select: {
              name: true,
            },
          },
        },
      });

      for (const shift of shifts) {
        result.processed++;

        if (!shift.employee?.email) {
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
            shiftDate: shift.start_time.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            shiftTime: shift.start_time.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            shiftEndTime: shift.end_time?.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            location: shift.location?.name ?? "TBD",
            role: shift.role ?? undefined,
            recipientName: [shift.employee.first_name, shift.employee.last_name]
              .filter(Boolean)
              .join(" "),
            dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
              ? `${process.env.NEXT_PUBLIC_APP_URL}/schedule`
              : undefined,
          },
          recipients: [
            {
              email: shift.employee.email,
              employeeId: shift.employee.id,
              name: [shift.employee.first_name, shift.employee.last_name]
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
