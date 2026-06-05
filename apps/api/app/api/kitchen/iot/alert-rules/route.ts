/**
 * IoT Alert Rules API Routes
 *
 * POST creates rules via Manifest runtime.
 * GET reads bypass runtime per constitution §10.
 */

import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

const createAlertRuleSchema = z.object({
  name: z.string().min(1),
  equipmentId: z.uuid(),
  sensorType: z.string().min(1),
  condition: z.string().min(1),
  threshold: z.number().optional(),
  thresholdMin: z.number().optional(),
  thresholdMax: z.number().optional(),
  severity: z.string().default("warning"),
  durationMs: z.number().int().default(0),
  alertAction: z.string().default("notification"),
  isActive: z.boolean().default(true),
  notifyRoles: z.array(z.string()).optional(),
  notifyChannels: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/**
 * GET /api/kitchen/iot/alert-rules
 * List alert rules for the current tenant (read — bypasses Manifest per §10).
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireCurrentUser();

    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get("equipmentId");
    const sensorType = searchParams.get("sensorType");
    const isActiveParam = searchParams.get("isActive");

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }
    if (sensorType) {
      where.sensorType = sensorType;
    }
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    // Use database directly for reads (bypasses Manifest per constitution §10)
    const { database } = await import("@/lib/database");
    const rules = await database.iotAlertRule.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    captureException(error);
    log.error("List IoT alert rules error:", error);
    return NextResponse.json(
      { error: "Failed to list alert rules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/iot/alert-rules
 * Create a new alert rule via Manifest runtime.
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantId, id: userId } = await requireCurrentUser();

    const body = await request.json();
    const parsed = createAlertRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Delegate creation to Manifest runtime
    return runManifestCommand({
      entity: "IotAlertRule",
      command: "create",
      body: {
        name: data.name,
        equipmentId: data.equipmentId,
        metric: data.sensorType, // route uses sensorType as metric
        sensorType: data.sensorType,
        condition: data.condition,
        threshold: data.threshold ?? 0,
        thresholdMin: data.thresholdMin ?? 0,
        thresholdMax: data.thresholdMax ?? 0,
        comparison: data.condition, // route uses condition as comparison operator
        severity: data.severity,
        durationMs: data.durationMs,
        alertAction: data.alertAction,
        isActive: data.isActive,
        notifyRoles: data.notifyRoles?.join(",") ?? "",
        notifyChannels: data.notifyChannels?.join(",") ?? "",
        description: data.description ?? "",
      },
      user: { id: userId, tenantId, role: "" },
    });
  } catch (error) {
    captureException(error);
    log.error("Create IoT alert rule error:", error);
    return NextResponse.json(
      { error: "Failed to create alert rule" },
      { status: 500 }
    );
  }
}
