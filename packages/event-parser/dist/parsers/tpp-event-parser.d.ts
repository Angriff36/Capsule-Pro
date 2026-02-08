/**
 * TPP Event Parser
 * Parses TPP (Total Party Planner) format PDFs to extract event data
 * Adapted from Battle-Boards shared/parsers/tppEventParser.ts
 */
import type { ParsedEventResult } from "../types/index.js";
export interface ParseOptions {
  sourceName: string;
}
export declare function parseTppEvent(
  rawLines: string[],
  options: ParseOptions
): ParsedEventResult;
//# sourceMappingURL=tpp-event-parser.d.ts.map
