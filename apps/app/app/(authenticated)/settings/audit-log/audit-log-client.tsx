"use client";

import { BlogFilterChip } from "@repo/design-system/components/blocks/blog-filter-chip";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  EyeIcon,
  Loader2,
  RefreshCw,
  SearchIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for custom settings audit-log endpoint (no generated client equivalent)
import { apiFetch } from "@/app/lib/api";

interface AuditLogEntry {
  action: string;
  createdAt: string;
  id: string;
  ipAddress: string | null;
  newValues: unknown;
  oldValues: unknown;
  performedBy: string | null;
  performedByEmail: string | null;
  performedByName: string | null;
  recordId: string;
  tableName: string;
  tableSchema: string;
  userAgent: string | null;
}

interface AuditLogResponse {
  entries: AuditLogEntry[];
  limit: number;
  page: number;
  tableNames: string[];
  total: number;
  totalPages: number;
}

const ACTION_OPTIONS = ["all", "insert", "update", "delete"] as const;

const ACTION_COLORS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  insert: "default",
  update: "secondary",
  delete: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    insert: "Created",
    update: "Updated",
    delete: "Deleted",
  };
  return map[action] ?? action;
}

function formatTableName(name: string): string {
  return name
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function JsonPreview({ label, data }: { label: string; data: unknown }) {
  if (!data) {
    return (
      <div className="text-muted-foreground text-sm italic">{label}: None</div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="font-medium text-muted-foreground text-sm">{label}</div>
      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function DetailDialog({ entry }: { entry: AuditLogEntry }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <EyeIcon className="mr-1 h-4 w-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change Details</DialogTitle>
          <DialogDescription>
            {formatAction(entry.action)} {formatTableName(entry.tableName)}
            {entry.performedByName && ` by ${entry.performedByName}`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">User:</span>{" "}
                {entry.performedByName || entry.performedByEmail || "System"}
              </div>
              <div>
                <span className="font-medium">Timestamp:</span>{" "}
                {formatDate(entry.createdAt)}
              </div>
              {entry.ipAddress && (
                <div>
                  <span className="font-medium">IP Address:</span>{" "}
                  {entry.ipAddress}
                </div>
              )}
              <div>
                <span className="font-medium">Record ID:</span>{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  {entry.recordId.slice(0, 8)}...
                </code>
              </div>
              <div>
                <span className="font-medium">Table:</span>{" "}
                {formatTableName(entry.tableName)}
              </div>
              <div>
                <span className="font-medium">Schema:</span> {entry.tableSchema}
              </div>
            </div>
            <Separator />
            <JsonPreview data={entry.oldValues} label="Before" />
            <JsonPreview data={entry.newValues} label="After" />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogClient() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [_total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (actionFilter && actionFilter !== "all") {
        params.set("action", actionFilter);
      }
      if (tableFilter && tableFilter !== "all") {
        params.set("table_name", tableFilter);
      }

      const res = await apiFetch(
        `/api/settings/audit-log?${params.toString()}`
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error("Failed to load audit log", {
          description:
            (data as { message?: string }).message || "Unknown error",
        });
        return;
      }

      const auditData = data as AuditLogResponse;
      setEntries(auditData.entries);
      setTotal(auditData.total);
      setTotalPages(auditData.totalPages);

      if (auditData.tableNames.length > 0) {
        setTableNames((prev) =>
          prev.length >= auditData.tableNames.length
            ? prev
            : auditData.tableNames
        );
      }
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, tableFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredEntries = search.trim()
    ? entries.filter(
        (e) =>
          (e.performedByName &&
            e.performedByName.toLowerCase().includes(search.toLowerCase())) ||
          (e.performedByEmail &&
            e.performedByEmail.toLowerCase().includes(search.toLowerCase())) ||
          e.recordId.toLowerCase().includes(search.toLowerCase()) ||
          e.tableName.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="relative">
          <SearchIcon className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="w-56 pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="User, table, or record ID..."
            value={search}
          />
        </div>
        <Button onClick={loadLogs} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTION_OPTIONS.map((a) => (
          <BlogFilterChip
            key={a}
            onSelect={() => {
              setActionFilter(a);
              setPage(1);
            }}
            selected={actionFilter === a}
          >
            {a === "all" ? "All actions" : formatAction(a)}
          </BlogFilterChip>
        ))}
      </div>

      {tableNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <BlogFilterChip
            onSelect={() => {
              setTableFilter("all");
              setPage(1);
            }}
            selected={tableFilter === "all"}
            tone="ghost"
          >
            All tables
          </BlogFilterChip>
          {tableNames.map((name) => (
            <BlogFilterChip
              key={name}
              onSelect={() => {
                setTableFilter(name);
                setPage(1);
              }}
              selected={tableFilter === name}
              tone="ghost"
            >
              {formatTableName(name)}
            </BlogFilterChip>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">No audit log entries found.</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={`${entry.id}-${entry.createdAt}`}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {formatDate(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    {entry.performedByName ||
                      entry.performedByEmail ||
                      "System"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_COLORS[entry.action] || "outline"}>
                      {formatAction(entry.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatTableName(entry.tableName)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1 text-xs">
                      {entry.recordId.slice(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <DetailDialog entry={entry} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Page {page} of {totalPages || 1}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                size="sm"
                variant="outline"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                size="sm"
                variant="outline"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
