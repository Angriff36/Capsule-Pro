import Papa from 'papaparse';
import { SalesRecord } from '../types';
import { parseRowToRecord } from './row-mapper';

export function parseCsv(data: Buffer): SalesRecord[] {
  const text = data.toString('utf-8');
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (result.errors.length > 0) {
    const critical = result.errors.filter(e => e.type === 'FieldMismatch');
    if (critical.length > 0) {
      throw new Error(`CSV parsing errors: ${critical.map(e => e.message).join('; ')}`);
    }
  }

  return (result.data as Record<string, string>[])
    .map(parseRowToRecord)
    .filter((r): r is SalesRecord => r !== null);
}
