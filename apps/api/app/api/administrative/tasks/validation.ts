import { z } from "zod";

// ============ Constants ============

// Authoritative AdminTask states — the operational Kanban's four columns
// (backlog/in_progress/review/done) plus the `cancelled` side-state. Mirrors
// the state machine in manifest/source/admin-task-rules.manifest. (`todo` was
// removed; no product surface used it. The Kanban v2 dev-mode columns
// `blocked`/`ready_for_qa` are NOT yet part of the state machine — they need
// new commands/transitions in admin-task-rules.manifest before they can be
// accepted here.)
export const ADMIN_TASK_STATUSES = [
  "backlog",
  "in_progress",
  "review",
  "done",
  "cancelled",
] as const;

export const ADMIN_TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

// ============ Create Schema ============

export const CreateAdminTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(ADMIN_TASK_STATUSES).default("backlog"),
  priority: z.enum(ADMIN_TASK_PRIORITIES).default("medium"),
  category: z.string().max(100).optional(),
  dueDate: z
    .union([z.iso.datetime({ offset: true }), z.iso.date()])
    .transform((str) => new Date(str))
    .optional(),
  assignedTo: z.uuid({ error: "assignedTo must be a valid UUID" }).optional(),
  sourceType: z.string().max(100).optional(),
  sourceId: z.uuid({ error: "sourceId must be a valid UUID" }).optional(),
});

export type CreateAdminTaskInput = z.infer<typeof CreateAdminTaskSchema>;

// ============ Update Schema ============

export const UpdateAdminTaskSchema = z
  .object({
    title: z.string().min(1, "Title cannot be empty").max(500),
    description: z.string().max(5000).nullable(),
    status: z.enum(ADMIN_TASK_STATUSES),
    priority: z.enum(ADMIN_TASK_PRIORITIES),
    category: z.string().max(100).nullable(),
    dueDate: z
      .union([z.iso.datetime({ offset: true }), z.iso.date()])
      .transform((str) => new Date(str))
      .nullable(),
    assignedTo: z.uuid({ error: "assignedTo must be a valid UUID" }).nullable(),
    sourceType: z.string().max(100).nullable(),
    sourceId: z.uuid({ error: "sourceId must be a valid UUID" }).nullable(),
  })
  .partial()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    error: "At least one field must be provided for update",
  });

export type UpdateAdminTaskInput = z.infer<typeof UpdateAdminTaskSchema>;

// ============ Query Filters ============

export const AdminTaskFiltersSchema = z.object({
  status: z.enum(ADMIN_TASK_STATUSES).optional(),
  priority: z.enum(ADMIN_TASK_PRIORITIES).optional(),
  category: z.string().optional(),
  assignedTo: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminTaskFilters = z.infer<typeof AdminTaskFiltersSchema>;
