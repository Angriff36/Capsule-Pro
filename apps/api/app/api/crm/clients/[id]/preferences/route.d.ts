/**
 * Client Preferences API Endpoints
 *
 * GET  /api/crm/clients/[id]/preferences - List client preferences
 * POST /api/crm/clients/[id]/preferences - Add a preference
 */
import { NextResponse } from "next/server";
/**
 * GET /api/crm/clients/[id]/preferences
 * List all preferences for a client
 */
export declare function GET(
  _request: Request,
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
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string;
        preferenceType: string;
        preferenceKey: string;
        preferenceValue: import("@prisma/client/runtime/client").JsonValue;
      }[];
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * POST /api/crm/clients/[id]/preferences
 * Add a new preference for a client
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
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string;
        preferenceType: string;
        preferenceKey: string;
        preferenceValue: import("@prisma/client/runtime/client").JsonValue;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
