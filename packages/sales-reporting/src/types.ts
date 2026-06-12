export interface SalesRecord {
  clientName: string;
  closeDate: Date | null;
  date: Date;
  eventDate: Date | null;
  eventName: string;
  eventType: string;
  leadSource: string;
  proposalDate: Date | null;
  revenue: number;
  status: "won" | "lost" | "pending" | "proposal_sent";
}

export interface ReportConfig {
  accentColor?: string;
  companyName?: string;
  dateColumn?: string;
  dateRange: {
    start: string;
    end: string;
  };
  reportType: "weekly" | "monthly" | "quarterly";
}

export interface FileInput {
  data: Buffer;
  name: string;
  type: "csv" | "xlsx";
}

export interface ReportInput {
  config: ReportConfig;
  files: FileInput[];
}

export interface WeeklyMetrics {
  closingRatio: number;
  dateRange: { start: Date; end: Date };
  eventsClosed: number;
  leadsReceived: number;
  lostOpportunities: {
    count: number;
    totalValue: number;
    records: SalesRecord[];
  };
  proposalsSent: number;
  revenueByEventType: Record<string, number>;
  topPendingDeals: SalesRecord[];
}

export interface MonthlyMetrics {
  avgEventValue: number;
  dateRange: { start: Date; end: Date };
  funnelMetrics: {
    leads: number;
    proposals: number;
    won: number;
    lost: number;
  };
  leadSourceBreakdown: Record<
    string,
    { count: number; revenue: number; conversionRate: number }
  >;
  pipelineForecast: {
    pendingCount: number;
    pendingValue: number;
    weightedForecast: number;
    deals: SalesRecord[];
  };
  previousMonthRevenue: number | null;
  totalRevenue: number;
  winLossTrends: Array<{ period: string; wins: number; losses: number }>;
  yearOverYearRevenue: number | null;
}

export interface QuarterlyMetrics {
  customerSegments: Record<
    string,
    { count: number; revenue: number; avgValue: number }
  >;
  dateRange: { start: Date; end: Date };
  nextQuarterGoals: {
    revenueTarget: number;
    leadTarget: number;
    conversionTarget: number;
  };
  pricingTrends: Array<{ month: string; avgValue: number; dealCount: number }>;
  recommendations: string[];
  referralPerformance: Record<
    string,
    { count: number; revenue: number; conversionRate: number }
  >;
  salesCycleLength: {
    avg: number;
    min: number;
    max: number;
    bySegment: Record<string, number>;
  };
  totalRevenue: number;
}

export interface BarChartOptions {
  colors?: string[];
  data: Array<{ label: string; value: number }>;
  height: number;
  showCurrency?: boolean;
  title: string;
  width: number;
  x: number;
  y: number;
}

export interface LineChartOptions {
  height: number;
  series: Array<{
    label: string;
    data: Array<{ label: string; value: number }>;
    color: string;
  }>;
  showCurrency?: boolean;
  title: string;
  width: number;
  x: number;
  y: number;
}

export interface FunnelChartOptions {
  colors?: string[];
  height: number;
  stages: Array<{ label: string; value: number }>;
  title: string;
  width: number;
  x: number;
  y: number;
}

export interface TableOptions {
  columns: Array<{
    header: string;
    width: number;
    align?: "left" | "center" | "right";
  }>;
  headerColor?: string;
  rows: string[][];
  width: number;
  x: number;
  y: number;
}

export const COLORS = {
  navy: "#0F4C81",
  teal: "#2E86AB",
  amber: "#F18F01",
  green: "#1B998B",
  red: "#E63946",
  slate: "#6C757D",
  darkText: "#2D3748",
  mediumText: "#4A5568",
  lightText: "#718096",
  border: "#E2E8F0",
  lightBg: "#F7FAFC",
  metricBg: "#F0F5FA",
  white: "#FFFFFF",
} as const;

export const CHART_PALETTE = [
  COLORS.navy,
  COLORS.teal,
  COLORS.amber,
  COLORS.green,
  COLORS.red,
  COLORS.slate,
];
