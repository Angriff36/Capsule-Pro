"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFiles = parseFiles;
const csv_parser_1 = require("./csv-parser");
const xlsx_parser_1 = require("./xlsx-parser");
function parseFiles(files) {
    const allRecords = [];
    for (const file of files) {
        const records = file.type === 'csv'
            ? (0, csv_parser_1.parseCsv)(file.data)
            : (0, xlsx_parser_1.parseXlsx)(file.data);
        allRecords.push(...records);
    }
    allRecords.sort((a, b) => a.date.getTime() - b.date.getTime());
    return allRecords;
}
//# sourceMappingURL=index.js.map