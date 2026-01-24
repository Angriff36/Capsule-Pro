/**
 * Client Interactions (Communication Log) API Endpoints
 *
 * GET  /api/crm/clients/[id]/interactions - Get client communication timeline
 * POST /api/crm/clients/[id]/interactions - Log a new interaction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../validation");
/**
 * GET /api/crm/clients/[id]/interactions
 * Get communication timeline for a client
 */
async function GET(request, { params }) {
  try {
    const { id } = await params;
    (0, invariant_1.invariant)(id, "params.id must exist");
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { searchParams } = new URL(request.url);
    // Pagination
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    // Verify client exists
    const client = await database_1.database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!client) {
      return server_2.NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    // Get interactions (joined with employee data for display)
    const interactions = await database_1.database.clientInteraction.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ interactionDate: "desc" }],
      take: limit,
      skip: offset,
    });
    // Get total count
    const totalCount = await database_1.database.clientInteraction.count({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
    });
    return server_2.NextResponse.json({
      data: interactions,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error listing client interactions:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/crm/clients/[id]/interactions
 * Log a new interaction with a client
 */
async function POST(request, { params }) {
  try {
    const { id } = await params;
    (0, invariant_1.invariant)(id, "params.id must exist");
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const body = await request.json();
    // Validate request body
    (0, validation_1.validateCreateClientInteractionRequest)(body);
    const data = body;
    // Verify client exists
    const client = await database_1.database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!client) {
      return server_2.NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    // Get current user (employee) ID
    // For now, we'll need to look up the employee from the user
    const employee = await database_1.database.user.findFirst({
      where: {
        AND: [{ tenantId }, { deletedAt: null }],
      },
    });
    if (!employee) {
      return server_2.NextResponse.json(
        { message: "User record not found for current user" },
        { status: 400 }
      );
    }
    // Create interaction
    const interaction = await database_1.database.clientInteraction.create({
      data: {
        tenantId,
        clientId: id,
        employeeId: employee.id,
        interactionType: data.interactionType.trim(),
        subject: data.subject?.trim() || null,
        description: data.description?.trim() || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });
    return server_2.NextResponse.json({ data: interaction }, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating client interaction:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
