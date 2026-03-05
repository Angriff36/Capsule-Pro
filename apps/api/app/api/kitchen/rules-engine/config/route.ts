/**
 * Kitchen Rules Engine Configuration Endpoint
 *
 * Manages rules engine configuration.
 */

import { getRulesEngine } from "@repo/manifest-adapters/rules-engine";
import { type NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins/managers can view config
    if (!(user.roles?.includes("admin") || user.roles?.includes("manager"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const engine = getRulesEngine();
    const config = engine.getConfig();

    return NextResponse.json({
      success: true,
      config,
      cacheStats: engine.getCacheStats(),
    });
  } catch (error) {
    console.error("Rules engine config error:", error);
    return NextResponse.json(
      {
        error: "Failed to get rules engine config",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can modify config
    if (!user.roles?.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, defaultSeverity, allowOverrides, enableCache, cacheTtl } =
      body;

    const engine = getRulesEngine();
    engine.configure({
      enabled,
      defaultSeverity,
      allowOverrides,
      enableCache,
      cacheTtl,
    });

    const newConfig = engine.getConfig();

    return NextResponse.json({
      success: true,
      config: newConfig,
      message: "Rules engine configuration updated",
    });
  } catch (error) {
    console.error("Rules engine config update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update rules engine config",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can clear cache
    if (!user.roles?.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const engine = getRulesEngine();
    engine.clearCache();

    return NextResponse.json({
      success: true,
      message: "Rules engine cache cleared",
    });
  } catch (error) {
    console.error("Rules engine cache clear error:", error);
    return NextResponse.json(
      {
        error: "Failed to clear rules engine cache",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
