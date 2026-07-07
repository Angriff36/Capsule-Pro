"use client";

import { apiFetch } from "@/app/lib/api";
import * as routes from "@/app/lib/routes";
import type {
  KanbanTask,
  TaskComment,
  TaskAttachment,
  TaskFileRef,
  DevBugMeta,
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
      const response = await apiFetch(routes.adminTasks(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const updateTask = async (
    id: string,
    data: Partial<KanbanTask>
  ): Promise<MutationResponse<KanbanTask>> => {
    try {
      const response = await apiFetch(routes.adminTask(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const deleteTask = async (id: string): Promise<MutationResponse<void>> => {
    try {
      const response = await apiFetch(routes.adminTask(id), {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
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
      const response = await apiFetch(routes.adminTaskComments(taskId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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

  const deleteComment = async (
    taskId: string,
    commentId: string
  ): Promise<MutationResponse<void>> => {
    try {
      const response = await apiFetch(
        routes.adminTaskComment(taskId, commentId),
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

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
    taskId: string,
    attachmentId: string
  ): Promise<MutationResponse<void>> => {
    try {
      const response = await apiFetch(
        routes.adminTaskAttachment(taskId, attachmentId),
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
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
      const response = await apiFetch(routes.adminTaskFileRefs(taskId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const deleteFileRef = async (
    taskId: string,
    refId: string
  ): Promise<MutationResponse<void>> => {
    try {
      const response = await apiFetch(
        routes.adminTaskFileRef(taskId, refId),
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
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
      const response = await apiFetch(routes.adminTaskDevMeta(taskId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const updateDevMeta = async (
    taskId: string,
    data: Partial<DevBugMeta>
  ): Promise<MutationResponse<DevBugMeta>> => {
    try {
      const response = await apiFetch(routes.adminTaskDevMeta(taskId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
