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
    dateRange: {
        start: Date;
        end: Date;
    };
    revenueByEventType: Record<string, number>;
    leadsReceived: number;
    proposalsSent: number;
    eventsClosed: number;
    closingRatio: number;
    lostOpportunities: {
        count: number;
        totalValue: number;
        records: SalesRecord[];
    };
    topPendingDeals: SalesRecord[];
}
export interface MonthlyMetrics {
    dateRange: {
        start: Date;
        end: Date;
    };
    totalRevenue: number;
    previousMonthRevenue: number | null;
    yearOverYearRevenue: number | null;
    avgEventValue: number;
    leadSourceBreakdown: Record<string, {
        count: number;
        revenue: number;
        conversionRate: number;
    }>;
    funnelMetrics: {
        leads: number;
        proposals: number;
        won: number;
        lost: number;
    };
    winLossTrends: Array<{
        period: string;
        wins: number;
        losses: number;
    }>;
    pipelineForecast: {
        pendingCount: number;
        pendingValue: number;
        weightedForecast: number;
        deals: SalesRecord[];
    };
}
export interface QuarterlyMetrics {
    dateRange: {
        start: Date;
        end: Date;
    };
    totalRevenue: number;
    customerSegments: Record<string, {
        count: number;
        revenue: number;
        avgValue: number;
    }>;
    salesCycleLength: {
        avg: number;
        min: number;
        max: number;
        bySegment: Record<string, number>;
    };
    pricingTrends: Array<{
        month: string;
        avgValue: number;
        dealCount: number;
    }>;
    referralPerformance: Record<string, {
        count: number;
        revenue: number;
        conversionRate: number;
    }>;
    recommendations: string[];
    nextQuarterGoals: {
        revenueTarget: number;
        leadTarget: number;
        conversionTarget: number;
    };
}
export interface BarChartOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    data: Array<{
        label: string;
        value: number;
    }>;
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
        data: Array<{
            label: string;
            value: number;
        }>;
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
    stages: Array<{
        label: string;
        value: number;
    }>;
    title: string;
    colors?: string[];
}
export interface TableOptions {
    x: number;
    y: number;
    width: number;
    columns: Array<{
        header: string;
        width: number;
        align?: 'left' | 'center' | 'right';
    }>;
    rows: string[][];
    headerColor?: string;
}
export declare const COLORS: {
    readonly navy: "#0F4C81";
    readonly teal: "#2E86AB";
    readonly amber: "#F18F01";
    readonly green: "#1B998B";
    readonly red: "#E63946";
    readonly slate: "#6C757D";
    readonly darkText: "#2D3748";
    readonly mediumText: "#4A5568";
    readonly lightText: "#718096";
    readonly border: "#E2E8F0";
    readonly lightBg: "#F7FAFC";
    readonly metricBg: "#F0F5FA";
    readonly white: "#FFFFFF";
};
export declare const CHART_PALETTE: ("#0F4C81" | "#2E86AB" | "#F18F01" | "#1B998B" | "#E63946" | "#6C757D")[];
//# sourceMappingURL=types.d.ts.map