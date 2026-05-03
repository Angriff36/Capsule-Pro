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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Thermometer,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getTenantIdForOrg } from "../../../lib/tenant";

const checkTypeLabels: Record<string, string> = {
  receiving: "Receiving",
  storage: "Storage",
  prep: "Prep",
  cooking: "Cooking",
  cooling: "Cooling",
  holding: "Holding",
  transport: "Transport",
};

const checkStatusBadge: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  pending: "secondary",
  passed: "default",
  failed: "destructive",
  needs_review: "outline",
};

const logTypeLabels: Record<string, string> = {
  cooler: "Cooler",
  freezer: "Freezer",
  hot_hold: "Hot Hold",
  cooking: "Cooking",
  receiving: "Receiving",
  cooling: "Cooling",
};

const severityBadge: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const actionStatusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  verified: "Verified",
};

const QualityAssurancePage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const qualityChecks = await database.qualityCheck.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: true },
  });

  const temperatureLogs = await database.temperatureLog.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { loggedAt: "desc" },
    take: 10,
  });

  const correctiveActions = await database.correctiveAction.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const checkTypeCounts = new Map<string, { total: number; pending: number }>();
  for (const ct of Object.keys(checkTypeLabels)) {
    checkTypeCounts.set(ct, { total: 0, pending: 0 });
  }
  for (const qc of qualityChecks) {
    const entry = checkTypeCounts.get(qc.checkType) ?? { total: 0, pending: 0 };
    entry.total++;
    if (qc.status === "pending") entry.pending++;
    checkTypeCounts.set(qc.checkType, entry);
  }

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const ca of correctiveActions) {
    if (ca.severity in severityCounts) {
      severityCounts[ca.severity as keyof typeof severityCounts]++;
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quality Assurance</h1>
          <p className="text-muted-foreground">
            HACCP compliance and food safety monitoring
          </p>
        </div>
      </div>

      <Tabs className="space-y-4" defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Quality Checks ({qualityChecks.length})
          </TabsTrigger>
          <TabsTrigger value="temperature">
            <Thermometer className="h-4 w-4 mr-2" />
            Temperature Logs ({temperatureLogs.length})
          </TabsTrigger>
          <TabsTrigger value="corrective">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Corrective Actions ({correctiveActions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="checks">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(checkTypeLabels).map(([type, label]) => {
              const counts = checkTypeCounts.get(type) ?? { total: 0, pending: 0 };
              return (
                <Card
                  className="hover:border-primary/50 transition-colors"
                  key={type}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {counts.total} total checks
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline">{counts.pending} pending</Badge>
                      <Badge variant="secondary">{counts.total} total</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {qualityChecks.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Recent Checks
              </h3>
              {qualityChecks.slice(0, 10).map((qc) => (
                <Card key={qc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {qc.status === "passed" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : qc.status === "failed" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                        {qc.title}
                      </CardTitle>
                      <Badge variant={checkStatusBadge[qc.status] ?? "outline"}>
                        {qc.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Type: {checkTypeLabels[qc.checkType] ?? qc.checkType}
                      </span>
                      <span>Items: {qc.items.length}</span>
                      {qc.completedAt && (
                        <span>
                          Completed:{" "}
                          {format(new Date(qc.completedAt), "MMM d, h:mm a")}
                        </span>
                      )}
                      {!qc.completedAt && qc.scheduledAt && (
                        <span>
                          Scheduled:{" "}
                          {format(new Date(qc.scheduledAt), "MMM d, h:mm a")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              No quality checks recorded yet.
            </p>
          )}
        </TabsContent>

        <TabsContent className="space-y-4" value="temperature">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {Object.entries(logTypeLabels).map(([type, label]) => {
              const count = temperatureLogs.filter(
                (tl) => tl.logType === type
              ).length;
              return (
                <Card key={type}>
                  <CardContent className="pt-4">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "log" : "logs"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {temperatureLogs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent Temperature Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {temperatureLogs.map((log) => (
                    <div
                      className="flex items-center justify-between py-2 border-b last:border-0"
                      key={log.id}
                    >
                      <div className="flex items-center gap-3">
                        <Thermometer
                          className={`h-4 w-4 ${
                            log.withinRange === false
                              ? "text-red-500"
                              : log.withinRange === true
                                ? "text-green-500"
                                : "text-yellow-500"
                          }`}
                        />
                        <span className="font-medium capitalize">
                          {logTypeLabels[log.logType] ?? log.logType.replace("_", " ")}
                        </span>
                        {log.itemName && (
                          <span className="text-sm text-muted-foreground">
                            {log.itemName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono">
                          {Number(log.temperature)}&deg;{log.unit}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.loggedAt), "MMM d, h:mm a")}
                        </span>
                        {log.withinRange === false ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              No temperature logs recorded yet.
            </p>
          )}
        </TabsContent>

        <TabsContent className="space-y-4" value="corrective">
          <div className="flex gap-2">
            {severityCounts.critical > 0 && (
              <Badge variant="destructive">
                {severityCounts.critical} Critical
              </Badge>
            )}
            {severityCounts.high > 0 && (
              <Badge variant="destructive">{severityCounts.high} High</Badge>
            )}
            {severityCounts.medium > 0 && (
              <Badge variant="secondary">
                {severityCounts.medium} Medium
              </Badge>
            )}
            {severityCounts.low > 0 && (
              <Badge variant="outline">{severityCounts.low} Low</Badge>
            )}
            {correctiveActions.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No corrective actions
              </span>
            )}
          </div>

          {correctiveActions.length > 0 ? (
            <div className="space-y-3">
              {correctiveActions.map((action) => (
                <Card key={action.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {action.status === "open" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : action.status === "in_progress" ? (
                            <Clock className="h-4 w-4 text-blue-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          <span className="font-medium">{action.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {action.dueDate && (
                            <span>
                              Due: {format(new Date(action.dueDate), "MMM d, yyyy")}
                            </span>
                          )}
                          <span>
                            Status:{" "}
                            {actionStatusLabel[action.status] ?? action.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            severityBadge[action.severity] ?? "outline"
                          }
                        >
                          {action.severity}
                        </Badge>
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/kitchen/quality-assurance/${action.id}`}
                          >
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              No corrective actions recorded yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QualityAssurancePage;
