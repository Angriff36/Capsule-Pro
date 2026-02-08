"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawBarChart = drawBarChart;
const types_1 = require("../types");
const formatting_1 = require("../utils/formatting");
const chart_utils_1 = require("./chart-utils");
function drawBarChart(doc, options) {
    const { x, y, width, height, data, title, colors = types_1.CHART_PALETTE, showCurrency = true, } = options;
    if (data.length === 0)
        return y;
    doc.save();
    if (title) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(types_1.COLORS.darkText)
            .text(title, x, y, { width, lineBreak: false });
    }
    const chartTop = y + (title ? 22 : 0);
    const labelAreaWidth = 60;
    const chartLeft = x + labelAreaWidth;
    const chartWidth = width - labelAreaWidth - 10;
    const chartBottom = y + height - 25;
    const chartHeight = chartBottom - chartTop;
    const maxValue = Math.max(...data.map(d => d.value));
    const scale = (0, chart_utils_1.niceScale)(maxValue, 4);
    for (const tick of scale.ticks) {
        const tickY = chartBottom - (tick / scale.max) * chartHeight;
        doc.moveTo(chartLeft, tickY)
            .lineTo(chartLeft + chartWidth, tickY)
            .strokeColor(types_1.COLORS.border)
            .lineWidth(0.5)
            .stroke();
        doc.fontSize(7).font('Helvetica').fillColor(types_1.COLORS.lightText)
            .text((0, chart_utils_1.formatAxisLabel)(tick, showCurrency), x, tickY - 4, { width: labelAreaWidth - 8, align: 'right', lineBreak: false });
    }
    const barCount = data.length;
    const groupWidth = chartWidth / barCount;
    const barWidth = Math.min(groupWidth * 0.6, 50);
    const barOffset = (groupWidth - barWidth) / 2;
    data.forEach((item, i) => {
        const barX = chartLeft + i * groupWidth + barOffset;
        const barHeight = scale.max > 0 ? (item.value / scale.max) * chartHeight : 0;
        const barY = chartBottom - barHeight;
        doc.rect(barX, barY, barWidth, barHeight)
            .fill(colors[i % colors.length]);
        const labelText = showCurrency ? (0, formatting_1.formatCurrency)(item.value) : (0, formatting_1.formatNumber)(item.value);
        doc.fontSize(7).font('Helvetica-Bold').fillColor(types_1.COLORS.darkText)
            .text(labelText, barX - 5, barY - 12, { width: barWidth + 10, align: 'center', lineBreak: false });
        doc.fontSize(7).font('Helvetica').fillColor(types_1.COLORS.mediumText)
            .text(item.label, barX - 10, chartBottom + 4, { width: barWidth + 20, align: 'center', lineBreak: false });
    });
    doc.moveTo(chartLeft, chartBottom)
        .lineTo(chartLeft + chartWidth, chartBottom)
        .strokeColor(types_1.COLORS.border)
        .lineWidth(1)
        .stroke();
    doc.restore();
    const returnY = y + height;
    doc.x = x;
    doc.y = returnY;
    return returnY;
}
//# sourceMappingURL=bar-chart.js.map