/**
 * Client Interactions (Communication Log) API Endpoints
 *
 * GET  /api/crm/clients/[id]/interactions - Get client communication timeline
 * POST /api/crm/clients/[id]/interactions - Log a new interaction
 */
import { NextResponse } from "next/server";
/**
 * GET /api/crm/clients/[id]/interactions
 * Get communication timeline for a client
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      data: {
        id: string;
        description: string | null;
        employeeId: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        clientId: string | null;
        leadId: string | null;
        interactionType: string;
        interactionDate: Date;
        subject: string | null;
        followUpDate: Date | null;
        followUpCompleted: boolean;
        correlation_id: string | null;
      }[];
      pagination: {
        limit: number;
        offset: number;
        total: number;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * POST /api/crm/clients/[id]/interactions
 * Log a new interaction with a client
 */
export declare function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      data: {
        id: string;
        description: string | null;
        employeeId: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        clientId: string | null;
        leadId: string | null;
        interactionType: string;
        interactionDate: Date;
        subject: string | null;
        followUpDate: Date | null;
        followUpCompleted: boolean;
        correlation_id: string | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
