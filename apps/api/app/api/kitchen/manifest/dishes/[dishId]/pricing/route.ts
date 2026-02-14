import { auth } from "@repo/auth/server";
import {
  createRecipeRuntime,
  updateDishPricing,
} from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  checkBlockingConstraints,
  createDishPricingOutboxEvent,
  createRuntimeContext,
  fetchDishById,
  getCurrentUser,
  loadDishInstance,
  syncDishPricingToDatabase,
  validatePricingUpdate,
} from "../../helpers";

interface RouteContext {
  params: Promise<{ dishId: string }>;
}

/**
 * Update dish pricing using Manifest runtime
 *
 * PATCH /api/kitchen/manifest/dishes/:dishId/pricing
 *
 * This endpoint uses the Manifest runtime for:
 * - Constraint checking (valid price/cost, margin warnings)
 * - Event emission (DishPricingUpdated)
 * - Audit logging
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { dishId } = await context.params;
  const body = await request.json();

  const pricingUpdate = validatePricingUpdate(body);
  if (!pricingUpdate) {
    return NextResponse.json(
      {
        message:
          "Invalid pricing data. Both pricePerPerson and costPerPerson are required and must be non-negative numbers.",
      },
      { status: 400 }
    );
  }

  const authUser = await auth();
  const currentUser = await getCurrentUser(tenantId, authUser.userId ?? "");

  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  const dish = await fetchDishById(tenantId, dishId);
  if (!dish) {
    return NextResponse.json({ message: "Dish not found" }, { status: 404 });
  }

  try {
    const runtimeContext = await createRuntimeContext(
      tenantId,
      currentUser.id,
      currentUser.role
    );
    const runtime = await createRecipeRuntime(runtimeContext);

    await loadDishInstance(runtime, dish);

    const result = await updateDishPricing(
      runtime,
      dishId,
      pricingUpdate.pricePerPerson,
      pricingUpdate.costPerPerson
    );

    const constraintValidation = checkBlockingConstraints(
      result.constraintOutcomes
    );

    if (!constraintValidation.passed) {
      return NextResponse.json(
        {
          message: "Cannot update dish pricing due to constraint violations",
          constraintOutcomes: constraintValidation.blockingConstraints,
        },
        { status: 400 }
      );
    }

    const instance = await runtime.getInstance("Dish", dishId);
    if (instance) {
      await syncDishPricingToDatabase(
        tenantId,
        dishId,
        instance.pricePerPerson as number,
        instance.costPerPerson as number
      );

      await createDishPricingOutboxEvent(
        tenantId,
        dishId,
        instance.name as string,
        instance.pricePerPerson as number,
        instance.costPerPerson as number,
        result.constraintOutcomes,
        result.emittedEvents
      );

      return NextResponse.json(
        {
          dishId,
          name: instance.name,
          pricePerPerson: instance.pricePerPerson,
          costPerPerson: instance.costPerPerson,
          constraintOutcomes: result.constraintOutcomes,
          emittedEvents: result.emittedEvents,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Failed to update dish pricing" },
      { status: 500 }
    );
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      {
        message: "Failed to update dish pricing",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
