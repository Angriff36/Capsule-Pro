import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireApiManager } from "@/app/lib/auth-roles";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;

    const chartOfAccounts = await database.chartOfAccount.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return manifestSuccessResponse({ chartOfAccounts });
  } catch (error) {
    captureException(error);
    log.error("Error fetching chartOfAccounts:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
