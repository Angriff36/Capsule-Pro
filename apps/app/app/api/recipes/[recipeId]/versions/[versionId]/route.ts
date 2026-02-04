import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { getRecipeVersionSnapshot } from "../utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string; versionId: string }> }
) {
  try {
    const { recipeId, versionId } = await params;
    invariant(recipeId, "params.recipeId must exist");
    invariant(versionId, "params.versionId must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const snapshot = await getRecipeVersionSnapshot(
      tenantId,
      recipeId,
      versionId
    );

    if (!snapshot) {
      return NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to fetch recipe version:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe version" },
      { status: 500 }
    );
  }
}
