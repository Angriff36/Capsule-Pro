import type { WorkBook, WorkSheet } from "xlsx";
import { invariant } from "@/app/lib/invariant";

// Lazy load xlsx utils to keep it out of initial bundle
const getXlsxUtils = async () => {
  const xlsx = await import("xlsx");
  return xlsx.utils;
};

export type CellValue = string | number | boolean | Date | null;
export type DataRow = Record<string, CellValue>;

export interface DateWindow {
  start: Date;
  end: Date;
}

export interface SalesData {
  masterEvents: DataRow[];
  dealsLost: DataRow[];
  leadSource: DataRow[];
  mappingEventType: DataRow[];
  calcsFunnel: DataRow[];
  rawSheets: Record<string, DataRow[]>;
}

export interface WeeklyMetrics {
  window: DateWindow;
  revenueByEventType: Array<{ event_type: string; revenue: number }>;
  leadsReceived: number;
  proposalsSent: number;
  eventsWon: number;
  closingRatio: number;
  trendingLost: Array<{ lost_reason: string; count: number }>;
  topPending: DataRow[];
}

export interface MonthlyMetrics {
  window: DateWindow;
  totalRevenueBooked: number;
  totalEventsClosed: number;
  averageEventValue: number;
  leadSourceBreakdown: Array<{ lead_source: string; count: number }>;
  salesFunnel: Array<{ stage: string; count: number }>;
  closingBySalesperson: Array<{
    salesperson: string;
    won: number;
    lost: number;
    win_rate: number;
  }>;
  winLossTrends: Array<{ lost_reason: string; count: number }>;
  topPackages: Array<{ package: string; revenue: number }>;
  pipelineForecast60: number;
  pipelineForecast90: number;
  revenueMomDelta: number;
  revenueYoyDelta: number;
  revenueMomPct: number;
  revenueYoyPct: number;
}

export interface QuarterlyMetrics {
  window: DateWindow;
  totalRevenueBooked: number;
  totalEventsClosed: number;
  averageEventValue: number;
  avgSalesCycleDays: number;
  segmentSummary: Array<{
    event_type: string;
    size_bucket: string;
    budget_tier: string;
    count: number;
    revenue: number;
  }>;
  funnelBySource: Array<{
    lead_source: string;
    Inquiries: number;
    qualified: number;
    proposals: number;
    won: number;
    lost: number;
    proposal_rate: number;
    win_rate: number;
  }>;
  pricingSummary: Array<{ metric: string; value: number }>;
  pricingTrends: Array<{
    month: Date;
    avg_actual: number;
    avg_budget: number;
    avg_discount_rate: number;
  }>;
  venuePerformance: Array<{
    venue_source: string;
    count: number;
    revenue: number;
  }>;
  winLossTrends: Array<{ lost_reason: string; count: number }>;
  nextQuarterForecast: number;
  recommendations: string[];
  opportunities: string[];
}

export interface AnnualMetrics {
  window: DateWindow;
  totalRevenueBooked: number;
  totalEventsClosed: number;
  averageEventValue: number;
  revenueByMonth: Array<{ month: Date; revenue: number }>;
  revenueByEventType: Array<{ event_type: string; revenue: number }>;
  leadSourceBreakdown: Array<{ lead_source: string; count: number }>;
  salesFunnel: Array<{ stage: string; count: number }>;
  closingBySalesperson: Array<{
    salesperson: string;
    won: number;
    lost: number;
    win_rate: number;
  }>;
  winLossTrends: Array<{ lost_reason: string; count: number }>;
  topPackages: Array<{ package: string; revenue: number }>;
  pipelineForecast90: number;
  revenueYoyDelta: number;
  revenueYoyPct: number;
}

export interface PeriodSummary {
  label: string;
  window: DateWindow;
  leadsReceived: number;
  qualifiedLeads: number;
  proposalsSent: number;
  eventsWon: number;
  closingRatio: number;
  revenue: number;
  eventsClosed: number;
  averageEventValue: number;
}

export interface FunnelValidationResult {
  metric: string;
  expected: number | null;
  actual: number | null;
  delta: number | null;
  delta_pct: number | null;
  status: "Pass" | "Fail" | "Missing";
}

export interface FunnelValidation {
  results: FunnelValidationResult[];
  passed: boolean;
}

const RAW_SHEETS = [
  "RAW_MasterEvents_2025",
  "RAW_Deals_Lost_2025",
  "RAW_LeadSource_2025",
];
const MAP_SHEET = "MAP_EventType_2025";
const CALCS_SHEET = "CALCS_Funnel";
const MASTER_EVENT_ALIASES = [
  RAW_SHEETS[0],
  "RAW_MasterEvents",
  "Master Events",
  "Events",
  "Events Export",
  "Sales Events",
];
const DEALS_LOST_ALIASES = [
  RAW_SHEETS[1],
  "RAW_Deals_Lost",
  "Deals Lost",
  "Lost Deals",
  "Lost Reasons",
];
const LEAD_SOURCE_ALIASES = [
  RAW_SHEETS[2],
  "RAW_LeadSource",
  "Lead Source",
  "Lead Sources",
  "Lead Channels",
  "Channels",
];
const EVENT_TYPE_MAP_ALIASES = [
  MAP_SHEET,
  "MAP_EventType",
  "Event Type Map",
  "Event Type Mapping",
];
const CALCS_ALIASES = [CALCS_SHEET, "CALCS Funnel", "Funnel"];

const STATUS_NORMALIZED_COL = "status_normalized";
const EVENT_TYPE_STANDARD_COL = "event_type_standard";
const EVENT_DATE_COL = "event_date";
const CREATED_DATE_COL = "created_date";

const CURRENCY_HINTS = ["total", "value", "amount", "budget", "revenue"];
const DATE_HINTS = ["date", "created"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeName = (value: string): string => {
  const text = value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return text.replace(/\s+/g, " ").trim();
};

const normalizeSheetName = (value: string): string =>
  normalizeName(value)
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const resolveSheetName = (
  sheetNames: string[],
  aliases: string[],
  used: Set<string>
): string | null => {
  const available = sheetNames.filter((name) => !used.has(name));
  const normalizedAliases = aliases.map((alias) => normalizeSheetName(alias));

  for (const name of available) {
    const normalized = normalizeSheetName(name);
    if (normalizedAliases.includes(normalized)) {
      return name;
    }
  }

  const candidates = available
    .map((name) => {
      const normalized = normalizeSheetName(name);
      let score = 0;
      for (const alias of normalizedAliases) {
        if (!alias) {
          continue;
        }
        if (normalized.includes(alias) || alias.includes(normalized)) {
          score = Math.max(score, alias.split(" ").length);
          continue;
        }
        const tokens = alias.split(" ").filter(Boolean);
        if (
          tokens.length > 1 &&
          tokens.every((token) => normalized.includes(token))
        ) {
          score = Math.max(score, tokens.length);
        }
      }
      return { name, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.name ?? null;
};

const normalizeMappingKey = (value: CellValue): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text ? normalizeName(text) : null;
};

const getColumns = (rows: DataRow[]): string[] => {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
};

const findColumn = (rows: DataRow[], candidates: string[]): string | null => {
  const columns = getColumns(rows);
  const normalized = new Map<string, string>();
  for (const column of columns) {
    normalized.set(normalizeName(column), column);
  }
  for (const candidate of candidates) {
    const key = normalizeName(candidate);
    const exact = normalized.get(key);
    if (exact) {
      return exact;
    }
  }
  for (const candidate of candidates) {
    const key = normalizeName(candidate);
    for (const [normalizedKey, original] of normalized.entries()) {
      if (key && normalizedKey.includes(key)) {
        return original;
      }
    }
  }
  return null;
};

const toNumber = (value: CellValue): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const negative = trimmed.startsWith("(") && trimmed.endsWith(")");
    const numeric = trimmed.replace(/[(),$]/g, "").replace(/,/g, "");
    const parsed = Number(numeric);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return negative ? -parsed : parsed;
  }
  return null;
};

const excelDateToJs = (value: number): Date | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  const epoch = Math.round((value - 25_569) * 86_400 * 1000);
  const date = new Date(epoch);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDate = (value: CellValue): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    return excelDateToJs(value);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const normalizeDate = (value: Date | null | undefined): Date => {
  const base = value ?? new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
};

const isCurrencyColumn = (name: string): boolean => {
  const normalized = normalizeName(name);
  return CURRENCY_HINTS.some((hint) => normalized.includes(hint));
};

const isDateColumn = (name: string): boolean => {
  const normalized = normalizeName(name);
  return DATE_HINTS.some((hint) => normalized.includes(hint));
};

const cleanRows = (rows: DataRow[]): DataRow[] => {
  const columns = getColumns(rows);
  const currencyColumns = new Set(
    columns.filter((column) => isCurrencyColumn(column))
  );
  const dateColumns = new Set(columns.filter((column) => isDateColumn(column)));

  return rows.map((row) => {
    const cleaned: DataRow = {};
    for (const [key, value] of Object.entries(row)) {
      let nextValue: CellValue = value ?? null;
      if (typeof nextValue === "string") {
        nextValue = nextValue.trim();
      }
      if (currencyColumns.has(key)) {
        const numeric = toNumber(nextValue);
        nextValue = numeric ?? nextValue;
      }
      if (dateColumns.has(key)) {
        const dateValue = toDate(nextValue);
        nextValue = dateValue ?? nextValue;
      }
      cleaned[key] = nextValue;
    }
    return cleaned;
  });
};

const parseSheetRows = async (sheet: WorkSheet): Promise<DataRow[]> => {
  const utils = await getXlsxUtils();
  const rows = utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
  }) as unknown;
  invariant(Array.isArray(rows), "Workbook sheet rows must be an array");
  return rows.map((row: unknown) => {
    invariant(isRecord(row), "Each row must be an object");
    const parsed: DataRow = {};
    for (const [key, value] of Object.entries(row)) {
      parsed[key] = value as CellValue;
    }
    return parsed;
  });
};

export const loadSalesData = async (workbook: WorkBook): Promise<SalesData> => {
  const sheetNames = workbook.SheetNames;
  invariant(
    sheetNames.length > 0,
    "Workbook must contain at least one worksheet"
  );

  const used = new Set<string>();
  const masterSheet =
    resolveSheetName(sheetNames, MASTER_EVENT_ALIASES, used) ??
    sheetNames[0] ??
    null;
  if (masterSheet) {
    used.add(masterSheet);
  }
  const dealsLostSheet = resolveSheetName(sheetNames, DEALS_LOST_ALIASES, used);
  if (dealsLostSheet) {
    used.add(dealsLostSheet);
  }
  const leadSourceSheet = resolveSheetName(
    sheetNames,
    LEAD_SOURCE_ALIASES,
    used
  );
  if (leadSourceSheet) {
    used.add(leadSourceSheet);
  }
  const mapSheet = resolveSheetName(sheetNames, EVENT_TYPE_MAP_ALIASES, used);
  if (mapSheet) {
    used.add(mapSheet);
  }
  const calcsSheet = resolveSheetName(sheetNames, CALCS_ALIASES, used);

  const toRead = Array.from(new Set(sheetNames));

  const sheetData: Record<string, DataRow[]> = {};
  for (const name of toRead) {
    const sheet = workbook.Sheets[name];
    invariant(sheet, `Sheet "${name}" not found in workbook`);
    sheetData[name] = cleanRows(await parseSheetRows(sheet));
  }

  const mapping = mapSheet ? (sheetData[mapSheet] ?? []) : [];
  const master = normalizeMasterEvents(
    masterSheet ? (sheetData[masterSheet] ?? []) : [],
    mapping
  );
  const dealsLost = dealsLostSheet
    ? cleanRows(sheetData[dealsLostSheet] ?? [])
    : [];
  const leadSource = leadSourceSheet
    ? cleanRows(sheetData[leadSourceSheet] ?? [])
    : [];
  const calcsFunnel = calcsSheet ? (sheetData[calcsSheet] ?? []) : [];
  const rawSheets: Record<string, DataRow[]> = {};

  for (const name of sheetNames) {
    rawSheets[name] = sheetData[name] ?? [];
  }

  return {
    masterEvents: master,
    dealsLost,
    leadSource,
    mappingEventType: mapping,
    calcsFunnel,
    rawSheets,
  };
};

const normalizeStatus = (value: CellValue): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = normalizeName(String(value));
  if (!text) {
    return null;
  }
  if (text.includes("lost")) {
    return "Lost";
  }
  if (
    text.includes("cancel") ||
    text.includes("declin") ||
    text.includes("no show")
  ) {
    return "Lost";
  }
  if (text.includes("final") || text.includes("won")) {
    return "Won";
  }
  if (text.includes("quote") || text.includes("proposal")) {
    return "Quote";
  }
  if (text.includes("qualif")) {
    return "Qualified";
  }
  if (
    text.includes("pending") ||
    text.includes("tentative") ||
    text.includes("hold")
  ) {
    return "Pending";
  }
  return String(value).trim() || null;
};

const inferEventDateColumn = (rows: DataRow[]): string | null => {
  const priority = [
    "event date",
    "event start date",
    "event start",
    "start date",
    "event day",
  ];
  const preferred = findColumn(rows, priority);
  if (preferred) {
    return preferred;
  }
  for (const column of getColumns(rows)) {
    const normalized = normalizeName(column);
    if (normalized.includes("date") && !normalized.includes("created")) {
      return column;
    }
  }
  return null;
};

const inferCreatedDateColumn = (rows: DataRow[]): string | null => {
  const priority = [
    "created date",
    "created",
    "inquiry date",
    "lead date",
    "date created",
  ];
  const preferred = findColumn(rows, priority);
  if (preferred) {
    return preferred;
  }
  for (const column of getColumns(rows)) {
    const normalized = normalizeName(column);
    if (normalized.includes("created") && normalized.includes("date")) {
      return column;
    }
  }
  return null;
};

const applyEventTypeMapping = (
  masterRows: DataRow[],
  mappingRows: DataRow[]
): DataRow[] => {
  const serviceStyleCol = findColumn(masterRows, ["service style", "service"]);
  const mapServiceCol = findColumn(mappingRows, ["service style", "service"]);
  const mapEventCol = findColumn(mappingRows, [
    "standard event type",
    "event type",
    "type",
  ]);

  if (!(serviceStyleCol && mapServiceCol && mapEventCol)) {
    return masterRows;
  }

  const mapping = new Map<string, string>();
  for (const row of mappingRows) {
    const key = normalizeMappingKey(row[mapServiceCol]);
    const value = row[mapEventCol];
    if (key && typeof value === "string" && value.trim()) {
      mapping.set(key, value.trim());
    }
  }

  return masterRows.map((row) => {
    const serviceKey = normalizeMappingKey(row[serviceStyleCol]);
    if (!serviceKey) {
      return row;
    }
    const mapped = mapping.get(serviceKey);
    if (!mapped) {
      return row;
    }
    return {
      ...row,
      [EVENT_TYPE_STANDARD_COL]: mapped,
    };
  });
};

const normalizeMasterEvents = (
  rows: DataRow[],
  mappingRows: DataRow[]
): DataRow[] => {
  const cleaned = cleanRows(rows);
  const statusCol = findColumn(cleaned, ["status", "event status"]);
  let normalized = cleaned.map((row) => {
    if (!statusCol) {
      return row;
    }
    return {
      ...row,
      [STATUS_NORMALIZED_COL]: normalizeStatus(row[statusCol]),
    };
  });

  normalized = applyEventTypeMapping(normalized, mappingRows);

  const eventCol = inferEventDateColumn(normalized);
  const createdCol = inferCreatedDateColumn(normalized);

  normalized = normalized.map((row) => {
    const next: DataRow = { ...row };
    if (eventCol) {
      next[EVENT_DATE_COL] = row[eventCol] ?? null;
    }
    if (createdCol) {
      next[CREATED_DATE_COL] = row[createdCol] ?? null;
    }
    return next;
  });

  return normalized;
};

export const getEventDateCol = (rows: DataRow[]): string | null =>
  findColumn(rows, [
    EVENT_DATE_COL,
    "event date",
    "event start date",
    "event start",
    "start date",
    "event day",
  ]);

export const getCreatedDateCol = (rows: DataRow[]): string | null =>
  findColumn(rows, [
    CREATED_DATE_COL,
    "created date",
    "created",
    "inquiry date",
    "lead date",
    "date created",
  ]);

export const getEventTotalCol = (rows: DataRow[]): string | null =>
  findColumn(rows, [
    "event total",
    "total",
    "value",
    "amount",
    "revenue",
    "budget",
  ]);

export const buildWeekWindow = (anchor?: Date | string | null): DateWindow => {
  const anchorDate = normalizeDate(
    anchor ? (anchor instanceof Date ? anchor : new Date(anchor)) : null
  );
  const day = anchorDate.getDay() || 7;
  const start = new Date(anchorDate);
  start.setDate(anchorDate.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
};

export const buildMonthWindow = (anchor?: Date | string | null): DateWindow => {
  const anchorDate = normalizeDate(
    anchor ? (anchor instanceof Date ? anchor : new Date(anchor)) : null
  );
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  return { start, end };
};

export const buildQuarterWindow = (
  anchor?: Date | string | null
): DateWindow => {
  const anchorDate = normalizeDate(
    anchor ? (anchor instanceof Date ? anchor : new Date(anchor)) : null
  );
  const quarter = Math.floor(anchorDate.getMonth() / 3);
  const start = new Date(anchorDate.getFullYear(), quarter * 3, 1);
  const end = new Date(anchorDate.getFullYear(), quarter * 3 + 3, 0);
  return { start, end };
};

export const buildYearWindow = (anchor?: Date | string | null): DateWindow => {
  const anchorDate = normalizeDate(
    anchor ? (anchor instanceof Date ? anchor : new Date(anchor)) : null
  );
  const start = new Date(anchorDate.getFullYear(), 0, 1);
  const end = new Date(anchorDate.getFullYear(), 11, 31);
  return { start, end };
};
const filterByDate = (
  rows: DataRow[],
  dateCol: string | null,
  window: DateWindow
): DataRow[] => {
  if (!dateCol) {
    return [];
  }
  return rows.filter((row) => {
    const date = toDate(row[dateCol]);
    if (!date) {
      return false;
    }
    const normalized = normalizeDate(date);
    return normalized >= window.start && normalized <= window.end;
  });
};

const getStatusSeries = (rows: DataRow[]): Array<string | null> => {
  if (rows.length === 0) {
    return [];
  }
  const statusCol = rows[0]?.[STATUS_NORMALIZED_COL]
    ? STATUS_NORMALIZED_COL
    : findColumn(rows, ["status", "event status", "stage"]);
  if (!statusCol) {
    return rows.map(() => null);
  }
  return rows.map((row) => normalizeStatus(row[statusCol]));
};

const groupBy = <T>(
  rows: T[],
  keySelector: (row: T) => string
): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = keySelector(row);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }
  return grouped;
};

const formatGroupKey = (value: CellValue): string =>
  value === null || value === undefined || value === ""
    ? "Unknown"
    : String(value);

const sumValues = (values: Array<number | null>): number =>
  values.reduce((total: number, value) => total + (value ?? 0), 0);

const meanValues = (values: Array<number | null>): number => {
  const filtered = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
  return filtered.length ? sumValues(filtered) / filtered.length : 0;
};

const valueCounts = (
  values: CellValue[]
): Array<{
  label: string;
  count: number;
}> => {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = formatGroupKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
};

const buildDateColumnOptions = (rows: DataRow[]) => {
  const columns = getColumns(rows);
  const ratios: Record<string, number> = {};
  const scores: Array<{ column: string; score: number; ratio: number }> = [];

  for (const column of columns) {
    const name = normalizeName(column);
    let score = 0;
    if (name.includes("date")) {
      score += 3;
    }
    if (
      name.includes("created") ||
      name.includes("inquiry") ||
      name.includes("lead")
    ) {
      score += 2;
    }
    if (name.includes("event") || name.includes("start")) {
      score += 1;
    }

    const values = rows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined);
    const allNumeric =
      values.length > 0 && values.every((value) => typeof value === "number");
    if (allNumeric && score === 0) {
      ratios[column] = 0;
      scores.push({ column, score, ratio: 0 });
      return;
    }

    const parsed = values.map((value) => toDate(value));
    const valid = parsed.filter((date) => date).length;
    const ratio = values.length ? valid / values.length : 0;
    const allDates =
      values.length > 0 && values.every((value) => value instanceof Date);
    if (allDates) {
      score += 4;
    }
    score += ratio * 2;
    ratios[column] = ratio;
    scores.push({ column, score, ratio });
  }

  scores.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    if (a.ratio !== b.ratio) {
      return b.ratio - a.ratio;
    }
    return a.column.localeCompare(b.column);
  });

  const detected = scores
    .filter((item) => item.score >= 2 || item.ratio >= 0.2)
    .map((item) => item.column);

  return { detected, ratios };
};

export const buildDateColumnOptionsForUI = buildDateColumnOptions;

const applyDateMapping = (
  masterEvents: DataRow[],
  dealsLost: DataRow[],
  createdChoice: string | null,
  eventChoice: string | null
) => {
  const mappedMaster = masterEvents.map((row) => {
    const next: DataRow = { ...row };
    if (createdChoice && createdChoice in row) {
      next[CREATED_DATE_COL] = row[createdChoice] ?? null;
    }
    if (eventChoice && eventChoice in row) {
      next[EVENT_DATE_COL] = row[eventChoice] ?? null;
    }
    return next;
  });

  const mappedLost = dealsLost.map((row) => {
    const next: DataRow = { ...row };
    if (createdChoice && createdChoice in row) {
      next[CREATED_DATE_COL] = row[createdChoice] ?? null;
    }
    return next;
  });

  return { mappedMaster, mappedLost };
};

export const calculateWeeklyMetrics = (
  masterEvents: DataRow[],
  dealsLost: DataRow[],
  weekAnchor?: Date | string | null
): WeeklyMetrics => {
  const window = buildWeekWindow(weekAnchor ?? null);
  const createdCol = getCreatedDateCol(masterEvents);
  const eventCol = getEventDateCol(masterEvents);
  const totalCol = getEventTotalCol(masterEvents);
  const status = getStatusSeries(masterEvents);

  const createdWindow = filterByDate(masterEvents, createdCol, window);
  const eventWindow = filterByDate(masterEvents, eventCol, window);
  const statusWindow = createdWindow.map((_, index) => {
    const rowIndex = masterEvents.indexOf(createdWindow[index]);
    return status[rowIndex] ?? null;
  });
  const statusEvent = eventWindow.map((row) => {
    const rowIndex = masterEvents.indexOf(row);
    return status[rowIndex] ?? null;
  });

  const leadsReceived = createdWindow.length;
  const proposalsSent = statusWindow.filter(
    (value) => value === "Quote"
  ).length;
  const eventsWon = statusWindow.filter((value) => value === "Won").length;
  const lostCount = statusWindow.filter((value) => value === "Lost").length;
  const closingRatio =
    eventsWon + lostCount > 0 ? eventsWon / (eventsWon + lostCount) : 0;

  let revenueByEventType: Array<{ event_type: string; revenue: number }> = [];
  if (totalCol) {
    const wonRows = eventWindow.filter(
      (_row, index) => statusEvent[index] === "Won"
    );
    const eventTypeCol = getColumns(wonRows).includes(EVENT_TYPE_STANDARD_COL)
      ? EVENT_TYPE_STANDARD_COL
      : findColumn(wonRows, ["service style", "event type", "type"]);
    if (eventTypeCol) {
      const grouped = groupBy(wonRows, (row) =>
        formatGroupKey(row[eventTypeCol])
      );
      revenueByEventType = Array.from(grouped.entries())
        .map(([eventType, rows]) => ({
          event_type: eventType,
          revenue: sumValues(rows.map((row) => toNumber(row[totalCol]) ?? 0)),
        }))
        .sort((a, b) => b.revenue - a.revenue);
    }
  }

  const trendingLost = calculateTrendingLost(dealsLost, window);
  const topPending = calculateTopPending(masterEvents, totalCol);

  return {
    window,
    revenueByEventType,
    leadsReceived,
    proposalsSent,
    eventsWon,
    closingRatio,
    trendingLost,
    topPending,
  };
};

const calculateTrendingLost = (
  dealsLost: DataRow[],
  window: DateWindow
): Array<{ lost_reason: string; count: number }> => {
  const createdCol = getCreatedDateCol(dealsLost);
  const lostReasonCol = findColumn(dealsLost, [
    "lost reason",
    "reason",
    "loss reason",
  ]);
  if (!(createdCol && lostReasonCol)) {
    return [];
  }
  const filtered = filterByDate(dealsLost, createdCol, window);
  const counts = valueCounts(filtered.map((row) => row[lostReasonCol]));
  return counts.map((row) => ({ lost_reason: row.label, count: row.count }));
};

const calculateTopPending = (
  masterEvents: DataRow[],
  totalCol: string | null
): DataRow[] => {
  if (!totalCol) {
    return [];
  }
  const status = getStatusSeries(masterEvents);
  const eventCol = getEventDateCol(masterEvents);
  if (!eventCol) {
    return [];
  }
  const today = normalizeDate(null);
  const pendingRows = masterEvents.filter((row, index) => {
    const state = status[index];
    if (!state || state === "Won" || state === "Lost") {
      return false;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return false;
    }
    return normalizeDate(eventDate) >= today;
  });

  const displayCols = [
    findColumn(masterEvents, ["event name", "name", "client", "company"]),
    eventCol,
    totalCol,
    findColumn(masterEvents, ["service style", "event type", "type"]),
  ].filter((value): value is string => Boolean(value));

  return pendingRows
    .sort((a, b) => (toNumber(b[totalCol]) ?? 0) - (toNumber(a[totalCol]) ?? 0))
    .slice(0, 3)
    .map((row) => {
      const selected: DataRow = {};
      displayCols.forEach((col) => {
        selected[col] = row[col] ?? null;
      });
      selected.status = status[masterEvents.indexOf(row)] ?? null;
      return selected;
    });
};

export const calculateMonthlyMetrics = (
  masterEvents: DataRow[],
  dealsLost: DataRow[],
  monthAnchor?: Date | string | null
): MonthlyMetrics => {
  const window = buildMonthWindow(monthAnchor ?? null);
  const createdCol = getCreatedDateCol(masterEvents);
  const eventCol = getEventDateCol(masterEvents);
  const totalCol = getEventTotalCol(masterEvents);
  const status = getStatusSeries(masterEvents);

  const createdWindow = filterByDate(masterEvents, createdCol, window);
  const eventWindow = filterByDate(masterEvents, eventCol, window);
  const statusCreated = createdWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });
  const statusEvent = eventWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });

  let totalRevenueBooked = 0;
  let totalEventsClosed = statusEvent.filter((value) => value === "Won").length;
  let averageEventValue = 0;

  if (totalCol) {
    const wonRows = eventWindow.filter(
      (_row, index) => statusEvent[index] === "Won"
    );
    const revenues = wonRows.map((row) => toNumber(row[totalCol]) ?? 0);
    totalRevenueBooked = sumValues(revenues);
    totalEventsClosed = wonRows.length;
    averageEventValue = wonRows.length
      ? totalRevenueBooked / wonRows.length
      : 0;
  }

  const leadSourceBreakdown = calculateLeadSourceBreakdown(createdWindow);
  const salesFunnel = calculateSalesFunnel(statusCreated);
  const closingBySalesperson = calculateClosingBySalesperson(
    createdWindow,
    statusCreated
  );
  const winLossTrends = calculateWinLossTrends(dealsLost, window);
  const topPackages = calculateTopPackages(eventWindow, statusEvent, totalCol);
  const pipelineForecast60 = calculatePipelineForecast(
    masterEvents,
    totalCol,
    window.end,
    60
  );
  const pipelineForecast90 = calculatePipelineForecast(
    masterEvents,
    totalCol,
    window.end,
    90
  );
  const {
    momDelta: revenueMomDelta,
    yoyDelta: revenueYoyDelta,
    momPct: revenueMomPct,
    yoyPct: revenueYoyPct,
  } = calculateRevenueComparisons(
    masterEvents,
    totalCol,
    eventCol,
    window,
    status
  );

  return {
    window,
    totalRevenueBooked,
    totalEventsClosed,
    averageEventValue,
    leadSourceBreakdown,
    salesFunnel,
    closingBySalesperson,
    winLossTrends,
    topPackages,
    pipelineForecast60,
    pipelineForecast90,
    revenueMomDelta,
    revenueYoyDelta,
    revenueMomPct,
    revenueYoyPct,
  };
};

const calculateLeadSourceBreakdown = (
  rows: DataRow[]
): Array<{ lead_source: string; count: number }> => {
  const sourceCol = findColumn(rows, [
    "referred from",
    "lead source",
    "source",
    "referral",
  ]);
  if (!sourceCol) {
    return [];
  }
  const counts = valueCounts(rows.map((row) => row[sourceCol]));
  return counts.map((row) => ({ lead_source: row.label, count: row.count }));
};

const calculateSalesFunnel = (
  statusSeries: Array<string | null>
): Array<{ stage: string; count: number }> => {
  const counts = {
    Inquiries: statusSeries.filter((value) => value !== null).length,
    Qualified: statusSeries.filter((value) => value === "Qualified").length,
    Proposals: statusSeries.filter((value) => value === "Quote").length,
    Won: statusSeries.filter((value) => value === "Won").length,
    Lost: statusSeries.filter((value) => value === "Lost").length,
  };
  return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
};

const calculateClosingBySalesperson = (
  rows: DataRow[],
  statusSeries: Array<string | null>
): Array<{
  salesperson: string;
  won: number;
  lost: number;
  win_rate: number;
}> => {
  const salespersonCol = findColumn(rows, [
    "salesperson",
    "sales rep",
    "sales rep name",
    "rep",
    "account manager",
  ]);
  if (!salespersonCol) {
    return [];
  }
  const grouped = groupBy(rows, (row) => formatGroupKey(row[salespersonCol]));
  return Array.from(grouped.entries())
    .map(([salesperson, groupedRows]) => {
      const indices = groupedRows.map((row) => rows.indexOf(row));
      const won = indices.filter(
        (index) => statusSeries[index] === "Won"
      ).length;
      const lost = indices.filter(
        (index) => statusSeries[index] === "Lost"
      ).length;
      const total = won + lost;
      return {
        salesperson,
        won,
        lost,
        win_rate: total ? won / total : 0,
      };
    })
    .sort((a, b) => b.win_rate - a.win_rate);
};

const calculateWinLossTrends = (
  dealsLost: DataRow[],
  window: DateWindow
): Array<{ lost_reason: string; count: number }> => {
  const reasonCol = findColumn(dealsLost, [
    "lost reason",
    "reason",
    "loss reason",
  ]);
  const createdCol = getCreatedDateCol(dealsLost);
  if (!(reasonCol && createdCol)) {
    return [];
  }
  const filtered = filterByDate(dealsLost, createdCol, window);
  const counts = valueCounts(filtered.map((row) => row[reasonCol]));
  return counts.map((row) => ({ lost_reason: row.label, count: row.count }));
};

const calculateTopPackages = (
  rows: DataRow[],
  statusSeries: Array<string | null>,
  totalCol: string | null
): Array<{ package: string; revenue: number }> => {
  if (!totalCol) {
    return [];
  }
  const eventTypeCol = getColumns(rows).includes(EVENT_TYPE_STANDARD_COL)
    ? EVENT_TYPE_STANDARD_COL
    : findColumn(rows, ["service style", "event type", "type"]);
  if (!eventTypeCol) {
    return [];
  }
  const wonRows = rows.filter((_row, index) => statusSeries[index] === "Won");
  const grouped = groupBy(wonRows, (row) => formatGroupKey(row[eventTypeCol]));
  return Array.from(grouped.entries())
    .map(([pkg, groupedRows]) => ({
      package: pkg,
      revenue: sumValues(
        groupedRows.map((row) => toNumber(row[totalCol]) ?? 0)
      ),
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

const calculatePipelineForecast = (
  rows: DataRow[],
  totalCol: string | null,
  anchor: Date,
  horizonDays: number
): number => {
  if (!totalCol) {
    return 0;
  }
  const status = getStatusSeries(rows);
  const eventCol = getEventDateCol(rows);
  if (!eventCol) {
    return 0;
  }
  const anchorDate = normalizeDate(anchor);
  const horizon = new Date(anchorDate);
  horizon.setDate(anchorDate.getDate() + horizonDays);
  return rows.reduce((sum, row, index) => {
    const state = status[index];
    if (state !== "Quote" && state !== "Pending") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (normalized < anchorDate || normalized > horizon) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);
};

const calculateRevenueComparisons = (
  rows: DataRow[],
  totalCol: string | null,
  eventCol: string | null,
  window: DateWindow,
  statusSeries: Array<string | null>
): { momDelta: number; yoyDelta: number; momPct: number; yoyPct: number } => {
  if (!(totalCol && eventCol)) {
    return { momDelta: 0, yoyDelta: 0, momPct: 0, yoyPct: 0 };
  }
  const inWindow = (date: Date, start: Date, end: Date) =>
    date >= start && date <= end;

  const currentTotal = rows.reduce((sum, row, index) => {
    if (statusSeries[index] !== "Won") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (!inWindow(normalized, window.start, window.end)) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);

  const prevStart = new Date(
    window.start.getFullYear(),
    window.start.getMonth() - 1,
    1
  );
  const prevEnd = new Date(
    prevStart.getFullYear(),
    prevStart.getMonth() + 1,
    0
  );

  const prevTotal = rows.reduce((sum, row, index) => {
    if (statusSeries[index] !== "Won") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (!inWindow(normalized, prevStart, prevEnd)) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);

  const yoyStart = new Date(
    window.start.getFullYear() - 1,
    window.start.getMonth(),
    1
  );
  const yoyEnd = new Date(yoyStart.getFullYear(), yoyStart.getMonth() + 1, 0);
  const yoyTotal = rows.reduce((sum, row, index) => {
    if (statusSeries[index] !== "Won") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (!inWindow(normalized, yoyStart, yoyEnd)) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);

  const momDelta = currentTotal - prevTotal;
  const yoyDelta = currentTotal - yoyTotal;
  const momPct = prevTotal ? momDelta / prevTotal : 0;
  const yoyPct = yoyTotal ? yoyDelta / yoyTotal : 0;
  return { momDelta, yoyDelta, momPct, yoyPct };
};

export const calculateQuarterlyMetrics = (
  masterEvents: DataRow[],
  dealsLost: DataRow[],
  quarterAnchor?: Date | string | null
): QuarterlyMetrics => {
  const window = buildQuarterWindow(quarterAnchor ?? null);
  const createdCol = getCreatedDateCol(masterEvents);
  const eventCol = getEventDateCol(masterEvents);
  const totalCol = getEventTotalCol(masterEvents);
  const status = getStatusSeries(masterEvents);

  const createdWindow = filterByDate(masterEvents, createdCol, window);
  const eventWindow = filterByDate(masterEvents, eventCol, window);
  const statusEvent = eventWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });
  const statusCreated = createdWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });

  let totalRevenueBooked = 0;
  let totalEventsClosed = statusEvent.filter((value) => value === "Won").length;
  let averageEventValue = 0;

  if (totalCol) {
    const wonRows = eventWindow.filter(
      (_row, index) => statusEvent[index] === "Won"
    );
    const revenues = wonRows.map((row) => toNumber(row[totalCol]) ?? 0);
    totalRevenueBooked = sumValues(revenues);
    totalEventsClosed = wonRows.length;
    averageEventValue = wonRows.length
      ? totalRevenueBooked / wonRows.length
      : 0;
  }

  const avgSalesCycleDays = calculateSalesCycleDays(eventWindow, statusEvent);
  const segmentSummary = calculateSegmentSummary(
    eventWindow,
    statusEvent,
    totalCol
  );
  const funnelBySource = calculateFunnelBySource(createdWindow, statusCreated);
  const pricingSummary = calculatePricingSummary(
    eventWindow,
    statusEvent,
    totalCol
  );
  const pricingTrends = calculatePricingTrends(
    eventWindow,
    statusEvent,
    totalCol
  );
  const venuePerformance = calculateVenuePerformance(
    createdWindow,
    statusCreated,
    totalCol
  );
  const winLossTrends = calculateWinLossTrends(dealsLost, window);
  const nextQuarterForecast = calculateNextQuarterForecast(
    masterEvents,
    totalCol,
    eventCol,
    status,
    window
  );
  const recommendations = generateRecommendations(
    totalRevenueBooked,
    funnelBySource,
    winLossTrends,
    venuePerformance
  );
  const opportunities = generateOpportunities(
    funnelBySource,
    pricingTrends,
    venuePerformance
  );

  return {
    window,
    totalRevenueBooked,
    totalEventsClosed,
    averageEventValue,
    avgSalesCycleDays,
    segmentSummary,
    funnelBySource,
    pricingSummary,
    pricingTrends,
    venuePerformance,
    winLossTrends,
    nextQuarterForecast,
    recommendations,
    opportunities,
  };
};

const calculateSalesCycleDays = (
  rows: DataRow[],
  statusSeries: Array<string | null>
): number => {
  const createdCol = getCreatedDateCol(rows);
  const eventCol = getEventDateCol(rows);
  if (!(createdCol && eventCol)) {
    return 0;
  }
  const deltas = rows
    .map((row, index) => {
      if (statusSeries[index] !== "Won") {
        return null;
      }
      const created = toDate(row[createdCol]);
      const eventDate = toDate(row[eventCol]);
      if (!(created && eventDate)) {
        return null;
      }
      const diff =
        normalizeDate(eventDate).getTime() - normalizeDate(created).getTime();
      return diff / (1000 * 60 * 60 * 24);
    })
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    );
  return deltas.length ? sumValues(deltas) / deltas.length : 0;
};

const calculateSegmentSummary = (
  rows: DataRow[],
  statusSeries: Array<string | null>,
  totalCol: string | null
): QuarterlyMetrics["segmentSummary"] => {
  const eventTypeCol = getColumns(rows).includes(EVENT_TYPE_STANDARD_COL)
    ? EVENT_TYPE_STANDARD_COL
    : findColumn(rows, ["service style", "event type", "type"]);
  if (!eventTypeCol) {
    return [];
  }
  const guestCol = findColumn(rows, [
    "guest count",
    "guests",
    "attendees",
    "pax",
    "headcount",
  ]);
  const budgetCol = findColumn(rows, [
    "budget",
    "estimated budget",
    "est budget",
    "event budget",
  ]);

  const summary = new Map<string, { count: number; revenue: number }>();

  rows.forEach((row, index) => {
    if (statusSeries[index] !== "Won") {
      return;
    }
    const eventType = formatGroupKey(row[eventTypeCol]);
    const guestCount = guestCol ? toNumber(row[guestCol]) : null;
    const budget = toNumber(
      (budgetCol ? row[budgetCol] : null) ?? row[totalCol ?? ""] ?? null
    );
    const sizeBucket =
      guestCount === null
        ? "Unknown"
        : guestCount <= 50
          ? "<50"
          : guestCount <= 100
            ? "50-100"
            : guestCount <= 200
              ? "100-200"
              : "200+";
    const budgetTier =
      budget === null
        ? "Unknown"
        : budget <= 2500
          ? "<$2.5k"
          : budget <= 5000
            ? "$2.5k-$5k"
            : budget <= 10_000
              ? "$5k-$10k"
              : "$10k+";
    const key = `${eventType}||${sizeBucket}||${budgetTier}`;
    const current = summary.get(key) ?? { count: 0, revenue: 0 };
    summary.set(key, {
      count: current.count + 1,
      revenue: current.revenue + (toNumber(row[totalCol ?? ""]) ?? 0),
    });
  });

  return Array.from(summary.entries())
    .map(([key, value]) => {
      const [event_type, size_bucket, budget_tier] = key.split("||");
      return {
        event_type,
        size_bucket,
        budget_tier,
        count: value.count,
        revenue: value.revenue,
      };
    })
    .sort((a, b) => b.count - a.count);
};

const calculateFunnelBySource = (
  rows: DataRow[],
  statusSeries: Array<string | null>
): QuarterlyMetrics["funnelBySource"] => {
  const sourceCol = findColumn(rows, [
    "referred from",
    "lead source",
    "source",
    "referral",
  ]);
  if (!sourceCol) {
    return [];
  }
  const grouped = new Map<
    string,
    {
      inquiries: number;
      qualified: number;
      proposals: number;
      won: number;
      lost: number;
    }
  >();
  rows.forEach((row, index) => {
    const key = formatGroupKey(row[sourceCol]);
    const current = grouped.get(key) ?? {
      inquiries: 0,
      qualified: 0,
      proposals: 0,
      won: 0,
      lost: 0,
    };
    current.inquiries += 1;
    const status = statusSeries[index];
    if (status === "Qualified") {
      current.qualified += 1;
    } else if (status === "Quote") {
      current.proposals += 1;
    } else if (status === "Won") {
      current.won += 1;
    } else if (status === "Lost") {
      current.lost += 1;
    }
    grouped.set(key, current);
  });

  return Array.from(grouped.entries())
    .map(([leadSource, value]) => ({
      lead_source: leadSource,
      Inquiries: value.inquiries,
      qualified: value.qualified,
      proposals: value.proposals,
      won: value.won,
      lost: value.lost,
      proposal_rate: value.inquiries ? value.proposals / value.inquiries : 0,
      win_rate: value.inquiries ? value.won / value.inquiries : 0,
    }))
    .sort((a, b) => b.Inquiries - a.Inquiries);
};

const calculatePricingSummary = (
  rows: DataRow[],
  statusSeries: Array<string | null>,
  totalCol: string | null
): QuarterlyMetrics["pricingSummary"] => {
  const budgetCol = findColumn(rows, [
    "budget",
    "estimated budget",
    "est budget",
    "event budget",
  ]);
  if (!(budgetCol && totalCol)) {
    return [];
  }
  const budgets: number[] = [];
  const actuals: number[] = [];
  rows.forEach((row, index) => {
    if (statusSeries[index] !== "Won") {
      return;
    }
    const budget = toNumber(row[budgetCol]);
    const actual = toNumber(row[totalCol]);
    if (budget !== null && actual !== null) {
      budgets.push(budget);
      actuals.push(actual);
    }
  });
  const variance = budgets.map((budget, idx) => actuals[idx] - budget);
  const discountRate = budgets.map((budget, idx) =>
    budget ? (budget - actuals[idx]) / budget : 0
  );

  return [
    { metric: "Avg Budget", value: meanValues(budgets) },
    { metric: "Avg Actual", value: meanValues(actuals) },
    { metric: "Avg Variance", value: meanValues(variance) },
    {
      metric: "Pct Over Budget",
      value: variance.length
        ? variance.filter((value) => value > 0).length / variance.length
        : 0,
    },
    { metric: "Avg Discount %", value: meanValues(discountRate) },
    {
      metric: "Pct Discounted",
      value: discountRate.length
        ? discountRate.filter((value) => value > 0).length / discountRate.length
        : 0,
    },
  ];
};

const calculatePricingTrends = (
  rows: DataRow[],
  statusSeries: Array<string | null>,
  totalCol: string | null
): QuarterlyMetrics["pricingTrends"] => {
  const eventCol = getEventDateCol(rows);
  const budgetCol = findColumn(rows, [
    "budget",
    "estimated budget",
    "est budget",
    "event budget",
  ]);
  if (!(eventCol && totalCol)) {
    return [];
  }
  const buckets = new Map<
    string,
    { actual: number[]; budget: number[]; discount: number[] }
  >();
  rows.forEach((row, index) => {
    if (statusSeries[index] !== "Won") {
      return;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return;
    }
    const monthKey = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      1
    ).toISOString();
    const actual = toNumber(row[totalCol]);
    if (actual === null) {
      return;
    }
    const budget = budgetCol ? toNumber(row[budgetCol]) : null;
    const discount = budget && budget !== 0 ? (budget - actual) / budget : null;
    const bucket = buckets.get(monthKey) ?? {
      actual: [],
      budget: [],
      discount: [],
    };
    bucket.actual.push(actual);
    if (budget !== null) {
      bucket.budget.push(budget);
    }
    if (discount !== null) {
      bucket.discount.push(discount);
    }
    buckets.set(monthKey, bucket);
  });

  return Array.from(buckets.entries())
    .map(([monthIso, bucket]) => ({
      month: new Date(monthIso),
      avg_actual: meanValues(bucket.actual),
      avg_budget: meanValues(bucket.budget),
      avg_discount_rate: meanValues(bucket.discount),
    }))
    .sort((a, b) => a.month.getTime() - b.month.getTime());
};

const calculateVenuePerformance = (
  rows: DataRow[],
  _statusSeries: Array<string | null>,
  totalCol: string | null
): QuarterlyMetrics["venuePerformance"] => {
  const sourceCol = findColumn(rows, [
    "referred from",
    "lead source",
    "source",
    "referral",
  ]);
  if (!sourceCol) {
    return [];
  }
  const filtered = rows.filter((row) => {
    const value = row[sourceCol];
    return typeof value === "string" && value.toLowerCase().includes("venue");
  });
  if (!filtered.length) {
    return [];
  }
  const grouped = groupBy(filtered, (row) => formatGroupKey(row[sourceCol]));
  return Array.from(grouped.entries())
    .map(([venue, groupedRows]) => ({
      venue_source: venue,
      count: groupedRows.length,
      revenue: totalCol
        ? sumValues(groupedRows.map((row) => toNumber(row[totalCol]) ?? 0))
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
};

const calculateNextQuarterForecast = (
  rows: DataRow[],
  totalCol: string | null,
  eventCol: string | null,
  statusSeries: Array<string | null>,
  window: DateWindow
): number => {
  if (!(totalCol && eventCol)) {
    return 0;
  }
  const currentTotal = rows.reduce((sum, row, index) => {
    if (statusSeries[index] !== "Won") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (normalized < window.start || normalized > window.end) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);

  const prevStart = new Date(
    window.start.getFullYear(),
    window.start.getMonth() - 3,
    1
  );
  const prevEnd = new Date(
    prevStart.getFullYear(),
    prevStart.getMonth() + 3,
    0
  );
  const prevTotal = rows.reduce((sum, row, index) => {
    if (statusSeries[index] !== "Won") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (normalized < prevStart || normalized > prevEnd) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);

  const growth = prevTotal ? (currentTotal - prevTotal) / prevTotal : 0;
  return currentTotal * (1 + growth);
};

const generateRecommendations = (
  revenueTotal: number,
  funnelBySource: QuarterlyMetrics["funnelBySource"],
  winLossTrends: QuarterlyMetrics["winLossTrends"],
  venuePerformance: QuarterlyMetrics["venuePerformance"]
): string[] => {
  const recommendations: string[] = [];
  if (revenueTotal) {
    recommendations.push(
      "Focus outreach on top revenue-producing event types."
    );
  }
  if (funnelBySource.length) {
    recommendations.push(
      `Double down on high-volume lead sources like ${funnelBySource[0]?.lead_source}.`
    );
  }
  if (winLossTrends.length) {
    recommendations.push(
      `Review losses driven by '${winLossTrends[0]?.lost_reason}' to improve close rates.`
    );
  }
  if (venuePerformance.length) {
    recommendations.push(
      "Strengthen venue partner relationships to keep referral volume steady."
    );
  }
  if (!recommendations.length) {
    recommendations.push("Collect more data to improve quarterly insights.");
  }
  return recommendations;
};

const generateOpportunities = (
  funnelBySource: QuarterlyMetrics["funnelBySource"],
  pricingTrends: QuarterlyMetrics["pricingTrends"],
  venuePerformance: QuarterlyMetrics["venuePerformance"]
): string[] => {
  const opportunities: string[] = [];
  if (funnelBySource.length) {
    const highVolume = funnelBySource.slice(0, 3);
    const lowWin = highVolume.filter((item) => item.win_rate < 0.25);
    if (lowWin.length) {
      opportunities.push(
        `Improve conversion for high-volume sources with low win rates: ${lowWin
          .map((item) => item.lead_source)
          .join(", ")}.`
      );
    }
  }
  const latestDiscount = pricingTrends
    .filter((item) => Number.isFinite(item.avg_discount_rate))
    .at(-1);
  if (latestDiscount && latestDiscount.avg_discount_rate > 0.1) {
    opportunities.push(
      "Discounting is elevated this quarter; tighten pricing approvals."
    );
  }
  if (venuePerformance.length) {
    opportunities.push(
      `Expand partner co-marketing with ${venuePerformance[0]?.venue_source} to grow referrals.`
    );
  }
  if (!opportunities.length) {
    opportunities.push(
      "Expand data capture to surface new growth opportunities."
    );
  }
  return opportunities;
};

export const calculateAnnualMetrics = (
  masterEvents: DataRow[],
  dealsLost: DataRow[],
  yearAnchor?: Date | string | null
): AnnualMetrics => {
  const window = buildYearWindow(yearAnchor ?? null);
  const createdCol = getCreatedDateCol(masterEvents);
  const eventCol = getEventDateCol(masterEvents);
  const totalCol = getEventTotalCol(masterEvents);
  const status = getStatusSeries(masterEvents);

  const createdWindow = filterByDate(masterEvents, createdCol, window);
  const eventWindow = filterByDate(masterEvents, eventCol, window);
  const statusCreated = createdWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });
  const statusEvent = eventWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });

  let totalRevenueBooked = 0;
  let totalEventsClosed = statusEvent.filter((value) => value === "Won").length;
  let averageEventValue = 0;

  if (totalCol) {
    const wonRows = eventWindow.filter(
      (_row, index) => statusEvent[index] === "Won"
    );
    const revenues = wonRows.map((row) => toNumber(row[totalCol]) ?? 0);
    totalRevenueBooked = sumValues(revenues);
    totalEventsClosed = wonRows.length;
    averageEventValue = wonRows.length
      ? totalRevenueBooked / wonRows.length
      : 0;
  }

  const revenueByMonth = calculateRevenueByMonth(
    eventWindow,
    statusEvent,
    totalCol,
    eventCol
  );
  const revenueByEventType = calculateRevenueByEventType(
    eventWindow,
    statusEvent,
    totalCol
  );
  const leadSourceBreakdown = calculateLeadSourceBreakdown(createdWindow);
  const salesFunnel = calculateSalesFunnel(statusCreated);
  const closingBySalesperson = calculateClosingBySalesperson(
    createdWindow,
    statusCreated
  );
  const winLossTrends = calculateWinLossTrends(dealsLost, window);
  const topPackages = calculateTopPackages(eventWindow, statusEvent, totalCol);
  const pipelineForecast90 = calculatePipelineForecast(
    masterEvents,
    totalCol,
    window.end,
    90
  );
  const { delta: revenueYoyDelta, pct: revenueYoyPct } = calculateRevenueYoy(
    masterEvents,
    totalCol,
    eventCol,
    window,
    status
  );

  return {
    window,
    totalRevenueBooked,
    totalEventsClosed,
    averageEventValue,
    revenueByMonth,
    revenueByEventType,
    leadSourceBreakdown,
    salesFunnel,
    closingBySalesperson,
    winLossTrends,
    topPackages,
    pipelineForecast90,
    revenueYoyDelta,
    revenueYoyPct,
  };
};

const calculateRevenueByMonth = (
  rows: DataRow[],
  statusSeries: Array<string | null>,
  totalCol: string | null,
  eventCol: string | null
): Array<{ month: Date; revenue: number }> => {
  if (!(totalCol && eventCol)) {
    return [];
  }
  const buckets = new Map<string, number>();
  rows.forEach((row, index) => {
    if (statusSeries[index] !== "Won") {
      return;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return;
    }
    const month = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      1
    ).toISOString();
    const revenue = toNumber(row[totalCol]) ?? 0;
    buckets.set(month, (buckets.get(month) ?? 0) + revenue);
  });
  return Array.from(buckets.entries())
    .map(([monthIso, revenue]) => ({ month: new Date(monthIso), revenue }))
    .sort((a, b) => a.month.getTime() - b.month.getTime());
};

const calculateRevenueByEventType = (
  rows: DataRow[],
  statusSeries: Array<string | null>,
  totalCol: string | null
): Array<{ event_type: string; revenue: number }> => {
  if (!totalCol) {
    return [];
  }
  const eventTypeCol = getColumns(rows).includes(EVENT_TYPE_STANDARD_COL)
    ? EVENT_TYPE_STANDARD_COL
    : findColumn(rows, ["service style", "event type", "type"]);
  if (!eventTypeCol) {
    return [];
  }
  const grouped = new Map<string, number>();
  rows.forEach((row, index) => {
    if (statusSeries[index] !== "Won") {
      return;
    }
    const key = formatGroupKey(row[eventTypeCol]);
    const revenue = toNumber(row[totalCol]) ?? 0;
    grouped.set(key, (grouped.get(key) ?? 0) + revenue);
  });
  return Array.from(grouped.entries())
    .map(([event_type, revenue]) => ({ event_type, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
};

const calculateRevenueYoy = (
  rows: DataRow[],
  totalCol: string | null,
  eventCol: string | null,
  window: DateWindow,
  statusSeries: Array<string | null>
): { delta: number; pct: number } => {
  if (!(totalCol && eventCol)) {
    return { delta: 0, pct: 0 };
  }
  const currentTotal = rows.reduce((sum, row, index) => {
    if (statusSeries[index] !== "Won") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (normalized < window.start || normalized > window.end) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);

  const prevStart = new Date(
    window.start.getFullYear() - 1,
    window.start.getMonth(),
    window.start.getDate()
  );
  const prevEnd = new Date(
    window.end.getFullYear() - 1,
    window.end.getMonth(),
    window.end.getDate()
  );
  const prevTotal = rows.reduce((sum, row, index) => {
    if (statusSeries[index] !== "Won") {
      return sum;
    }
    const eventDate = toDate(row[eventCol]);
    if (!eventDate) {
      return sum;
    }
    const normalized = normalizeDate(eventDate);
    if (normalized < prevStart || normalized > prevEnd) {
      return sum;
    }
    return sum + (toNumber(row[totalCol]) ?? 0);
  }, 0);

  const delta = currentTotal - prevTotal;
  const pct = prevTotal ? delta / prevTotal : 0;
  return { delta, pct };
};

export const calculatePeriodSummary = (
  masterEvents: DataRow[],
  window: DateWindow,
  label: string
): PeriodSummary => {
  const createdCol = getCreatedDateCol(masterEvents);
  const eventCol = getEventDateCol(masterEvents);
  const totalCol = getEventTotalCol(masterEvents);
  const status = getStatusSeries(masterEvents);

  const createdWindow = filterByDate(masterEvents, createdCol, window);
  const eventWindow = filterByDate(masterEvents, eventCol, window);
  const statusCreated = createdWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });
  const statusEvent = eventWindow.map((row) => {
    const index = masterEvents.indexOf(row);
    return status[index] ?? null;
  });

  const leadsReceived = createdWindow.length;
  const qualifiedLeads = statusCreated.filter(
    (value) => value === "Qualified"
  ).length;
  const proposalsSent = statusCreated.filter(
    (value) => value === "Quote"
  ).length;
  const eventsWon = statusCreated.filter((value) => value === "Won").length;
  const eventsLost = statusCreated.filter((value) => value === "Lost").length;
  const closingRatio =
    eventsWon + eventsLost > 0 ? eventsWon / (eventsWon + eventsLost) : 0;

  let revenue = 0;
  let eventsClosed = statusEvent.filter((value) => value === "Won").length;
  let averageEventValue = 0;
  if (totalCol) {
    const wonRows = eventWindow.filter(
      (_row, index) => statusEvent[index] === "Won"
    );
    revenue = sumValues(wonRows.map((row) => toNumber(row[totalCol]) ?? 0));
    eventsClosed = wonRows.length;
    averageEventValue = eventsClosed ? revenue / eventsClosed : 0;
  }

  return {
    label,
    window,
    leadsReceived,
    qualifiedLeads,
    proposalsSent,
    eventsWon,
    closingRatio,
    revenue,
    eventsClosed,
    averageEventValue,
  };
};

const parseNumber = (value: CellValue): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  if (text.endsWith("%")) {
    const pct = Number(text.replace("%", ""));
    return Number.isFinite(pct) ? pct / 100 : null;
  }
  const normalized = text.replace(/[$,]/g, "");
  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    const numberValue = Number(normalized.slice(1, -1));
    return Number.isFinite(numberValue) ? -numberValue : null;
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeRatio = (value: number): number =>
  value > 1 && value <= 100 ? value / 100 : value;

const extractFunnelTargets = (rows: DataRow[]): Record<string, number> => {
  if (!rows.length) {
    return {};
  }
  const metricCol = findColumn(rows, [
    "metric",
    "kpi",
    "label",
    "stage",
    "description",
  ]);
  const valueCol = findColumn(rows, [
    "value",
    "count",
    "total",
    "amount",
    "result",
  ]);
  const targets: Record<string, number> = {};

  if (metricCol && valueCol) {
    rows.forEach((row) => {
      const label = normalizeName(String(row[metricCol] ?? ""));
      const value = parseNumber(row[valueCol] ?? null);
      if (value === null) {
        return;
      }
      if (label.includes("lead")) {
        targets.leads_received ??= value;
      }
      if (label.includes("proposal") || label.includes("quote")) {
        targets.proposals_sent ??= value;
      }
      if (label.includes("won") && !label.includes("lost")) {
        targets.events_won ??= value;
      }
      if (label.includes("closing") || label.includes("close rate")) {
        targets.closing_ratio ??= normalizeRatio(value);
      }
    });
  }

  if (Object.keys(targets).length < 4) {
    rows.forEach((row) => {
      const text = Object.values(row)
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();
      const numbers = Object.values(row)
        .map((value) => parseNumber(value))
        .filter((value): value is number => value !== null);
      if (!numbers.length) {
        return;
      }
      const value = numbers.at(-1);
      if (value !== undefined) {
        if (text.includes("lead") && targets.leads_received === undefined) {
          targets.leads_received = value;
        }
        if (
          (text.includes("proposal") || text.includes("quote")) &&
          targets.proposals_sent === undefined
        ) {
          targets.proposals_sent = value;
        }
        if (
          text.includes("won") &&
          !text.includes("lost") &&
          targets.events_won === undefined
        ) {
          targets.events_won = value;
        }
        if (
          (text.includes("closing") || text.includes("close")) &&
          targets.closing_ratio === undefined
        ) {
          targets.closing_ratio = normalizeRatio(value);
        }
      }
    });
  }

  return targets;
};

const calculateFunnelTotals = (rows: DataRow[]): Record<string, number> => {
  const status = getStatusSeries(rows);
  const leadsReceived =
    rows.filter((row) => row[CREATED_DATE_COL] !== null).length || rows.length;
  const proposalsSent = status.filter((value) => value === "Quote").length;
  const eventsWon = status.filter((value) => value === "Won").length;
  const eventsLost = status.filter((value) => value === "Lost").length;
  const closingRatio =
    eventsWon + eventsLost > 0 ? eventsWon / (eventsWon + eventsLost) : 0;
  return {
    leads_received: leadsReceived,
    proposals_sent: proposalsSent,
    events_won: eventsWon,
    closing_ratio: closingRatio,
  };
};

export const validateFunnel = (
  masterEvents: DataRow[],
  calcsFunnel: DataRow[],
  tolerance = 0.01
): FunnelValidation => {
  const actual = calculateFunnelTotals(masterEvents);
  const expected = extractFunnelTargets(calcsFunnel);
  const results: FunnelValidationResult[] = [];
  let passed = true;

  const rows: Array<{ key: keyof typeof actual; label: string }> = [
    { key: "leads_received", label: "Leads Received" },
    { key: "proposals_sent", label: "Proposals Sent" },
    { key: "events_won", label: "Events Won" },
    { key: "closing_ratio", label: "Closing Ratio" },
  ];

  rows.forEach(({ key, label }) => {
    const expectedValue = expected[key];
    const actualValue = actual[key];
    if (expectedValue === undefined) {
      results.push({
        metric: label,
        expected: null,
        actual: actualValue,
        delta: null,
        delta_pct: null,
        status: "Missing",
      });
      passed = false;
      return;
    }
    const delta = actualValue - expectedValue;
    const deltaPct = expectedValue ? delta / expectedValue : null;
    const status =
      deltaPct !== null && Math.abs(deltaPct) <= tolerance ? "Pass" : "Fail";
    if (status !== "Pass") {
      passed = false;
    }
    results.push({
      metric: label,
      expected: expectedValue,
      actual: actualValue,
      delta,
      delta_pct: deltaPct,
      status,
    });
  });

  return { results, passed };
};

export const prepareSalesMetrics = ({
  salesData,
  createdChoice,
  eventChoice,
  weekAnchor,
  monthAnchor,
  quarterAnchor,
}: {
  salesData: SalesData;
  createdChoice: string | null;
  eventChoice: string | null;
  weekAnchor: Date;
  monthAnchor: Date;
  quarterAnchor: Date;
}) => {
  const { mappedMaster, mappedLost } = applyDateMapping(
    salesData.masterEvents,
    salesData.dealsLost,
    createdChoice,
    eventChoice
  );

  const weekly = calculateWeeklyMetrics(mappedMaster, mappedLost, weekAnchor);
  const monthly = calculateMonthlyMetrics(
    mappedMaster,
    mappedLost,
    monthAnchor
  );
  const quarterly = calculateQuarterlyMetrics(
    mappedMaster,
    mappedLost,
    quarterAnchor
  );
  const annual = calculateAnnualMetrics(mappedMaster, mappedLost, monthAnchor);

  const comparisonAnchor = monthly.window.end;
  const ytdWindow = {
    start: new Date(comparisonAnchor.getFullYear(), 0, 1),
    end: comparisonAnchor,
  };
  const annualWindow = buildYearWindow(comparisonAnchor);

  const summaries = [
    calculatePeriodSummary(mappedMaster, weekly.window, "Week"),
    calculatePeriodSummary(mappedMaster, monthly.window, "Month"),
    calculatePeriodSummary(mappedMaster, quarterly.window, "Quarter"),
    calculatePeriodSummary(mappedMaster, ytdWindow, "YTD"),
    calculatePeriodSummary(mappedMaster, annualWindow, "Annual"),
  ];

  return { weekly, monthly, quarterly, annual, summaries };
};
