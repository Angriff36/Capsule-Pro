/**
 * @module AutofillReportsClient
 * @intent Client-side UI for autofill reports: event reports, document parsing, and waste reports
 * @responsibility Render tabbed interface for generating/viewing event reports, parsing documents into
 *   structured event data (autofill), and viewing kitchen waste reports with summary analytics
 * @domain Tools
 * @tags reports, autofill, events, waste, kitchen, document-parser
 * @canonical true
 */

"use client";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingDown,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  dishCreate,
  eventDishCreate,
  eventReportCreate,
  eventUpdate,
  scheduleShiftCreate,
} from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventReport {
  id: string;
  eventId: string;
  eventName: string;
  reportType: string;
  status: "draft" | "complete" | "reviewed";
  createdAt: string;
}

interface EventReportsResponse {
  data: EventReport[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface ParsedMenuItem {
  name: string;
  quantity: number;
  notes: string | null;
}

interface ParsedStaffShift {
  role: string;
  name: string;
  time: string;
}

interface ParsedEventDetails {
  eventName: string | null;
  eventDate: string | null;
  guestCount: number | null;
  venue: string | null;
}

interface ParsedDocument {
  menuItems: ParsedMenuItem[];
  staffShifts: ParsedStaffShift[];
  eventDetails: ParsedEventDetails;
  rawText?: string;
}

interface WasteSummary {
  totalCost: number;
  totalQuantity: number;
  entryCount: number;
  avgCostPerEntry: number;
}

interface WasteEntry {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
  reason: string;
  recordedAt: string;
}

interface WasteReportResponse {
  report: {
    summary: WasteSummary;
    groupedBy: string;
    data: WasteEntry[];
    trends: Array<{ period: string; cost: number }>;
    wasteReasons: Array<{ reason: string; count: number; totalCost: number }>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function reportStatusBadge(status: string) {
  switch (status) {
    case "complete":
      return (
        <Badge className="gap-1" variant="default">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </Badge>
      );
    case "reviewed":
      return (
        <Badge className="gap-1 bg-blue-600">
          <CheckCircle2 className="h-3 w-3" />
          Reviewed
        </Badge>
      );
    case "draft":
      return (
        <Badge className="gap-1" variant="secondary">
          <Clock className="h-3 w-3" />
          Draft
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground/70">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Event Reports Tab
// ---------------------------------------------------------------------------

function EventReportsTab() {
  const [reports, setReports] = useState<EventReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [downloadState, setDownloadState] = useState<{
    loadingId: string | null;
  }>({ loadingId: null });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/events/reports");
      const json = (await res.json()) as EventReportsResponse;
      if (!res.ok) {
        toast.error("Failed to load event reports");
        return;
      }
      setReports(json.data ?? []);
    } catch {
      toast.error("Failed to load event reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleCreate = useCallback(async () => {
    if (!selectedEventId.trim()) {
      toast.error("Please enter an event ID");
      return;
    }
    setCreating(true);
    try {
      await eventReportCreate({ eventId: selectedEventId.trim() });
      toast.success("Event report created");
      setDialogOpen(false);
      setSelectedEventId("");
      loadReports();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create report";
      toast.error("Failed to create report", {
        description: message,
      });
    } finally {
      setCreating(false);
    }
  }, [selectedEventId, loadReports]);

  const handleDownloadReport = useCallback(async (reportId: string) => {
    setDownloadState({ loadingId: reportId });
    try {
      const res = await apiFetch(`/api/events/reports/${reportId}/download`);
      if (!res.ok) {
        toast.error("Failed to download report");
        return;
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "event-report.json";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match?.[1]) {
          filename = match[1];
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download report");
    } finally {
      setDownloadState({ loadingId: null });
    }
  }, []);

  const totalReports = reports.length;
  const completedReports = reports.filter(
    (r) => r.status === "complete"
  ).length;
  const draftReports = reports.filter((r) => r.status === "draft").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reports</CardDescription>
            <CardTitle className="text-2xl">{totalReports}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {completedReports}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drafts</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {draftReports}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Reports Table */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No event reports yet</p>
            <p className="text-sm text-muted-foreground">
              Generate your first event report to review pre-event checklists.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.eventName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.reportType}</Badge>
                    </TableCell>
                    <TableCell>{reportStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        disabled={downloadState.loadingId === report.id}
                        onClick={() => handleDownloadReport(report.id)}
                        size="sm"
                        title="Download report"
                        variant="ghost"
                      >
                        {downloadState.loadingId === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Report Dialog */}
      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Event Report</DialogTitle>
            <DialogDescription>
              Create a new pre-event review checklist for an event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-id">Event ID</Label>
              <Input
                id="event-id"
                onChange={(e) => setSelectedEventId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="Enter event ID..."
                value={selectedEventId}
              />
              <p className="text-xs text-muted-foreground">
                Enter the ID of the event to generate a report for.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={creating} onClick={handleCreate}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document Parser Tab (Autofill)
// ---------------------------------------------------------------------------

interface EventSearchResult {
  id: string;
  title: string;
  eventDate: string | null;
  guestCount: number | null;
  status: string;
}

function DocumentParserTab() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventName, setSelectedEventName] = useState<string | null>(
    null
  );
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventSearchResults, setEventSearchResults] = useState<
    EventSearchResult[]
  >([]);
  const [eventSearchLoading, setEventSearchLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const pendingSection = useRef<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] ?? null;
      setFile(selected);
      setParsed(null);
      setError(null);
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0] ?? null;
    setFile(dropped);
    setParsed(null);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleParse = useCallback(async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/events/documents/parse", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const json = (await res.json()) as ParsedDocument;
      setParsed(json);
      toast.success("Document parsed successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse document";
      setError(message);
      toast.error(message);
    } finally {
      setParsing(false);
    }
  }, [file]);

  const searchEvents = useCallback(async (query: string) => {
    setEventSearchLoading(true);
    try {
      const res = await apiFetch(
        `/api/events?search=${encodeURIComponent(query)}&limit=10`
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data: EventSearchResult[];
        };
        setEventSearchResults(json.data ?? []);
      }
    } catch {
      setEventSearchResults([]);
    } finally {
      setEventSearchLoading(false);
    }
  }, []);

  const handleSelectEvent = useCallback((event: EventSearchResult) => {
    setSelectedEventId(event.id);
    setSelectedEventName(event.title);
    setEventPickerOpen(false);
    setEventSearchQuery("");
    setEventSearchResults([]);
    const section = pendingSection.current;
    pendingSection.current = null;
    if (section) {
      setTimeout(() => handleApplySection(section), 0);
    }
  }, []);

  const handleApplySection = useCallback(
    async (section: string) => {
      if (!parsed) return;

      if (!selectedEventId) {
        pendingSection.current = section;
        setEventPickerOpen(true);
        return;
      }

      setApplying(section);
      try {
        if (section === "Event Details") {
          const details = parsed.eventDetails;
          const updatePayload: Record<string, unknown> = {
            id: selectedEventId,
          };
          if (details.eventName) updatePayload.title = details.eventName;
          if (details.eventDate) updatePayload.eventDate = details.eventDate;
          if (details.guestCount) updatePayload.guestCount = details.guestCount;
          if (details.venue) updatePayload.venueName = details.venue;

          await eventUpdate(updatePayload);
          toast.success("Event details applied", {
            description: `Updated ${selectedEventName}`,
          });
        } else if (section === "Menu Items") {
          let created = 0;
          const errors: string[] = [];
          for (const item of parsed.menuItems) {
            try {
              const dish = await dishCreate({ name: item.name });
              const dishId = dish?.id;
              if (dishId) {
                await eventDishCreate({
                  eventId: selectedEventId,
                  dishId,
                  quantityServings: item.quantity || 1,
                  specialInstructions: item.notes || undefined,
                });
              }
              created++;
            } catch {
              errors.push(item.name);
            }
          }
          toast.success(
            `${created} menu item${created !== 1 ? "s" : ""} applied`,
            {
              description:
                errors.length > 0
                  ? `Failed: ${errors.join(", ")}`
                  : `Added to ${selectedEventName}`,
            }
          );
        } else if (section === "Staff Shifts") {
          let created = 0;
          const errors: string[] = [];
          for (const shift of parsed.staffShifts) {
            try {
              await scheduleShiftCreate({
                eventId: selectedEventId,
                role: shift.role,
                employeeName: shift.name,
                shiftTime: shift.time,
              });
              created++;
            } catch {
              errors.push(shift.name);
            }
          }
          toast.success(`${created} shift${created !== 1 ? "s" : ""} created`, {
            description:
              errors.length > 0
                ? `Failed: ${errors.join(", ")}`
                : `Added to ${selectedEventName}`,
          });
        }
      } catch (err) {
        toast.error(`Failed to apply ${section.toLowerCase()}`, {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setApplying(null);
      }
    },
    [parsed, selectedEventId, selectedEventName]
  );

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upload Document</CardTitle>
          <CardDescription>
            Upload a PDF or CSV file to parse into structured event data. The
            parser extracts menu items, staff shifts, and event details for
            autofill.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-muted-foreground/60" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Drag and drop your file here, or
              </p>
              <Button
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                variant="outline"
              >
                Browse Files
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports PDF and CSV files
            </p>
            <input
              accept=".pdf,.csv"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
          </div>

          {file && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                onClick={() => {
                  setFile(null);
                  setParsed(null);
                  setError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button disabled={!file || parsing} onClick={handleParse}>
              {parsing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Parse Document
            </Button>
            {file && !parsing && (
              <Button
                onClick={() => {
                  setFile(null);
                  setParsed(null);
                  setError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                variant="outline"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Event Indicator */}
      {parsed && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {selectedEventId ? (
                <span className="text-sm">
                  Applying to: <strong>{selectedEventName}</strong>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No event selected — click &quot;Apply to Event&quot; to pick
                  one
                </span>
              )}
            </div>
            {selectedEventId && (
              <Button
                onClick={() => {
                  setSelectedEventId(null);
                  setSelectedEventName(null);
                }}
                size="sm"
                variant="ghost"
              >
                Change
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Picker Dialog */}
      <Dialog onOpenChange={setEventPickerOpen} open={eventPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Event</DialogTitle>
            <DialogDescription>
              Choose an event to apply the parsed data to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              onChange={(e) => {
                setEventSearchQuery(e.target.value);
                if (e.target.value.length >= 2) {
                  searchEvents(e.target.value);
                } else {
                  setEventSearchResults([]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && eventSearchQuery.length >= 2) {
                  searchEvents(eventSearchQuery);
                }
              }}
              placeholder="Search events by name..."
              value={eventSearchQuery}
            />
            {eventSearchLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!eventSearchLoading && eventSearchResults.length > 0 && (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {eventSearchResults.map((event) => (
                  <button
                    className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    type="button"
                  >
                    <span className="font-medium">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.eventDate)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!eventSearchLoading &&
              eventSearchQuery.length >= 2 &&
              eventSearchResults.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No events found
                </p>
              )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setEventPickerOpen(false);
                pendingSection.current = null;
              }}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 p-4 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Parsed Results */}
      {parsed && (
        <div className="space-y-4">
          {/* Event Details */}
          {parsed.eventDetails && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Event Details</CardTitle>
                    <CardDescription>
                      Extracted event information
                    </CardDescription>
                  </div>
                  <Button
                    disabled={applying === "Event Details"}
                    onClick={() => handleApplySection("Event Details")}
                    size="sm"
                    variant="outline"
                  >
                    {applying === "Event Details" && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    Apply to Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Event Name
                    </p>
                    <p className="text-sm">
                      {parsed.eventDetails.eventName ?? "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Event Date
                    </p>
                    <p className="text-sm">
                      {parsed.eventDetails.eventDate
                        ? formatDate(parsed.eventDetails.eventDate)
                        : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Guest Count
                    </p>
                    <p className="text-sm">
                      {parsed.eventDetails.guestCount?.toString() ?? "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Venue
                    </p>
                    <p className="text-sm">
                      {parsed.eventDetails.venue ?? "--"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Menu Items */}
          {parsed.menuItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Menu Items ({parsed.menuItems.length})
                    </CardTitle>
                    <CardDescription>
                      Extracted menu items from the document
                    </CardDescription>
                  </div>
                  <Button
                    disabled={applying === "Menu Items"}
                    onClick={() => handleApplySection("Menu Items")}
                    size="sm"
                    variant="outline"
                  >
                    {applying === "Menu Items" && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    Apply to Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.menuItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.notes ?? "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Staff Shifts */}
          {parsed.staffShifts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Staff Shifts ({parsed.staffShifts.length})
                    </CardTitle>
                    <CardDescription>
                      Extracted staffing requirements
                    </CardDescription>
                  </div>
                  <Button
                    disabled={applying === "Staff Shifts"}
                    onClick={() => handleApplySection("Staff Shifts")}
                    size="sm"
                    variant="outline"
                  >
                    {applying === "Staff Shifts" && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    Apply to Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.staffShifts.map((shift, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline">{shift.role}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {shift.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {shift.time}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Empty parsed state */}
          {parsed.menuItems.length === 0 &&
            parsed.staffShifts.length === 0 &&
            !parsed.eventDetails?.eventName && (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">
                    No structured data extracted
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The document was parsed but no menu items, staff shifts, or
                    event details were found.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* Empty Initial State */}
      {!(parsed || error || parsing) && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm font-medium">No document parsed</p>
            <p className="text-sm text-muted-foreground">
              Upload a PDF or CSV file and click &quot;Parse Document&quot; to
              extract event data for autofill.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waste Reports Tab
// ---------------------------------------------------------------------------

function WasteReportsTab() {
  const [wasteData, setWasteData] = useState<WasteReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState("reason");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/kitchen/waste/reports?groupBy=${encodeURIComponent(groupBy)}`
      );
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const json = (await res.json()) as WasteReportResponse;
      setWasteData(json);
      toast.success("Waste report loaded");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load waste report";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [groupBy]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = wasteData?.report.summary;
  const entries = wasteData?.report.data ?? [];
  const reasons = wasteData?.report.wasteReasons ?? [];
  const trends = wasteData?.report.trends ?? [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Group By</Label>
          <Select onValueChange={setGroupBy} value={groupBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reason">Reason</SelectItem>
              <SelectItem value="item">Item</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button disabled={loading} onClick={loadReport}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Report
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 p-4 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && !wasteData && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={TrendingDown}
            label="Total Waste Cost"
            value={formatCurrency(summary.totalCost)}
          />
          <StatCard
            icon={BarChart3}
            label="Total Quantity"
            value={summary.totalQuantity.toString()}
          />
          <StatCard
            icon={FileText}
            label="Entry Count"
            value={summary.entryCount.toString()}
          />
          <StatCard
            icon={Clock}
            label="Avg Cost / Entry"
            value={formatCurrency(summary.avgCostPerEntry)}
          />
        </div>
      )}

      {/* Waste Reasons Breakdown */}
      {reasons.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Waste by Reason</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasons.map((r) => (
                  <TableRow key={r.reason}>
                    <TableCell className="font-medium">{r.reason}</TableCell>
                    <TableCell>{r.count}</TableCell>
                    <TableCell>{formatCurrency(r.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Trends */}
      {trends.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Waste Trends</CardTitle>
            <CardDescription>Cost over recent periods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {trends.map((t) => (
                <div
                  className="flex flex-col items-center gap-1 rounded-md border px-4 py-2"
                  key={t.period}
                >
                  <span className="text-xs text-muted-foreground">
                    {t.period}
                  </span>
                  <span className="text-sm font-semibold">
                    {formatCurrency(t.cost)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waste Entries Table */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Waste Entries ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.itemName}
                    </TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.unit}
                    </TableCell>
                    <TableCell>{formatCurrency(entry.cost)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.reason}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.recordedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!(loading || error) && entries.length === 0 && !wasteData && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm font-medium">No waste data</p>
            <p className="text-sm text-muted-foreground">
              Waste entries will appear here once kitchen waste data is
              recorded.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AutofillReportsClient() {
  return (
    <Tabs className="w-full" defaultValue="event-reports">
      <TabsList>
        <TabsTrigger className="gap-1.5" value="event-reports">
          <FileText className="h-3.5 w-3.5" />
          Event Reports
        </TabsTrigger>
        <TabsTrigger className="gap-1.5" value="document-parser">
          <Sparkles className="h-3.5 w-3.5" />
          Document Parser
        </TabsTrigger>
        <TabsTrigger className="gap-1.5" value="waste-reports">
          <BarChart3 className="h-3.5 w-3.5" />
          Waste Reports
        </TabsTrigger>
      </TabsList>

      <TabsContent className="mt-6" value="event-reports">
        <EventReportsTab />
      </TabsContent>

      <TabsContent className="mt-6" value="document-parser">
        <DocumentParserTab />
      </TabsContent>

      <TabsContent className="mt-6" value="waste-reports">
        <WasteReportsTab />
      </TabsContent>
    </Tabs>
  );
}
