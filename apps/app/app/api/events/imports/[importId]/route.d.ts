import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    importId: string;
  }>;
};
export declare const GET: (
  _request: Request,
  context: RouteContext
) => Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
