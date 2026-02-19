/**
 * Outbound Webhook by ID API
 *
 * GET    /api/integrations/webhooks/[id] - Get webhook
 * PUT    /api/integrations/webhooks/[id] - Update webhook
 * DELETE /api/integrations/webhooks/[id] - Delete webhook (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Valid event types
const VALID_EVENT_TYPES = ["created", "updated", "deleted"] as const;
type WebhookEventType = (typeof VALID_EVENT_TYPES)[number];

// Valid statuses
const VALID_STATUSES = ["active", "inactive", "disabled"] as const;
type WebhookStatus = (typeof VALID_STATUSES)[number];

// Valid entity types
const VALID_ENTITY_TYPES = [
  "event",
  "task",
  "kitchen_task",
  "prep_task",
  "employee",
  "client",
  "proposal",
  "contract",
  "shipment",
  "inventory_item",
  "purchase_order",
];

interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  secret?: string;
  apiKey?: string;
  eventTypeFilters?: WebhookEventType[];
  entityFilters?: string[];
  status?: WebhookStatus;
  retryCount?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  customHeaders?: Record<string, string>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    const webhook = await database.outboundWebhook.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Mask secrets in response
    const sanitizedWebhook = {
      ...webhook,
      secret: webhook.secret ? "***" : null,
      apiKey: webhook.apiKey ? "***" : null,
    };

    return NextResponse.json({ webhook: sanitizedWebhook });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateWebhookRequest = await request.json();

    // Validate URL if provided
    if (body.url) {
      try {
        const url = new URL(body.url);
        if (!url.protocol.startsWith("http")) {
          return NextResponse.json(
            { error: "URL must use HTTP or HTTPS protocol" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    }

    // Validate event types if provided
    if (body.eventTypeFilters) {
      const invalidTypes = body.eventTypeFilters.filter(
        (t) => !VALID_EVENT_TYPES.includes(t)
      );
      if (invalidTypes.length > 0) {
        return NextResponse.json(
          { error: `Invalid event types: ${invalidTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate entity types if provided
    if (body.entityFilters) {
      const invalidEntities = body.entityFilters.filter(
        (e) => !VALID_ENTITY_TYPES.includes(e)
      );
      if (invalidEntities.length > 0) {
        return NextResponse.json(
          { error: `Invalid entity types: ${invalidEntities.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check webhook exists
    const existing = await database.outboundWebhook.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Build update object
    const updateData: Prisma.OutboundWebhookUpdateInput = {};
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.url !== undefined) {
      updateData.url = body.url;
    }
    if (body.secret !== undefined) {
      updateData.secret = body.secret || null;
    }
    if (body.apiKey !== undefined) {
      updateData.apiKey = body.apiKey || null;
    }
    if (body.eventTypeFilters !== undefined) {
      updateData.eventTypeFilters =
        body.eventTypeFilters as unknown as Prisma.InputJsonValue;
    }
    if (body.entityFilters !== undefined) {
      updateData.entityFilters =
        body.entityFilters as unknown as Prisma.InputJsonValue;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.retryCount !== undefined) {
      updateData.retryCount = body.retryCount;
    }
    if (body.retryDelayMs !== undefined) {
      updateData.retryDelayMs = body.retryDelayMs;
    }
    if (body.timeoutMs !== undefined) {
      updateData.timeoutMs = body.timeoutMs;
    }
    if (body.customHeaders !== undefined) {
      updateData.customHeaders =
        body.customHeaders as unknown as Prisma.InputJsonValue;
    }

    const webhook = await database.outboundWebhook.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    // Mask secrets in response
    const sanitizedWebhook = {
      ...webhook,
      secret: webhook.secret ? "***" : null,
      apiKey: webhook.apiKey ? "***" : null,
    };

    return NextResponse.json({ webhook: sanitizedWebhook });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    // Check webhook exists
    const existing = await database.outboundWebhook.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Soft delete
    await database.outboundWebhook.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
