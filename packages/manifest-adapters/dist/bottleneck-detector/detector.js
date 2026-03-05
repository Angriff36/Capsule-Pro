/**
 * Operational Bottleneck Detector
 *
 * AI-powered system that identifies operational bottlenecks and suggests
 * process improvements based on performance data analysis.
 *
 * @packageDocumentation
 */
import { randomUUID } from "node:crypto";
import { BottleneckCategory } from "./types.js";
// Default detection rules covering common operational bottlenecks
const DEFAULT_DETECTION_RULES = [
    // Kitchen throughput bottlenecks
    {
        id: "station-completion-rate-low",
        name: "Low Station Completion Rate",
        category: "throughput",
        type: "station_overload",
        enabled: true,
        severity: "high",
        threshold: {
            metric: "completion_rate",
            operator: "lt",
            value: 60, // Less than 60% completion rate
            window: "7d",
        },
    },
    {
        id: "prep-task-backlog-high",
        name: "High Prep Task Backlog",
        category: "capacity",
        type: "prep_task_backlog",
        enabled: true,
        severity: "medium",
        threshold: {
            metric: "backlog_count",
            operator: "gt",
            value: 20, // More than 20 pending tasks
            window: "1d",
        },
    },
    {
        id: "avg-task-time-high",
        name: "High Average Task Completion Time",
        category: "efficiency",
        type: "process_delay",
        enabled: true,
        severity: "medium",
        threshold: {
            metric: "avg_completion_minutes",
            operator: "gt",
            value: 120, // More than 2 hours per task
            window: "7d",
        },
    },
    // Inventory bottlenecks
    {
        id: "stockout-risk",
        name: "Stockout Risk Detected",
        category: "resource",
        type: "stockout_risk",
        enabled: true,
        severity: "high",
        threshold: {
            metric: "days_of_stock",
            operator: "lt",
            value: 3, // Less than 3 days of stock
            window: "1d",
        },
    },
    {
        id: "waste-rate-high",
        name: "High Waste Rate",
        category: "efficiency",
        type: "process_delay",
        enabled: true,
        severity: "medium",
        threshold: {
            metric: "waste_percentage",
            operator: "gt",
            value: 5, // More than 5% waste
            window: "30d",
        },
    },
    // Scheduling bottlenecks
    {
        id: "overtime-spike",
        name: "Overtime Usage Spike",
        category: "capacity",
        type: "overtime_spike",
        enabled: true,
        severity: "medium",
        threshold: {
            metric: "overtime_percentage",
            operator: "gt",
            value: 15, // More than 15% overtime
            window: "7d",
        },
    },
    {
        id: "shift-coverage-gap",
        name: "Shift Coverage Gap",
        category: "capacity",
        type: "insufficient_staff",
        enabled: true,
        severity: "high",
        threshold: {
            metric: "unfilled_shifts",
            operator: "gt",
            value: 2, // More than 2 unfilled shifts
            window: "7d",
        },
    },
    // Event bottlenecks
    {
        id: "lead-time-overflow",
        name: "Event Lead Time Overflow",
        category: "process",
        type: "lead_time_overflow",
        enabled: true,
        severity: "high",
        threshold: {
            metric: "avg_prep_days",
            operator: "gt",
            value: 14, // More than 14 days average prep time
            window: "30d",
        },
    },
];
// Default configuration
const DEFAULT_CONFIG = {
    enabled: true,
    sampleRate: 1.0,
    rules: DEFAULT_DETECTION_RULES,
    aiEnabled: true,
    aiModel: "gpt-4o-mini",
    detectionWindow: "30d",
    minDataPoints: 5,
    cacheTtl: 60_000, // 1 minute
};
/**
 * Operational Bottleneck Detector
 *
 * Analyzes operational metrics to detect bottlenecks and generate
 * AI-powered improvement suggestions.
 */
export class BottleneckDetector {
    prisma;
    config;
    cache;
    cacheTimestamp;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new Map();
        this.cacheTimestamp = Date.now();
    }
    // ==========================================================================
    // Configuration
    // ==========================================================================
    /**
     * Update detector configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        this.clearCache();
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ==========================================================================
    // Bottleneck Detection
    // ==========================================================================
    /**
     * Run full bottleneck analysis for a tenant
     */
    async analyze(tenantId, locationId) {
        if (!this.config.enabled) {
            return this.createEmptyAnalysis(tenantId);
        }
        const endDate = new Date();
        const startDate = this.calculateStartDate(this.config.detectionWindow);
        // Fetch all performance metrics in parallel
        const metricsData = await this.fetchAllMetrics(tenantId, startDate, endDate, locationId);
        // Run enabled detection rules
        const enabledRules = this.config.rules.filter((r) => r.enabled);
        const bottlenecks = [];
        for (const rule of enabledRules) {
            const detected = await this.runDetectionRule(rule, metricsData, tenantId);
            bottlenecks.push(...detected);
        }
        // Generate suggestions for each bottleneck
        for (const bottleneck of bottlenecks) {
            if (!bottleneck.suggestion) {
                bottleneck.suggestion = await this.generateSuggestion(bottleneck);
            }
        }
        // Calculate summary and health score
        const summary = this.calculateSummary(bottlenecks);
        const healthScore = this.calculateHealthScore(bottlenecks);
        return {
            tenantId,
            analysisPeriod: { start: startDate, end: endDate },
            bottlenecks,
            summary,
            healthScore,
            analyzedAt: new Date(),
        };
    }
    /**
     * Detect bottlenecks for a specific category
     */
    async detectByCategory(tenantId, category, locationId) {
        const endDate = new Date();
        const startDate = this.calculateStartDate(this.config.detectionWindow);
        const metricsData = await this.fetchAllMetrics(tenantId, startDate, endDate, locationId);
        const categoryRules = this.config.rules.filter((r) => r.enabled && r.category === category);
        const bottlenecks = [];
        for (const rule of categoryRules) {
            const detected = await this.runDetectionRule(rule, metricsData, tenantId);
            bottlenecks.push(...detected);
        }
        return bottlenecks;
    }
    // ==========================================================================
    // Metric Fetching
    // ==========================================================================
    /**
     * Fetch all performance metrics for analysis
     */
    async fetchAllMetrics(tenantId, startDate, endDate, locationId) {
        const cacheKey = `${tenantId}:${locationId || "all"}:${startDate.toISOString()}:${endDate.toISOString()}`;
        // Check cache
        if (this.cache.has(cacheKey)) {
            const entry = this.cache.get(cacheKey);
            if (Date.now() - entry.timestamp < this.config.cacheTtl) {
                return this.groupMetricsByKey(entry.data);
            }
        }
        // Fetch metrics from database
        const metrics = await Promise.all([
            this.fetchStationMetrics(tenantId, startDate, endDate, locationId),
            this.fetchPrepTaskMetrics(tenantId, startDate, endDate, locationId),
            this.fetchInventoryMetrics(tenantId, startDate, endDate, locationId),
            this.fetchSchedulingMetrics(tenantId, startDate, endDate, locationId),
            this.fetchEventMetrics(tenantId, startDate, endDate, locationId),
        ]);
        const allMetrics = metrics.flat();
        // Cache the results
        this.cache.set(cacheKey, {
            data: allMetrics,
            timestamp: Date.now(),
        });
        return this.groupMetricsByKey(allMetrics);
    }
    /**
     * Fetch kitchen station metrics
     */
    async fetchStationMetrics(tenantId, startDate, endDate, locationId) {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT
        pli.station_id as station_id,
        pli.station_name as station_name,
        COUNT(*)::int as total_items,
        COUNT(CASE WHEN pli.is_completed = true THEN 1 END)::int as completed_items,
        COALESCE(AVG(
          CASE
            WHEN pli.completed_at IS NOT NULL AND pli.created_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (pli.completed_at - pli.created_at)) / 60
            ELSE NULL
          END
        ), 0)::numeric as avg_completion_minutes
      FROM tenant_kitchen.prep_list_items pli
      WHERE pli.tenant_id = $1
        AND pli.created_at >= $2
        AND pli.created_at <= $3
        AND pli.deleted_at IS NULL
        AND pli.station_id IS NOT NULL
        ${locationId ? "AND EXISTS (SELECT 1 FROM tenant_kitchen.stations s WHERE s.id = pli.station_id AND s.location_id = $4)" : ""}
      GROUP BY pli.station_id, pli.station_name
      ORDER BY pli.station_name
      `, locationId
            ? [tenantId, startDate, endDate, locationId]
            : [tenantId, startDate, endDate]);
        return result.map((row) => ({
            metric: "station_performance",
            entity: {
                type: "station",
                id: row.station_id,
                name: row.station_name,
            },
            dataPoints: [
                {
                    timestamp: new Date(),
                    value: (Number(row.completed_items) /
                        Math.max(1, Number(row.total_items))) *
                        100,
                    metadata: {
                        totalItems: Number(row.total_items),
                        completedItems: Number(row.completed_items),
                        avgMinutes: Number(row.avg_completion_minutes),
                    },
                },
            ],
            aggregation: "avg",
        }));
    }
    /**
     * Fetch prep task metrics
     */
    async fetchPrepTaskMetrics(tenantId, startDate, endDate, locationId) {
        const [backlog, avgTime] = await Promise.all([
            this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count
        FROM tenant_kitchen.prep_tasks pt
        WHERE pt.tenant_id = $1
          AND pt.status NOT IN ('completed', 'cancelled')
          AND pt.deleted_at IS NULL
          ${locationId ? "AND pt.location_id = $2" : ""}
        `, locationId ? [tenantId, locationId] : [tenantId]),
            this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(AVG(
          CASE
            WHEN pt.actual_minutes IS NOT NULL THEN pt.actual_minutes
            WHEN pt.completed_at IS NOT NULL AND pt.created_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (pt.completed_at - pt.created_at)) / 60
            ELSE NULL
          END
        ), 0)::numeric as avg_minutes
        FROM tenant_kitchen.prep_tasks pt
        WHERE pt.tenant_id = $1
          AND pt.status = 'completed'
          AND pt.completed_at >= $2
          AND pt.completed_at <= $3
          AND pt.deleted_at IS NULL
          ${locationId ? "AND pt.location_id = $4" : ""}
        `, locationId
                ? [tenantId, startDate, endDate, locationId]
                : [tenantId, startDate, endDate]),
        ]);
        return [
            {
                metric: "prep_task_backlog",
                entity: { type: "kitchen", id: tenantId, name: "All Prep Tasks" },
                dataPoints: [
                    { timestamp: new Date(), value: Number(backlog[0]?.count || 0) },
                ],
                aggregation: "count",
            },
            {
                metric: "avg_task_completion_time",
                entity: { type: "kitchen", id: tenantId, name: "All Prep Tasks" },
                dataPoints: [
                    {
                        timestamp: new Date(),
                        value: Number(avgTime[0]?.avg_minutes || 0),
                    },
                ],
                aggregation: "avg",
            },
        ];
    }
    /**
     * Fetch inventory metrics
     */
    async fetchInventoryMetrics(tenantId, startDate, endDate, locationId) {
        const [lowStock, wasteData] = await Promise.all([
            this.prisma.inventoryStock.findMany({
                where: {
                    tenantId,
                    quantity_on_hand: { lt: 10 },
                    ...(locationId ? { storageLocationId: locationId } : {}),
                },
                select: {
                    id: true,
                    itemId: true,
                    quantity_on_hand: true,
                },
                take: 50,
            }),
            this.prisma.wasteEntry.aggregate({
                where: {
                    tenantId,
                    loggedAt: { gte: startDate, lte: endDate },
                    deletedAt: null,
                    ...(locationId ? { locationId } : {}),
                },
                _count: true,
                _sum: { quantity: true },
            }),
        ]);
        const totalInventory = await this.prisma.inventoryItem.count({
            where: { tenantId, deletedAt: null },
        });
        const wastePercentage = totalInventory > 0 && wasteData._sum.quantity
            ? (Number(wasteData._sum.quantity) / totalInventory) * 100
            : 0;
        // Fetch item names for low stock items
        const itemIds = lowStock.map((s) => s.itemId);
        const items = await this.prisma.inventoryItem.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, name: true },
        });
        const itemMap = new Map(items.map((i) => [i.id, i.name]));
        return [
            ...lowStock.map((stock) => ({
                metric: "days_of_stock",
                entity: {
                    type: "inventory_item",
                    id: stock.itemId,
                    name: itemMap.get(stock.itemId) || "Unknown Item",
                },
                dataPoints: [
                    {
                        timestamp: new Date(),
                        value: Number(stock.quantity_on_hand),
                        metadata: { stockId: stock.id },
                    },
                ],
                aggregation: "min",
            })),
            {
                metric: "waste_percentage",
                entity: { type: "kitchen", id: tenantId, name: "All Inventory" },
                dataPoints: [{ timestamp: new Date(), value: wastePercentage }],
                aggregation: "avg",
            },
        ];
    }
    /**
     * Fetch scheduling metrics
     */
    async fetchSchedulingMetrics(tenantId, startDate, endDate, locationId) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        // Since ScheduleShift has non-nullable employeeId, we count all shifts as filled
        // and instead look at the number of shifts with short notice (created within 24h)
        const shortNoticeShifts = await this.prisma.scheduleShift.findMany({
            where: {
                tenantId,
                shift_start: { gte: weekAgo },
                createdAt: { gte: new Date(weekAgo.getTime() - 24 * 60 * 60 * 1000) },
                deletedAt: null,
                ...(locationId ? { locationId } : {}),
            },
            select: { id: true, shift_start: true },
            take: 20,
        });
        // Get time entries for overtime calculation
        const timeEntries = await this.prisma.$queryRawUnsafe(`
      SELECT
        SUM(CASE
          WHEN EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.break_minutes, 0)/60 <= 8
          THEN EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.break_minutes, 0)/60
          ELSE 8
        END)::numeric as regular_hours,
        SUM(CASE
          WHEN EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.break_minutes, 0)/60 > 8
          THEN EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.break_minutes, 0)/60 - 8
          ELSE 0
        END)::numeric as overtime_hours
      FROM tenant_staff.time_entries te
      WHERE te.tenant_id = $1
        AND te.clock_in >= $2
        AND te.deleted_at IS NULL
        ${locationId ? "AND te.location_id = $3" : ""}
      `, locationId ? [tenantId, weekAgo, locationId] : [tenantId, weekAgo]);
        const regularHours = Number(timeEntries[0]?.regular_hours || 0);
        const overtimeHours = Number(timeEntries[0]?.overtime_hours || 0);
        const overtimePercentage = regularHours > 0 ? (overtimeHours / regularHours) * 100 : 0;
        return [
            {
                metric: "unfilled_shifts",
                entity: { type: "scheduling", id: tenantId, name: "All Schedules" },
                dataPoints: [
                    { timestamp: new Date(), value: shortNoticeShifts.length },
                ],
                aggregation: "count",
            },
            {
                metric: "overtime_percentage",
                entity: { type: "scheduling", id: tenantId, name: "All Schedules" },
                dataPoints: [{ timestamp: new Date(), value: overtimePercentage }],
                aggregation: "avg",
            },
        ];
    }
    /**
     * Fetch event metrics
     */
    async fetchEventMetrics(tenantId, startDate, endDate, locationId) {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (e.event_date - e.created_at)) / 86400)::numeric as avg_days
      FROM tenant_events.events e
      WHERE e.tenant_id = $1
        AND e.created_at >= $2
        AND e.created_at <= $3
        AND e.deleted_at IS NULL
        ${locationId ? "AND e.location_id = $4" : ""}
      `, locationId
            ? [tenantId, startDate, endDate, locationId]
            : [tenantId, startDate, endDate]);
        return [
            {
                metric: "avg_prep_days",
                entity: { type: "events", id: tenantId, name: "All Events" },
                dataPoints: [
                    { timestamp: new Date(), value: Number(result[0]?.avg_days || 0) },
                ],
                aggregation: "avg",
            },
        ];
    }
    // ==========================================================================
    // Detection Rules
    // ==========================================================================
    /**
     * Run a single detection rule against metrics data
     */
    async runDetectionRule(rule, metricsData, tenantId) {
        const bottlenecks = [];
        const relevantMetrics = metricsData.get(rule.threshold.metric) || [];
        for (const series of relevantMetrics) {
            // Get the latest value from the time series
            const latestValue = series.dataPoints[series.dataPoints.length - 1]?.value ?? 0;
            const threshold = rule.threshold.value;
            // Check if threshold is breached
            const isBreached = this.evaluateThreshold(latestValue, threshold, rule.threshold.operator);
            if (isBreached) {
                const percentOverThreshold = rule.threshold.operator === "lt"
                    ? ((threshold - latestValue) / threshold) * 100
                    : ((latestValue - threshold) / threshold) * 100;
                bottlenecks.push({
                    id: randomUUID(),
                    tenantId,
                    category: rule.category,
                    type: rule.type,
                    severity: rule.severity,
                    title: this.generateBottleneckTitle(rule, series),
                    description: this.generateBottleneckDescription(rule, series, latestValue, threshold),
                    affectedEntity: {
                        type: series.entity.type,
                        id: series.entity.id,
                        name: series.entity.name,
                    },
                    metrics: {
                        currentValue: latestValue,
                        thresholdValue: threshold,
                        percentOverThreshold: Math.max(0, percentOverThreshold),
                        trend: this.calculateTrend(series.dataPoints),
                    },
                    context: {
                        ...rule.context,
                        metric: rule.threshold.metric,
                        window: rule.threshold.window,
                    },
                    detectedAt: new Date(),
                    resolvedAt: null,
                    suggestion: null,
                });
            }
        }
        return bottlenecks;
    }
    /**
     * Evaluate if a value breaches a threshold
     */
    evaluateThreshold(value, threshold, operator) {
        switch (operator) {
            case "gt":
                return value > threshold;
            case "lt":
                return value < threshold;
            case "gte":
                return value >= threshold;
            case "lte":
                return value <= threshold;
            case "eq":
                return value === threshold;
            default:
                return false;
        }
    }
    /**
     * Calculate trend from time series data
     */
    calculateTrend(dataPoints) {
        if (dataPoints.length < 3) {
            return "stable";
        }
        // Simple linear regression to determine trend
        const n = dataPoints.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;
        for (let i = 0; i < n; i++) {
            const x = i;
            const y = dataPoints[i].value;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        if (Math.abs(slope) < 0.01) {
            return "stable";
        }
        // For metrics where lower is better (backlogs, waste), negative slope is improving
        // For metrics where higher is better (completion rate), positive slope is improving
        // This is a simplified heuristic
        return slope > 0 ? "worsening" : "improving";
    }
    /**
     * Generate bottleneck title
     */
    generateBottleneckTitle(rule, series) {
        return `${rule.name}: ${series.entity.name}`;
    }
    /**
     * Generate bottleneck description
     */
    generateBottleneckDescription(rule, series, currentValue, threshold) {
        const operatorText = {
            gt: "exceeds",
            lt: "below",
            gte: "meets or exceeds",
            lte: "at or below",
            eq: "equals",
        }[rule.threshold.operator];
        return `The ${series.entity.name} has a ${rule.threshold.metric} of ${currentValue.toFixed(1)}, which ${operatorText} the threshold of ${threshold}.`;
    }
    // ==========================================================================
    // Suggestion Generation
    // ==========================================================================
    /**
     * Generate improvement suggestion for a bottleneck
     */
    async generateSuggestion(bottleneck) {
        // For now, use rule-based suggestions
        // AI integration can be added later
        const ruleBasedSuggestion = this.generateRuleBasedSuggestion(bottleneck);
        return ruleBasedSuggestion;
    }
    /**
     * Generate rule-based suggestion (fallback when AI unavailable)
     */
    generateRuleBasedSuggestion(bottleneck) {
        const suggestionTemplates = {
            station_overload: {
                type: "resource_reallocation",
                priority: "high",
                title: "Redistribute station workload",
                description: "Consider redistributing tasks from overloaded stations to underutilized ones or adjusting prep schedules.",
                reasoning: "Balancing workload across stations can improve overall throughput and reduce bottlenecks.",
                estimatedImpact: {
                    area: "Throughput",
                    improvement: "+15-25% station efficiency",
                    confidence: "high",
                },
                implementation: {
                    effort: "medium",
                    timeframe: "1-2 weeks",
                    prerequisites: ["Staff availability", "Equipment capacity"],
                },
                steps: [
                    "Analyze current station workload distribution",
                    "Identify underutilized stations with compatible capabilities",
                    "Redistribute pending prep items",
                    "Monitor completion rates for 3-5 days",
                ],
                dismissed: false,
                dismissedAt: null,
                dismissedBy: null,
                dismissReason: null,
            },
            prep_task_backlog: {
                type: "capacity_expansion",
                priority: "high",
                title: "Address prep task backlog",
                description: "Consider adding temporary staff, extending shift hours, or prioritizing critical tasks.",
                reasoning: "A growing backlog can lead to missed deadlines and quality issues.",
                estimatedImpact: {
                    area: "Capacity",
                    improvement: "Reduce backlog by 30-50%",
                    confidence: "medium",
                },
                implementation: {
                    effort: "low",
                    timeframe: "Immediate to 1 week",
                    prerequisites: ["Available staff", "Overtime budget"],
                },
                steps: [
                    "Review and prioritize all pending tasks",
                    "Identify tasks that can be deferred",
                    "Allocate additional staff to high-priority tasks",
                    "Track completion rate daily",
                ],
                dismissed: false,
                dismissedAt: null,
                dismissedBy: null,
                dismissReason: null,
            },
            process_delay: {
                type: "process_change",
                priority: "medium",
                title: "Streamline preparation process",
                description: "Review and optimize the preparation workflow to reduce completion time.",
                reasoning: "Extended preparation times indicate potential process inefficiencies.",
                estimatedImpact: {
                    area: "Efficiency",
                    improvement: "-20% average task time",
                    confidence: "medium",
                },
                implementation: {
                    effort: "medium",
                    timeframe: "2-4 weeks",
                    prerequisites: ["Process documentation", "Staff training"],
                },
                steps: [
                    "Map out current preparation steps",
                    "Identify time-consuming steps",
                    "Implement batch preparation where possible",
                    "Train staff on new procedures",
                ],
                dismissed: false,
                dismissedAt: null,
                dismissedBy: null,
                dismissReason: null,
            },
            stockout_risk: {
                type: "process_change",
                priority: "high",
                title: "Reorder critical inventory items",
                description: "Place urgent orders for items with low stock to prevent stockouts.",
                reasoning: "Stockouts can disrupt operations and impact customer satisfaction.",
                estimatedImpact: {
                    area: "Reliability",
                    improvement: "Prevent operational disruptions",
                    confidence: "high",
                },
                implementation: {
                    effort: "low",
                    timeframe: "Immediate",
                    prerequisites: ["Supplier contacts", "Budget approval"],
                },
                steps: [
                    "Review low stock items",
                    "Place rush orders with suppliers",
                    "Adjust reorder points for future",
                ],
                dismissed: false,
                dismissedAt: null,
                dismissedBy: null,
                dismissReason: null,
            },
            insufficient_staff: {
                type: "resource_reallocation",
                priority: "urgent",
                title: "Fill unfilled shift positions",
                description: "Address unfilled shifts through hiring, overtime, or schedule adjustments.",
                reasoning: "Unfilled shifts reduce capacity and impact service quality.",
                estimatedImpact: {
                    area: "Capacity",
                    improvement: "Maintain operational capacity",
                    confidence: "high",
                },
                implementation: {
                    effort: "high",
                    timeframe: "1-4 weeks",
                    prerequisites: ["Recruitment pipeline", "Overtime budget"],
                },
                steps: [
                    "Review upcoming unfilled shifts",
                    "Offer overtime to available staff",
                    "Contact temporary staffing agencies",
                    "Accelerate hiring process",
                ],
                dismissed: false,
                dismissedAt: null,
                dismissedBy: null,
                dismissReason: null,
            },
            overtime_spike: {
                type: "scheduling_adjustment",
                priority: "medium",
                title: "Reduce overtime dependency",
                description: "Review schedules and adjust staffing levels to reduce overtime usage.",
                reasoning: "High overtime increases costs and can lead to staff burnout.",
                estimatedImpact: {
                    area: "Cost",
                    improvement: "-15% labor costs",
                    confidence: "medium",
                },
                implementation: {
                    effort: "medium",
                    timeframe: "2-3 weeks",
                    prerequisites: ["Staff availability data", "Demand forecasting"],
                },
                steps: [
                    "Analyze overtime patterns by day and role",
                    "Adjust base staffing levels",
                    "Implement demand-based scheduling",
                    "Monitor overtime weekly",
                ],
                dismissed: false,
                dismissedAt: null,
                dismissedBy: null,
                dismissReason: null,
            },
            lead_time_overflow: {
                type: "process_change",
                priority: "high",
                title: "Improve event planning lead time",
                description: "Streamline the event planning process to reduce preparation time.",
                reasoning: "Long lead times reduce capacity for additional events.",
                estimatedImpact: {
                    area: "Capacity",
                    improvement: "+20% event capacity",
                    confidence: "medium",
                },
                implementation: {
                    effort: "high",
                    timeframe: "4-8 weeks",
                    prerequisites: ["Process review", "Staff training"],
                },
                steps: [
                    "Map current event planning workflow",
                    "Identify bottlenecks and delays",
                    "Implement parallel processing where possible",
                    "Establish clear deadlines and responsibilities",
                ],
                dismissed: false,
                dismissedAt: null,
                dismissedBy: null,
                dismissReason: null,
            },
        };
        const template = suggestionTemplates[bottleneck.type];
        if (!template) {
            return null;
        }
        return {
            ...template,
            id: randomUUID(),
            bottleneckId: bottleneck.id,
            createdAt: new Date(),
            aiGenerated: false,
        };
    }
    // ==========================================================================
    // Analysis Helpers
    // ==========================================================================
    /**
     * Calculate summary statistics
     */
    calculateSummary(bottlenecks) {
        const bySeverity = {};
        const byCategory = {};
        const affectedEntities = {};
        for (const b of bottlenecks) {
            bySeverity[b.severity] = (bySeverity[b.severity] || 0) + 1;
            byCategory[b.category] = (byCategory[b.category] || 0) + 1;
            if (b.affectedEntity) {
                const key = `${b.affectedEntity.type}:${b.affectedEntity.id}`;
                affectedEntities[key] = {
                    type: b.affectedEntity.type,
                    id: b.affectedEntity.id,
                    name: b.affectedEntity.name,
                    count: (affectedEntities[key]?.count || 0) + 1,
                };
            }
        }
        const topAffectedEntities = Object.values(affectedEntities)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((e) => ({
            type: e.type,
            id: e.id,
            name: e.name,
            bottleneckCount: e.count,
        }));
        return {
            total: bottlenecks.length,
            bySeverity: bySeverity,
            byCategory: byCategory,
            topAffectedEntities,
        };
    }
    /**
     * Calculate health score (0-100, higher is better)
     */
    calculateHealthScore(bottlenecks) {
        const byCategory = {};
        const allCategories = Object.values(BottleneckCategory);
        // Initialize all categories
        for (const cat of allCategories) {
            byCategory[cat] = 100;
        }
        // Deduct points based on bottlenecks
        for (const b of bottlenecks) {
            const deduction = {
                low: 5,
                medium: 15,
                high: 30,
                critical: 50,
            }[b.severity];
            byCategory[b.category] = Math.max(0, byCategory[b.category] - deduction);
        }
        // Calculate overall as average of all categories
        const overall = Object.values(byCategory).reduce((sum, val) => sum + val, 0) /
            allCategories.length;
        return {
            overall: Math.round(overall),
            byCategory: byCategory,
        };
    }
    /**
     * Create empty analysis result
     */
    createEmptyAnalysis(tenantId) {
        return {
            tenantId,
            analysisPeriod: {
                start: new Date(),
                end: new Date(),
            },
            bottlenecks: [],
            summary: {
                total: 0,
                bySeverity: {},
                byCategory: {},
                topAffectedEntities: [],
            },
            healthScore: {
                overall: 100,
                byCategory: {
                    [BottleneckCategory.Throughput]: 100,
                    [BottleneckCategory.Capacity]: 100,
                    [BottleneckCategory.Efficiency]: 100,
                    [BottleneckCategory.Quality]: 100,
                    [BottleneckCategory.Resource]: 100,
                    [BottleneckCategory.Process]: 100,
                },
            },
            analyzedAt: new Date(),
        };
    }
    /**
     * Group metrics by key for efficient lookup
     */
    groupMetricsByKey(metrics) {
        const grouped = new Map();
        for (const metric of metrics) {
            const key = metric.metric;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(metric);
        }
        return grouped;
    }
    /**
     * Calculate start date from window string
     */
    calculateStartDate(window) {
        const date = new Date();
        const match = window.match(/^(\d+)([dhm])$/);
        if (!match) {
            date.setDate(date.getDate() - 30); // Default to 30 days
            return date;
        }
        const value = Number.parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case "d":
                date.setDate(date.getDate() - value);
                break;
            case "h":
                date.setHours(date.getHours() - value);
                break;
            case "m":
                date.setMinutes(date.getMinutes() - value);
                break;
        }
        return date;
    }
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheTimestamp = Date.now();
    }
}
// ==========================================================================
// Factory Functions
// ==========================================================================
/**
 * Create a bottleneck detector instance
 */
export function createBottleneckDetector(prisma, config) {
    return new BottleneckDetector(prisma, config);
}
// Re-export enums and types
export * from "./types.js";
