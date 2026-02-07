import { SalesRecord } from '../types';
export declare function filterByDateRange(records: SalesRecord[], start: Date, end: Date): SalesRecord[];
export declare function filterByStatus(records: SalesRecord[], status: SalesRecord['status']): SalesRecord[];
export declare function sumRevenue(records: SalesRecord[]): number;
export declare function groupBy<K extends string>(records: SalesRecord[], keyFn: (r: SalesRecord) => K): Record<K, SalesRecord[]>;
export declare function countByStatus(records: SalesRecord[]): Record<string, number>;
export declare function averageRevenue(records: SalesRecord[]): number;
export declare function conversionRate(records: SalesRecord[]): number;
//# sourceMappingURL=shared.d.ts.map