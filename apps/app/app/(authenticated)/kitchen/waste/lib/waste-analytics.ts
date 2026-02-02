import { invariant } from "@/app/lib/invariant";

type WasteTrendsSummary = {
  totalCost: number;
  totalQuantity: number;
  totalEntries: number;
  avgCostPerEntry: number;
  period: string;
  startDate: string;
  endDate: string;
};

type WasteTopReason = {
  reason: {
    id: number;
    name: string;
  };
  count: number;
  cost: number;
};

type WasteReductionOpportunity = {
  description: string;
  potentialSavings: number;
};

export type WasteTrendsData = {
  summary: WasteTrendsSummary;
  topReasons: WasteTopReason[];
  reductionOpportunities: WasteReductionOpportunity[];
};

type WasteReportSummary = {
  totalCost: number;
  totalQuantity: number;
  entryCount: number;
  avgCostPerEntry: number;
};

type WasteReportRow = {
  key: string;
  label: string;
  count: number;
  totalCost: number;
  avgCostPerEntry: number;
  avgQuantityPerEntry: number;
};

export type WasteReportData = {
  summary: WasteReportSummary;
  data: WasteReportRow[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const expectRecord = (
  value: unknown,
  path: string
): Record<string, unknown> => {
  invariant(isRecord(value), `${path} must be an object`);
  return value;
};

const expectArray = (value: unknown, path: string): unknown[] => {
  invariant(Array.isArray(value), `${path} must be an array`);
  return value;
};

const expectString = (value: unknown, path: string): string => {
  invariant(typeof value === "string", `${path} must be a string`);
  return value;
};

const expectNumber = (value: unknown, path: string): number => {
  invariant(
    typeof value === "number" && Number.isFinite(value),
    `${path} must be a number`
  );
  return value;
};

export const parseWasteTrendsResponse = (payload: unknown): WasteTrendsData => {
  invariant(isRecord(payload), "payload must be an object");

  const trends = expectRecord(payload.trends, "payload.trends");
  const summary = expectRecord(trends.summary, "payload.trends.summary");

  const topReasons = expectArray(
    trends.topReasons,
    "payload.trends.topReasons"
  ).map((item, index) => {
    const record = expectRecord(item, `payload.trends.topReasons[${index}]`);
    const reason = expectRecord(
      record.reason,
      `payload.trends.topReasons[${index}].reason`
    );
    return {
      reason: {
        id: expectNumber(
          reason.id,
          `payload.trends.topReasons[${index}].reason.id`
        ),
        name: expectString(
          reason.name,
          `payload.trends.topReasons[${index}].reason.name`
        ),
      },
      count: expectNumber(
        record.count,
        `payload.trends.topReasons[${index}].count`
      ),
      cost: expectNumber(
        record.cost,
        `payload.trends.topReasons[${index}].cost`
      ),
    };
  });

  const reductionOpportunities = expectArray(
    trends.reductionOpportunities,
    "payload.trends.reductionOpportunities"
  ).map((item, index) => {
    const record = expectRecord(
      item,
      `payload.trends.reductionOpportunities[${index}]`
    );
    return {
      description: expectString(
        record.description,
        `payload.trends.reductionOpportunities[${index}].description`
      ),
      potentialSavings: expectNumber(
        record.potentialSavings,
        `payload.trends.reductionOpportunities[${index}].potentialSavings`
      ),
    };
  });

  return {
    summary: {
      totalCost: expectNumber(
        summary.totalCost,
        "payload.trends.summary.totalCost"
      ),
      totalQuantity: expectNumber(
        summary.totalQuantity,
        "payload.trends.summary.totalQuantity"
      ),
      totalEntries: expectNumber(
        summary.totalEntries,
        "payload.trends.summary.totalEntries"
      ),
      avgCostPerEntry: expectNumber(
        summary.avgCostPerEntry,
        "payload.trends.summary.avgCostPerEntry"
      ),
      period: expectString(summary.period, "payload.trends.summary.period"),
      startDate: expectString(
        summary.startDate,
        "payload.trends.summary.startDate"
      ),
      endDate: expectString(summary.endDate, "payload.trends.summary.endDate"),
    },
    topReasons,
    reductionOpportunities,
  };
};

export const parseWasteReportResponse = (payload: unknown): WasteReportData => {
  invariant(isRecord(payload), "payload must be an object");

  const report = expectRecord(payload.report, "payload.report");
  const summary = expectRecord(report.summary, "payload.report.summary");
  const data = expectArray(report.data, "payload.report.data").map(
    (item, index) => {
      const record = expectRecord(item, `payload.report.data[${index}]`);
      return {
        key: expectString(record.key, `payload.report.data[${index}].key`),
        label: expectString(
          record.label,
          `payload.report.data[${index}].label`
        ),
        count: expectNumber(
          record.count,
          `payload.report.data[${index}].count`
        ),
        totalCost: expectNumber(
          record.totalCost,
          `payload.report.data[${index}].totalCost`
        ),
        avgCostPerEntry: expectNumber(
          record.avgCostPerEntry,
          `payload.report.data[${index}].avgCostPerEntry`
        ),
        avgQuantityPerEntry: expectNumber(
          record.avgQuantityPerEntry,
          `payload.report.data[${index}].avgQuantityPerEntry`
        ),
      };
    }
  );

  return {
    summary: {
      totalCost: expectNumber(
        summary.totalCost,
        "payload.report.summary.totalCost"
      ),
      totalQuantity: expectNumber(
        summary.totalQuantity,
        "payload.report.summary.totalQuantity"
      ),
      entryCount: expectNumber(
        summary.entryCount,
        "payload.report.summary.entryCount"
      ),
      avgCostPerEntry: expectNumber(
        summary.avgCostPerEntry,
        "payload.report.summary.avgCostPerEntry"
      ),
    },
    data,
  };
};

export async function fetchWasteTrends(): Promise<WasteTrendsData> {
  const response = await fetch(
    "/api/kitchen/waste/trends?period=30d&groupBy=day"
  );

  if (!response.ok) {
    console.warn("Failed to fetch waste trends, server may be unavailable");
    return {
      summary: {
        totalCost: 0,
        totalQuantity: 0,
        totalEntries: 0,
        avgCostPerEntry: 0,
        period: "30d",
        startDate: "",
        endDate: "",
      },
      topReasons: [],
      reductionOpportunities: [],
    };
  }

  const payload = await response.json();
  return parseWasteTrendsResponse(payload);
}

export async function fetchWasteReports(): Promise<WasteReportData> {
  const response = await fetch("/api/kitchen/waste/reports?groupBy=reason");

  if (!response.ok) {
    console.warn("Failed to fetch waste reports, server may be unavailable");
    return {
      summary: {
        totalCost: 0,
        totalQuantity: 0,
        entryCount: 0,
        avgCostPerEntry: 0,
      },
      data: [],
    };
  }

  const payload = await response.json();
  return parseWasteReportResponse(payload);
}
