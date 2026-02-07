"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateQuarterlyMetrics = calculateQuarterlyMetrics;
const shared_1 = require("./shared");
const date_1 = require("../utils/date");
const formatting_1 = require("../utils/formatting");
function computeSalesCycleLength(records) {
    const withCycle = records.filter(r => r.status === 'won' && r.proposalDate && r.closeDate);
    if (withCycle.length === 0) {
        return { avg: 0, min: 0, max: 0, bySegment: {} };
    }
    const durations = withCycle.map(r => (0, date_1.daysBetween)(r.proposalDate, r.closeDate));
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const bySegment = {};
    const segmented = (0, shared_1.groupBy)(withCycle, r => r.eventType || 'Other');
    for (const [segment, recs] of Object.entries(segmented)) {
        const segDurations = recs
            .filter(r => r.proposalDate && r.closeDate)
            .map(r => (0, date_1.daysBetween)(r.proposalDate, r.closeDate));
        if (segDurations.length > 0) {
            bySegment[segment] = Math.round(segDurations.reduce((a, b) => a + b, 0) / segDurations.length);
        }
    }
    return { avg, min, max, bySegment };
}
function generateRecommendations(metrics, records) {
    const recommendations = [];
    const segments = Object.entries(metrics.customerSegments);
    if (segments.length > 0) {
        const best = segments.sort((a, b) => b[1].revenue - a[1].revenue)[0];
        recommendations.push(`"${best[0]}" events generated the highest revenue at ${(0, formatting_1.formatCurrencyFull)(best[1].revenue)} — prioritize marketing and capacity for this segment.`);
    }
    if (metrics.salesCycleLength.avg > 14) {
        recommendations.push(`Average sales cycle is ${metrics.salesCycleLength.avg} days. Streamlining the proposal and follow-up process could accelerate closings.`);
    }
    else if (metrics.salesCycleLength.avg > 0) {
        recommendations.push(`Sales cycle averaging ${metrics.salesCycleLength.avg} days is efficient. Maintain current proposal turnaround processes.`);
    }
    const referrals = Object.entries(metrics.referralPerformance);
    if (referrals.length > 0) {
        const best = referrals.sort((a, b) => b[1].conversionRate - a[1].conversionRate)[0];
        if (best[1].conversionRate > 0) {
            recommendations.push(`"${best[0]}" has the highest conversion rate at ${(0, formatting_1.formatPercent)(best[1].conversionRate)}. Consider increasing investment in this lead channel.`);
        }
    }
    const trends = metrics.pricingTrends;
    if (trends.length >= 2) {
        const first = trends[0].avgValue;
        const last = trends[trends.length - 1].avgValue;
        if (first > 0 && last > first) {
            const change = ((last - first) / first * 100).toFixed(0);
            recommendations.push(`Average deal value increased ${change}% over the quarter — current pricing strategy is effective.`);
        }
        else if (first > 0 && last < first) {
            const change = ((first - last) / first * 100).toFixed(0);
            recommendations.push(`Average deal value decreased ${change}% over the quarter — review pricing strategy and upsell opportunities.`);
        }
    }
    const wonCount = (0, shared_1.filterByStatus)(records, 'won').length;
    const lostCount = (0, shared_1.filterByStatus)(records, 'lost').length;
    if (wonCount + lostCount > 0) {
        const rate = wonCount / (wonCount + lostCount);
        if (rate < 0.4) {
            recommendations.push(`Win rate of ${(0, formatting_1.formatPercent)(rate)} is below target. Review qualification criteria and competitive positioning.`);
        }
    }
    return recommendations;
}
function computeGoals(metrics, records) {
    const growthFactor = 1.1;
    const revenueTarget = Math.round(metrics.totalRevenue * growthFactor);
    const currentConversion = (0, shared_1.conversionRate)(records);
    const conversionTarget = Math.min(currentConversion + 0.05, 0.95);
    const wonRevenue = (0, shared_1.sumRevenue)((0, shared_1.filterByStatus)(records, 'won'));
    const avgDealSize = (0, shared_1.averageRevenue)((0, shared_1.filterByStatus)(records, 'won'));
    const dealsNeeded = avgDealSize > 0 ? Math.ceil(revenueTarget / avgDealSize) : 0;
    const leadTarget = conversionTarget > 0 ? Math.ceil(dealsNeeded / conversionTarget) : 0;
    return { revenueTarget, leadTarget, conversionTarget };
}
function calculateQuarterlyMetrics(allRecords, start, end) {
    const records = (0, shared_1.filterByDateRange)(allRecords, start, end);
    const wonRecords = (0, shared_1.filterByStatus)(records, 'won');
    const totalRevenue = (0, shared_1.sumRevenue)(wonRecords);
    const segmentGroups = (0, shared_1.groupBy)(records, r => r.eventType || 'Other');
    const customerSegments = {};
    for (const [segment, recs] of Object.entries(segmentGroups)) {
        const won = (0, shared_1.filterByStatus)(recs, 'won');
        customerSegments[segment] = {
            count: recs.length,
            revenue: (0, shared_1.sumRevenue)(won),
            avgValue: (0, shared_1.averageRevenue)(won),
        };
    }
    const salesCycleLength = computeSalesCycleLength(records);
    const months = (0, date_1.getMonthsInRange)(start, end);
    const pricingTrends = months.map(monthStart => {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthRecords = (0, shared_1.filterByDateRange)(allRecords, monthStart, monthEnd);
        const monthWon = (0, shared_1.filterByStatus)(monthRecords, 'won');
        return {
            month: (0, date_1.formatMonthShort)(monthStart),
            avgValue: (0, shared_1.averageRevenue)(monthWon),
            dealCount: monthWon.length,
        };
    });
    const sourceGroups = (0, shared_1.groupBy)(records, r => r.leadSource || 'Unknown');
    const referralPerformance = {};
    for (const [source, recs] of Object.entries(sourceGroups)) {
        const won = (0, shared_1.filterByStatus)(recs, 'won');
        referralPerformance[source] = {
            count: recs.length,
            revenue: (0, shared_1.sumRevenue)(won),
            conversionRate: (0, shared_1.conversionRate)(recs),
        };
    }
    const partial = {
        dateRange: { start, end },
        totalRevenue,
        customerSegments,
        salesCycleLength,
        pricingTrends,
        referralPerformance,
    };
    const recommendations = generateRecommendations(partial, records);
    const nextQuarterGoals = computeGoals(partial, records);
    return {
        ...partial,
        recommendations,
        nextQuarterGoals,
    };
}
//# sourceMappingURL=quarterly.js.map