/**
 * Client CRUD API Endpoints
 *
 * GET    /api/crm/clients      - List clients with pagination and filters
 * POST   /api/crm/clients      - Create a new client
 */
import { NextResponse } from "next/server";
/**
 * GET /api/crm/clients
 * List clients with pagination, search, and filters
 */
export declare function GET(request: Request): Promise<
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
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * POST /api/crm/clients
 * Create a new client
 */
export declare function POST(request: Request): Promise<
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
//# sourceMappingURL=route.d.ts.map
