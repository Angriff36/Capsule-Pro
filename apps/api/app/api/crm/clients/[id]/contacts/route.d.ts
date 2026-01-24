/**
 * Client Contacts API Endpoints
 *
 * GET  /api/crm/clients/[id]/contacts - List client contacts
 * POST /api/crm/clients/[id]/contacts - Add a new contact
 */
import { NextResponse } from "next/server";
/**
 * GET /api/crm/clients/[id]/contacts
 * List all contacts for a client
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
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * POST /api/crm/clients/[id]/contacts
 * Add a new contact to a client
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
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
