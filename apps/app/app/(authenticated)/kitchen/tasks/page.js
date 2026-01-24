Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../lib/tenant");
const header_1 = require("../../components/header");
const actions_1 = require("./actions");
const priorityLabels = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  5: "Low",
  10: "Backlog",
};
const priorityColors = {
  1: "destructive",
  2: "default",
  3: "secondary",
  5: "outline",
  10: "outline",
};
const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const KitchenTasksPage = async () => {
  const { orgId, userId: clerkId } = await (0, server_1.auth)();
  if (!orgId) {
    return (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Get current user
  const currentUser = clerkId
    ? await database_1.database.user.findFirst({
        where: {
          tenantId,
          authUserId: clerkId,
        },
      })
    : null;
  // Fetch tasks
  const tasks = await (0, actions_1.getKitchenTasks)();
  // Fetch user's active claims
  const myClaims = currentUser
    ? await (0, actions_1.getMyActiveClaims)(currentUser.id)
    : [];
  // Build task map with claims
  const myClaimedTaskIds = new Set(myClaims.map((c) => c.taskId));
  return (
    <>
      <header_1.Header page="Kitchen Tasks" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tasks
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Open
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                {tasks.filter((t) => t.status === "open").length}
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter((t) => t.status === "in_progress").length}
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                My Claims
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {myClaims.length}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        {/* Tasks Table */}
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>All Kitchen Tasks</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  No kitchen tasks found. Create tasks from the Production
                  Board.
                </p>
                <button_1.Button asChild className="mt-4">
                  <a href="/kitchen/tasks/new">Create Task</a>
                </button_1.Button>
              </div>
            ) : (
              <table_1.Table>
                <table_1.TableHeader>
                  <table_1.TableRow>
                    <table_1.TableHead>Status</table_1.TableHead>
                    <table_1.TableHead>Priority</table_1.TableHead>
                    <table_1.TableHead>Task</table_1.TableHead>
                    <table_1.TableHead>Claimed By</table_1.TableHead>
                    <table_1.TableHead>Due Date</table_1.TableHead>
                    <table_1.TableHead>Created</table_1.TableHead>
                  </table_1.TableRow>
                </table_1.TableHeader>
                <table_1.TableBody>
                  {tasks.map((task) => {
                    const isClaimedByMe = myClaimedTaskIds.has(task.id);
                    const claimedBy = myClaims.find(
                      (c) => c.taskId === task.id
                    );
                    return (
                      <table_1.TableRow key={task.id}>
                        <table_1.TableCell>
                          <badge_1.Badge
                            variant={
                              task.status === "completed"
                                ? "secondary"
                                : task.status === "in_progress"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {statusLabels[task.status] || task.status}
                          </badge_1.Badge>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <badge_1.Badge
                            variant={priorityColors[task.priority]}
                          >
                            {priorityLabels[task.priority] || task.priority}
                          </badge_1.Badge>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="font-medium">{task.title}</div>
                          {task.summary && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {task.summary}
                            </div>
                          )}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {claimedBy ? (
                            <div className="flex items-center gap-2">
                              <lucide_react_1.User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">You</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Unclaimed
                            </span>
                          )}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {task.dueDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <lucide_react_1.Calendar className="h-3 w-3 text-muted-foreground" />
                              {(0, date_fns_1.format)(
                                new Date(task.dueDate),
                                "MMM d, yyyy"
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <lucide_react_1.Clock className="h-3 w-3" />
                            {(0, date_fns_1.format)(
                              new Date(task.createdAt),
                              "MMM d"
                            )}
                          </div>
                        </table_1.TableCell>
                      </table_1.TableRow>
                    );
                  })}
                </table_1.TableBody>
              </table_1.Table>
            )}
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </>
  );
};
exports.default = KitchenTasksPage;
