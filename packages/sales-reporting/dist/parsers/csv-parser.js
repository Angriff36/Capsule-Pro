"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsv = parseCsv;
const papaparse_1 = __importDefault(require("papaparse"));
const row_mapper_1 = require("./row-mapper");
function parseCsv(data) {
    const text = data.toString('utf-8');
    const result = papaparse_1.default.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });
    if (result.errors.length > 0) {
        const critical = result.errors.filter(e => e.type === 'FieldMismatch');
        if (critical.length > 0) {
            throw new Error(`CSV parsing errors: ${critical.map(e => e.message).join('; ')}`);
        }
    }
    return result.data
        .map(row_mapper_1.parseRowToRecord)
        .filter((r) => r !== null);
}
//# sourceMappingURL=csv-parser.js.map