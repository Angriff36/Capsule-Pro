/**
 * @module MarketingAutomationRulesAPI
 * @intent Manage marketing automation rules
 * @responsibility CRUD operations for automation rules
 * @domain Marketing
 * @tags marketing, automation, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface AutomationRuleListFilters {
  triggerType?: string;
  isActive?: boolean;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface CreateAutomationRuleRequest {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: unknown;
  actions: unknown;
  conditions?: unknown;
}

interface UpdateAutomationRuleRequest {
  name?: string;
  description?: string;
  triggerType?: string;
  triggerConfig?: unknown;
  actions?: unknown;
  conditions?: unknown;
  isActive?: boolean;
}

function parseAutomationRuleFilters(searchParams: URLSearchParams): AutomationRuleListFilters {
  const filters: AutomationRuleListFilters = {};

  const triggerType = searchParams.get("triggerType");
  if (triggerType) {
    filters.triggerType = triggerType;
  }

  const isActive = searchParams.get("isActive");
  if (isActive !== null) {
    filters.isActive = isActive === "true";
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  return filters;
}

function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

function validateCreateAutomationRuleRequest(
  body: unknown
): asserts body is CreateAutomationRuleRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
  const b = body as Record<string, unknown>;
  InvariantError(typeof b.name === "string" && b.name.trim().length > 0, "Rule name is required");
  InvariantError(typeof b.triggerType === "string" && b.triggerType.trim().length > 0, "Trigger type is required");
  InvariantError(b.actions && typeof b.actions === "object", "Actions are required");
}

function validateUpdateAutomationRuleRequest(
  body: unknown
): asserts body is UpdateAutomationRuleRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
}

/**
 * GET /api/marketing/automation-rules
 * List automation rules with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const filters = parseAutomationRuleFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    if (filters.triggerType) {
      (whereClause.AND as Record<string, unknown>[]).push({ triggerType: filters.triggerType });
    }

    if (filters.isActive !== undefined) {
      (whereClause.AND as Record<string, unknown>[]).push({ isActive: filters.isActive });
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      (whereClause.AND as Record<string, unknown>[]).push({
        OR: [
          { name: { contains: searchLower, mode: "insensitive" } },
          { description: { contains: searchLower, mode: "insensitive" } },
        ],
      });
    }

    const [rules, total] = await Promise.all([
      database.automationRule.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.automationRule.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      rules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing automation rules:", error);
    return NextResponse.json(
      { message: "Failed to list automation rules", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/automation-rules
 * Create a new automation rule
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    validateCreateAutomationRuleRequest(body);

    const rule = await database.automationRule.create({
      data: {
        ...body,
        tenantId,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating automation rule:", error);
    return NextResponse.json(
      { message: "Failed to create automation rule", error: String(error) },
      { status: 500 }
    );
  }
}
