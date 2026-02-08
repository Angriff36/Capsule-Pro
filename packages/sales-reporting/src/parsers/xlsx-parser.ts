import * as XLSX from 'xlsx';
import { SalesRecord } from '../types';
import { parseRowToRecord } from './row-mapper';

export function parseXlsx(data: Buffer): SalesRecord[] {
  const workbook = XLSX.read(data, { type: 'buffer', cellDates: true });
  const records: SalesRecord[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    const normalized = rows.map(row => {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        mapped[normalizedKey] = value instanceof Date
          ? value.toISOString().split('T')[0]
          : String(value ?? '');
      }
      return mapped;
    });

    for (const row of normalized) {
      const record = parseRowToRecord(row);
      if (record) records.push(record);
    }
  }

  return records;
}
