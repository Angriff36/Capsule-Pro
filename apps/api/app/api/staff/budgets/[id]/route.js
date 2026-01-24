Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const labor_budget_1 = require("@/lib/staff/labor-budget");
/**
 * GET /api/staff/budgets/[id]
 * Get a single labor budget by ID with current utilization
 */
async function GET(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  try {
    const budget = await (0, labor_budget_1.getLaborBudgetById)(tenantId, id);
    if (!budget) {
      return server_2.NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json({ budget });
  } catch (error) {
    console.error("Error fetching labor budget:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch labor budget" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/staff/budgets/[id]
 * Update a labor budget
 *
 * Optional fields:
 * - name
 * - description
 * - budgetTarget
 * - status
 * - overrideReason
 * - threshold80Pct
 * - threshold90Pct
 * - threshold100Pct
 */
async function PUT(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  const body = await request.json();
  // Validate budget target if provided
  if (body.budgetTarget !== undefined && body.budgetTarget <= 0) {
    return server_2.NextResponse.json(
      { message: "Budget target must be greater than 0" },
      { status: 400 }
    );
  }
  // Validate status if provided
  if (body.status && !["active", "paused", "archived"].includes(body.status)) {
    return server_2.NextResponse.json(
      { message: "Status must be one of: active, paused, archived" },
      { status: 400 }
    );
  }
  try {
    const budget = await (0, labor_budget_1.updateLaborBudget)(tenantId, id, {
      name: body.name,
      description: body.description,
      budgetTarget: body.budgetTarget,
      status: body.status,
      overrideReason: body.overrideReason,
      threshold80Pct: body.threshold80Pct,
      threshold90Pct: body.threshold90Pct,
      threshold100Pct: body.threshold100Pct,
    });
    if (!budget) {
      return server_2.NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json({ budget });
  } catch (error) {
    console.error("Error updating labor budget:", error);
    return server_2.NextResponse.json(
      { message: "Failed to update labor budget" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/staff/budgets/[id]
 * Delete (soft delete) a labor budget
 */
async function DELETE(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  try {
    await (0, labor_budget_1.deleteLaborBudget)(tenantId, id);
    return server_2.NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting labor budget:", error);
    return server_2.NextResponse.json(
      { message: "Failed to delete labor budget" },
      { status: 500 }
    );
  }
}
