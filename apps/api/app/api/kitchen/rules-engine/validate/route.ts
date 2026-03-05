/**
 * Kitchen Rules Engine Validation Endpoint
 *
 * Validates operations against kitchen business rules.
 */

import type { RuleContext } from "@repo/manifest-adapters/rules-engine";
import { getRulesEngine } from "@repo/manifest-adapters/rules-engine";
import { type NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, entityId, command, params, currentState, relatedData } =
      body;

    if (!(entityType && entityId && command)) {
      return NextResponse.json(
        { error: "Missing required fields: entityType, entityId, command" },
        { status: 400 }
      );
    }

    const engine = getRulesEngine();

    // Build rule context
    const context: RuleContext = {
      tenantId: user.tenantId,
      entity: {
        type: entityType,
        id: entityId,
        state: currentState || {},
      },
      operation: {
        type: command,
        command,
        params: params || {},
      },
      related: relatedData
        ? {
            type: relatedData[0]?.type || "",
            data: relatedData.map((r: any) => r.data || r),
          }
        : undefined,
      user: {
        id: user.id,
        roles: user.roles || [],
      },
      metadata: {},
    };

    // Evaluate all applicable rules
    const result = engine.evaluateAll(context);

    return NextResponse.json({
      success: true,
      allowed: result.allowed,
      hasWarnings: result.hasWarnings,
      hasErrors: result.hasErrors,
      message: result.message,
      results: result.results,
    });
  } catch (error) {
    console.error("Rules engine validation error:", error);
    return NextResponse.json(
      {
        error: "Rules engine validation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const engine = getRulesEngine();

    // Return all rule sets
    const ruleSets = engine.getAllRuleSets().map((rs) => ({
      id: rs.id,
      name: rs.name,
      description: rs.description,
      domain: rs.domain,
      priority: rs.priority,
      ruleCount: rs.rules.size,
      rules: Array.from(rs.rules.values()).map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.type,
        severity: rule.severity,
        enabled: rule.enabled,
        overridable: rule.overridable,
        appliesTo: rule.appliesTo,
        tags: rule.tags,
      })),
    }));

    return NextResponse.json({
      success: true,
      ruleSets,
      config: engine.getConfig(),
    });
  } catch (error) {
    console.error("Rules engine list error:", error);
    return NextResponse.json(
      {
        error: "Failed to list rule sets",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
