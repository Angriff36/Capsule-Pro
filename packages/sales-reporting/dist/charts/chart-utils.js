"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.niceScale = niceScale;
exports.formatAxisLabel = formatAxisLabel;
const formatting_1 = require("../utils/formatting");
function niceScale(maxValue, tickCount) {
    if (maxValue <= 0) {
        return { max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
    }
    const roughStep = maxValue / tickCount;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;
    let niceStep;
    if (residual <= 1.5)
        niceStep = 1 * magnitude;
    else if (residual <= 3)
        niceStep = 2 * magnitude;
    else if (residual <= 7)
        niceStep = 5 * magnitude;
    else
        niceStep = 10 * magnitude;
    const niceMax = Math.ceil(maxValue / niceStep) * niceStep;
    const ticks = [];
    for (let v = 0; v <= niceMax; v += niceStep) {
        ticks.push(v);
    }
    return { max: niceMax, step: niceStep, ticks };
}
function formatAxisLabel(value, isCurrency) {
    return isCurrency ? (0, formatting_1.formatCurrency)(value) : (0, formatting_1.formatNumber)(value);
}
//# sourceMappingURL=chart-utils.js.map