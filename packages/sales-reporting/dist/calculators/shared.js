"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterByDateRange = filterByDateRange;
exports.filterByStatus = filterByStatus;
exports.sumRevenue = sumRevenue;
exports.groupBy = groupBy;
exports.countByStatus = countByStatus;
exports.averageRevenue = averageRevenue;
exports.conversionRate = conversionRate;
const date_1 = require("../utils/date");
function filterByDateRange(records, start, end) {
    return records.filter(r => (0, date_1.isInRange)(r.date, start, end));
}
function filterByStatus(records, status) {
    return records.filter(r => r.status === status);
}
function sumRevenue(records) {
    return records.reduce((sum, r) => sum + r.revenue, 0);
}
function groupBy(records, keyFn) {
    const groups = {};
    for (const record of records) {
        const key = keyFn(record);
        if (!groups[key])
            groups[key] = [];
        groups[key].push(record);
    }
    return groups;
}
function countByStatus(records) {
    const counts = {};
    for (const r of records) {
        counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
}
function averageRevenue(records) {
    if (records.length === 0)
        return 0;
    return sumRevenue(records) / records.length;
}
function conversionRate(records) {
    const decided = records.filter(r => r.status === 'won' || r.status === 'lost');
    if (decided.length === 0)
        return 0;
    const won = decided.filter(r => r.status === 'won').length;
    return won / decided.length;
}
//# sourceMappingURL=shared.js.map