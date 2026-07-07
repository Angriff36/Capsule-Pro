import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { format } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { getKitchenTasks, getMyActiveClaims } from "./actions";
import { KitchenTasksEmptyState } from "./components/kitchen-tasks-empty-state";

const priorityLabels: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  5: "Low",
  10: "Backlog",
};

const priorityColors: Record<number, string> = {
  1: "destructive",
  2: "default",
  3: "secondary",
  5: "outline",
  10: "outline",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const KitchenTasksPage = async () => {
  const { orgId, userId: clerkId } = await auth();

  if (!orgId) {
    return notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get current user
  const currentUser = clerkId
    ? await database.user.findFirst({
        where: {
          tenantId,
          authUserId: clerkId,
        },
      })
    : null;

  // Fetch tasks
  const tasks = await getKitchenTasks();

  // Fetch user's active claims
  const myClaims = currentUser ? await getMyActiveClaims(currentUser.id) : [];

  return (
    <>
      <Header page="Kitchen Tasks" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">
            Kitchen Tasks
          </h1>
          <p className="text-muted-foreground">
            Manage and track all kitchen operations tasks, priorities, and
            assignments.
          </p>
        </div>

        <Separator />

        {/* Performance Overview Section */}
        <section className="space-y-4">
          <h2 className="font-medium text-muted-foreground text-sm">
            Performance Overview
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            <Card tone="soft-stone">
              <CardHeader className="pb-2">
                <CardDescription>Total Tasks</CardDescription>
                <CardTitle className="font-bold text-2xl">
                  {tasks.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card tone="soft-stone">
              <CardHeader className="pb-2">
                <CardDescription>Open</CardDescription>
                <CardTitle className="font-bold text-2xl">
                  {tasks.filter((t) => t.status === "pending").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card tone="soft-stone">
              <CardHeader className="pb-2">
                <CardDescription>In Progress</CardDescription>
                <CardTitle className="font-bold text-2xl">
                  {tasks.filter((t) => t.status === "in_progress").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card tone="soft-stone">
              <CardHeader className="pb-2">
                <CardDescription>My Claims</CardDescription>
                <CardTitle className="font-bold text-2xl">
                  {myClaims.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Tasks Section */}
        <section className="space-y-4">
          <h2 className="font-medium text-muted-foreground text-sm">
            All Kitchen Tasks
          </h2>
          <Card tone="canvas">
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="py-6">
                  <KitchenTasksEmptyState />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Claimed By</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const claimedBy = myClaims.find(
                        (c) => c.taskId === task.id
                      );
                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Badge
                              variant={
                                task.status === "done"
                                  ? "secondary"
                                  : task.status === "in_progress"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {statusLabels[task.status] || task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                priorityColors[task.priority] as
                                  | "destructive"
                                  | "default"
                                  | "secondary"
                                  | "outline"
                              }
                            >
                              {priorityLabels[task.priority] || task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{task.title}</div>
                            {task.summary && (
                              <div className="line-clamp-1 text-muted-foreground text-sm">
                                {task.summary}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {claimedBy ? (
                              <div className="flex items-center gap-2">
                                <User className="size-4 text-muted-foreground" />
                                <span className="text-sm">You</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Unclaimed
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.dueDate ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="size-3 text-muted-foreground" />
                                {format(new Date(task.dueDate), "MMM d, yyyy")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Clock className="size-3" />
                              {format(new Date(task.createdAt), "MMM d")}
                            </div>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};

export default KitchenTasksPage;
