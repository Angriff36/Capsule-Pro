import type {
  AdminTask,
  AdminTaskAttachment,
  AdminTaskComment,
  AdminTaskDevMeta,
  AdminTaskFileRef,
} from "@/app/lib/manifest-types.generated";
import type {
  DevBugMeta,
  KanbanTask,
  TaskAttachment,
  TaskComment,
  TaskFileRef,
} from "./board-types";

export function mapAdminTaskToKanban(task: AdminTask): KanbanTask {
  return {
    id: task.id,
    title: task.title ?? "",
    description: task.description ?? null,
    status: task.status ?? "backlog",
    priority: (task.priority ?? "medium") as KanbanTask["priority"],
    category: task.category ?? null,
    position: task.position ?? 0,
    labels: Array.isArray(task.labels)
      ? (task.labels as string[])
      : [],
    estimatedHours: task.estimatedHours ?? null,
    dueDate: task.dueDate ?? null,
    assignedTo: task.assignedTo ?? null,
    createdBy: task.createdBy ?? null,
    sourceType: task.sourceType ?? null,
    sourceId: task.sourceId ?? null,
    ownerName: "Unassigned",
  };
}

export function mapAdminComment(comment: AdminTaskComment): TaskComment {
  return {
    id: comment.id,
    taskId: comment.taskId ?? "",
    authorId: comment.authorId ?? null,
    authorName: comment.authorName ?? "Unknown",
    text: comment.text ?? "",
    createdAt: comment.createdAt,
  };
}

export function mapAdminAttachment(
  attachment: AdminTaskAttachment
): TaskAttachment {
  return {
    id: attachment.id,
    taskId: attachment.taskId ?? "",
    fileName: attachment.fileName ?? "",
    fileUrl: attachment.fileUrl ?? "",
    fileSize: attachment.fileSize ?? 0,
    mimeType: attachment.mimeType ?? "",
    uploadedBy: attachment.uploadedBy ?? null,
    createdAt: attachment.createdAt,
  };
}

export function mapAdminFileRef(ref: AdminTaskFileRef): TaskFileRef {
  return {
    id: ref.id,
    taskId: ref.taskId ?? "",
    refType: ref.refType ?? "",
    refId: ref.refId ?? "",
    refLabel: ref.refLabel ?? "",
    linkedBy: ref.linkedBy ?? null,
    createdAt: ref.createdAt,
  };
}

export function mapAdminDevMeta(meta: AdminTaskDevMeta): DevBugMeta {
  return {
    id: meta.id,
    taskId: meta.taskId ?? "",
    severity: meta.severity ?? "",
    environment: meta.environment ?? null,
    stepsToRepro: meta.stepsToRepro ?? null,
    expectedResult: meta.expectedResult ?? null,
    actualResult: meta.actualResult ?? null,
  };
}
