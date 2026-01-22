import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { Header } from "../../components/header";
import {
  getKitchenTasks,
  getMyActiveClaims,
} from "./actions";
import { getTenantIdForOrg } from "../../../lib/tenant";

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
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
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
  const myClaims = currentUser
    ? await getMyActiveClaims(currentUser.id)
    : [];

  // Build task map with claims
  const myClaimedTaskIds = new Set(myClaims.map((c) => c.taskId));

  return (
    <>
      <Header page="Kitchen Tasks" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Open
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tasks.filter((t) => t.status === "open").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter((t) => t.status === "in_progress").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {myClaims.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Kitchen Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  No kitchen tasks found. Create tasks from the Production Board.
                </p>
                <Button asChild className="mt-4">
                  <a href="/kitchen/tasks/new">Create Task</a>
                </Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const isClaimedByMe = myClaimedTaskIds.has(task.id);
                    const claimedBy = myClaims.find((c) => c.taskId === task.id);
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === "completed"
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
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {task.summary}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {claimedBy ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
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
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.createdAt), "MMM d")}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default KitchenTasksPage;
