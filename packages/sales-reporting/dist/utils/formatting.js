"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatCurrencyFull = formatCurrencyFull;
exports.formatPercent = formatPercent;
exports.formatNumber = formatNumber;
exports.truncateText = truncateText;
function formatCurrency(value) {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 10000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function formatCurrencyFull(value) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
}
function formatNumber(value) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
//# sourceMappingURL=formatting.js.map