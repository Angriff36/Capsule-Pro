/**
 * Battle Board Adapter
 * Converts parsed event data to battle board format
 */
import type { BattleBoardData, BattleBoardLayout } from "../types/battleBoard.js";
import type { ParsedEvent, StaffShift } from "../types/event.js";
export interface BattleBoardAdapterOptions {
    includeTaskLibrary?: boolean;
    defaultLayouts?: BattleBoardLayout[];
    staffParkingDefault?: string;
    staffRestroomsDefault?: string;
}
export interface BattleBoardBuildResult {
    battleBoard: BattleBoardData;
    autoFillScore: number;
    warnings: string[];
    missingFields: string[];
}
/**
 * Build a battle board from parsed event data
 */
export declare function buildBattleBoardFromEvent(event: ParsedEvent, options?: BattleBoardAdapterOptions): BattleBoardBuildResult;
/**
 * Merge staff data from CSV into an existing battle board
 */
export declare function mergeStaffIntoBattleBoard(battleBoard: BattleBoardData, staffing: StaffShift[]): BattleBoardData;
/**
 * Create an empty battle board template
 */
export declare function createEmptyBattleBoard(eventName?: string, eventDate?: string): BattleBoardData;
//# sourceMappingURL=battle-board-adapter.d.ts.map