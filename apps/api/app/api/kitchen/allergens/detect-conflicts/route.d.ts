/**
 * @module AllergenConflictDetectionService
 * @intent Automatically detect allergen conflicts and generate warnings
 * @responsibility Check for conflicts between event guests and dish allergens, create warnings
 * @domain Kitchen
 * @tags allergens, conflicts, warnings, service
 * @canonical true
 */
import { NextResponse } from "next/server";
/**
 * POST /api/kitchen/allergens/detect-conflicts
 *
 * Automatically detects allergen conflicts between event guests and assigned dishes,
 * and creates warnings for any conflicts found.
 *
 * This endpoint should be called:
 * - When guests are added/updated for an event
 * - When dishes are added/removed from an event menu
 * - When dish allergen information is updated
 */
export declare function POST(request: Request): Promise<
  | NextResponse<{
      success: boolean;
      message: string;
      warningsCreated: number;
      guestsProcessed: number;
      dishesProcessed: number;
    }>
  | NextResponse<{
      error: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
