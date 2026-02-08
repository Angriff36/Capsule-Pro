"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawMetricCards = drawMetricCards;
exports.drawSectionTitle = drawSectionTitle;
exports.drawTable = drawTable;
exports.drawTextBlock = drawTextBlock;
exports.ensureSpace = ensureSpace;
const types_1 = require("../types");
const document_1 = require("./document");
function drawMetricCards(doc, y, cards, columns) {
    const cols = columns ?? Math.min(cards.length, 4);
    const gap = 12;
    const cardWidth = (document_1.PAGE.contentWidth - gap * (cols - 1)) / cols;
    const cardHeight = 65;
    cards.forEach((card, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cardX = document_1.PAGE.margin + col * (cardWidth + gap);
        const cardY = y + row * (cardHeight + gap);
        doc.save();
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4)
            .fill(types_1.COLORS.metricBg);
        doc.fontSize(20).font('Helvetica-Bold').fillColor(types_1.COLORS.navy)
            .text(card.value, cardX + 12, cardY + 12, { width: cardWidth - 24, lineBreak: false });
        doc.fontSize(8).font('Helvetica').fillColor(types_1.COLORS.lightText)
            .text(card.label, cardX + 12, cardY + 36, { width: cardWidth - 24, lineBreak: false });
        if (card.subtext) {
            const subtextColor = card.trend === 'up' ? types_1.COLORS.green
                : card.trend === 'down' ? types_1.COLORS.red
                    : types_1.COLORS.mediumText;
            doc.fontSize(7).font('Helvetica').fillColor(subtextColor)
                .text(card.subtext, cardX + 12, cardY + 48, { width: cardWidth - 24, lineBreak: false });
        }
        doc.restore();
    });
    const rowCount = Math.ceil(cards.length / cols);
    const returnY = y + rowCount * (cardHeight + gap);
    doc.x = document_1.PAGE.margin;
    doc.y = returnY;
    return returnY;
}
function drawSectionTitle(doc, title, y) {
    doc.moveTo(document_1.PAGE.margin, y)
        .lineTo(document_1.PAGE.margin + document_1.PAGE.contentWidth, y)
        .strokeColor(types_1.COLORS.border)
        .lineWidth(0.5)
        .stroke();
    doc.fontSize(12).font('Helvetica-Bold').fillColor(types_1.COLORS.navy)
        .text(title, document_1.PAGE.margin, y + 8, { width: document_1.PAGE.contentWidth, lineBreak: false });
    const returnY = y + 28;
    doc.x = document_1.PAGE.margin;
    doc.y = returnY;
    return returnY;
}
function drawTable(doc, options) {
    const { x, y, width, columns, rows, headerColor = types_1.COLORS.navy } = options;
    const rowHeight = 22;
    const headerHeight = 26;
    const padding = 8;
    doc.rect(x, y, width, headerHeight).fill(headerColor);
    let colX = x;
    columns.forEach((col) => {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(types_1.COLORS.white)
            .text(col.header, colX + padding, y + 8, {
            width: col.width - padding * 2,
            align: col.align || 'left',
            lineBreak: false,
        });
        colX += col.width;
    });
    let currentY = y + headerHeight;
    rows.forEach((row, rowIndex) => {
        if (rowIndex % 2 === 0) {
            doc.rect(x, currentY, width, rowHeight).fill(types_1.COLORS.lightBg);
        }
        colX = x;
        row.forEach((cell, cellIndex) => {
            const col = columns[cellIndex];
            if (!col)
                return;
            doc.fontSize(8).font('Helvetica').fillColor(types_1.COLORS.darkText)
                .text(cell, colX + padding, currentY + 6, {
                width: col.width - padding * 2,
                align: col.align || 'left',
                lineBreak: false,
            });
            colX += col.width;
        });
        currentY += rowHeight;
    });
    doc.rect(x, y, width, headerHeight + rows.length * rowHeight)
        .strokeColor(types_1.COLORS.border)
        .lineWidth(0.5)
        .stroke();
    const returnY = currentY + 10;
    doc.x = x;
    doc.y = returnY;
    return returnY;
}
function drawTextBlock(doc, y, items, bulletColor = types_1.COLORS.navy) {
    let currentY = y;
    items.forEach((item) => {
        doc.circle(document_1.PAGE.margin + 4, currentY + 5, 2.5).fill(bulletColor);
        const textHeight = doc.heightOfString(item, { width: document_1.PAGE.contentWidth - 14 });
        doc.fontSize(9).font('Helvetica').fillColor(types_1.COLORS.darkText)
            .text(item, document_1.PAGE.margin + 14, currentY, {
            width: document_1.PAGE.contentWidth - 14,
            lineGap: 2,
            lineBreak: true,
        });
        currentY += textHeight + 8;
    });
    doc.x = document_1.PAGE.margin;
    doc.y = currentY;
    return currentY;
}
function ensureSpace(doc, currentY, needed) {
    if (currentY + needed > document_1.PAGE.contentBottom - 40) {
        doc.addPage();
        return document_1.PAGE.margin;
    }
    return currentY;
}
//# sourceMappingURL=components.js.map