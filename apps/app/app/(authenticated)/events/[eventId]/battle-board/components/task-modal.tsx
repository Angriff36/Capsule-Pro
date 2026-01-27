"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { addMinutes, format } from "date-fns";
import { useCallback, useState } from "react";
import { createTimelineTask } from "../actions/tasks";
import type { StaffMember, TimelineTask } from "../types";

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventDate: Date;
  staff: StaffMember[];
  onTaskCreated?: (task: TimelineTask) => void;
};

const CATEGORIES = [
  "Setup",
  "Service",
  "Cleanup",
  "Kitchen",
  "Front of House",
  "Bar",
  "Entertainment",
  "Logistics",
  "Security",
];

const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export function TaskModal({
  isOpen,
  onClose,
  eventId,
  eventDate,
  staff,
  onTaskCreated,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Service");
  const [priority, setPriority] =
    useState<(typeof PRIORITIES)[number]>("medium");
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setTitle("");
    setDescription("");
    setCategory("Service");
    setPriority("medium");
    setAssigneeId(undefined);
    setStartTime("09:00");
    setDuration(30);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim()) {
        return;
      }

      setIsSubmitting(true);

      try {
        const [hours, minutes] = startTime.split(":").map(Number);
        const startDateTime = new Date(eventDate);
        startDateTime.setHours(hours, minutes, 0, 0);

        const endDateTime = addMinutes(startDateTime, duration);

        const result = await createTimelineTask({
          eventId,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          assigneeId,
          startTime: format(startDateTime, "yyyy-MM-dd HH:mm:ss"),
          endTime: format(endDateTime, "yyyy-MM-dd HH:mm:ss"),
        });

        if (result.success && result.taskId) {
          const newTask: TimelineTask = {
            id: result.taskId,
            eventId,
            title: title.trim(),
            description: description.trim() || undefined,
            startTime: format(startDateTime, "yyyy-MM-dd HH:mm:ss"),
            endTime: format(endDateTime, "yyyy-MM-dd HH:mm:ss"),
            status: "not_started",
            priority,
            category,
            assigneeId,
            assigneeName: staff.find((s) => s.id === assigneeId)?.name,
            progress: 0,
            dependencies: [],
            isOnCriticalPath: false,
            slackMinutes: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          onTaskCreated?.(newTask);
          handleClose();
        }
      } catch (error) {
        console.error("Failed to create task:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      description,
      category,
      priority,
      assigneeId,
      startTime,
      duration,
      eventId,
      eventDate,
      staff,
      onTaskCreated,
      handleClose,
    ]
  );

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open={isOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              autoFocus
              id="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
              value={title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={3}
              value={description}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                onValueChange={(v) => setPriority(v as typeof priority)}
                value={priority}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                onChange={(e) => setStartTime(e.target.value)}
                required
                type="time"
                value={startTime}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                min={5}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
                step={5}
                type="number"
                value={duration}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Assign To</Label>
            <Select onValueChange={setAssigneeId} value={assigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member (optional)" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isSubmitting || !title.trim()} type="submit">
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
