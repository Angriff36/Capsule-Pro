"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawLineChart = drawLineChart;
const types_1 = require("../types");
const chart_utils_1 = require("./chart-utils");
function drawLineChart(doc, options) {
    const { x, y, width, height, series, title, showCurrency = false, } = options;
    if (series.length === 0)
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
    const chartBottom = y + height - 35;
    const chartHeight = chartBottom - chartTop;
    let allValues = [];
    for (const s of series) {
        allValues = allValues.concat(s.data.map(d => d.value));
    }
    const maxValue = Math.max(...allValues, 1);
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
    const maxPoints = Math.max(...series.map(s => s.data.length));
    const labels = series[0]?.data.map(d => d.label) ?? [];
    labels.forEach((label, i) => {
        const labelX = chartLeft + (i / Math.max(maxPoints - 1, 1)) * chartWidth;
        doc.fontSize(7).font('Helvetica').fillColor(types_1.COLORS.mediumText)
            .text(label, labelX - 25, chartBottom + 6, { width: 50, align: 'center', lineBreak: false });
    });
    for (const s of series) {
        const points = s.data.map((d, i) => ({
            x: chartLeft + (i / Math.max(s.data.length - 1, 1)) * chartWidth,
            y: chartBottom - (d.value / scale.max) * chartHeight,
            value: d.value,
        }));
        if (points.length > 1) {
            doc.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                doc.lineTo(points[i].x, points[i].y);
            }
            doc.strokeColor(s.color).lineWidth(2).stroke();
        }
        for (const pt of points) {
            doc.circle(pt.x, pt.y, 3.5).fill(types_1.COLORS.white);
            doc.circle(pt.x, pt.y, 3.5).strokeColor(s.color).lineWidth(1.5).stroke();
            doc.circle(pt.x, pt.y, 2).fill(s.color);
        }
    }
    if (series.length > 1) {
        const legendY = chartBottom + 20;
        let legendX = chartLeft;
        for (const s of series) {
            doc.rect(legendX, legendY, 10, 10).fill(s.color);
            doc.fontSize(7).font('Helvetica').fillColor(types_1.COLORS.mediumText)
                .text(s.label, legendX + 14, legendY + 1, { lineBreak: false });
            legendX += doc.widthOfString(s.label) + 30;
        }
    }
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
//# sourceMappingURL=line-chart.js.map