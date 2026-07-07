"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import type {
  KanbanTask,
  Employee,
  TaskComment,
  TaskAttachment,
  TaskActivity,
  DevBugMeta,
} from "../lib/board-types";
import { apiFetch } from "@/app/lib/api";
import * as routes from "@/app/lib/routes";
import type { useCardMutations } from "../hooks/use-card-mutations";

type TabKey = "details" | "comments" | "attachments" | "activity";

interface KanbanCardDetailProps {
  task: KanbanTask;
  employees: Employee[];
  open: boolean;
  onClose: () => void;
  onUpdate: (
    updated: Partial<KanbanTask> & { id: string }
  ) => void;
  mutations: ReturnType<typeof useCardMutations>;
  isDevMode: boolean;
}

export function KanbanCardDetail({
  task,
  employees,
  open,
  onClose,
  onUpdate,
  mutations,
}: KanbanCardDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [devMeta, setDevMeta] = useState<DevBugMeta | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<KanbanTask>>({});

  // Fetch tab data when switching tabs
  useEffect(() => {
    if (!open) return;
    if (activeTab === "comments") {
      apiFetch(routes.adminTaskComments(task.id))
        .then((res) => {
          if (res.ok) {
            return res
              .json()
              .then((data: { data?: TaskComment[] }) =>
                setComments(data.data ?? [])
              );
          }
          return undefined;
        })
        .catch(() => {});
    } else if (activeTab === "attachments") {
      apiFetch(routes.adminTaskAttachments(task.id))
        .then((res) => {
          if (res.ok) {
            return res
              .json()
              .then((data: { data?: TaskAttachment[] }) =>
                setAttachments(data.data ?? [])
              );
          }
          return undefined;
        })
        .catch(() => {});
    } else if (activeTab === "activity") {
      apiFetch(routes.adminTaskActivity(task.id))
        .then((res) => {
          if (res.ok) {
            return res
              .json()
              .then((data: { data?: TaskActivity[] }) =>
                setActivity(data.data ?? [])
              );
          }
          return undefined;
        })
        .catch(() => {});
    }
    // Load dev meta for bug tasks
    if (task.sourceType === "dev_bug") {
      apiFetch(routes.adminTaskDevMeta(task.id))
        .then((res) => {
          if (res.ok) {
            return res
              .json()
              .then((data: { data?: DevBugMeta | null }) =>
                setDevMeta(data.data ?? null)
              );
          }
          return undefined;
        })
        .catch(() => {});
    }
  }, [open, activeTab, task.id, task.sourceType]);

  const handleSaveEdit = useCallback(async () => {
    const result = await mutations.updateTask(task.id, editData);
    if (result.success) {
      onUpdate({
        id: task.id,
        ...editData,
      } as Partial<KanbanTask> & { id: string });
      setIsEditing(false);
    }
  }, [mutations, task.id, editData, onUpdate]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    const result = await mutations.addComment(task.id, commentText);
    if (result.success) {
      setCommentText("");
      // Refresh comments
      apiFetch(routes.adminTaskComments(task.id))
        .then((res) => {
          if (res.ok) {
            return res
              .json()
              .then((data: { data?: TaskComment[] }) =>
                setComments(data.data ?? [])
              );
          }
          return undefined;
        })
        .catch(() => {});
    }
  }, [mutations, task.id, commentText]);

  const handleDeleteTask = useCallback(async () => {
    const result = await mutations.deleteTask(task.id);
    if (result.success) {
      onClose();
    }
  }, [mutations, task.id, onClose]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "comments", label: "Comments" },
    { key: "attachments", label: "Attachments" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <Sheet
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      open={open}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {task.title}
            {task.sourceType === "dev_bug" ? (
              <Badge variant="destructive">Bug</Badge>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {activeTab === "details" && (
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      defaultValue={task.title}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      defaultValue={task.description ?? ""}
                      onChange={(e) =>
                        setEditData((d) => ({
                          ...d,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={task.priority}
                        onChange={(e) =>
                          setEditData((d) => ({
                            ...d,
                            priority: e.target.value as KanbanTask["priority"],
                          }))
                        }
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={task.assignedTo ?? ""}
                        onChange={(e) =>
                          setEditData((d) => ({
                            ...d,
                            assignedTo: e.target.value || null,
                          }))
                        }
                      >
                        <option value="">Unassigned</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} size="sm">
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {task.description || "No description"}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Priority:</span>{" "}
                      {task.priority}
                    </div>
                    <div>
                      <span className="font-medium">Assignee:</span>{" "}
                      {task.ownerName}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span>{" "}
                      {task.category || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Due:</span>{" "}
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  {task.labels.length > 0 && (
                    <div className="flex gap-1">
                      {task.labels.map((l) => (
                        <Badge key={l} variant="secondary">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsEditing(true)}
                      size="sm"
                      variant="outline"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={handleDeleteTask}
                      size="sm"
                      variant="destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}

              {/* Dev bug metadata */}
              {task.sourceType === "dev_bug" && devMeta && (
                <div className="space-y-2 rounded-md border p-3">
                  <h4 className="text-sm font-semibold">Bug Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Severity:</span>{" "}
                      {devMeta.severity}
                    </div>
                    <div>
                      <span className="font-medium">Environment:</span>{" "}
                      {devMeta.environment || "—"}
                    </div>
                  </div>
                  {devMeta.stepsToRepro && (
                    <div className="text-sm">
                      <span className="font-medium">Steps:</span>{" "}
                      {devMeta.stepsToRepro}
                    </div>
                  )}
                  {devMeta.expectedResult && (
                    <div className="text-sm">
                      <span className="font-medium">Expected:</span>{" "}
                      {devMeta.expectedResult}
                    </div>
                  )}
                  {devMeta.actualResult && (
                    <div className="text-sm">
                      <span className="font-medium">Actual:</span>{" "}
                      {devMeta.actualResult}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-3">
              {comments.map((c) => (
                <div className="rounded-md border p-2 text-sm" key={c.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1">{c.text}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                  placeholder="Add a comment..."
                  value={commentText}
                />
                <Button onClick={handleAddComment} size="sm">
                  Post
                </Button>
              </div>
            </div>
          )}

          {activeTab === "attachments" && (
            <div className="space-y-3">
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments</p>
              ) : (
                attachments.map((a) => (
                  <div
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                    key={a.id}
                  >
                    <div>
                      <span className="font-medium">{a.fileName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({(a.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      onClick={() =>
                        mutations.deleteAttachment(task.id, a.id)
                      }
                      size="sm"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity</p>
              ) : (
                activity.map((a) => (
                  <div className="flex items-start gap-2 text-sm" key={a.id}>
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <div>
                      <span className="font-medium">{a.actorName}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
