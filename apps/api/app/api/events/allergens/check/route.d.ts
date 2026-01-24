import { NextResponse } from "next/server";
type AllergenConflict = {
  guestId: string;
  guestName: string;
  dishId: string;
  dishName: string;
  allergens: string[];
  severity: "critical" | "warning";
  type: "allergen_conflict" | "dietary_conflict";
};
type CheckAllergensResponse = {
  conflicts: AllergenConflict[];
  summary: {
    total: number;
    critical: number;
    warning: number;
  };
};
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<CheckAllergensResponse>
>;
//# sourceMappingURL=route.d.ts.map
