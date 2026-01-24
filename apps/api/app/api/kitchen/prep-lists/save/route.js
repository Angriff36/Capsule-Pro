Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function POST(request) {
  try {
    const body = await request.json();
    const { eventId, prepList } = body;
    if (!(eventId && prepList)) {
      return server_2.NextResponse.json(
        { error: "Event ID and prep list are required" },
        { status: 400 }
      );
    }
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    try {
      for (const station of prepList.stationLists) {
        if (station.ingredients.length === 0) {
          continue;
        }
        for (const task of station.tasks) {
          const existingTask = await database_1.database.$queryRaw(database_1
            .Prisma.sql`
              SELECT id
              FROM tenant_kitchen.prep_tasks
              WHERE tenant_id = ${tenantId}
                AND event_id = ${eventId}
                AND name = ${task.name}
                AND status = 'pending'
                AND deleted_at IS NULL
              LIMIT 1
            `);
          if (existingTask.length > 0) {
            continue;
          }
          const ingredientsJson = JSON.stringify(
            station.ingredients.map((ing) => ({
              name: ing.ingredientName,
              quantity: ing.scaledQuantity,
              unit: ing.scaledUnit,
              notes: ing.preparationNotes,
            }))
          );
          await database_1.database.$executeRaw`
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
              ${station.ingredients.reduce((sum, ing) => sum + ing.scaledQuantity, 0)},
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
      return server_2.NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error saving prep list to production board:", error);
      return server_2.NextResponse.json(
        { error: "Failed to save prep list" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error saving prep list:", error);
    return server_2.NextResponse.json(
      { error: "Failed to save prep list" },
      { status: 500 }
    );
  }
}
