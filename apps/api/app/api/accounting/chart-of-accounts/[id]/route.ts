import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireApiManager } from "@/app/lib/auth-roles";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;

    const { id } = await params;

    const chartOfAccount = await database.chartOfAccount.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!chartOfAccount) {
      return manifestErrorResponse("ChartOfAccount not found", 404);
    }

    return manifestSuccessResponse({ chartOfAccount });
  } catch (error) {
    captureException(error);
    log.error("Error fetching chartOfAccount:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
