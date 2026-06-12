import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { listAdminTasks, updateAdminTaskStatus } from "./actions";
import { AdminTaskDialog } from "./components/admin-task-dialog";

const columns = [
  {
    status: "backlog",
    title: "Backlog",
    description: "Requests that need clarification or approval.",
  },
  {
    status: "in_progress",
    title: "In Progress",
    description: "Assignments that are actively tracked today.",
  },
  {
    status: "review",
    title: "Review",
    description: "Pending approval by leadership or clients.",
  },
  {
    status: "done",
    title: "Done",
    description: "Closed items from this week.",
  },
];

const priorityVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const AdministrativeKanbanPage = async () => {
  const tasks = await listAdminTasks();
  const tasksByStatus: Map<string, typeof tasks> = new Map(
    columns.map((column) => [column.status, []])
  );

  for (const task of tasks) {
    const bucket = tasksByStatus.get(task.status) ?? [];
    bucket.push(task);
    tasksByStatus.set(task.status, bucket);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">
            Operational Kanban
          </h1>
          <p className="text-muted-foreground text-sm">
            Keep critical cross-functional requests visible and moving.
          </p>
        </div>
        <AdminTaskDialog />
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => {
          const columnTasks = tasksByStatus.get(column.status) ?? [];

          return (
            <Card
              className="flex h-full flex-col"
              key={column.title}
              tone="canvas"
            >
              <CardHeader>
                <CardTitle>{column.title}</CardTitle>
                <CardDescription>{column.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 overflow-hidden">
                {columnTasks.length === 0 ? (
                  <div className="rounded-md border border-border/60 border-dashed p-3 text-muted-foreground text-sm">
                    No tasks yet.
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      className="flex flex-col gap-3 rounded-md border border-border/50 bg-card/50 p-3"
                      key={task.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold text-sm leading-tight">
                          {task.title}
                        </h2>
                        {task.category ? (
                          <Badge className="uppercase">{task.category}</Badge>
                        ) : null}
                      </div>
                      {task.description ? (
                        <p className="text-muted-foreground text-xs">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{task.ownerName}</span>
                        <span>
                          {task.dueDate
                            ? `Due ${dateFormatter.format(task.dueDate)}`
                            : "No due date"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className="w-fit font-semibold text-[11px]"
                          variant={priorityVariant[task.priority] ?? "outline"}
                        >
                          {task.priority} priority
                        </Badge>
                        <Badge variant="outline">
                          {statusLabels[task.status]}
                        </Badge>
                      </div>
                      <form
                        action={updateAdminTaskStatus}
                        className="flex items-center gap-2"
                      >
                        <input name="taskId" type="hidden" value={task.id} />
                        <select
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          defaultValue={task.status}
                          name="status"
                        >
                          {columns.map((option) => (
                            <option key={option.status} value={option.status}>
                              {option.title}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" type="submit" variant="ghost">
                          Update
                        </Button>
                      </form>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdministrativeKanbanPage;
