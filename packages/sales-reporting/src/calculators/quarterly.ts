import { SalesRecord, QuarterlyMetrics } from '../types';
import {
  filterByDateRange, filterByStatus, sumRevenue,
  groupBy, conversionRate, averageRevenue,
} from './shared';
import { getMonthsInRange, formatMonthShort, daysBetween } from '../utils/date';
import { formatCurrencyFull, formatPercent } from '../utils/formatting';

function computeSalesCycleLength(records: SalesRecord[]): QuarterlyMetrics['salesCycleLength'] {
  const withCycle = records.filter(r => r.status === 'won' && r.proposalDate && r.closeDate);

  if (withCycle.length === 0) {
    return { avg: 0, min: 0, max: 0, bySegment: {} };
  }

  const durations = withCycle.map(r => daysBetween(r.proposalDate!, r.closeDate!));
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  const bySegment: Record<string, number> = {};
  const segmented = groupBy(withCycle, r => r.eventType || 'Other');
  for (const [segment, recs] of Object.entries(segmented)) {
    const segDurations = recs
      .filter(r => r.proposalDate && r.closeDate)
      .map(r => daysBetween(r.proposalDate!, r.closeDate!));
    if (segDurations.length > 0) {
      bySegment[segment] = Math.round(segDurations.reduce((a, b) => a + b, 0) / segDurations.length);
    }
  }

  return { avg, min, max, bySegment };
}

function generateRecommendations(
  metrics: Omit<QuarterlyMetrics, 'recommendations' | 'nextQuarterGoals'>,
  records: SalesRecord[]
): string[] {
  const recommendations: string[] = [];

  const segments = Object.entries(metrics.customerSegments);
  if (segments.length > 0) {
    const best = segments.sort((a, b) => b[1].revenue - a[1].revenue)[0];
    recommendations.push(
      `"${best[0]}" events generated the highest revenue at ${formatCurrencyFull(best[1].revenue)} — prioritize marketing and capacity for this segment.`
    );
  }

  if (metrics.salesCycleLength.avg > 14) {
    recommendations.push(
      `Average sales cycle is ${metrics.salesCycleLength.avg} days. Streamlining the proposal and follow-up process could accelerate closings.`
    );
  } else if (metrics.salesCycleLength.avg > 0) {
    recommendations.push(
      `Sales cycle averaging ${metrics.salesCycleLength.avg} days is efficient. Maintain current proposal turnaround processes.`
    );
  }

  const referrals = Object.entries(metrics.referralPerformance);
  if (referrals.length > 0) {
    const best = referrals.sort((a, b) => b[1].conversionRate - a[1].conversionRate)[0];
    if (best[1].conversionRate > 0) {
      recommendations.push(
        `"${best[0]}" has the highest conversion rate at ${formatPercent(best[1].conversionRate)}. Consider increasing investment in this lead channel.`
      );
    }
  }

  const trends = metrics.pricingTrends;
  if (trends.length >= 2) {
    const first = trends[0].avgValue;
    const last = trends[trends.length - 1].avgValue;
    if (first > 0 && last > first) {
      const change = ((last - first) / first * 100).toFixed(0);
      recommendations.push(
        `Average deal value increased ${change}% over the quarter — current pricing strategy is effective.`
      );
    } else if (first > 0 && last < first) {
      const change = ((first - last) / first * 100).toFixed(0);
      recommendations.push(
        `Average deal value decreased ${change}% over the quarter — review pricing strategy and upsell opportunities.`
      );
    }
  }

  const wonCount = filterByStatus(records, 'won').length;
  const lostCount = filterByStatus(records, 'lost').length;
  if (wonCount + lostCount > 0) {
    const rate = wonCount / (wonCount + lostCount);
    if (rate < 0.4) {
      recommendations.push(
        `Win rate of ${formatPercent(rate)} is below target. Review qualification criteria and competitive positioning.`
      );
    }
  }

  return recommendations;
}

function computeGoals(
  metrics: Omit<QuarterlyMetrics, 'recommendations' | 'nextQuarterGoals'>,
  records: SalesRecord[]
): QuarterlyMetrics['nextQuarterGoals'] {
  const growthFactor = 1.1;
  const revenueTarget = Math.round(metrics.totalRevenue * growthFactor);

  const currentConversion = conversionRate(records);
  const conversionTarget = Math.min(currentConversion + 0.05, 0.95);

  const wonRevenue = sumRevenue(filterByStatus(records, 'won'));
  const avgDealSize = averageRevenue(filterByStatus(records, 'won'));
  const dealsNeeded = avgDealSize > 0 ? Math.ceil(revenueTarget / avgDealSize) : 0;
  const leadTarget = conversionTarget > 0 ? Math.ceil(dealsNeeded / conversionTarget) : 0;

  return { revenueTarget, leadTarget, conversionTarget };
}

export function calculateQuarterlyMetrics(
  allRecords: SalesRecord[],
  start: Date,
  end: Date
): QuarterlyMetrics {
  const records = filterByDateRange(allRecords, start, end);
  const wonRecords = filterByStatus(records, 'won');
  const totalRevenue = sumRevenue(wonRecords);

  const segmentGroups = groupBy(records, r => r.eventType || 'Other');
  const customerSegments: QuarterlyMetrics['customerSegments'] = {};
  for (const [segment, recs] of Object.entries(segmentGroups)) {
    const won = filterByStatus(recs, 'won');
    customerSegments[segment] = {
      count: recs.length,
      revenue: sumRevenue(won),
      avgValue: averageRevenue(won),
    };
  }

  const salesCycleLength = computeSalesCycleLength(records);

  const months = getMonthsInRange(start, end);
  const pricingTrends = months.map(monthStart => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthRecords = filterByDateRange(allRecords, monthStart, monthEnd);
    const monthWon = filterByStatus(monthRecords, 'won');
    return {
      month: formatMonthShort(monthStart),
      avgValue: averageRevenue(monthWon),
      dealCount: monthWon.length,
    };
  });

  const sourceGroups = groupBy(records, r => r.leadSource || 'Unknown');
  const referralPerformance: QuarterlyMetrics['referralPerformance'] = {};
  for (const [source, recs] of Object.entries(sourceGroups)) {
    const won = filterByStatus(recs, 'won');
    referralPerformance[source] = {
      count: recs.length,
      revenue: sumRevenue(won),
      conversionRate: conversionRate(recs),
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
