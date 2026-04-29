// Get tax configuration
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

// Tax brackets for 2026 federal single filers (simplified)
const DEFAULT_FEDERAL_BRACKETS = [
  { min: 0, max: 11_600, rate: 0.1 },
  { min: 11_600, max: 47_150, rate: 0.12 },
  { min: 47_150, max: 100_525, rate: 0.22 },
  { min: 100_525, max: 191_950, rate: 0.24 },
  { min: 191_950, max: 243_725, rate: 0.32 },
  { min: 243_725, max: 609_350, rate: 0.35 },
  { min: 609_350, max: Number.POSITIVE_INFINITY, rate: 0.37 },
];

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    // Get or create tenant tax config
    let configs = await database.$queryRaw`
      SELECT * FROM tenant_payroll.tax_configurations
      WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
    `;

    const configList = configs as any[];

    // If no configs exist, create default federal + user's state
    if (!configList?.length) {
      await database.$executeRaw`
        INSERT INTO tenant_payroll.tax_configurations (
          tenant_id, tax_type, jurisdiction, state_code, is_active, created_at
        ) VALUES (
          ${tenantId}::uuid, 'federal', 'US', 'FED', true, NOW()
        )
      `;

      configs = await database.$queryRaw`
        SELECT * FROM tenant_payroll.tax_configurations
        WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
      `;
    }

    return manifestSuccessResponse({
      configurations: configs || [],
      defaultBrackets: DEFAULT_FEDERAL_BRACKETS,
    });
  } catch (error) {
    captureException(error);
    console.error("Error fetching tax config:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

// Update tax configuration
export async function PUT(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { configId, isActive, stateCode } = await request.json();
    if (!configId) return manifestErrorResponse("configId required", 400);

    const result = await database.$queryRaw`
      UPDATE tenant_payroll.tax_configurations
      SET is_active = ${isActive ?? true},
          state_code = ${stateCode || null},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${configId}::uuid
      RETURNING id, tax_type, jurisdiction, state_code, is_active
    `;

    return manifestSuccessResponse({ config: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    console.error("Error updating tax config:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
