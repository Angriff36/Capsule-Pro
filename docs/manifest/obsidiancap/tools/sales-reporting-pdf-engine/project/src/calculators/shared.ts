import { SalesRecord } from '../types';
import { isInRange } from '../utils/date';

export function filterByDateRange(records: SalesRecord[], start: Date, end: Date): SalesRecord[] {
  return records.filter(r => isInRange(r.date, start, end));
}

export function filterByStatus(records: SalesRecord[], status: SalesRecord['status']): SalesRecord[] {
  return records.filter(r => r.status === status);
}

export function sumRevenue(records: SalesRecord[]): number {
  return records.reduce((sum, r) => sum + r.revenue, 0);
}

export function groupBy<K extends string>(
  records: SalesRecord[],
  keyFn: (r: SalesRecord) => K
): Record<K, SalesRecord[]> {
  const groups = {} as Record<K, SalesRecord[]>;
  for (const record of records) {
    const key = keyFn(record);
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  }
  return groups;
}

export function countByStatus(records: SalesRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of records) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }
  return counts;
}

export function averageRevenue(records: SalesRecord[]): number {
  if (records.length === 0) return 0;
  return sumRevenue(records) / records.length;
}

export function conversionRate(records: SalesRecord[]): number {
  const decided = records.filter(r => r.status === 'won' || r.status === 'lost');
  if (decided.length === 0) return 0;
  const won = decided.filter(r => r.status === 'won').length;
  return won / decided.length;
}
