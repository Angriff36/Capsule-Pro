import { SalesRecord, MonthlyMetrics } from '../types';
import {
  filterByDateRange, filterByStatus, sumRevenue,
  groupBy, conversionRate, averageRevenue,
} from './shared';
import { subtractMonths, subtractYears, startOfMonth, endOfMonth, getWeeksInRange, formatDateShort } from '../utils/date';

export function calculateMonthlyMetrics(
  allRecords: SalesRecord[],
  start: Date,
  end: Date
): MonthlyMetrics {
  const records = filterByDateRange(allRecords, start, end);
  const wonRecords = filterByStatus(records, 'won');
  const lostRecords = filterByStatus(records, 'lost');
  const proposalRecords = filterByStatus(records, 'proposal_sent');
  const pendingRecords = filterByStatus(records, 'pending');

  const totalRevenue = sumRevenue(wonRecords);

  const prevStart = startOfMonth(subtractMonths(start, 1));
  const prevEnd = endOfMonth(subtractMonths(start, 1));
  const prevRecords = filterByDateRange(allRecords, prevStart, prevEnd);
  const prevWon = filterByStatus(prevRecords, 'won');
  const previousMonthRevenue = prevWon.length > 0 ? sumRevenue(prevWon) : null;

  const yoyStart = startOfMonth(subtractYears(start, 1));
  const yoyEnd = endOfMonth(subtractYears(start, 1));
  const yoyRecords = filterByDateRange(allRecords, yoyStart, yoyEnd);
  const yoyWon = filterByStatus(yoyRecords, 'won');
  const yearOverYearRevenue = yoyWon.length > 0 ? sumRevenue(yoyWon) : null;

  const avgEventValue = averageRevenue(wonRecords);

  const sourceGroups = groupBy(records, r => r.leadSource || 'Unknown');
  const leadSourceBreakdown: MonthlyMetrics['leadSourceBreakdown'] = {};
  for (const [source, recs] of Object.entries(sourceGroups)) {
    const won = filterByStatus(recs, 'won');
    leadSourceBreakdown[source] = {
      count: recs.length,
      revenue: sumRevenue(won),
      conversionRate: conversionRate(recs),
    };
  }

  const funnelMetrics = {
    leads: records.length,
    proposals: proposalRecords.length + wonRecords.length + lostRecords.length,
    won: wonRecords.length,
    lost: lostRecords.length,
  };

  const weeks = getWeeksInRange(start, end);
  const winLossTrends = weeks.map(week => {
    const weekRecords = filterByDateRange(allRecords, week.start, week.end);
    return {
      period: formatDateShort(week.start),
      wins: filterByStatus(weekRecords, 'won').length,
      losses: filterByStatus(weekRecords, 'lost').length,
    };
  });

  const allPending = [...pendingRecords, ...proposalRecords];
  const historicalConversion = conversionRate(records);
  const pipelineForecast = {
    pendingCount: allPending.length,
    pendingValue: sumRevenue(allPending),
    weightedForecast: sumRevenue(allPending) * (historicalConversion || 0.3),
    deals: allPending.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };

  return {
    dateRange: { start, end },
    totalRevenue,
    previousMonthRevenue,
    yearOverYearRevenue,
    avgEventValue,
    leadSourceBreakdown,
    funnelMetrics,
    winLossTrends,
    pipelineForecast,
  };
}
