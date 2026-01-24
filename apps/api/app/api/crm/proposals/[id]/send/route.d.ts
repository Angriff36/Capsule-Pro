/**
 * Send Proposal API Endpoint
 *
 * POST /api/crm/proposals/[id]/send  - Send proposal to client
 */
import { NextResponse } from "next/server";
type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * POST /api/crm/proposals/[id]/send
 * Send a proposal to the client
 * Updates proposal status to 'sent' and records sentAt timestamp
 */
export declare function POST(
  request: Request,
  { params }: RouteParams
): Promise<
  NextResponse<{
    message: any;
  }>
>;
//# sourceMappingURL=route.d.ts.map
