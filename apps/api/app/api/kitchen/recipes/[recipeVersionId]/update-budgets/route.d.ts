import { NextResponse } from "next/server";
export declare function POST(
  request: Request,
  {
    params,
  }: {
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
      message: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
