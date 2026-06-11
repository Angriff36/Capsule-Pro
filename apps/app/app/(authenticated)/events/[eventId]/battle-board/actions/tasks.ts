"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import {
  runManifestCommand,
} from "@/lib/manifest-command";

export interface CreateTimelineTaskInput {
  eventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  assigneeId?: string;
  dependencies?: string[];
}

export interface UpdateTimelineTaskInput {
  id: string;
  eventId: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  status?: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
  priority?: "low" | "medium" | "high" | "critical";
  category?: string;
  assigneeId?: string | null;
  progress?: number;
  dependencies?: string[];
  notes?: string;
}

export async function getTimelineTasks(eventId: string) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const tasks = await database.$queryRawUnsafe<
    Array<{
      id: string;
      event_id: string;
      title: string;
      description: string | null;
      startTime: string;
      endTime: string;
      status: string;
      priority: string;
      category: string;
      assignee_id: string | null;
      assignee_name: string | null;
      progress: number;
      dependencies: string[];
      is_on_critical_path: boolean;
      slack_minutes: number;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>
  >(
    `SELECT 
        t.id,
        t.event_id,
        t.title,
        t.description,
        t.start_time,
        t.end_time,
        t.status,
        t.priority,
        t.category,
        t.assignee_id,
        u.first_name || ' ' || u.last_name as assignee_name,
        t.progress,
        COALESCE(t.dependencies, ARRAY[]::text[]) as dependencies,
        t.is_on_critical_path,
        t.slack_minutes,
        t.notes,
        t.created_at,
        t.updated_at
      FROM tenant_events.timeline_tasks t
      LEFT JOIN tenant_staff.employees u ON u.tenant_id = t.tenant_id AND u.id = t.assignee_id
      WHERE t.tenant_id = $1
        AND t.event_id = $2
        AND t.deleted_at IS NULL
      ORDER BY t.start_time ASC`,
    tenantId,
    eventId
  );

  return tasks.map((task) => ({
    id: task.id,
    eventId: task.event_id,
    title: task.title,
    description: task.description ?? undefined,
    startTime: task.startTime,
    endTime: task.endTime,
    status: task.status as
      | "not_started"
      | "in_progress"
      | "completed"
      | "delayed"
      | "blocked",
    priority: task.priority as "low" | "medium" | "high" | "critical",
    category: task.category,
    assigneeId: task.assignee_id ?? undefined,
    assigneeName: task.assignee_name ?? undefined,
    progress: task.progress,
    dependencies: task.dependencies,
    isOnCriticalPath: task.is_on_critical_path,
    slackMinutes: task.slack_minutes,
    notes: task.notes ?? undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }));
}

export async function createTimelineTask(input: CreateTimelineTaskInput) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const result = await database.$queryRawUnsafe<
    Array<{ id: string; title: string }>
  >(
    `INSERT INTO tenant_events.timeline_tasks (
        tenant_id,
        event_id,
        title,
        description,
        start_time,
        end_time,
        status,
        priority,
        category,
        assignee_id,
        progress,
        dependencies,
        is_on_critical_path,
        slack_minutes,
        created_at,
        updated_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'not_started',
        $7,
        $8,
        $9,
        0,
        $10,
        false,
        0,
        NOW(),
        NOW()
      )
      RETURNING id, title`,
    [
      tenantId,
      input.eventId,
      input.title,
      input.description ?? null,
      input.startTime,
      input.endTime,
      input.priority,
      input.category,
      input.assigneeId ?? null,
      input.dependencies ?? [],
    ]
  );

  revalidatePath(`/events/${input.eventId}/battle-board`);

  const returned = result[0];
  if (!returned) {
    return { success: false, error: "Failed to create task" };
  }

  return { success: true, taskId: returned.id };
}

export async function updateTimelineTask(input: UpdateTimelineTaskInput) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const updates: string[] = [];
  const values: (string | number | null | string[])[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    values.push(input.title);
    paramIndex += 1;
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    values.push(input.description);
    paramIndex += 1;
  }
  if (input.startTime !== undefined) {
    updates.push(`start_time = $${paramIndex}`);
    values.push(input.startTime);
    paramIndex += 1;
  }
  if (input.endTime !== undefined) {
    updates.push(`end_time = $${paramIndex}`);
    values.push(input.endTime);
    paramIndex += 1;
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    values.push(input.status);
    paramIndex += 1;
  }
  if (input.priority !== undefined) {
    updates.push(`priority = $${paramIndex}`);
    values.push(input.priority);
    paramIndex += 1;
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex}`);
    values.push(input.category);
    paramIndex += 1;
  }
  if (input.assigneeId !== undefined) {
    updates.push(`assignee_id = $${paramIndex}`);
    values.push(input.assigneeId);
    paramIndex += 1;
  }
  if (input.progress !== undefined) {
    updates.push(`progress = $${paramIndex}`);
    values.push(input.progress);
    paramIndex += 1;
  }
  if (input.dependencies !== undefined) {
    updates.push(`dependencies = $${paramIndex}::text[]`);
    values.push(input.dependencies);
    paramIndex += 1;
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    values.push(input.notes);
    paramIndex += 1;
  }

  updates.push("updated_at = NOW()");

  // Add WHERE clause parameters - use current paramIndex for tenant_id
  const tenantParamIndex = paramIndex;
  const idParamIndex = paramIndex + 1;
  const eventIdParamIndex = paramIndex + 2;

  values.push(tenantId, input.id, input.eventId);

  const updateQuery = `UPDATE tenant_events.timeline_tasks SET ${updates.join(", ")} WHERE tenant_id = $${tenantParamIndex} AND id = $${idParamIndex} AND event_id = $${eventIdParamIndex}`;

  await database.$executeRawUnsafe(updateQuery, ...values);

  revalidatePath(`/events/${input.eventId}/battle-board`);

  return { success: true };
}

export async function deleteTimelineTask(taskId: string, eventId: string) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  await database.$executeRawUnsafe(
    `UPDATE tenant_events.timeline_tasks
     SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND event_id = $3`,
    tenantId,
    taskId,
    eventId
  );

  revalidatePath(`/events/${eventId}/battle-board`);

  return { success: true };
}

export async function getEventStaff(eventId: string) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const staff = await database.$queryRawUnsafe<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      role: string;
      avatar_url: string | null;
      is_active: boolean;
    }>
  >(
    `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.role,
        u.avatar_url,
        u.is_active
      FROM tenant_staff.employees u
      WHERE u.tenant_id = $1
        AND u.deleted_at IS NULL
        AND u.is_active = true
      ORDER BY u.first_name, u.last_name`,
    tenantId
  );

  const assignments = await database.$queryRawUnsafe<
    Array<{
      employeeId: string;
      task_count: bigint;
    }>
  >(
    `SELECT 
        assignee_id as employee_id,
        COUNT(*) as task_count
      FROM tenant_events.timeline_tasks
      WHERE tenant_id = $1
        AND event_id = $2
        AND deleted_at IS NULL
        AND assignee_id IS NOT NULL
      GROUP BY assignee_id`,
    tenantId,
    eventId
  );

  const assignmentMap = new Map(
    assignments.map((a) => [a.employeeId, Number(a.task_count)])
  );

  return staff.map((s) => {
    const taskCount = assignmentMap.get(s.id) ?? 0;
    let availability: "available" | "at_capacity" | "overbooked";
    if (taskCount === 0) {
      availability = "available";
    } else if (taskCount < 3) {
      availability = "at_capacity";
    } else {
      availability = "overbooked";
    }

    return {
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      role: s.role,
      avatarUrl: s.avatar_url ?? undefined,
      availability,
      currentTaskCount: taskCount,
      skills: [],
    };
  });
}

export async function getAvailableEmployees(eventId: string) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get employees NOT already assigned to this event
  const employees = await database.$queryRawUnsafe<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      role: string;
      avatar_url: string | null;
    }>
  >(
    `SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.role,
        e.avatar_url
      FROM tenant_staff.employees e
      WHERE e.tenant_id = $1
        AND e.deleted_at IS NULL
        AND e.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM tenant_events.event_staff esa
          WHERE esa."tenantId" = e.tenant_id::text
            AND esa."staffMemberId" = e.id::text
            AND esa."eventId" = $2
            AND esa."deletedAt" IS NULL
        )
      ORDER BY e.first_name, e.last_name`,
    tenantId,
    eventId
  );

  return employees.map((emp) => ({
    id: emp.id,
    name: `${emp.first_name} ${emp.last_name}`,
    role: emp.role,
    avatarUrl: emp.avatar_url ?? undefined,
  }));
}

export async function addEventStaff(
  eventId: string,
  employeeId: string,
  role = "staff"
) {
  const user = await requireCurrentUser();

  // Verify the employee exists and is active (read-only check before command)
  const employee = await database.$queryRawUnsafe<
    Array<{ id: string; first_name: string; last_name: string }>
  >(
    `SELECT id, first_name, last_name
     FROM tenant_staff.employees
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
       AND is_active = true`,
    user.tenantId,
    employeeId
  );

  if (employee.length === 0) {
    throw new Error("Employee not found or inactive");
  }

  // Placeholder shift = event date (no real shift schedule from this flow).
  const eventRow = await database.$queryRaw<Array<{ event_date: Date | null }>>`
    SELECT event_date FROM tenant_events.events
    WHERE tenant_id = ${user.tenantId}::uuid AND id = ${eventId}::uuid AND deleted_at IS NULL`;
  const shiftPlaceholder = (eventRow[0]?.event_date ?? new Date()).toISOString();

  // Route through Manifest runtime (EventStaff.assign) instead of raw SQL
  const result = await runManifestCommand({
    entity: "EventStaff",
    command: "assign",
    body: {
      eventId,
      staffMemberId: employeeId,
      role,
      notes: "",
      shiftStart: shiftPlaceholder,
      shiftEnd: shiftPlaceholder,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    // Manifest handles duplicate detection via guards/constraints
    throw new Error(`Failed to assign staff: ${result.message}`);
  }

  revalidatePath(`/events/${eventId}/battle-board`);

  return {
    success: true,
    employeeName: `${employee[0].first_name} ${employee[0].last_name}`,
  };
}

/**
 * Calculate and update the critical path for all tasks in an event.
 *
 * This function:
 * 1. Fetches all tasks for the event
 * 2. Calculates the critical path using the CPM algorithm
 * 3. Updates the is_on_critical_path and slack_minutes fields for each task
 * 4. Returns the updated critical path results
 *
 * @param eventId - The ID of the event
 * @returns Map of task ID to critical path calculation results
 */
export async function calculateCriticalPath(eventId: string) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch all tasks for the event
  const tasks = await database.$queryRawUnsafe<
    Array<{
      id: string;
      startTime: string;
      endTime: string;
      dependencies: string[];
    }>
  >(
    `SELECT
        id,
        start_time,
        end_time,
        COALESCE(dependencies, ARRAY[]::text[]) as dependencies
      FROM tenant_events.timeline_tasks
      WHERE tenant_id = $1
        AND event_id = $2
        AND deleted_at IS NULL
      ORDER BY start_time ASC`,
    tenantId,
    eventId
  );

  if (tasks.length === 0) {
    return new Map();
  }

  // Import the CPM algorithm
  const { calculateCriticalPath: cpm } = await import("@repo/database");

  // Transform tasks to the format expected by the CPM algorithm
  const tasksForCPM = tasks.map((task) => ({
    id: task.id,
    startTime: new Date(task.startTime),
    endTime: new Date(task.endTime),
    dependencies: task.dependencies,
  }));

  // Calculate the critical path
  const results = cpm(tasksForCPM);

  // Update each task with its critical path status and slack
  for (const [taskId, result] of results) {
    await database.$executeRawUnsafe(
      `UPDATE tenant_events.timeline_tasks
       SET is_on_critical_path = $1,
           slack_minutes = $2,
           updated_at = NOW()
       WHERE tenant_id = $3
         AND id = $4
         AND event_id = $5`,
      result.isOnCriticalPath,
      result.slackMinutes,
      tenantId,
      taskId,
      eventId
    );
  }

  revalidatePath(`/events/${eventId}/battle-board`);

  return results;
}
