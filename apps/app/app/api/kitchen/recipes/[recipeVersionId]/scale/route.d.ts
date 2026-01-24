import { NextResponse } from "next/server";
export declare function POST(
  request: Request,
  _params: {
    params: Promise<{
      recipeVersionId: string;
    }>;
  }
): Promise<NextResponse<any>>;
export declare function PATCH(
  request: Request,
  _params: {
    params: Promise<{
      recipeVersionId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
    }>
>;
//# sourceMappingURL=route.d.ts.map
