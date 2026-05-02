"use client";

/**
 * @module AuditLogClient
 * @intent Client-side audit log viewer with filtering and pagination
 * @responsibility Fetch, filter, paginate, and display audit log entries from the API
 * @domain Settings
 * @tags audit-log, settings, client-component
 * @canonical true
 */

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
  FileText,
  Loader2,
  RefreshCw,
  SearchIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  id: string;
  tableName: string;
  tableSchema: string;
  recordId: string;
  action: string;
  oldValues: unknown;
  newValues: unknown;
  performedBy: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  tableNames: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_OPTIONS = [
  { value: "insert", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
] as const;

const ACTION_COLORS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  insert: "default",
  update: "secondary",
  delete: "destructive",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const found = ACTION_OPTIONS.find((o) => o.value === action);
  return found ? found.label : action;
}

function formatTableName(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function JsonPreview({ label, data }: { label: string; data: unknown }) {
  if (!data) {
    return (
      <div className="text-sm italic text-muted-foreground">{label}: None</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Dialog
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AuditLogClient() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
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

      // Populate table name options on first load or when they come back
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

  // Reset page when filters change
  const handleActionChange = useCallback((value: string) => {
    setActionFilter(value);
    setPage(1);
  }, []);

  const handleTableChange = useCallback((value: string) => {
    setTableFilter(value);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Filter by performed_by is handled server-side via the API
    // For now, search is client-side post-filter
    setPage(1);
  }, []);

  // Client-side search filter on displayed results
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
    <div className="space-y-6">
      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Action</label>
          <Select onValueChange={handleActionChange} value={actionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Table</label>
          <Select onValueChange={handleTableChange} value={tableFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {tableNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {formatTableName(name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form className="space-y-1.5" onSubmit={handleSearchSubmit}>
          <label className="text-sm font-medium" htmlFor="audit-search">
            Search
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-56 pl-9"
              id="audit-search"
              onChange={handleSearchChange}
              placeholder="User, table, or record ID..."
              value={search}
            />
          </div>
        </form>

        <Button onClick={loadLogs} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No audit log entries found</p>
            <p className="text-sm text-muted-foreground">
              Adjust the filters or try a different search term.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Change History</CardTitle>
              <CardDescription>
                {total} {total === 1 ? "entry" : "entries"} found.
                {search.trim() &&
                  ` Showing ${filteredEntries.length} matching "${search}".`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        {entry.performedByName ||
                          entry.performedByEmail ||
                          "System"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ACTION_COLORS[entry.action] || "outline"}
                        >
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
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
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
