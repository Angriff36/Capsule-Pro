"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseXlsx = parseXlsx;
const XLSX = __importStar(require("xlsx"));
const row_mapper_1 = require("./row-mapper");
function parseXlsx(data) {
    const workbook = XLSX.read(data, { type: 'buffer', cellDates: true });
    const records = [];
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
        });
        const normalized = rows.map(row => {
            const mapped = {};
            for (const [key, value] of Object.entries(row)) {
                const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                mapped[normalizedKey] = value instanceof Date
                    ? value.toISOString().split('T')[0]
                    : String(value ?? '');
            }
            return mapped;
        });
        for (const row of normalized) {
            const record = (0, row_mapper_1.parseRowToRecord)(row);
            if (record)
                records.push(record);
        }
    }
    return records;
}
//# sourceMappingURL=xlsx-parser.js.map