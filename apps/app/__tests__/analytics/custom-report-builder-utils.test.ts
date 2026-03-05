import { describe, expect, it } from "vitest";
import {
  applyTemplateToBuilder,
  type CustomReportPayload,
  normalizeCustomReportPayload,
} from "@/app/(authenticated)/analytics/custom-reports/report-builder-utils";

describe("custom report builder utils", () => {
  it("normalizes scheduling + distribution defaults", () => {
    const input: CustomReportPayload = {
      name: "Weekly Ops Pulse",
      widgets: [
        {
          id: "w1",
          type: "kpi",
          title: "Revenue",
          metric: "revenue",
          chartType: "number",
        },
      ],
      dataSource: "events",
      schedule: {
        enabled: true,
        frequency: "weekly",
        dayOfWeek: "monday",
        time: "08:30",
      },
      distribution: {
        channels: ["email"],
        recipients: ["ops@capsule.test", "", "ops@capsule.test"],
      },
    };

    const normalized = normalizeCustomReportPayload(input);

    expect(normalized.name).toBe("Weekly Ops Pulse");
    expect(normalized.schedule.enabled).toBe(true);
    expect(normalized.schedule.dayOfWeek).toBe("monday");
    expect(normalized.distribution.recipients).toEqual(["ops@capsule.test"]);
  });

  it("rejects invalid schedule when enabled", () => {
    const input: CustomReportPayload = {
      name: "Bad schedule",
      widgets: [
        {
          id: "w1",
          type: "line",
          title: "Trend",
          metric: "orders",
          chartType: "line",
        },
      ],
      dataSource: "events",
      schedule: {
        enabled: true,
        frequency: "weekly",
        dayOfWeek: "funday",
        time: "25:90",
      },
      distribution: {
        channels: ["email"],
        recipients: ["team@capsule.test"],
      },
    };

    expect(() => normalizeCustomReportPayload(input)).toThrow(
      /dayOfWeek|time/i
    );
  });

  it("applies template layout + widgets", () => {
    const template = {
      id: "ops-overview",
      name: "Ops Overview",
      description: "KPI + trend + table",
      widgets: [
        {
          id: "kpi-revenue",
          type: "kpi",
          title: "Revenue",
          metric: "revenue",
          chartType: "number",
        },
      ],
      layout: { columns: 2, gap: "md" },
      dataSource: "events",
    } as const;

    const applied = applyTemplateToBuilder(template);

    expect(applied.templateId).toBe("ops-overview");
    expect(applied.widgets).toHaveLength(1);
    expect(applied.layout.columns).toBe(2);
  });
});
