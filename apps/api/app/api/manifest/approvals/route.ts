/**
 * POST /api/manifest/approvals — grant or deny a stage of an IR-declared
 * approval chain (e.g. PurchaseRequisition `procurementChain`).
 *
 * The runtime's approval gate creates a pending `manifest_approval_requests`
 * row when a gated command first runs, but until now NOTHING exposed the
 * engine's approveStage/denyApproval over HTTP — every IR `approval` block
 * was a dead end in the UI. The engine itself evaluates the stage policy
 * against the authenticated approver (server-resolved id/role), so this
 * route adds transport, not authorization.
 *
 * Body: { entity, instanceId, approvalName, stageName, action: "approve" }
 *   or  { entity, instanceId, approvalName, action: "deny", reason }
 */

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

const POLICY_REJECTION_RE = /not authorized|policy/i;

interface ApprovalRequestBody {
  action: "approve" | "deny";
  approvalName: string;
  entity: string;
  instanceId: string;
  reason?: string;
  stageName?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const currentUser = await requireCurrentUser();
    const body = (await request.json()) as ApprovalRequestBody;
    const { entity, instanceId, approvalName, stageName, action, reason } =
      body;
    if (!(entity && instanceId && approvalName && action)) {
      return NextResponse.json(
        {
          success: false,
          error: "entity, instanceId, approvalName and action are required",
        },
        { status: 400 }
      );
    }

    const engine = (await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    })) as unknown as {
      approveStage: (
        entityName: string,
        instanceId: string,
        approvalName: string,
        stageName: string,
        approver: { id: string; role?: string }
      ) => Promise<unknown>;
      denyApproval: (
        entityName: string,
        instanceId: string,
        approvalName: string,
        deniedBy: string,
        reason?: string
      ) => Promise<unknown>;
    };

    if (action === "approve") {
      if (!stageName) {
        return NextResponse.json(
          { success: false, error: "stageName is required to approve" },
          { status: 400 }
        );
      }
      const state = await engine.approveStage(
        entity,
        instanceId,
        approvalName,
        stageName,
        { id: currentUser.id, role: currentUser.role }
      );
      return NextResponse.json({ success: true, state });
    }

    const state = await engine.denyApproval(
      entity,
      instanceId,
      approvalName,
      currentUser.id,
      reason
    );
    return NextResponse.json({ success: true, state });
  } catch (error) {
    if (error instanceof Error && error.name === "InvariantError") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
    // Policy rejections from approveStage surface as plain errors — report
    // them as 403 with the engine's message rather than a generic 500.
    if (error instanceof Error && POLICY_REJECTION_RE.test(error.message)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    captureException(error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Approval action failed",
      },
      { status: 500 }
    );
  }
}
