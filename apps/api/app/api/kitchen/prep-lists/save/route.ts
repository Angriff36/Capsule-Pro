import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, prepList } = body;

    if (!(eventId && prepList)) {
      return NextResponse.json(
        { error: "Event ID and prep list are required" },
        { status: 400 }
      );
    }

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    try {
      for (const station of prepList.stationLists) {
        if (station.ingredients.length === 0) {
          continue;
        }

        for (const task of station.tasks) {
          const existingTask = await database.$queryRaw<Array<{ id: string }>>(
            Prisma.sql`
              SELECT id
              FROM tenant_kitchen.prep_tasks
              WHERE tenant_id = ${tenantId}
                AND event_id = ${eventId}
                AND name = ${task.name}
                AND status = 'pending'
                AND deleted_at IS NULL
              LIMIT 1
            `
          );

          if (existingTask.length > 0) {
            continue;
          }

          const ingredientsJson = JSON.stringify(
            station.ingredients.map((ing: any) => ({
              name: ing.ingredientName,
              quantity: ing.scaledQuantity,
              unit: ing.scaledUnit,
              notes: ing.preparationNotes,
            }))
          );

          await database.$executeRaw`
            INSERT INTO tenant_kitchen.prep_tasks (
              tenant_id,
              event_id,
              task_type,
              name,
              quantity_total,
              quantity_unit_id,
              quantity_completed,
              servings_total,
              start_by_date,
              due_by_date,
              status,
              priority,
              notes,
              created_at,
              updated_at
            ) VALUES (
              ${tenantId},
              ${eventId},
              'prep',
              ${task.name},
              ${station.ingredients.reduce((sum: number, ing: any) => sum + ing.scaledQuantity, 0)},
              1,
              0,
              ${prepList.guestCount},
              ${new Date(task.dueDate).toISOString().split("T")[0]},
              ${new Date(task.dueDate).toISOString().split("T")[0]},
              'pending',
              ${task.priority},
              ${ingredientsJson},
              ${new Date()},
              ${new Date()}
            )
          `;
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error saving prep list to production board:", error);
      return NextResponse.json(
        { error: "Failed to save prep list" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error saving prep list:", error);
    return NextResponse.json(
      { error: "Failed to save prep list" },
      { status: 500 }
    );
  }
}