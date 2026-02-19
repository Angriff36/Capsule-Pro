/**
 * Outbound Webhooks API
 *
 * GET  /api/integrations/webhooks - List webhooks
 * POST /api/integrations/webhooks - Create webhook
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

interface CreateWebhookRequest {
  name: string;
  url: string;
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

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const entityType = searchParams.get("entityType");

    // Build where clause
    const where: Prisma.OutboundWebhookWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (status && VALID_STATUSES.includes(status as WebhookStatus)) {
      where.status = status as WebhookStatus;
    }

    const webhooks = await database.outboundWebhook.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Filter by entity type if specified (can't do in SQL since it's an array)
    let filteredWebhooks = webhooks;
    if (entityType && VALID_ENTITY_TYPES.includes(entityType)) {
      filteredWebhooks = webhooks.filter((w) => {
        const filters = w.entityFilters as string[];
        return !filters || filters.length === 0 || filters.includes(entityType);
      });
    }

    // Mask secrets in response
    const sanitizedWebhooks = filteredWebhooks.map((webhook) => ({
      ...webhook,
      secret: webhook.secret ? "***" : null,
      apiKey: webhook.apiKey ? "***" : null,
    }));

    return NextResponse.json({ webhooks: sanitizedWebhooks });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body: CreateWebhookRequest = await request.json();

    // Validate required fields
    if (!(body.name && body.url)) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    // Validate URL
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

    // Validate event types
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

    // Validate entity types
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

    const webhook = await database.outboundWebhook.create({
      data: {
        tenantId,
        name: body.name,
        url: body.url,
        secret: body.secret || null,
        apiKey: body.apiKey || null,
        eventTypeFilters: body.eventTypeFilters || [],
        entityFilters: body.entityFilters || [],
        status: body.status || "active",
        retryCount: body.retryCount ?? 3,
        retryDelayMs: body.retryDelayMs ?? 1000,
        timeoutMs: body.timeoutMs ?? 30_000,
        customHeaders: body.customHeaders || null,
        consecutiveFailures: 0,
      },
    });

    // Mask secrets in response
    const sanitizedWebhook = {
      ...webhook,
      secret: webhook.secret ? "***" : null,
      apiKey: webhook.apiKey ? "***" : null,
    };

    return NextResponse.json({ webhook: sanitizedWebhook }, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
