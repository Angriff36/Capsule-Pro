/**
 * Individual Client Interaction API Endpoints
 *
 * PUT    /api/crm/clients/[id]/interactions/[interactionId] - Update interaction
 * DELETE /api/crm/clients/[id]/interactions/[interactionId] - Delete interaction
 */
import { NextResponse } from "next/server";
/**
 * PUT /api/crm/clients/[id]/interactions/[interactionId]
 * Update a specific interaction
 */
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      interactionId: string;
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
/**
 * DELETE /api/crm/clients/[id]/interactions/[interactionId]
 * Soft delete a specific interaction
 */
export declare function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      interactionId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      success: boolean;
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
