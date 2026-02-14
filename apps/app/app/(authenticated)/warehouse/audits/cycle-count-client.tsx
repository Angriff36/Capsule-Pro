"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { formatCurrency } from "@/app/lib/format";

type CycleCountSessionType =
  | "ad_hoc"
  | "scheduled_daily"
  | "scheduled_weekly"
  | "scheduled_monthly";

type CycleCountSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "finalized"
  | "cancelled";

interface CycleCountSession {
  id: string;
  session_id: string;
  session_name: string;
  count_type: CycleCountSessionType;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  finalized_at: string | null;
  status: CycleCountSessionStatus;
  total_items: number;
  counted_items: number;
  total_variance: number;
  variance_percentage: number;
  notes: string | null;
  created_at: string;
}

interface CycleCountSessionsResponse {
  data: CycleCountSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusVariant: Record<
  CycleCountSessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  finalized: "outline",
  cancelled: "destructive",
};

const statusLabel: Record<CycleCountSessionStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  finalized: "Finalized",
  cancelled: "Cancelled",
};

const countTypeLabel: Record<CycleCountSessionType, string> = {
  ad_hoc: "Ad Hoc",
  scheduled_daily: "Daily",
  scheduled_weekly: "Weekly",
  scheduled_monthly: "Monthly",
};

export const CycleCountClient = () => {
  const [sessions, setSessions] = useState<CycleCountSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create session dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionType, setNewSessionType] =
    useState<CycleCountSessionType>("ad_hoc");
  const [newSessionNotes, setNewSessionNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (typeFilter !== "all") {
        params.set("countType", typeFilter);
      }

      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions?${params}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load sessions");
      }

      const result: CycleCountSessionsResponse = await response.json();
      setSessions(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.total);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load sessions"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error("Session name is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiFetch("/api/inventory/cycle-count/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_name: newSessionName,
          location_id: "default", // TODO: Get from location selector
          count_type: newSessionType,
          notes: newSessionNotes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create session");
      }

      toast.success("Cycle count session created");
      setIsCreateDialogOpen(false);
      setNewSessionName("");
      setNewSessionType("ad_hoc");
      setNewSessionNotes("");
      loadSessions();
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create session"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${sessionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "in_progress" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start session");
      }

      toast.success("Session started");
      loadSessions();
    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start session"
      );
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${sessionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "completed" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to complete session");
      }

      toast.success("Session completed");
      loadSessions();
    } catch (error) {
      console.error("Failed to complete session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to complete session"
      );
    }
  };

  const handleFinalizeSession = async (sessionId: string) => {
    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${sessionId}/finalize`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to finalize session");
      }

      toast.success("Session finalized");
      loadSessions();
    } catch (error) {
      console.error("Failed to finalize session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to finalize session"
      );
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${sessionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel session");
      }

      toast.success("Session cancelled");
      loadSessions();
    } catch (error) {
      console.error("Failed to cancel session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel session"
      );
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      session.session_name.toLowerCase().includes(query) ||
      session.notes?.toLowerCase().includes(query)
    );
  });

  // Calculate summary stats
  const draftSessions = sessions.filter((s) => s.status === "draft").length;
  const inProgressSessions = sessions.filter(
    (s) => s.status === "in_progress"
  ).length;
  const totalVariance = sessions.reduce(
    (sum, s) => sum + Math.abs(s.total_variance),
    0
  );

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Cycle Counts</h1>
          <p className="text-muted-foreground">
            Track cycle counts, discrepancies, and variances.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              All time cycle count sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftSessions}</div>
            <p className="text-xs text-muted-foreground">
              Sessions awaiting start
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <PlayIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressSessions}</div>
            <p className="text-xs text-muted-foreground">
              Active counting sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Variance
            </CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalVariance)}
            </div>
            <p className="text-xs text-muted-foreground">Across all sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Input
              className="max-w-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              value={searchQuery}
            />
            <Select
              onValueChange={(value) =>
                setStatusFilter(value as CycleCountSessionStatus | "all")
              }
              value={statusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                setTypeFilter(value as CycleCountSessionType | "all")
              }
              value={typeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                <SelectItem value="scheduled_daily">Daily</SelectItem>
                <SelectItem value="scheduled_weekly">Weekly</SelectItem>
                <SelectItem value="scheduled_monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-center py-8" colSpan={7}>
                    Loading sessions...
                  </TableCell>
                </TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8" colSpan={7}>
                    No sessions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">
                          {session.session_name}
                        </div>
                        {session.notes && (
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {session.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {countTypeLabel[session.count_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[session.status]}>
                        {statusLabel[session.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span>
                        {session.counted_items} / {session.total_items}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          session.total_variance !== 0
                            ? session.total_variance > 0
                              ? "text-green-600"
                              : "text-red-600"
                            : ""
                        }
                      >
                        {formatCurrency(Math.abs(session.total_variance))}
                        {session.total_variance !== 0 && (
                          <span className="text-xs">
                            {" "}
                            ({session.total_variance > 0 ? "+" : ""}
                            {session.variance_percentage.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {session.scheduled_date
                        ? new Date(session.scheduled_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {session.status === "draft" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStartSession(session.id)}
                              >
                                <PlayIcon className="mr-2 h-4 w-4" />
                                Start Session
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  (window.location.href = `/warehouse/audits/${session.id}`)
                                }
                              >
                                View Details
                              </DropdownMenuItem>
                            </>
                          )}
                          {session.status === "in_progress" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  (window.location.href = `/warehouse/audits/${session.id}`)
                                }
                              >
                                <PlayIcon className="mr-2 h-4 w-4" />
                                Continue Counting
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleCompleteSession(session.id)
                                }
                              >
                                <CheckCircleIcon className="mr-2 h-4 w-4" />
                                Complete Session
                              </DropdownMenuItem>
                            </>
                          )}
                          {session.status === "completed" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  (window.location.href = `/warehouse/audits/${session.id}`)
                                }
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleFinalizeSession(session.id)
                                }
                              >
                                <CheckCircleIcon className="mr-2 h-4 w-4" />
                                Finalize Session
                              </DropdownMenuItem>
                            </>
                          )}
                          {session.status === "finalized" && (
                            <DropdownMenuItem
                              onClick={() =>
                                (window.location.href = `/warehouse/audits/${session.id}`)
                              }
                            >
                              View Report
                            </DropdownMenuItem>
                          )}
                          {(session.status === "draft" ||
                            session.status === "in_progress") && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleCancelSession(session.id)}
                            >
                              Cancel Session
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of{" "}
          {totalCount} sessions
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            size="sm"
            variant="outline"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {page} of {totalPages}
          </div>
          <Button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            size="sm"
            variant="outline"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Session Dialog */}
      <AlertDialog
        onOpenChange={setIsCreateDialogOpen}
        open={isCreateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Cycle Count Session</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new cycle count session to track inventory counts and
              variances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name *</Label>
              <Input
                id="session-name"
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="e.g., Dry Storage Cycle Count"
                value={newSessionName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-type">Count Type</Label>
              <Select
                onValueChange={(value) =>
                  setNewSessionType(value as CycleCountSessionType)
                }
                value={newSessionType}
              >
                <SelectTrigger id="session-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                  <SelectItem value="scheduled_daily">Daily</SelectItem>
                  <SelectItem value="scheduled_weekly">Weekly</SelectItem>
                  <SelectItem value="scheduled_monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-notes">Notes</Label>
              <Textarea
                id="session-notes"
                onChange={(e) => setNewSessionNotes(e.target.value)}
                placeholder="Optional notes about this session..."
                value={newSessionNotes}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCreating || !newSessionName.trim()}
              onClick={(e) => {
                e.preventDefault();
                handleCreateSession();
              }}
            >
              {isCreating ? "Creating..." : "Create Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
