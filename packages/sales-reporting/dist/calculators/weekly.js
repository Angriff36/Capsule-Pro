"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWeeklyMetrics = calculateWeeklyMetrics;
const shared_1 = require("./shared");
function calculateWeeklyMetrics(allRecords, start, end) {
    const records = (0, shared_1.filterByDateRange)(allRecords, start, end);
    const wonRecords = (0, shared_1.filterByStatus)(records, 'won');
    const lostRecords = (0, shared_1.filterByStatus)(records, 'lost');
    const proposalRecords = (0, shared_1.filterByStatus)(records, 'proposal_sent');
    const pendingRecords = (0, shared_1.filterByStatus)(records, 'pending');
    const revenueGroups = (0, shared_1.groupBy)(wonRecords, r => r.eventType || 'Other');
    const revenueByEventType = {};
    for (const [type, recs] of Object.entries(revenueGroups)) {
        revenueByEventType[type] = (0, shared_1.sumRevenue)(recs);
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
            totalValue: (0, shared_1.sumRevenue)(lostRecords),
            records: lostRecords,
        },
        topPendingDeals,
    };
}
//# sourceMappingURL=weekly.js.map