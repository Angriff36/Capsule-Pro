/**
 * Staff CSV Parser
 * Parses Time & Attendance CSV exports to extract staff shift data
 */
import type { StaffShift } from "../types/index.js";
export interface StaffCsvParseResult {
    shifts: Map<string, StaffShift[]>;
    errors: string[];
    totalShifts: number;
}
/**
 * Parse a staff roster CSV file
 * Expected columns: Event Name, First Name, Last Name, Position, Scheduled In, Scheduled Out, Scheduled Hours
 */
export declare function parseStaffCsv(csvContent: string): StaffCsvParseResult;
/**
 * Get all event names from parsed shifts
 */
export declare function getEventNamesFromShifts(result: StaffCsvParseResult): string[];
/**
 * Get shifts for a specific event
 */
export declare function getShiftsForEvent(result: StaffCsvParseResult, eventName: string): StaffShift[];
//# sourceMappingURL=staff-csv-parser.d.ts.map