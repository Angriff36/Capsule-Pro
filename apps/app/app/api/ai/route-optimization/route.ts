import { auth } from "@repo/auth/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  optimizeDeliveryRoutes,
  routeOptimizationRequestSchema,
  toRouteOptimizationRequest,
} from "@/lib/ai/route-optimization";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await requireTenantId();
    const body = await request.json();

    const parsed = routeOptimizationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const normalizedInput = toRouteOptimizationRequest(parsed.data);

    if (normalizedInput.stops.length === 0) {
      return Response.json(
        {
          error: "No valid stops were provided after validation",
        },
        { status: 400 }
      );
    }

    const result = await optimizeDeliveryRoutes(normalizedInput);

    return Response.json({
      tenantId,
      optimizedAt: new Date(),
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return Response.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
