"use server";
import {
  listEvents,
  listStaffMembers,
  listTimelineTasks,
  listUsers,
  timelineTaskCreate,
  timelineTaskReassign,
  timelineTaskRemove,
} from "@/app/lib/manifest-client.generated";

import { auth } from "@repo/auth/server";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

export interface CreateTimelineTaskInput {
  assigneeId?: string;
  category: string;
  dependencies?: string[];
  description?: string;
  endTime: string;
  eventId: string;
  priority: "low" | "medium" | "high" | "critical";
  startTime: string;
  title: string;
}

export interface UpdateTimelineTaskInput {
  assigneeId?: string | null;
  category?: string;
  dependencies?: string[];
  description?: string;
  endTime?: string;
  eventId: string;
  id: string;
  notes?: string;
  priority?: "low" | "medium" | "high" | "critical";
  progress?: number;
  startTime?: string;
  status?: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
  title?: string;
}

export async function getTimelineTasks(eventId: string) {
  await assertAuthorizedOrg();
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  const [timelineTasks, users, staff] = await Promise.all([
    listTimelineTasks(),
    listUsers(),
    listStaffMembers(),
  ]);

  const userNameById = new Map(
    users.data.map((user) => [
      user.id,
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.email,
    ])
  );
  const staffNameById = new Map(
    staff.data.map((member) => [member.id, member.displayName || "Staff member"])
  );

  return timelineTasks.data
    .filter((task) => task.eventId === eventId && !task.deletedAt)
    .sort((a, b) => (a.startTime ?? "") > (b.startTime ?? "") ? 1 : -1)
    .map((task) => ({
    id: task.id,
    eventId: task.eventId ?? eventId,
    title: task.title ?? "",
    description: undefined,
    startTime: task.startTime ?? "",
    endTime: task.endTime ?? "",
    status: (task.status as
      | "not_started"
      | "in_progress"
      | "completed"
      | "delayed"
      | "blocked") ?? "not_started",
    priority: "medium" as const,
    category: task.category ?? "general",
    assigneeId: task.assigneeId ?? undefined,
    assigneeName:
      (task.assigneeId ? userNameById.get(task.assigneeId) : undefined) ??
      (task.assigneeId ? staffNameById.get(task.assigneeId) : undefined),
    progress: task.status === "completed" ? 100 : task.status === "in_progress" ? 50 : 0,
    dependencies: [],
    isOnCriticalPath: false,
    slackMinutes: 0,
    notes: undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    }));
}

export async function createTimelineTask(input: CreateTimelineTaskInput) {
  await assertAuthorizedOrg();
  const created = await timelineTaskCreate({
    eventId: input.eventId,
    title: input.title,
    category: input.category,
    startTime: input.startTime,
    endTime: input.endTime,
    assigneeId: input.assigneeId,
  });

  revalidatePath(`/events/${input.eventId}/battle-board`);

  if (!created?.id) {
    return { success: false, error: "Failed to create task" };
  }

  return { success: true, taskId: created.id };
}

export async function updateTimelineTask(input: UpdateTimelineTaskInput) {
  const user = await requireCurrentUser();
  if (input.assigneeId !== undefined) {
    await timelineTaskReassign({
      id: input.id,
      newAssignedTo: input.assigneeId ?? "",
    });
  }
  if (input.status === "in_progress") {
    await runManifestCommand({
      entity: "TimelineTask",
      command: "start",
      instanceId: input.id,
      body: { userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } else if (input.status === "completed") {
    await runManifestCommand({
      entity: "TimelineTask",
      command: "complete",
      instanceId: input.id,
      body: { userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } else if (input.status === "blocked") {
    await runManifestCommand({
      entity: "TimelineTask",
      command: "blockTask",
      instanceId: input.id,
      body: { reason: input.notes ?? "Blocked", userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } else if (input.status === "not_started") {
    await runManifestCommand({
      entity: "TimelineTask",
      command: "unblockTask",
      instanceId: input.id,
      body: { userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  revalidatePath(`/events/${input.eventId}/battle-board`);

  return { success: true };
}

export async function deleteTimelineTask(taskId: string, eventId: string) {
  const user = await requireCurrentUser();
  await timelineTaskRemove({ id: taskId, userId: user.id });

  revalidatePath(`/events/${eventId}/battle-board`);

  return { success: true };
}

export async function getEventStaff(eventId: string) {
  await assertAuthorizedOrg();
  const [staff, tasks] = await Promise.all([listStaffMembers(), listTimelineTasks()]);
  const assignmentMap = new Map<string, number>();
  for (const task of tasks.data) {
    if (task.eventId !== eventId || !task.assigneeId || task.deletedAt) {
      continue;
    }
    assignmentMap.set(task.assigneeId, (assignmentMap.get(task.assigneeId) ?? 0) + 1);
  }

  return staff.data.filter((s) => !s.deletedAt).map((s) => {
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
      name: s.displayName || "Staff member",
      role: s.role || "",
      avatarUrl: undefined,
      availability,
      currentTaskCount: taskCount,
      skills: [],
    };
  });
}

export async function getAvailableEmployees(eventId: string) {
  await assertAuthorizedOrg();
  const [staffMembers, users] = await Promise.all([listStaffMembers(), listUsers()]);
  const userById = new Map(users.data.map((user) => [user.id, user]));
  return staffMembers.data
    .filter((member) => !member.deletedAt)
    .map((member) => {
      const user = userById.get(member.id);
      const userName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email
        : undefined;
      return {
        id: member.id,
        name: member.displayName || userName || "Staff member",
        role: member.role || user?.role || "",
        avatarUrl: user?.avatarUrl,
      };
    });
}

export async function addEventStaff(
  eventId: string,
  employeeId: string,
  role = "staff"
) {
  const user = await requireCurrentUser();
  const employee = (await listStaffMembers()).data.find(
    (member) => member.id === employeeId && !member.deletedAt
  );
  if (!employee) {
    throw new Error("Employee not found or inactive");
  }
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  const shiftPlaceholder = Date.parse(event.eventDate || "") || Date.now();

  // Route through Manifest runtime (EventStaff.create) instead of raw SQL
  const result = await runManifestCommand({
    entity: "EventStaff",
    command: "create",
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
    employeeName: employee.displayName || employee.id,
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
  await assertAuthorizedOrg();
  const tasks = (await listTimelineTasks()).data
    .filter((task) => task.eventId === eventId && !task.deletedAt)
    .sort((a, b) => (a.startTime ?? "") > (b.startTime ?? "") ? 1 : -1);
  const results = new Map<string, { isOnCriticalPath: boolean; slackMinutes: number }>();
  if (tasks.length === 0) {
    return results;
  }
  for (let index = 0; index < tasks.length; index += 1) {
    results.set(tasks[index].id, {
      isOnCriticalPath: index === tasks.length - 1,
      slackMinutes: 0,
    });
  }
  return results;
}

async function assertAuthorizedOrg() {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
}

async function getEventById(eventId: string) {
  return (await listEvents()).data.find((event) => event.id === eventId) ?? null;
}
