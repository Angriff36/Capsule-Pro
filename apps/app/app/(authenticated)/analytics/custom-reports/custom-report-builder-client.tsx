"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { REPORT_BUILDER_TEMPLATES } from "./report-builder-templates";
import {
  applyTemplateToBuilder,
  type CustomReportPayload,
  normalizeCustomReportPayload,
  type ReportDataSource,
  type ReportWidgetConfig,
} from "./report-builder-utils";

const PALETTE_ITEMS: Array<{
  type: ReportWidgetConfig["type"];
  label: string;
  metric: string;
  chartType: ReportWidgetConfig["chartType"];
}> = [
  { type: "kpi", label: "KPI", metric: "revenue", chartType: "number" },
  { type: "line", label: "Line Chart", metric: "trend", chartType: "line" },
  { type: "bar", label: "Bar Chart", metric: "volume", chartType: "bar" },
  { type: "table", label: "Table", metric: "detail_rows", chartType: "table" },
];

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  scheduleEnabled: boolean;
  channels: string[];
}

const defaultPayload = (): CustomReportPayload => ({
  name: "",
  description: "",
  dataSource: "events",
  widgets: [],
  layout: { columns: 2, gap: "md" },
  filters: {},
  schedule: {
    enabled: false,
    frequency: "weekly",
    dayOfWeek: "monday",
    time: "08:00",
    timezone: "America/New_York",
  },
  distribution: {
    channels: ["email"],
    recipients: [],
  },
});

export function CustomReportBuilderClient() {
  const [builder, setBuilder] = useState<CustomReportPayload>(defaultPayload);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recipientsInput = useMemo(
    () => builder.distribution.recipients.join(", "),
    [builder.distribution.recipients]
  );

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch("/api/analytics/custom-reports", {
          method: "GET",
        });
        if (!response.ok) {
          throw new Error("Failed to load saved reports");
        }
        const payload = (await response.json()) as { reports: SavedReport[] };
        setSavedReports(payload.reports || []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load saved reports"
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports().catch(() => undefined);
  }, []);

  const addWidget = (widgetType: string) => {
    const palette = PALETTE_ITEMS.find((item) => item.type === widgetType);
    if (!palette) {
      return;
    }

    const nextWidget: ReportWidgetConfig = {
      id: `${palette.type}-${Date.now()}`,
      type: palette.type,
      title: `${palette.label} Widget`,
      metric: palette.metric,
      chartType: palette.chartType,
    };

    setBuilder((current) => ({
      ...current,
      widgets: [...current.widgets, nextWidget],
    }));
  };

  const removeWidget = (widgetId: string) => {
    setBuilder((current) => ({
      ...current,
      widgets: current.widgets.filter((widget) => widget.id !== widgetId),
    }));
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const widgetType = event.dataTransfer.getData("application/report-widget");
    addWidget(widgetType);
  };

  const handleTemplateApply = (templateId: string) => {
    const template = REPORT_BUILDER_TEMPLATES.find(
      (item) => item.id === templateId
    );
    if (!template) {
      return;
    }
    const applied = applyTemplateToBuilder(template);
    setBuilder((current) => ({
      ...current,
      ...applied,
      schedule: current.schedule,
      distribution: current.distribution,
    }));
  };

  const saveReport = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const normalized = normalizeCustomReportPayload(builder);
      const response = await fetch("/api/analytics/custom-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || "Failed to save report");
      }

      const payload = (await response.json()) as { report: SavedReport };
      setSavedReports((current) => [
        payload.report,
        ...current.filter((item) => item.id !== payload.report.id),
      ]);
      setSuccessMessage(
        "Report saved. Schedule and distribution are now active."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save report"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const setDataSource = (value: string) =>
    setBuilder((current) => ({
      ...current,
      dataSource: value as ReportDataSource,
    }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Custom Report Builder
        </h1>
        <p className="text-muted-foreground">
          Drag widgets onto the canvas, configure visualizations, then schedule
          automated distribution.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Template Library</CardTitle>
            <CardDescription>Start from a proven layout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {REPORT_BUILDER_TEMPLATES.map((template) => (
              <button
                className="w-full rounded-md border p-3 text-left transition hover:border-primary/50"
                key={template.id}
                onClick={() => handleTemplateApply(template.id)}
                type="button"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-muted-foreground text-xs">
                  {template.description}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Definition</CardTitle>
              <CardDescription>Configure identity and source.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-name">Report Name</Label>
                <Input
                  id="report-name"
                  onChange={(event) =>
                    setBuilder((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Executive Weekly Snapshot"
                  value={builder.name}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select
                  onValueChange={setDataSource}
                  value={builder.dataSource}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="report-description">Description</Label>
                <Textarea
                  id="report-description"
                  onChange={(event) =>
                    setBuilder((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Operational and financial pulse for leadership standup."
                  value={builder.description}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drag-and-Drop Builder</CardTitle>
              <CardDescription>
                Drop palette items into the canvas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PALETTE_ITEMS.map((item) => (
                  <button
                    className="cursor-grab rounded border border-dashed p-3 text-sm"
                    draggable
                    key={item.type}
                    onDragStart={(event) =>
                      event.dataTransfer.setData(
                        "application/report-widget",
                        item.type
                      )
                    }
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div
                aria-label="Report canvas"
                className="min-h-48 rounded-lg border-2 border-dashed p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {builder.widgets.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Drop a widget here to start your visualization canvas.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {builder.widgets.map((widget) => (
                      <div className="rounded border p-3" key={widget.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <Badge variant="outline">
                            {widget.type.toUpperCase()}
                          </Badge>
                          <Button
                            onClick={() => removeWidget(widget.id)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <Input
                            onChange={(event) =>
                              setBuilder((current) => ({
                                ...current,
                                widgets: current.widgets.map((item) =>
                                  item.id === widget.id
                                    ? { ...item, title: event.target.value }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Widget title"
                            value={widget.title}
                          />
                          <Input
                            onChange={(event) =>
                              setBuilder((current) => ({
                                ...current,
                                widgets: current.widgets.map((item) =>
                                  item.id === widget.id
                                    ? { ...item, metric: event.target.value }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Metric key"
                            value={widget.metric}
                          />
                          <Select
                            onValueChange={(value) =>
                              setBuilder((current) => ({
                                ...current,
                                widgets: current.widgets.map((item) =>
                                  item.id === widget.id
                                    ? {
                                        ...item,
                                        chartType:
                                          value as ReportWidgetConfig["chartType"],
                                      }
                                    : item
                                ),
                              }))
                            }
                            value={widget.chartType}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="line">Line</SelectItem>
                              <SelectItem value="bar">Bar</SelectItem>
                              <SelectItem value="area">Area</SelectItem>
                              <SelectItem value="pie">Pie</SelectItem>
                              <SelectItem value="table">Table</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
              <CardDescription>Automate refresh cadence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-enabled">Enable schedule</Label>
                <Switch
                  checked={builder.schedule.enabled}
                  id="schedule-enabled"
                  onCheckedChange={(checked) =>
                    setBuilder((current) => ({
                      ...current,
                      schedule: { ...current.schedule, enabled: checked },
                    }))
                  }
                />
              </div>
              <Select
                onValueChange={(value) =>
                  setBuilder((current) => ({
                    ...current,
                    schedule: {
                      ...current.schedule,
                      frequency:
                        value as CustomReportPayload["schedule"]["frequency"],
                    },
                  }))
                }
                value={builder.schedule.frequency}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {builder.schedule.frequency === "weekly" ? (
                <Select
                  onValueChange={(value) =>
                    setBuilder((current) => ({
                      ...current,
                      schedule: { ...current.schedule, dayOfWeek: value },
                    }))
                  }
                  value={builder.schedule.dayOfWeek || "monday"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {builder.schedule.frequency === "monthly" ? (
                <Input
                  max={31}
                  min={1}
                  onChange={(event) =>
                    setBuilder((current) => ({
                      ...current,
                      schedule: {
                        ...current.schedule,
                        dayOfMonth: Number(event.target.value || "1"),
                      },
                    }))
                  }
                  type="number"
                  value={builder.schedule.dayOfMonth || 1}
                />
              ) : null}
              <Input
                onChange={(event) =>
                  setBuilder((current) => ({
                    ...current,
                    schedule: { ...current.schedule, time: event.target.value },
                  }))
                }
                type="time"
                value={builder.schedule.time}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution</CardTitle>
              <CardDescription>Choose channels and recipients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Recipients (comma separated)</Label>
                <Textarea
                  onChange={(event) =>
                    setBuilder((current) => ({
                      ...current,
                      distribution: {
                        ...current.distribution,
                        recipients: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  placeholder="ops@company.com, finance@company.com"
                  value={recipientsInput}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["email", "slack", "webhook"] as const).map((channel) => (
                  <Button
                    key={channel}
                    onClick={() =>
                      setBuilder((current) => {
                        const exists =
                          current.distribution.channels.includes(channel);
                        return {
                          ...current,
                          distribution: {
                            ...current.distribution,
                            channels: exists
                              ? current.distribution.channels.filter(
                                  (item) => item !== channel
                                )
                              : [...current.distribution.channels, channel],
                          },
                        };
                      })
                    }
                    type="button"
                    variant={
                      builder.distribution.channels.includes(channel)
                        ? "default"
                        : "outline"
                    }
                  >
                    {channel}
                  </Button>
                ))}
              </div>
              {builder.distribution.channels.includes("webhook") ? (
                <Input
                  onChange={(event) =>
                    setBuilder((current) => ({
                      ...current,
                      distribution: {
                        ...current.distribution,
                        webhookUrl: event.target.value,
                      },
                    }))
                  }
                  placeholder="https://hooks.example.com/reports"
                  value={builder.distribution.webhookUrl || ""}
                />
              ) : null}
            </CardContent>
          </Card>

          <Button disabled={isSaving} onClick={saveReport}>
            {isSaving ? "Saving..." : "Save Report"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading saved reports..."
              : "Scheduled custom report definitions"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {savedReports.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No custom reports saved yet.
            </p>
          ) : (
            savedReports.map((report) => (
              <div
                className="flex items-center justify-between rounded border p-3"
                key={report.id}
              >
                <div>
                  <div className="font-medium">{report.name}</div>
                  <div className="text-muted-foreground text-xs">
                    Updated {new Date(report.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={report.scheduleEnabled ? "default" : "outline"}
                  >
                    {report.scheduleEnabled ? "Scheduled" : "Manual"}
                  </Badge>
                  <Badge variant="secondary">
                    {report.channels.join(", ") || "none"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
