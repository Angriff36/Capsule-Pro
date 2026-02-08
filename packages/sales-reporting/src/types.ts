export interface SalesRecord {
  date: Date;
  eventName: string;
  eventType: string;
  clientName: string;
  leadSource: string;
  status: 'won' | 'lost' | 'pending' | 'proposal_sent';
  proposalDate: Date | null;
  closeDate: Date | null;
  revenue: number;
  eventDate: Date | null;
}

export interface ReportConfig {
  reportType: 'weekly' | 'monthly' | 'quarterly';
  dateRange: {
    start: string;
    end: string;
  };
  companyName?: string;
  accentColor?: string;
}

export interface FileInput {
  name: string;
  data: Buffer;
  type: 'csv' | 'xlsx';
}

export interface ReportInput {
  files: FileInput[];
  config: ReportConfig;
}

export interface WeeklyMetrics {
  dateRange: { start: Date; end: Date };
  revenueByEventType: Record<string, number>;
  leadsReceived: number;
  proposalsSent: number;
  eventsClosed: number;
  closingRatio: number;
  lostOpportunities: { count: number; totalValue: number; records: SalesRecord[] };
  topPendingDeals: SalesRecord[];
}

export interface MonthlyMetrics {
  dateRange: { start: Date; end: Date };
  totalRevenue: number;
  previousMonthRevenue: number | null;
  yearOverYearRevenue: number | null;
  avgEventValue: number;
  leadSourceBreakdown: Record<string, { count: number; revenue: number; conversionRate: number }>;
  funnelMetrics: { leads: number; proposals: number; won: number; lost: number };
  winLossTrends: Array<{ period: string; wins: number; losses: number }>;
  pipelineForecast: { pendingCount: number; pendingValue: number; weightedForecast: number; deals: SalesRecord[] };
}

export interface QuarterlyMetrics {
  dateRange: { start: Date; end: Date };
  totalRevenue: number;
  customerSegments: Record<string, { count: number; revenue: number; avgValue: number }>;
  salesCycleLength: { avg: number; min: number; max: number; bySegment: Record<string, number> };
  pricingTrends: Array<{ month: string; avgValue: number; dealCount: number }>;
  referralPerformance: Record<string, { count: number; revenue: number; conversionRate: number }>;
  recommendations: string[];
  nextQuarterGoals: { revenueTarget: number; leadTarget: number; conversionTarget: number };
}

export interface BarChartOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  data: Array<{ label: string; value: number }>;
  title: string;
  colors?: string[];
  showCurrency?: boolean;
}

export interface LineChartOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  series: Array<{
    label: string;
    data: Array<{ label: string; value: number }>;
    color: string;
  }>;
  title: string;
  showCurrency?: boolean;
}

export interface FunnelChartOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  stages: Array<{ label: string; value: number }>;
  title: string;
  colors?: string[];
}

export interface TableOptions {
  x: number;
  y: number;
  width: number;
  columns: Array<{ header: string; width: number; align?: 'left' | 'center' | 'right' }>;
  rows: string[][];
  headerColor?: string;
}

export const COLORS = {
  navy: '#0F4C81',
  teal: '#2E86AB',
  amber: '#F18F01',
  green: '#1B998B',
  red: '#E63946',
  slate: '#6C757D',
  darkText: '#2D3748',
  mediumText: '#4A5568',
  lightText: '#718096',
  border: '#E2E8F0',
  lightBg: '#F7FAFC',
  metricBg: '#F0F5FA',
  white: '#FFFFFF',
} as const;

export const CHART_PALETTE = [
  COLORS.navy,
  COLORS.teal,
  COLORS.amber,
  COLORS.green,
  COLORS.red,
  COLORS.slate,
];
