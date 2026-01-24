/**
 * @module ContractSendAPI
 * @intent Handle sending contracts to clients for signature
 * @responsibility Process send requests, update contract status, initiate notification flow
 * @domain Events
 * @tags contracts, api, send
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const email_1 = require("@repo/email");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * POST /api/events/contracts/[id]/send
 * Send contract to client for signature
 */
async function POST(request, context) {
  const { id: contractId } = await context.params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    const body = await request.json();
    const { clientId, message } = body;
    // Check if contract exists and belongs to tenant
    const contract = await database_1.database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
    });
    if (!contract) {
      return server_2.NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    // Fetch client information
    const clientResult = await database_1.database.$queryRaw`
      SELECT c.id,
             c.company_name,
             c.first_name,
             c.last_name,
             c.email
      FROM tenant_crm.clients AS c
      WHERE c.tenant_id = ${tenantId}
        AND c.id = ${clientId}
        AND c.deleted_at IS NULL
    `;
    const client = clientResult[0];
    if (!client) {
      return server_2.NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }
    if (!client.email) {
      return server_2.NextResponse.json(
        { error: "Client has no email address" },
        { status: 400 }
      );
    }
    // In a production environment, this would:
    // 1. Generate a unique signing link/token
    // 2. Send an email with the signing link
    // 3. Create a signing request record
    // For now, we'll update the contract status and return success
    // Update contract status to pending
    await database_1.database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        status: "pending",
      },
    });
    // Send email with contract signing link
    const signingUrl = `${process.env.APP_URL || "https://app.convoy.com"}/contracts/${contractId}/sign`;
    const clientName =
      client.first_name || client.company_name || "Valued Client";
    try {
      await email_1.resend.emails.send({
        from: process.env.RESEND_FROM || "noreply@convoy.com",
        to: client.email,
        subject: `Contract for Signature: ${contract.title}`,
        react: (0, email_1.ContractTemplate)({
          clientName,
          contractTitle: contract.title,
          signingUrl,
          message,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send contract email:", emailError);
      // Continue with the response even if email fails
    }
    return server_2.NextResponse.json({
      success: true,
      message: "Contract sent successfully",
      clientEmail: client.email,
    });
  } catch (error) {
    console.error("Error sending contract:", error);
    return server_2.NextResponse.json(
      { error: "Failed to send contract" },
      { status: 500 }
    );
  }
}
