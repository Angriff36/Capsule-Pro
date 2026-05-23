import { SalesRecord, WeeklyMetrics } from '../types';
import { filterByDateRange, filterByStatus, sumRevenue, groupBy } from './shared';

export function calculateWeeklyMetrics(
  allRecords: SalesRecord[],
  start: Date,
  end: Date
): WeeklyMetrics {
  const records = filterByDateRange(allRecords, start, end);

  const wonRecords = filterByStatus(records, 'won');
  const lostRecords = filterByStatus(records, 'lost');
  const proposalRecords = filterByStatus(records, 'proposal_sent');
  const pendingRecords = filterByStatus(records, 'pending');

  const revenueGroups = groupBy(wonRecords, r => r.eventType || 'Other');
  const revenueByEventType: Record<string, number> = {};
  for (const [type, recs] of Object.entries(revenueGroups)) {
    revenueByEventType[type] = sumRevenue(recs);
  }

  const leadsReceived = records.length;
  const proposalsSent = proposalRecords.length + wonRecords.length + lostRecords.length;
  const eventsClosed = wonRecords.length;
  const closingRatio = proposalsSent > 0 ? eventsClosed / proposalsSent : 0;

  const topPendingDeals = [...pendingRecords, ...proposalRecords]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  return {
    dateRange: { start, end },
    revenueByEventType,
    leadsReceived,
    proposalsSent,
    eventsClosed,
    closingRatio,
    lostOpportunities: {
      count: lostRecords.length,
      totalValue: sumRevenue(lostRecords),
      records: lostRecords,
    },
    topPendingDeals,
  };
}
