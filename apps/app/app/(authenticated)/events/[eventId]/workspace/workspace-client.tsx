"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Activity,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  eventDate: Date;
  status: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  status: string;
  layoutConfig?: Record<string, unknown>;
  members: WorkspaceMember[];
}

interface WorkspaceTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: Date | null;
  position: number;
  version: number;
  assignee?: WorkspaceUser;
  comments: WorkspaceComment[];
  _count?: {
    comments: number;
  };
}

interface WorkspaceComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

interface WorkspaceActivity {
  id: string;
  activityType: string;
  action: string;
  title: string;
  description: string | null;
  performedBy: string | null;
  performerName: string | null;
  createdAt: Date;
}

interface EventWorkspaceClientProps {
  event: Event;
  workspace: Workspace;
  users: WorkspaceUser[];
  tenantId: string;
  userId: string;
}

type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  blocked: <div className="h-4 w-4 rounded-full bg-red-500" />,
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

export function EventWorkspaceClient({
  event,
  workspace,
  users,
  tenantId,
  userId,
}: EventWorkspaceClientProps) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);
  const [newComment, setNewComment] = useState("");
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>({});

  // Fetch initial data
  useEffect(() => {
    Promise.all([fetchTasks(), fetchActivities()]);
  }, [workspace.id]);

  // Simulate real-time user presence
  useEffect(() => {
    const interval = setInterval(() => {
      workspace.members.forEach((member) => {
        if (member.userId !== userId) {
          setUserStatuses((prev) => ({
            ...prev,
            [member.userId]: Math.random() > 0.3 ? "online" : "away",
          }));
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [workspace.members, userId]);

  // Set current user as online
  useEffect(() => {
    setUserStatuses((prev) => ({ ...prev, [userId]: "online" }));
  }, [userId]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/events/workspaces/tasks/list?workspaceId=${workspace.id}`
      );
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks ?? []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id]);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/events/workspaces/${workspace.id}/activity?limit=20`
      );
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities ?? []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [workspace.id]);

  const createTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch("/api/events/workspaces/tasks/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          title: newTaskTitle,
          description: newTaskDescription || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTasks((prev) => [...prev, data.task]);
        setNewTaskTitle("");
        setNewTaskDescription("");
        fetchActivities(); // Refresh activities
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  }, [workspace.id, newTaskTitle, newTaskDescription, fetchActivities]);

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const response = await fetch(`/api/events/workspaces/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            version: task.version,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
          );
          fetchActivities();
        }
      } catch (error) {
        console.error("Error updating task:", error);
      }
    },
    [tasks, fetchActivities]
  );

  const assignTask = useCallback(
    async (taskId: string, assignedTo: string | null) => {
      try {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const response = await fetch(`/api/events/workspaces/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedTo,
            version: task.version,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
          );
          fetchActivities();
        }
      } catch (error) {
        console.error("Error assigning task:", error);
      }
    },
    [tasks, fetchActivities]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        const response = await fetch(`/api/events/workspaces/tasks/${taskId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          if (selectedTask?.id === taskId) {
            setSelectedTask(null);
          }
          fetchActivities();
        }
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    },
    [selectedTask, fetchActivities]
  );

  const addComment = useCallback(async () => {
    if (!(selectedTask && newComment.trim())) return;

    try {
      const response = await fetch(
        `/api/events/workspaces/tasks/${selectedTask.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: newComment,
            contentType: "text",
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        const updatedTask = {
          ...selectedTask,
          comments: [...selectedTask.comments, data.comment],
        };
        setTasks((prev) =>
          prev.map((t) => (t.id === selectedTask.id ? updatedTask : t))
        );
        setSelectedTask(updatedTask);
        setNewComment("");
        fetchActivities();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }, [selectedTask, newComment, fetchActivities]);

  const tasksByStatus = tasks.reduce(
    (acc, task) => {
      if (!acc[task.status as TaskStatus]) {
        acc[task.status as TaskStatus] = [];
      }
      acc[task.status as TaskStatus].push(task);
      return acc;
    },
    {} as Record<TaskStatus, WorkspaceTask[]>
  );

  const canEdit = workspace.members.some(
    (m) => m.userId === userId && (m.role === "owner" || m.role === "editor")
  );

  return (
    <div className="flex h-[calc(100vh-theme-spacing.14)] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Header */}
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{workspace.name}</h1>
              <p className="text-sm text-muted-foreground">
                {workspace.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Online Users */}
              <div className="flex -space-x-2">
                {workspace.members.slice(0, 4).map((member) => (
                  <Avatar
                    className="h-8 w-8 border-2 border-background"
                    key={member.id}
                    title={member.name}
                  >
                    <AvatarImage src={member.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                    {userStatuses[member.userId] === "online" && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </Avatar>
                ))}
                {workspace.members.length > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                    +{workspace.members.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs className="h-full flex flex-col" defaultValue="tasks">
            <div className="px-6 pt-4">
              <TabsList>
                <TabsTrigger value="tasks">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Tasks ({tasks.length})
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tasks Tab */}
            <TabsContent
              className="flex-1 overflow-hidden p-6 pt-4"
              value="tasks"
            >
              <div className="flex h-full gap-4">
                {/* Kanban Board */}
                <div className="flex-1 grid grid-cols-4 gap-4 overflow-x-auto">
                  {(
                    ["todo", "in_progress", "done", "blocked"] as TaskStatus[]
                  ).map((status) => (
                    <div
                      className="flex flex-col bg-muted/30 rounded-lg overflow-hidden"
                      key={status}
                    >
                      <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {STATUS_ICONS[status]}
                          <span className="font-medium text-sm">
                            {STATUS_LABELS[status]}
                          </span>
                        </div>
                        <Badge className="text-xs" variant="secondary">
                          {tasksByStatus[status]?.length ?? 0}
                        </Badge>
                      </div>
                      <ScrollArea className="flex-1 p-2">
                        <div className="space-y-2">
                          {tasksByStatus[status]?.map((task) => (
                            <Card
                              className="cursor-pointer hover:bg-accent/50 transition-colors"
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <Badge
                                    className={`text-xs shrink-0 ${PRIORITY_COLORS[task.priority]}`}
                                    variant="outline"
                                  >
                                    {PRIORITY_LABELS[task.priority]}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  {task.assignee ? (
                                    <div className="flex items-center gap-1">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage
                                          src={
                                            task.assignee.avatarUrl ?? undefined
                                          }
                                        />
                                        <AvatarFallback className="text-[10px]">
                                          {task.assignee.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground">
                                        {task.assignee.name.split(" ")[0]}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      Unassigned
                                    </span>
                                  )}
                                  {task._count?.comments ? (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <MessageSquare className="h-3 w-3" />
                                      {task._count.comments}
                                    </div>
                                  ) : null}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {tasksByStatus[status]?.length === 0 && (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                              No tasks
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  ))}
                </div>

                {/* Task Detail Panel */}
                {selectedTask && (
                  <div className="w-80 border-l bg-background">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold">Task Details</h3>
                      <Button
                        onClick={() => setSelectedTask(null)}
                        size="sm"
                        variant="ghost"
                      >
                        ✕
                      </Button>
                    </div>
                    <ScrollArea className="h-[calc(100%-57px)] p-4">
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Status
                          </label>
                          <Select
                            disabled={!canEdit}
                            onValueChange={(value) =>
                              updateTaskStatus(
                                selectedTask.id,
                                value as TaskStatus
                              )
                            }
                            value={selectedTask.status}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Assign To
                          </label>
                          <Select
                            disabled={!canEdit}
                            onValueChange={(value) =>
                              assignTask(selectedTask.id, value || null)
                            }
                            value={selectedTask.assignedTo ?? ""}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="text-sm font-medium mb-2">Comments</h4>
                          <div className="space-y-3 mb-3">
                            {selectedTask.comments?.map((comment) => (
                              <div className="flex gap-2" key={comment.id}>
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarFallback className="text-[10px]">
                                    {comment.authorName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {comment.authorName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        comment.createdAt
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-0.5">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {selectedTask.comments?.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                No comments yet
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-2">
                              <Input
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    addComment();
                                  }
                                }}
                                placeholder="Add a comment..."
                                value={newComment}
                              />
                              <Button
                                disabled={!newComment.trim()}
                                onClick={addComment}
                                size="sm"
                              >
                                Send
                              </Button>
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <>
                            <Separator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  className="w-full"
                                  size="sm"
                                  variant="destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Task
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete this task?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTask(selectedTask.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Add Task Button */}
              {canEdit && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          createTask();
                        }
                      }}
                      placeholder="New task title..."
                      value={newTaskTitle}
                    />
                    <Input
                      className="w-64"
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Description (optional)"
                      value={newTaskDescription}
                    />
                    <Button
                      disabled={!newTaskTitle.trim()}
                      onClick={createTask}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent
              className="flex-1 overflow-hidden p-6 pt-4"
              value="activity"
            >
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div className="flex gap-3" key={activity.id}>
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="w-px flex-1 bg-border mt-2" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.performerName} •{" "}
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No activity yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Sidebar - Team Chat */}
      <div className="w-80 border-l bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members ({workspace.members.length})
          </h3>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {workspace.members.map((member) => (
              <div
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                key={member.id}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {userStatuses[member.userId] === "online" && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                <Badge className="text-xs capitalize" variant="outline">
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="p-4 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">
            💡 Tip: Drag tasks between columns to change status
          </p>
        </div>
      </div>
    </div>
  );
}
