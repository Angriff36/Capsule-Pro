/**
 * Single Client CRUD API Endpoints
 *
 * GET    /api/crm/clients/[id]  - Get client details
 * PUT    /api/crm/clients/[id]  - Update client
 * DELETE /api/crm/clients/[id]  - Soft delete client
 */
import { NextResponse } from "next/server";
/**
 * GET /api/crm/clients/[id]
 * Get client details with contacts, preferences, and stats
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
        contacts: {
          id: string;
          title: string | null;
          tenantId: string;
          createdAt: Date;
          updatedAt: Date;
          deletedAt: Date | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
          clientId: string;
          phoneMobile: string | null;
          isPrimary: boolean;
          isBillingContact: boolean;
        }[];
        preferences: {
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
        interactionCount: number;
        eventCount: number;
        totalRevenue: {
          total: string;
        } | null;
        id: string;
        tenantId: string;
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        clientType: string;
        company_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone: string | null;
        website: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        stateProvince: string | null;
        postalCode: string | null;
        countryCode: string | null;
        defaultPaymentTerms: number | null;
        taxExempt: boolean;
        taxId: string | null;
        notes: string | null;
        source: string | null;
        assignedTo: string | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * PUT /api/crm/clients/[id]
 * Update client
 */
export declare function PUT(
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
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        clientType: string;
        company_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone: string | null;
        website: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        stateProvince: string | null;
        postalCode: string | null;
        countryCode: string | null;
        defaultPaymentTerms: number | null;
        taxExempt: boolean;
        taxId: string | null;
        notes: string | null;
        source: string | null;
        assignedTo: string | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * DELETE /api/crm/clients/[id]
 * Soft delete client
 */
export declare function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  NextResponse<{
    message: any;
  }>
>;
//# sourceMappingURL=route.d.ts.map
