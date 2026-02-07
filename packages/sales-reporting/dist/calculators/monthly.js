"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMonthlyMetrics = calculateMonthlyMetrics;
const shared_1 = require("./shared");
const date_1 = require("../utils/date");
function calculateMonthlyMetrics(allRecords, start, end) {
    const records = (0, shared_1.filterByDateRange)(allRecords, start, end);
    const wonRecords = (0, shared_1.filterByStatus)(records, 'won');
    const lostRecords = (0, shared_1.filterByStatus)(records, 'lost');
    const proposalRecords = (0, shared_1.filterByStatus)(records, 'proposal_sent');
    const pendingRecords = (0, shared_1.filterByStatus)(records, 'pending');
    const totalRevenue = (0, shared_1.sumRevenue)(wonRecords);
    const prevStart = (0, date_1.startOfMonth)((0, date_1.subtractMonths)(start, 1));
    const prevEnd = (0, date_1.endOfMonth)((0, date_1.subtractMonths)(start, 1));
    const prevRecords = (0, shared_1.filterByDateRange)(allRecords, prevStart, prevEnd);
    const prevWon = (0, shared_1.filterByStatus)(prevRecords, 'won');
    const previousMonthRevenue = prevWon.length > 0 ? (0, shared_1.sumRevenue)(prevWon) : null;
    const yoyStart = (0, date_1.startOfMonth)((0, date_1.subtractYears)(start, 1));
    const yoyEnd = (0, date_1.endOfMonth)((0, date_1.subtractYears)(start, 1));
    const yoyRecords = (0, shared_1.filterByDateRange)(allRecords, yoyStart, yoyEnd);
    const yoyWon = (0, shared_1.filterByStatus)(yoyRecords, 'won');
    const yearOverYearRevenue = yoyWon.length > 0 ? (0, shared_1.sumRevenue)(yoyWon) : null;
    const avgEventValue = (0, shared_1.averageRevenue)(wonRecords);
    const sourceGroups = (0, shared_1.groupBy)(records, r => r.leadSource || 'Unknown');
    const leadSourceBreakdown = {};
    for (const [source, recs] of Object.entries(sourceGroups)) {
        const won = (0, shared_1.filterByStatus)(recs, 'won');
        leadSourceBreakdown[source] = {
            count: recs.length,
            revenue: (0, shared_1.sumRevenue)(won),
            conversionRate: (0, shared_1.conversionRate)(recs),
        };
    }
    const funnelMetrics = {
        leads: records.length,
        proposals: proposalRecords.length + wonRecords.length + lostRecords.length,
        won: wonRecords.length,
        lost: lostRecords.length,
    };
    const weeks = (0, date_1.getWeeksInRange)(start, end);
    const winLossTrends = weeks.map(week => {
        const weekRecords = (0, shared_1.filterByDateRange)(allRecords, week.start, week.end);
        return {
            period: (0, date_1.formatDateShort)(week.start),
            wins: (0, shared_1.filterByStatus)(weekRecords, 'won').length,
            losses: (0, shared_1.filterByStatus)(weekRecords, 'lost').length,
        };
    });
    const allPending = [...pendingRecords, ...proposalRecords];
    const historicalConversion = (0, shared_1.conversionRate)(records);
    const pipelineForecast = {
        pendingCount: allPending.length,
        pendingValue: (0, shared_1.sumRevenue)(allPending),
        weightedForecast: (0, shared_1.sumRevenue)(allPending) * (historicalConversion || 0.3),
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
//# sourceMappingURL=monthly.js.map