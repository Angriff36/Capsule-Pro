/**
 * POST /api/integrations/nowsta/employees/map
 *
 * Create or update an employee mapping manually
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const mapEmployeeSchema = z.object({
  nowstaEmployeeId: z.string().min(1, "Nowsta employee ID is required"),
  convoyEmployeeId: z.string().uuid("Invalid Convoy employee ID"),
  nowstaEmployeeName: z.string().optional(),
  nowstaEmployeeEmail: z.string().email().optional(),
  confirm: z.boolean().default(false),
});

/**
 * POST /api/integrations/nowsta/employees/map
 * Create or update an employee mapping
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = mapEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      nowstaEmployeeId,
      convoyEmployeeId,
      nowstaEmployeeName,
      nowstaEmployeeEmail,
      confirm,
    } = parsed.data;

    // Verify the Convoy employee exists
    const convoyEmployee = await database.$queryRaw<
      Array<{ id: string; email: string }>
    >(
      Prisma.sql`
        SELECT id, email
        FROM tenant_staff.employees
        WHERE tenant_id = ${tenantId}
          AND id = ${convoyEmployeeId}
          AND deleted_at IS NULL
          AND is_active = true
      `
    );

    if (convoyEmployee.length === 0) {
      return NextResponse.json(
        { error: "Convoy employee not found or inactive" },
        { status: 404 }
      );
    }

    // Check if this Convoy employee is already mapped to a different Nowsta employee
    const existingMappingForConvoy =
      await database.nowstaEmployeeMapping.findFirst({
        where: {
          tenantId,
          convoyEmployeeId,
          nowstaEmployeeId: { not: nowstaEmployeeId },
        },
      });

    if (existingMappingForConvoy) {
      return NextResponse.json(
        {
          error:
            "This Convoy employee is already mapped to a different Nowsta employee",
          existingMapping: {
            nowstaEmployeeId: existingMappingForConvoy.nowstaEmployeeId,
            nowstaEmployeeName: existingMappingForConvoy.nowstaEmployeeName,
          },
        },
        { status: 409 }
      );
    }

    // Create or update the mapping
    const mapping = await database.nowstaEmployeeMapping.upsert({
      where: {
        tenantId_nowstaEmployeeId: {
          tenantId,
          nowstaEmployeeId,
        },
      },
      update: {
        convoyEmployeeId,
        nowstaEmployeeName: nowstaEmployeeName ?? undefined,
        nowstaEmployeeEmail: nowstaEmployeeEmail ?? undefined,
        autoMapped: false,
        confirmedAt: confirm ? new Date() : undefined,
      },
      create: {
        tenantId,
        nowstaEmployeeId,
        convoyEmployeeId,
        nowstaEmployeeName,
        nowstaEmployeeEmail,
        autoMapped: false,
        confirmedAt: confirm ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      mapping: {
        id: mapping.id,
        nowstaEmployeeId: mapping.nowstaEmployeeId,
        convoyEmployeeId: mapping.convoyEmployeeId,
        nowstaEmployeeName: mapping.nowstaEmployeeName,
        nowstaEmployeeEmail: mapping.nowstaEmployeeEmail,
        autoMapped: mapping.autoMapped,
        confirmedAt: mapping.confirmedAt,
      },
    });
  } catch (error) {
    console.error("Failed to map employee:", error);
    return NextResponse.json(
      { error: "Failed to create mapping" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/nowsta/employees/map
 * Remove an employee mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nowstaEmployeeId = searchParams.get("nowstaEmployeeId");

    if (!nowstaEmployeeId) {
      return NextResponse.json(
        { error: "nowstaEmployeeId is required" },
        { status: 400 }
      );
    }

    await database.nowstaEmployeeMapping.delete({
      where: {
        tenantId_nowstaEmployeeId: {
          tenantId,
          nowstaEmployeeId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete employee mapping:", error);
    return NextResponse.json(
      { error: "Failed to delete mapping" },
      { status: 500 }
    );
  }
}
