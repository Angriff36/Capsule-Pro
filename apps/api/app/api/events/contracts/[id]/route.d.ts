import { NextResponse } from "next/server";
type Params = Promise<{
  id: string;
}>;
/**
 * GET /api/events/contracts/[id]
 * Get a single contract by ID with event and client details
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<
  | NextResponse<{
      contract: {
        event: {
          id: string;
          title: string;
          eventDate: Date;
        } | null;
        client: {
          id: string;
          company_name: string | null;
          first_name: string | null;
          last_name: string | null;
        } | null;
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string;
        eventId: string;
        contractNumber: string | null;
        documentUrl: string | null;
        documentType: string | null;
        expiresAt: Date | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * PUT /api/events/contracts/[id]
 * Update a contract with validation
 */
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<
  | NextResponse<{
      contract: {
        event: {
          id: string;
          title: string;
          eventDate: Date;
        } | null;
        client: {
          id: string;
          company_name: string | null;
          first_name: string | null;
          last_name: string | null;
        } | null;
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string;
        eventId: string;
        contractNumber: string | null;
        documentUrl: string | null;
        documentType: string | null;
        expiresAt: Date | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * DELETE /api/events/contracts/[id]
 * Soft delete a contract
 */
export declare function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
