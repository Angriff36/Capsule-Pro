import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { EyeIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  before_value: unknown;
  after_value: unknown;
  ip_address: string | null;
  created_at: Date;
}

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const formatAction = (action: string) => {
  const map: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
  };
  return map[action] || action;
};

const formatEntityType = (type: string) => {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const JsonPreview = ({ label, data }: { label: string; data: unknown }) => {
  if (!data) {
    return (
      <div className="text-sm text-muted-foreground italic">{label}: None</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

const AuditLogPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; action?: string; entityType?: string }>;
}) => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const params = await searchParams;

  // Build filter conditions
  const conditions: string[] = ["tenant_id = $1"];
  const queryParams: unknown[] = [tenantId];
  let paramIndex = 2;

  if (params.userId) {
    conditions.push(`user_id = $${paramIndex}`);
    queryParams.push(params.userId);
    paramIndex++;
  }

  if (params.action) {
    conditions.push(`action = $${paramIndex}`);
    queryParams.push(params.action.toUpperCase());
    paramIndex++;
  }

  if (params.entityType) {
    conditions.push(`entity_type = $${paramIndex}`);
    queryParams.push(params.entityType);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  // Fetch audit logs
  const auditLogs = await database.$queryRawUnsafe<AuditLogRow[]>(
    `
    SELECT 
      id,
      user_id,
      user_email,
      action,
      entity_type,
      entity_id,
      entity_name,
      before_value,
      after_value,
      ip_address,
      created_at
    FROM "tenant_admin"."audit_log"
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT 100
    `,
    ...queryParams
  );

  // Fetch users for filter dropdown
  const users = await database.$queryRawUnsafe<UserRow[]>(
    `
    SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
    FROM "tenant"."employees" u
    INNER JOIN "tenant_admin"."audit_log" a ON a.user_id = u.id
    WHERE a.tenant_id = $1
    ORDER BY u.email
    `,
    tenantId
  );

  // Get unique entity types for filter
  const entityTypes = [...new Set(auditLogs.map((log) => log.entity_type))].sort();

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          View a history of changes made to settings and configurations.
        </p>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">User</label>
          <form method="GET">
            <Select name="userId" defaultValue={params.userId || ""}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Action</label>
          <Select name="action" defaultValue={params.action || ""}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              <SelectItem value="CREATE">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="DELETE">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {entityTypes.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Entity Type</label>
            <Select name="entityType" defaultValue={params.entityType || ""}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEntityType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>
            {auditLogs.length} {auditLogs.length === 1 ? "entry" : "entries"}{" "}
            found.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No audit log entries found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {dateFormatter.format(new Date(log.created_at))}
                    </TableCell>
                    <TableCell>
                      {log.user_email || "System"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionColors[log.action] || "outline"}>
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {formatEntityType(log.entity_type)}
                        </span>
                        {log.entity_name && (
                          <span className="text-xs text-muted-foreground">
                            {log.entity_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Change Details</DialogTitle>
                            <DialogDescription>
                              {formatAction(log.action)}{" "}
                              {formatEntityType(log.entity_type)}
                              {log.entity_name && `: ${log.entity_name}`}
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="max-h-96">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">User:</span>{" "}
                                  {log.user_email || "System"}
                                </div>
                                <div>
                                  <span className="font-medium">Timestamp:</span>{" "}
                                  {dateFormatter.format(new Date(log.created_at))}
                                </div>
                                {log.ip_address && (
                                  <div>
                                    <span className="font-medium">IP Address:</span>{" "}
                                    {log.ip_address}
                                  </div>
                                )}
                                {log.entity_id && (
                                  <div>
                                    <span className="font-medium">Entity ID:</span>{" "}
                                    <code className="text-xs bg-muted px-1 rounded">
                                      {log.entity_id}
                                    </code>
                                  </div>
                                )}
                              </div>
                              <Separator />
                              <JsonPreview label="Before" data={log.before_value} />
                              <JsonPreview label="After" data={log.after_value} />
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogPage;
