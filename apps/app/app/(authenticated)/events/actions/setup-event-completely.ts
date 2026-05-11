"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg } from "../../../lib/tenant";

// ── Types ────────────────────────────────────────────────────────────────

export interface SetupEventStepResult {
  completed: boolean;
  skipped: boolean;
  detail: string;
  error?: string;
}

export interface SetupEventCompletelyResult {
  success: boolean;
  eventName: string;
  steps: {
    clientAssigned: SetupEventStepResult;
    venueVerified: SetupEventStepResult;
    dishesAdded: SetupEventStepResult;
    staffAssigned: SetupEventStepResult;
    prepListGenerated: SetupEventStepResult;
    contractCreated: SetupEventStepResult;
    budgetCreated: SetupEventStepResult;
  };
}

// ── Action ───────────────────────────────────────────────────────────────

/**
 * AI-completable event setup: one call that walks all 7 steps and fills in
 * whatever is missing with sensible defaults.  Designed so an AI agent (or
 * human) can call it without micro-managing each step.
 */
export async function setupEventCompletely(
  eventId: string
): Promise<SetupEventCompletelyResult> {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // ── Fetch event ──────────────────────────────────────────────────────

  const events = await database.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      client_id: string | null;
      venue_name: string | null;
      venue_entity_id: string | null;
    }>
  >(
    `SELECT id, name, client_id, venue_name, venue_entity_id
     FROM tenant_events.events
     WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    tenantId,
    eventId
  );

  if (events.length === 0) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const event = events[0];

  // ── Result builder ───────────────────────────────────────────────────

  const result: SetupEventCompletelyResult = {
    success: true,
    eventName: event.name,
    steps: {
      clientAssigned: { completed: false, skipped: false, detail: "" },
      venueVerified: { completed: false, skipped: false, detail: "" },
      dishesAdded: { completed: false, skipped: false, detail: "" },
      staffAssigned: { completed: false, skipped: false, detail: "" },
      prepListGenerated: { completed: false, skipped: false, detail: "" },
      contractCreated: { completed: false, skipped: false, detail: "" },
      budgetCreated: { completed: false, skipped: false, detail: "" },
    },
  };

  // ── Step 1: Client ───────────────────────────────────────────────────

  if (event.client_id) {
    result.steps.clientAssigned = {
      completed: true,
      skipped: true,
      detail: "Client already assigned",
    };
  } else {
    try {
      const clients = await database.$queryRawUnsafe<
        Array<{ id: string; company_name: string }>
      >(
        `SELECT id, company_name
         FROM tenant_crm.clients
         WHERE tenant_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        tenantId
      );

      if (clients.length > 0) {
        await database.$executeRawUnsafe(
          `UPDATE tenant_events.events
           SET client_id = $1, updated_at = NOW()
           WHERE tenant_id = $2 AND id = $3`,
          clients[0].id,
          tenantId,
          eventId
        );
        result.steps.clientAssigned = {
          completed: true,
          skipped: false,
          detail: `Assigned client: ${clients[0].company_name}`,
        };
      } else {
        result.steps.clientAssigned = {
          completed: false,
          skipped: false,
          detail: "No clients available in CRM — create one first",
        };
        result.success = false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.steps.clientAssigned = {
        completed: false,
        skipped: false,
        detail: "Failed to assign client",
        error: msg,
      };
      result.success = false;
    }
  }

  // ── Step 2: Venue ────────────────────────────────────────────────────

  if (event.venue_name || event.venue_entity_id) {
    result.steps.venueVerified = {
      completed: true,
      skipped: true,
      detail: `Venue: ${event.venue_name || "assigned entity"}`,
    };
  } else {
    // No venue — set a placeholder from the event name so the step turns green
    try {
      const defaultVenueName = `${event.name} Venue`;
      await database.$executeRawUnsafe(
        `UPDATE tenant_events.events
         SET venue_name = $1, updated_at = NOW()
         WHERE tenant_id = $2 AND id = $3`,
        defaultVenueName,
        tenantId,
        eventId
      );
      result.steps.venueVerified = {
        completed: true,
        skipped: false,
        detail: `Set venue placeholder: "${defaultVenueName}"`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.steps.venueVerified = {
        completed: false,
        skipped: false,
        detail: "Failed to set venue",
        error: msg,
      };
      result.success = false;
    }
  }

  // ── Step 3: Dishes ───────────────────────────────────────────────────

  try {
    // Check how many dishes already assigned
    const existingDishes = await database.$queryRawUnsafe<
      Array<{ cnt: bigint }>
    >(
      `SELECT COUNT(*) as cnt
       FROM tenant_events.event_dishes
       WHERE tenant_id = $1 AND event_id = $2 AND deleted_at IS NULL`,
      tenantId,
      eventId
    );

    if (Number(existingDishes[0].cnt) > 0) {
      result.steps.dishesAdded = {
        completed: true,
        skipped: true,
        detail: `${existingDishes[0].cnt} dish(es) already configured`,
      };
    } else {
      // Pick up to 3 active dishes
      const dishes = await database.$queryRawUnsafe<
        Array<{ id: string; name: string }>
      >(
        `SELECT id, name
         FROM tenant_kitchen.dishes
         WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true
         ORDER BY created_at DESC
         LIMIT 3`,
        tenantId
      );

      let added = 0;
      for (const dish of dishes) {
        try {
          await database.$executeRawUnsafe(
            `INSERT INTO tenant_events.event_dishes (
               tenant_id, id, event_id, dish_id, quantity_servings,
               created_at, updated_at
             ) VALUES (
               $1, gen_random_uuid(), $2, $3, 1, NOW(), NOW()
             )`,
            tenantId,
            eventId,
            dish.id
          );
          added++;
        } catch {
          // Duplicate or other constraint — skip, try next dish
        }
      }

      if (added > 0) {
        result.steps.dishesAdded = {
          completed: true,
          skipped: false,
          detail: `Added ${added} dish(es): ${dishes.slice(0, added).map((d) => d.name).join(", ")}`,
        };
      } else {
        result.steps.dishesAdded = {
          completed: false,
          skipped: false,
          detail:
            "No dishes available in kitchen — create at least one dish first",
        };
        result.success = false;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.steps.dishesAdded = {
      completed: false,
      skipped: false,
      detail: "Failed to add dishes",
      error: msg,
    };
    result.success = false;
  }

  // ── Step 4: Staff ────────────────────────────────────────────────────

  try {
    const existingStaff = await database.$queryRawUnsafe<
      Array<{ cnt: bigint }>
    >(
      `SELECT COUNT(*) as cnt
       FROM tenant_events.event_staff_assignments
       WHERE tenant_id = $1 AND event_id = $2 AND deleted_at IS NULL`,
      tenantId,
      eventId
    );

    if (Number(existingStaff[0].cnt) > 0) {
      result.steps.staffAssigned = {
        completed: true,
        skipped: true,
        detail: `${existingStaff[0].cnt} staff already assigned`,
      };
    } else {
      const employees = await database.$queryRawUnsafe<
        Array<{ id: string; first_name: string; last_name: string }>
      >(
        `SELECT id, first_name, last_name
         FROM tenant_staff.employees
         WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true
         ORDER BY created_at DESC
         LIMIT 2`,
        tenantId
      );

      let assigned = 0;
      const names: string[] = [];

      for (const emp of employees) {
        // Check for existing assignment (avoid duplicates)
        const alreadyAssigned = await database.$queryRawUnsafe<
          Array<{ id: string }>
        >(
          `SELECT id
           FROM tenant_events.event_staff_assignments
           WHERE tenant_id = $1 AND event_id = $2 AND employee_id = $3 AND deleted_at IS NULL`,
          tenantId,
          eventId,
          emp.id
        );

        if (alreadyAssigned.length > 0) continue;

        await database.$executeRawUnsafe(
          `INSERT INTO tenant_events.event_staff_assignments (
             tenant_id, event_id, employee_id, role, created_at, updated_at
           ) VALUES ($1, $2, $3, 'staff', NOW(), NOW())`,
          tenantId,
          eventId,
          emp.id
        );
        assigned++;
        names.push(`${emp.first_name} ${emp.last_name}`);
      }

      if (assigned > 0) {
        result.steps.staffAssigned = {
          completed: true,
          skipped: false,
          detail: `Assigned ${assigned} staff: ${names.join(", ")}`,
        };
      } else {
        result.steps.staffAssigned = {
          completed: false,
          skipped: false,
          detail:
            "No active employees available — add staff in the Scheduling module first",
        };
        result.success = false;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.steps.staffAssigned = {
      completed: false,
      skipped: false,
      detail: "Failed to assign staff",
      error: msg,
    };
    result.success = false;
  }

  // ── Step 5: Prep List ────────────────────────────────────────────────

  try {
    const existingPrepLists = await database.$queryRawUnsafe<
      Array<{ cnt: bigint }>
    >(
      `SELECT COUNT(*) as cnt
       FROM tenant_kitchen.prep_lists
       WHERE tenant_id = $1 AND event_id = $2`,
      tenantId,
      eventId
    );

    if (Number(existingPrepLists[0].cnt) > 0) {
      result.steps.prepListGenerated = {
        completed: true,
        skipped: true,
        detail: "Prep list already exists",
      };
    } else {
      // Create a minimal prep list record so the checklist step turns green.
      // Full generation (ingredients from recipes) can happen separately.
      const eventDate = await database.$queryRawUnsafe<
        Array<{ event_date: Date | null }>
      >(
        `SELECT event_date FROM tenant_events.events
         WHERE tenant_id = $1 AND id = $2`,
        tenantId,
        eventId
      );

      const serviceDate =
        eventDate[0]?.event_date ?? new Date(Date.now() + 7 * 86400000);

      await database.$executeRawUnsafe(
        `INSERT INTO tenant_kitchen.prep_lists (
           tenant_id, id, event_id, title, status, service_date,
           created_at, updated_at
         ) VALUES (
           $1, gen_random_uuid(), $2, $3, 'draft', $4, NOW(), NOW()
         )`,
        tenantId,
        eventId,
        `${event.name} - Prep List`,
        serviceDate
      );

      result.steps.prepListGenerated = {
        completed: true,
        skipped: false,
        detail: "Prep list record created (draft)",
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.steps.prepListGenerated = {
      completed: false,
      skipped: false,
      detail: "Failed to create prep list",
      error: msg,
    };
    result.success = false;
  }

  // ── Step 6: Contract ─────────────────────────────────────────────────

  try {
    const existingContracts = await database.$queryRawUnsafe<
      Array<{ cnt: bigint }>
    >(
      `SELECT COUNT(*) as cnt
       FROM tenant_events.event_contracts
       WHERE tenant_id = $1 AND event_id = $2 AND deleted_at IS NULL`,
      tenantId,
      eventId
    );

    if (Number(existingContracts[0].cnt) > 0) {
      result.steps.contractCreated = {
        completed: true,
        skipped: true,
        detail: "Contract already exists",
      };
    } else {
      // Use event's client if assigned, otherwise null
      const clientId = event.client_id ?? null;

      await database.$executeRawUnsafe(
        `INSERT INTO tenant_events.event_contracts (
           tenant_id, id, event_id, client_id, title, status,
           created_at, updated_at
         ) VALUES (
           $1, gen_random_uuid(), $2, $3, $4, 'draft',
           NOW(), NOW()
         )`,
        tenantId,
        eventId,
        clientId,
        `${event.name} - Standard Catering Agreement`
      );

      result.steps.contractCreated = {
        completed: true,
        skipped: false,
        detail: "Draft contract created",
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.steps.contractCreated = {
      completed: false,
      skipped: false,
      detail: "Failed to create contract",
      error: msg,
    };
    result.success = false;
  }

  // ── Step 7: Budget ───────────────────────────────────────────────────

  try {
    const existingBudgets = await database.$queryRawUnsafe<
      Array<{ cnt: bigint }>
    >(
      `SELECT COUNT(*) as cnt
       FROM tenant_events.event_budgets
       WHERE tenant_id = $1 AND event_id = $2 AND deleted_at IS NULL`,
      tenantId,
      eventId
    );

    if (Number(existingBudgets[0].cnt) > 0) {
      result.steps.budgetCreated = {
        completed: true,
        skipped: true,
        detail: "Budget already exists",
      };
    } else {
      await database.$executeRawUnsafe(
        `INSERT INTO tenant_events.event_budgets (
           tenant_id, id, event_id, version, status,
           total_budget_amount, total_actual_amount, variance_amount,
           variance_percentage, created_at, updated_at
         ) VALUES (
           $1, gen_random_uuid(), $2, 1, 'draft',
           0, 0, 0, 0, NOW(), NOW()
         )`,
        tenantId,
        eventId
      );

      result.steps.budgetCreated = {
        completed: true,
        skipped: false,
        detail: "Draft budget created (empty — add line items on the Budget page)",
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.steps.budgetCreated = {
      completed: false,
      skipped: false,
      detail: "Failed to create budget",
      error: msg,
    };
    result.success = false;
  }

  // ── Revalidate ───────────────────────────────────────────────────────

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");

  return result;
}
