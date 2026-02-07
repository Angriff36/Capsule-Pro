"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInRange = isInRange;
exports.startOfMonth = startOfMonth;
exports.endOfMonth = endOfMonth;
exports.subtractMonths = subtractMonths;
exports.subtractYears = subtractYears;
exports.startOfQuarter = startOfQuarter;
exports.endOfQuarter = endOfQuarter;
exports.formatDateShort = formatDateShort;
exports.formatMonthYear = formatMonthYear;
exports.formatMonthShort = formatMonthShort;
exports.getQuarterLabel = getQuarterLabel;
exports.daysBetween = daysBetween;
exports.getMonthsInRange = getMonthsInRange;
exports.getWeeksInRange = getWeeksInRange;
function isInRange(date, start, end) {
    return date >= start && date <= end;
}
function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
function subtractMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() - months);
    return d;
}
function subtractYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() - years);
    return d;
}
function startOfQuarter(date) {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
}
function endOfQuarter(date) {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
}
function formatDateShort(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
function formatMonthYear(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
function formatMonthShort(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
function getQuarterLabel(date) {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${date.getFullYear()}`;
}
function daysBetween(a, b) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round(Math.abs(b.getTime() - a.getTime()) / msPerDay);
}
function getMonthsInRange(start, end) {
    const months = [];
    const current = startOfMonth(new Date(start));
    const last = startOfMonth(new Date(end));
    while (current <= last) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }
    return months;
}
function getWeeksInRange(start, end) {
    const weeks = [];
    const current = new Date(start);
    while (current <= end) {
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weeks.push({
            start: new Date(current),
            end: weekEnd > end ? new Date(end) : weekEnd,
        });
        current.setDate(current.getDate() + 7);
    }
    return weeks;
}
//# sourceMappingURL=date.js.map