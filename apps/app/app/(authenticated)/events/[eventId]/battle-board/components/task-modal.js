"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskModal = TaskModal;
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const date_fns_1 = require("date-fns");
const react_1 = require("react");
const tasks_1 = require("../actions/tasks");
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
const PRIORITIES = ["low", "medium", "high", "critical"];
function TaskModal({
  isOpen,
  onClose,
  eventId,
  eventDate,
  staff,
  onTaskCreated,
}) {
  const [title, setTitle] = (0, react_1.useState)("");
  const [description, setDescription] = (0, react_1.useState)("");
  const [category, setCategory] = (0, react_1.useState)("Service");
  const [priority, setPriority] = (0, react_1.useState)("medium");
  const [assigneeId, setAssigneeId] = (0, react_1.useState)();
  const [startTime, setStartTime] = (0, react_1.useState)("09:00");
  const [duration, setDuration] = (0, react_1.useState)(30);
  const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
  const handleSubmit = (0, react_1.useCallback)(
    async (e) => {
      e.preventDefault();
      if (!title.trim()) {
        return;
      }
      setIsSubmitting(true);
      try {
        const [hours, minutes] = startTime.split(":").map(Number);
        const startDateTime = new Date(eventDate);
        startDateTime.setHours(hours, minutes, 0, 0);
        const endDateTime = (0, date_fns_1.addMinutes)(startDateTime, duration);
        const result = await (0, tasks_1.createTimelineTask)({
          eventId,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          assigneeId,
          startTime: (0, date_fns_1.format)(
            startDateTime,
            "yyyy-MM-dd HH:mm:ss"
          ),
          endTime: (0, date_fns_1.format)(endDateTime, "yyyy-MM-dd HH:mm:ss"),
        });
        if (result.success && result.taskId) {
          const newTask = {
            id: result.taskId,
            eventId,
            title: title.trim(),
            description: description.trim() || undefined,
            startTime: (0, date_fns_1.format)(
              startDateTime,
              "yyyy-MM-dd HH:mm:ss"
            ),
            endTime: (0, date_fns_1.format)(endDateTime, "yyyy-MM-dd HH:mm:ss"),
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
    ]
  );
  const handleClose = (0, react_1.useCallback)(() => {
    setTitle("");
    setDescription("");
    setCategory("Service");
    setPriority("medium");
    setAssigneeId(undefined);
    setStartTime("09:00");
    setDuration(30);
    onClose();
  }, [onClose]);
  return (
    <dialog_1.Dialog
      onOpenChange={(open) => !open && handleClose()}
      open={isOpen}
    >
      <dialog_1.DialogContent className="sm:max-w-[500px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Create New Task</dialog_1.DialogTitle>
        </dialog_1.DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label_1.Label htmlFor="title">Task Title</label_1.Label>
            <input_1.Input
              autoFocus
              id="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
              value={title}
            />
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="description">Description</label_1.Label>
            <textarea_1.Textarea
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={3}
              value={description}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="category">Category</label_1.Label>
              <select_1.Select onValueChange={setCategory} value={category}>
                <select_1.SelectTrigger>
                  <select_1.SelectValue placeholder="Select category" />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {CATEGORIES.map((cat) => (
                    <select_1.SelectItem key={cat} value={cat}>
                      {cat}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="priority">Priority</label_1.Label>
              <select_1.Select
                onValueChange={(v) => setPriority(v)}
                value={priority}
              >
                <select_1.SelectTrigger>
                  <select_1.SelectValue placeholder="Select priority" />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {PRIORITIES.map((p) => (
                    <select_1.SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="startTime">Start Time</label_1.Label>
              <input_1.Input
                id="startTime"
                onChange={(e) => setStartTime(e.target.value)}
                required
                type="time"
                value={startTime}
              />
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="duration">
                Duration (minutes)
              </label_1.Label>
              <input_1.Input
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
            <label_1.Label htmlFor="assignee">Assign To</label_1.Label>
            <select_1.Select onValueChange={setAssigneeId} value={assigneeId}>
              <select_1.SelectTrigger>
                <select_1.SelectValue placeholder="Select staff member (optional)" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {staff.map((member) => (
                  <select_1.SelectItem key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={handleClose}
              type="button"
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button
              disabled={isSubmitting || !title.trim()}
              type="submit"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </form>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
