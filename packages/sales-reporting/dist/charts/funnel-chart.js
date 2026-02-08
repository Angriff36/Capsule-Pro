"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawFunnelChart = drawFunnelChart;
const types_1 = require("../types");
const formatting_1 = require("../utils/formatting");
function drawFunnelChart(doc, options) {
    const { x, y, width, height, stages, title, colors = types_1.CHART_PALETTE, } = options;
    if (stages.length === 0)
        return y;
    doc.save();
    if (title) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(types_1.COLORS.darkText)
            .text(title, x, y, { width, lineBreak: false });
    }
    const chartTop = y + (title ? 25 : 0);
    const chartHeight = height - (title ? 35 : 0);
    const maxValue = stages[0]?.value || 1;
    const centerX = x + width / 2;
    const maxWidth = width * 0.75;
    const stageHeight = chartHeight / stages.length;
    const gap = 3;
    stages.forEach((stage, i) => {
        const currentWidth = maxWidth * (stage.value / maxValue);
        const nextWidth = i < stages.length - 1
            ? maxWidth * (stages[i + 1].value / maxValue)
            : currentWidth * 0.7;
        const topY = chartTop + i * stageHeight;
        const bottomY = topY + stageHeight - gap;
        const topLeft = centerX - currentWidth / 2;
        const topRight = centerX + currentWidth / 2;
        const bottomLeft = centerX - nextWidth / 2;
        const bottomRight = centerX + nextWidth / 2;
        doc.moveTo(topLeft, topY)
            .lineTo(topRight, topY)
            .lineTo(bottomRight, bottomY)
            .lineTo(bottomLeft, bottomY)
            .closePath()
            .fill(colors[i % colors.length]);
        const labelY = topY + (stageHeight - gap) / 2 - 6;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(types_1.COLORS.white)
            .text(stage.label, centerX - 60, labelY, { width: 120, align: 'center', lineBreak: false });
        doc.fontSize(8).font('Helvetica').fillColor(types_1.COLORS.white)
            .text((0, formatting_1.formatNumber)(stage.value), centerX - 60, labelY + 14, { width: 120, align: 'center', lineBreak: false });
        if (i > 0) {
            const conversionRate = stage.value / stages[i - 1].value;
            const rateText = (0, formatting_1.formatPercent)(conversionRate);
            doc.fontSize(7).font('Helvetica').fillColor(types_1.COLORS.lightText)
                .text(rateText, topRight + 10, topY + (stageHeight - gap) / 2 - 4, { lineBreak: false });
        }
    });
    doc.restore();
    const returnY = y + height;
    doc.x = x;
    doc.y = returnY;
    return returnY;
}
//# sourceMappingURL=funnel-chart.js.map