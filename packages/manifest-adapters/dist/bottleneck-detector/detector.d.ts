/**
 * Operational Bottleneck Detector
 *
 * AI-powered system that identifies operational bottlenecks and suggests
 * process improvements based on performance data analysis.
 *
 * @packageDocumentation
 */
import type { PrismaClient } from "@repo/database";
import type { Bottleneck, BottleneckAnalysis, BottleneckDetectorConfig, ImprovementSuggestion } from "./types.js";
import { BottleneckCategory } from "./types.js";
/**
 * Operational Bottleneck Detector
 *
 * Analyzes operational metrics to detect bottlenecks and generate
 * AI-powered improvement suggestions.
 */
export declare class BottleneckDetector {
    private prisma;
    private config;
    private cache;
    private cacheTimestamp;
    constructor(prisma: PrismaClient, config?: Partial<BottleneckDetectorConfig>);
    /**
     * Update detector configuration
     */
    configure(config: Partial<BottleneckDetectorConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): BottleneckDetectorConfig;
    /**
     * Run full bottleneck analysis for a tenant
     */
    analyze(tenantId: string, locationId?: string): Promise<BottleneckAnalysis>;
    /**
     * Detect bottlenecks for a specific category
     */
    detectByCategory(tenantId: string, category: BottleneckCategory, locationId?: string): Promise<Bottleneck[]>;
    /**
     * Fetch all performance metrics for analysis
     */
    private fetchAllMetrics;
    /**
     * Fetch kitchen station metrics
     */
    private fetchStationMetrics;
    /**
     * Fetch prep task metrics
     */
    private fetchPrepTaskMetrics;
    /**
     * Fetch inventory metrics
     */
    private fetchInventoryMetrics;
    /**
     * Fetch scheduling metrics
     */
    private fetchSchedulingMetrics;
    /**
     * Fetch event metrics
     */
    private fetchEventMetrics;
    /**
     * Run a single detection rule against metrics data
     */
    private runDetectionRule;
    /**
     * Evaluate if a value breaches a threshold
     */
    private evaluateThreshold;
    /**
     * Calculate trend from time series data
     */
    private calculateTrend;
    /**
     * Generate bottleneck title
     */
    private generateBottleneckTitle;
    /**
     * Generate bottleneck description
     */
    private generateBottleneckDescription;
    /**
     * Generate improvement suggestion for a bottleneck
     */
    generateSuggestion(bottleneck: Bottleneck): Promise<ImprovementSuggestion | null>;
    /**
     * Generate rule-based suggestion (fallback when AI unavailable)
     */
    private generateRuleBasedSuggestion;
    /**
     * Calculate summary statistics
     */
    private calculateSummary;
    /**
     * Calculate health score (0-100, higher is better)
     */
    private calculateHealthScore;
    /**
     * Create empty analysis result
     */
    private createEmptyAnalysis;
    /**
     * Group metrics by key for efficient lookup
     */
    private groupMetricsByKey;
    /**
     * Calculate start date from window string
     */
    private calculateStartDate;
    /**
     * Clear the cache
     */
    clearCache(): void;
}
/**
 * Create a bottleneck detector instance
 */
export declare function createBottleneckDetector(prisma: PrismaClient, config?: Partial<BottleneckDetectorConfig>): BottleneckDetector;
export * from "./types.js";
//# sourceMappingURL=detector.d.ts.map