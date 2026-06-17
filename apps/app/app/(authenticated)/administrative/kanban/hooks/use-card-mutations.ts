"use client";

import { apiFetch } from "@/app/lib/api";
import * as routes from "@/app/lib/routes";
import {
  adminTaskAttachmentSoftDelete,
  adminTaskCommentCreate,
  adminTaskCommentSoftDelete,
  adminTaskCreate,
  adminTaskDevMetaCreate,
  adminTaskDevMetaUpdate,
  adminTaskFileRefCreate,
  adminTaskFileRefSoftDelete,
  adminTaskSoftDelete,
  adminTaskUpdate,
  listAdminTaskDevMetas,
} from "@/app/lib/manifest-client.generated";
import {
  mapAdminComment,
  mapAdminDevMeta,
  mapAdminFileRef,
  mapAdminTaskToKanban,
} from "../lib/admin-task-mappers";
import type {
  DevBugMeta,
  KanbanTask,
  TaskAttachment,
  TaskComment,
  TaskFileRef,
} from "../lib/board-types";

export interface MutationResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useCardMutations() {
  const createTask = async (
    data: Partial<KanbanTask>
  ): Promise<MutationResponse<KanbanTask>> => {
    try {
      const result = await adminTaskCreate({
        title: data.title,
        description: data.description ?? undefined,
        status: data.status,
        priority: data.priority,
        category: data.category ?? undefined,
        assignedTo: data.assignedTo ?? undefined,
        dueDate: data.dueDate ?? undefined,
        createdBy: data.createdBy ?? undefined,
        sourceType: data.sourceType ?? undefined,
        sourceId: data.sourceId ?? undefined,
        position: data.position,
        labels: data.labels,
        estimatedHours: data.estimatedHours ?? undefined,
      });

      if (!result) {
        return { success: false, error: "Failed to create task" };
      }

      return { success: true, data: mapAdminTaskToKanban(result) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const updateTask = async (
    id: string,
    data: Partial<KanbanTask>
  ): Promise<MutationResponse<KanbanTask>> => {
    try {
      const result = await adminTaskUpdate({
        id,
        title: data.title,
        description: data.description ?? undefined,
        status: data.status,
        priority: data.priority,
        category: data.category ?? undefined,
        assignedTo: data.assignedTo ?? undefined,
        dueDate: data.dueDate ?? undefined,
        position: data.position,
        labels: data.labels,
        estimatedHours: data.estimatedHours ?? undefined,
      });

      if (!result) {
        return { success: false, error: "Failed to update task" };
      }

      return { success: true, data: mapAdminTaskToKanban(result) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const deleteTask = async (id: string): Promise<MutationResponse<void>> => {
    try {
      const result = await adminTaskSoftDelete({ id });
      if (!result) {
        return { success: false, error: "Failed to delete task" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const addComment = async (
    taskId: string,
    text: string
  ): Promise<MutationResponse<TaskComment>> => {
    try {
      const result = await adminTaskCommentCreate({
        taskId,
        text,
        authorName: "User",
      });

      if (!result) {
        return { success: false, error: "Failed to add comment" };
      }

      return { success: true, data: mapAdminComment(result) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const deleteComment = async (
    _taskId: string,
    commentId: string
  ): Promise<MutationResponse<void>> => {
    try {
      const result = await adminTaskCommentSoftDelete({ id: commentId });
      if (!result) {
        return { success: false, error: "Failed to delete comment" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // NOTE: File upload still requires the REST route for blob storage handling.
  const addAttachment = async (
    taskId: string,
    data: FormData
  ): Promise<MutationResponse<TaskAttachment>> => {
    try {
      const response = await apiFetch(routes.adminTaskAttachments(taskId), {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const deleteAttachment = async (
    _taskId: string,
    attachmentId: string
  ): Promise<MutationResponse<void>> => {
    try {
      const result = await adminTaskAttachmentSoftDelete({ id: attachmentId });
      if (!result) {
        return { success: false, error: "Failed to delete attachment" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const addFileRef = async (
    taskId: string,
    data: {
      refType: string;
      refId: string;
      refLabel: string;
    }
  ): Promise<MutationResponse<TaskFileRef>> => {
    try {
      const result = await adminTaskFileRefCreate({
        taskId,
        refType: data.refType,
        refId: data.refId,
        refLabel: data.refLabel,
      });

      if (!result) {
        return { success: false, error: "Failed to add file reference" };
      }

      return { success: true, data: mapAdminFileRef(result) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const deleteFileRef = async (
    _taskId: string,
    refId: string
  ): Promise<MutationResponse<void>> => {
    try {
      const result = await adminTaskFileRefSoftDelete({ id: refId });
      if (!result) {
        return { success: false, error: "Failed to delete file reference" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const createDevMeta = async (
    taskId: string,
    data: Partial<DevBugMeta>
  ): Promise<MutationResponse<DevBugMeta>> => {
    try {
      const result = await adminTaskDevMetaCreate({
        taskId,
        severity: data.severity ?? "",
        environment: data.environment ?? "",
        stepsToRepro: data.stepsToRepro ?? "",
        expectedResult: data.expectedResult ?? "",
        actualResult: data.actualResult ?? "",
      });

      if (!result) {
        return { success: false, error: "Failed to create dev meta" };
      }

      return { success: true, data: mapAdminDevMeta(result) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const updateDevMeta = async (
    taskId: string,
    data: Partial<DevBugMeta>
  ): Promise<MutationResponse<DevBugMeta>> => {
    try {
      const existing = (await listAdminTaskDevMetas()).data.find(
        (meta) => meta.taskId === taskId
      );
      if (!existing) {
        return { success: false, error: "Dev meta not found for task" };
      }

      const result = await adminTaskDevMetaUpdate({
        id: existing.id,
        severity: data.severity,
        environment: data.environment ?? undefined,
        stepsToRepro: data.stepsToRepro ?? undefined,
        expectedResult: data.expectedResult ?? undefined,
        actualResult: data.actualResult ?? undefined,
      });

      if (!result) {
        return { success: false, error: "Failed to update dev meta" };
      }

      return { success: true, data: mapAdminDevMeta(result) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return {
    createTask,
    updateTask,
    deleteTask,
    addComment,
    deleteComment,
    addAttachment,
    deleteAttachment,
    addFileRef,
    deleteFileRef,
    createDevMeta,
    updateDevMeta,
  };
}
