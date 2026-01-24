import { NextResponse } from "next/server";
import type {
  ActionHandler,
  SuggestedAction,
  SuggestionCategory,
  SuggestionPriority,
  SuggestionType,
} from "./types";
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      suggestions: SuggestedAction[];
      summary: string;
      generatedAt: Date;
      context: {
        timeframe: "today" | "week" | "month";
        boardId: string | undefined;
        eventId: string | undefined;
        totalEvents: number;
        incompleteTasks: number;
        inventoryAlerts: number;
      };
    }>
>;
export type {
  SuggestedAction,
  SuggestionCategory,
  SuggestionPriority,
  SuggestionType,
  ActionHandler,
};
//# sourceMappingURL=route.d.ts.map
