/**
 * GET /api/integrations/nowsta/employees
 *
 * List Nowsta employees with their mapping status
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { createNowstaClient } from "@/app/lib/nowsta-client";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/integrations/nowsta/employees
 * List Nowsta employees with mapping status
 */
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const config = await database.nowstaConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return NextResponse.json({
        configured: false,
        employees: [],
      });
    }

    // Fetch employees from Nowsta
    const client = createNowstaClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      organizationId: config.organizationId,
    });

    const nowstaEmployees = await client.getAllEmployees();

    // Get existing mappings
    const mappings = await database.nowstaEmployeeMapping.findMany({
      where: { tenantId },
    });

    const mappingByNowstaId = new Map(
      mappings.map((m) => [m.nowstaEmployeeId, m])
    );

    // Get Convoy employees for reference
    const convoyEmployees = await database.$queryRaw<
      Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
      }>
    >(
      Prisma.sql`
        SELECT id, email, first_name, last_name
        FROM tenant_staff.employees
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND is_active = true
        ORDER BY first_name, last_name
      `
    );

    // Combine Nowsta employees with mapping status
    const employees = nowstaEmployees.map(
      (ne: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        role?: string;
        is_active: boolean;
      }) => {
        const mapping = mappingByNowstaId.get(ne.id);
        const matchedConvoyEmployee = mapping
          ? convoyEmployees.find((ce) => ce.id === mapping.convoyEmployeeId)
          : null;

        return {
          nowstaEmployee: {
            id: ne.id,
            firstName: ne.first_name,
            lastName: ne.last_name,
            email: ne.email,
            phone: ne.phone,
            role: ne.role,
            isActive: ne.is_active,
          },
          mapping: mapping
            ? {
                id: mapping.id,
                convoyEmployeeId: mapping.convoyEmployeeId,
                autoMapped: mapping.autoMapped,
                confirmedAt: mapping.confirmedAt,
              }
            : null,
          matchedConvoyEmployee: matchedConvoyEmployee
            ? {
                id: matchedConvoyEmployee.id,
                email: matchedConvoyEmployee.email,
                firstName: matchedConvoyEmployee.first_name,
                lastName: matchedConvoyEmployee.last_name,
              }
            : null,
          // Potential matches by email
          potentialMatches: convoyEmployees.filter(
            (ce) => ce.email.toLowerCase() === ne.email.toLowerCase()
          ),
        };
      }
    );

    return NextResponse.json({
      configured: true,
      employees,
      convoyEmployees: convoyEmployees.map((ce) => ({
        id: ce.id,
        email: ce.email,
        firstName: ce.first_name,
        lastName: ce.last_name,
      })),
    });
  } catch (error) {
    console.error("Failed to get Nowsta employees:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get employees: ${message}` },
      { status: 500 }
    );
  }
}
