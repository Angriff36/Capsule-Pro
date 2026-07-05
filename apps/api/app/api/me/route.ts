/**
 * GET /api/me — the authenticated actor's employee identity.
 *
 * Client pages need the EMPLOYEE id (not the Clerk id) to fill actor-typed
 * `userId` command params (PurchaseRequisition.submit/approveManager/…).
 * Reads only; identity resolution is the same requireCurrentUser used by the
 * command dispatcher, so the id here always matches the acting identity the
 * runtime records.
 */

import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json({
      id: user.id,
      role: user.role,
      tenantId: user.tenantId,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvariantError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to resolve user" },
      { status: 500 }
    );
  }
}
