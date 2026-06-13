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
    dateRange: {
        start: Date;
        end: Date;
    };
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
    dateRange: {
        start: Date;
        end: Date;
    };
    funnelMetrics: {
        leads: number;
        proposals: number;
        won: number;
        lost: number;
    };
    leadSourceBreakdown: Record<string, {
        count: number;
        revenue: number;
        conversionRate: number;
    }>;
    pipelineForecast: {
        pendingCount: number;
        pendingValue: number;
        weightedForecast: number;
        deals: SalesRecord[];
    };
    previousMonthRevenue: number | null;
    totalRevenue: number;
    winLossTrends: Array<{
        period: string;
        wins: number;
        losses: number;
    }>;
    yearOverYearRevenue: number | null;
}
export interface QuarterlyMetrics {
    customerSegments: Record<string, {
        count: number;
        revenue: number;
        avgValue: number;
    }>;
    dateRange: {
        start: Date;
        end: Date;
    };
    nextQuarterGoals: {
        revenueTarget: number;
        leadTarget: number;
        conversionTarget: number;
    };
    pricingTrends: Array<{
        month: string;
        avgValue: number;
        dealCount: number;
    }>;
    recommendations: string[];
    referralPerformance: Record<string, {
        count: number;
        revenue: number;
        conversionRate: number;
    }>;
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
    data: Array<{
        label: string;
        value: number;
    }>;
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
        data: Array<{
            label: string;
            value: number;
        }>;
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
    stages: Array<{
        label: string;
        value: number;
    }>;
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