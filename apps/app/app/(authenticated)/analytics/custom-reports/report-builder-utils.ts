export type ReportWidgetType = "kpi" | "line" | "bar" | "table";
export type ChartType = "number" | "line" | "bar" | "table" | "area" | "pie";
export type ReportDataSource =
  | "events"
  | "finance"
  | "kitchen"
  | "staff"
  | "inventory";

export interface ReportWidgetConfig {
  id: string;
  type: ReportWidgetType;
  title: string;
  metric: string;
  chartType: ChartType;
}

export interface ReportScheduleConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: string;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
}

export interface ReportDistributionConfig {
  channels: Array<"email" | "slack" | "webhook">;
  recipients: string[];
  webhookUrl?: string;
}

export interface ReportLayoutConfig {
  columns: 1 | 2 | 3;
  gap: "sm" | "md" | "lg";
}

export interface CustomReportPayload {
  id?: string;
  name: string;
  description?: string;
  templateId?: string;
  dataSource: ReportDataSource;
  widgets: ReportWidgetConfig[];
  layout?: ReportLayoutConfig;
  filters?: Record<string, unknown>;
  schedule: ReportScheduleConfig;
  distribution: ReportDistributionConfig;
}

export interface ReportBuilderTemplate {
  id: string;
  name: string;
  description: string;
  dataSource: ReportDataSource;
  widgets: ReportWidgetConfig[];
  layout: ReportLayoutConfig;
}

const VALID_DAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEBHOOK_PATTERN = /^https?:\/\//i;

const sanitizeRecipients = (recipients: string[]): string[] =>
  Array.from(new Set(recipients.map((value) => value.trim()).filter(Boolean)));

export const normalizeCustomReportPayload = (
  input: CustomReportPayload
): CustomReportPayload => {
  const name = input.name.trim();
  if (!name) {
    throw new Error("name is required");
  }
  if (!Array.isArray(input.widgets) || input.widgets.length === 0) {
    throw new Error("At least one widget is required");
  }
  if (!TIME_PATTERN.test(input.schedule.time)) {
    throw new Error("schedule.time must be HH:MM");
  }

  const normalizedSchedule: ReportScheduleConfig = {
    enabled: Boolean(input.schedule.enabled),
    frequency: input.schedule.frequency,
    time: input.schedule.time,
    timezone: input.schedule.timezone || "America/New_York",
  };

  if (normalizedSchedule.enabled && normalizedSchedule.frequency === "weekly") {
    const day = (input.schedule.dayOfWeek || "").toLowerCase();
    if (!VALID_DAYS.has(day)) {
      throw new Error("schedule.dayOfWeek is invalid");
    }
    normalizedSchedule.dayOfWeek = day;
  }

  if (
    normalizedSchedule.enabled &&
    normalizedSchedule.frequency === "monthly"
  ) {
    const dayOfMonth = Number(input.schedule.dayOfMonth || 0);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      throw new Error("schedule.dayOfMonth must be between 1 and 31");
    }
    normalizedSchedule.dayOfMonth = dayOfMonth;
  }

  const recipients = sanitizeRecipients(input.distribution.recipients);
  if (
    input.distribution.channels.includes("email") &&
    recipients.length === 0
  ) {
    throw new Error("distribution.recipients must include at least one email");
  }

  const webhookUrl = input.distribution.webhookUrl?.trim();
  if (
    input.distribution.channels.includes("webhook") &&
    !(webhookUrl && WEBHOOK_PATTERN.test(webhookUrl))
  ) {
    throw new Error("distribution.webhookUrl must be a valid http(s) url");
  }

  return {
    ...input,
    name,
    description: input.description?.trim() || undefined,
    schedule: normalizedSchedule,
    distribution: {
      ...input.distribution,
      recipients,
      webhookUrl: webhookUrl || undefined,
    },
    layout: input.layout || { columns: 2, gap: "md" },
  };
};

export const applyTemplateToBuilder = (template: ReportBuilderTemplate) => ({
  name: template.name,
  description: template.description,
  templateId: template.id,
  dataSource: template.dataSource,
  widgets: template.widgets.map((widget) => ({ ...widget })),
  layout: { ...template.layout },
});
