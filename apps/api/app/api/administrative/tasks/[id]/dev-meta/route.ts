import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const devMeta = await database.adminTaskDevMeta.findFirst({
    where: {
      AND: [{ tenantId }, { taskId: id }, { deletedAt: null }],
    },
  });

  return NextResponse.json({ data: devMeta });
}

/**
 * POST /api/administrative/tasks/[id]/dev-meta
 * Create dev metadata via the governed AdminTaskDevMeta.create command.
 * One row per task (DB unique on tenantId+taskId) — use PATCH to update.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runCommand({
    entity: "AdminTaskDevMeta",
    command: "create",
    body: {
      severity: rawBody.severity ?? "medium",
      environment: rawBody.environment ?? "",
      stepsToRepro: rawBody.stepsToRepro ?? "",
      expectedResult: rawBody.expectedResult ?? "",
      actualResult: rawBody.actualResult ?? "",
      taskId: id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * PATCH /api/administrative/tasks/[id]/dev-meta
 * Update dev metadata via the governed AdminTaskDevMeta.update command.
 * The instance is resolved by taskId (unique per task), tenant-scoped.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);

  // Resolve the dev-meta row for this task (tenant-scoped read).
  const existingDevMeta = await database.adminTaskDevMeta.findFirst({
    where: {
      AND: [{ tenantId: user.tenantId }, { taskId: id }, { deletedAt: null }],
    },
  });

  if (!existingDevMeta) {
    return NextResponse.json(
      { message: "Dev meta not found" },
      { status: 404 }
    );
  }

  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  // AdminTaskDevMeta.update is a full-field command (every mutate runs), so
  // omitted fields must be passed back unchanged from the existing row.
  return runCommand({
    entity: "AdminTaskDevMeta",
    command: "update",
    body: {
      severity: rawBody.severity ?? existingDevMeta.severity,
      environment: rawBody.environment ?? existingDevMeta.environment ?? "",
      stepsToRepro: rawBody.stepsToRepro ?? existingDevMeta.stepsToRepro ?? "",
      expectedResult:
        rawBody.expectedResult ?? existingDevMeta.expectedResult ?? "",
      actualResult: rawBody.actualResult ?? existingDevMeta.actualResult ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
    instanceId: existingDevMeta.id,
  });
}
