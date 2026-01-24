"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimelineTasks = getTimelineTasks;
exports.createTimelineTask = createTimelineTask;
exports.updateTimelineTask = updateTimelineTask;
exports.deleteTimelineTask = deleteTimelineTask;
exports.getEventStaff = getEventStaff;
exports.calculateCriticalPath = calculateCriticalPath;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const cache_1 = require("next/cache");
const tenant_1 = require("../../../../../lib/tenant");
async function getTimelineTasks(eventId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const event = await database_1.database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });
  if (!event) {
    throw new Error("Event not found");
  }
  const tasks = await database_1.database.$queryRawUnsafe(
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
        u.first_name || '' || u.last_name || '' as assignee_name,
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
    [tenantId, eventId]
  );
  return tasks.map((task) => ({
    id: task.id,
    eventId: task.event_id,
    title: task.title,
    description: task.description ?? undefined,
    startTime: task.start_time,
    endTime: task.end_time,
    status: task.status,
    priority: task.priority,
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
async function createTimelineTask(input) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const result = await database_1.database.$queryRawUnsafe(
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
  (0, cache_1.revalidatePath)(`/events/${input.eventId}/battle-board`);
  const returned = result[0];
  if (!returned) {
    return { success: false, error: "Failed to create task" };
  }
  return { success: true, taskId: returned.id };
}
async function updateTimelineTask(input) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const updates = [];
  const values = [];
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
  values.push(tenantId, input.id, input.eventId);
  paramIndex += 3;
  const updateQuery = `UPDATE tenant_events.timeline_tasks SET ${updates.join(", ")} WHERE tenant_id = $${paramIndex - 2} AND id = $${paramIndex - 1} AND event_id = $${paramIndex}`;
  await database_1.database.$executeRawUnsafe(updateQuery, values);
  (0, cache_1.revalidatePath)(`/events/${input.eventId}/battle-board`);
  return { success: true };
}
async function deleteTimelineTask(taskId, eventId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  await database_1.database.$executeRawUnsafe(
    `UPDATE tenant_events.timeline_tasks
     SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND event_id = $3`,
    [tenantId, taskId, eventId]
  );
  (0, cache_1.revalidatePath)(`/events/${eventId}/battle-board`);
  return { success: true };
}
async function getEventStaff(eventId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const staff = await database_1.database.$queryRawUnsafe(
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
    [tenantId]
  );
  const assignments = await database_1.database.$queryRawUnsafe(
    `SELECT 
        assignee_id as employee_id,
        COUNT(*) as task_count
      FROM tenant_events.timeline_tasks
      WHERE tenant_id = $1
        AND event_id = $2
        AND deleted_at IS NULL
        AND assignee_id IS NOT NULL
      GROUP BY assignee_id`,
    [tenantId, eventId]
  );
  const assignmentMap = new Map(
    assignments.map((a) => [a.employee_id, Number(a.task_count)])
  );
  return staff.map((s) => {
    const taskCount = assignmentMap.get(s.id) ?? 0;
    let availability;
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
async function calculateCriticalPath(eventId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Fetch all tasks for the event
  const tasks = await database_1.database.$queryRawUnsafe(
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
    [tenantId, eventId]
  );
  if (tasks.length === 0) {
    return new Map();
  }
  // Import the CPM algorithm
  const { calculateCriticalPath: cpm } = await import("@repo/database");
  // Transform tasks to the format expected by the CPM algorithm
  const tasksForCPM = tasks.map((task) => ({
    id: task.id,
    startTime: new Date(task.start_time),
    endTime: new Date(task.end_time),
    dependencies: task.dependencies,
  }));
  // Calculate the critical path
  const results = cpm(tasksForCPM);
  // Update each task with its critical path status and slack
  for (const [taskId, result] of results) {
    await database_1.database.$executeRawUnsafe(
      `UPDATE tenant_events.timeline_tasks
       SET is_on_critical_path = $1,
           slack_minutes = $2,
           updated_at = NOW()
       WHERE tenant_id = $3
         AND id = $4
         AND event_id = $5`,
      [result.isOnCriticalPath, result.slackMinutes, tenantId, taskId, eventId]
    );
  }
  (0, cache_1.revalidatePath)(`/events/${eventId}/battle-board`);
  return results;
}
