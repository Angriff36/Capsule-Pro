"use server";

import { auth } from "@repo/auth/server";
import {
  eventBudgetCreate,
  eventContractCreate,
  eventDishCreate,
  eventStaffCreate,
  eventUpdate,
  listClients,
  listDishes,
  listEventBudgets,
  listEventContracts,
  listEventDishes,
  listEvents,
  listEventStaffs,
  listStaffMembers,
  listPrepLists,
  prepListCreate,
} from "@/app/lib/manifest-client.generated";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg } from "../../../lib/tenant";

export interface SetupEventStepResult {
  completed: boolean;
  detail: string;
  error?: string;
  skipped: boolean;
}

export interface SetupEventCompletelyResult {
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
  success: boolean;
}

export async function setupEventCompletely(
  eventId: string
): Promise<SetupEventCompletelyResult> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");
  await getTenantIdForOrg(orgId);

  const event = (await listEvents()).data.find((entry) => entry.id === eventId && !entry.deletedAt);
  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const result: SetupEventCompletelyResult = {
    success: true,
    eventName: event.title ?? "Event",
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

  try {
    if (event.clientId) {
      result.steps.clientAssigned = {
        completed: true,
        skipped: true,
        detail: "Client already assigned",
      };
    } else {
      const client = (await listClients()).data.find((entry) => !entry.deletedAt);
      if (!client) {
        throw new Error("No clients available in CRM — create one first");
      }
      await eventUpdate({ id: eventId, clientId: client.id });
      result.steps.clientAssigned = {
        completed: true,
        skipped: false,
        detail: `Assigned client: ${client.companyName ?? client.id}`,
      };
    }
  } catch (error) {
    result.steps.clientAssigned = {
      completed: false,
      skipped: false,
      detail: "Failed to assign client",
      error: error instanceof Error ? error.message : String(error),
    };
    result.success = false;
  }

  try {
    if (event.venueName) {
      result.steps.venueVerified = {
        completed: true,
        skipped: true,
        detail: `Venue: ${event.venueName}`,
      };
    } else {
      const fallbackVenueName = `${event.title ?? "Event"} Venue`;
      await eventUpdate({ id: eventId, venueName: fallbackVenueName });
      result.steps.venueVerified = {
        completed: true,
        skipped: false,
        detail: `Set venue placeholder: "${fallbackVenueName}"`,
      };
    }
  } catch (error) {
    result.steps.venueVerified = {
      completed: false,
      skipped: false,
      detail: "Failed to set venue",
      error: error instanceof Error ? error.message : String(error),
    };
    result.success = false;
  }

  try {
    const existingDishes = (await listEventDishes()).data.filter(
      (entry) => entry.eventId === eventId && !entry.deletedAt
    );
    if (existingDishes.length > 0) {
      result.steps.dishesAdded = {
        completed: true,
        skipped: true,
        detail: `${existingDishes.length} dish(es) already configured`,
      };
    } else {
      const dishes = (await listDishes()).data.filter((dish) => !dish.deletedAt && dish.isActive).slice(0, 3);
      if (dishes.length === 0) {
        throw new Error("No dishes available in kitchen — create at least one dish first");
      }
      for (const dish of dishes) {
        await eventDishCreate({
          eventId,
          dishId: dish.id,
          quantityServings: 1,
          course: "",
          specialInstructions: "",
        });
      }
      result.steps.dishesAdded = {
        completed: true,
        skipped: false,
        detail: `Added ${dishes.length} dish(es): ${dishes.map((dish) => dish.name ?? dish.id).join(", ")}`,
      };
    }
  } catch (error) {
    result.steps.dishesAdded = {
      completed: false,
      skipped: false,
      detail: "Failed to add dishes",
      error: error instanceof Error ? error.message : String(error),
    };
    result.success = false;
  }

  try {
    const existingStaff = (await listEventStaffs()).data.filter(
      (entry) => entry.eventId === eventId && !entry.deletedAt
    );
    if (existingStaff.length > 0) {
      result.steps.staffAssigned = {
        completed: true,
        skipped: true,
        detail: `${existingStaff.length} staff already assigned`,
      };
    } else {
      const staffMembers = (await listStaffMembers()).data
        .filter((member) => !member.deletedAt)
        .slice(0, 2);
      if (staffMembers.length === 0) {
        throw new Error("No active employees available — add staff first");
      }
      for (const staffMember of staffMembers) {
        await eventStaffCreate({
          eventId,
          staffMemberId: staffMember.id,
          role: "staff",
          shiftStart: event.eventDate ?? new Date().toISOString(),
          shiftEnd: event.eventDate ?? new Date().toISOString(),
          notes: "",
        });
      }
      result.steps.staffAssigned = {
        completed: true,
        skipped: false,
        detail: `Assigned ${staffMembers.length} staff`,
      };
    }
  } catch (error) {
    result.steps.staffAssigned = {
      completed: false,
      skipped: false,
      detail: "Failed to assign staff",
      error: error instanceof Error ? error.message : String(error),
    };
    result.success = false;
  }

  try {
    const prepList = (await listPrepLists()).data.find(
      (entry) => entry.eventId === eventId && !entry.deletedAt
    );
    if (prepList) {
      result.steps.prepListGenerated = {
        completed: true,
        skipped: true,
        detail: "Prep list already exists",
      };
    } else {
      await prepListCreate({
        eventId,
        name: `${event.title ?? "Event"} - Prep List`,
        batchMultiplier: 1,
        totalItems: 0,
        totalEstimatedTime: 0,
        notes: "Auto-created by setup flow",
      });
      result.steps.prepListGenerated = {
        completed: true,
        skipped: false,
        detail: "Prep list record created (draft)",
      };
    }
  } catch (error) {
    result.steps.prepListGenerated = {
      completed: false,
      skipped: false,
      detail: "Failed to create prep list",
      error: error instanceof Error ? error.message : String(error),
    };
    result.success = false;
  }

  try {
    const contract = (await listEventContracts()).data.find(
      (entry) => entry.eventId === eventId && !entry.deletedAt
    );
    if (contract) {
      result.steps.contractCreated = {
        completed: true,
        skipped: true,
        detail: "Contract already exists",
      };
    } else {
      await eventContractCreate({
        eventId,
        clientId: event.clientId ?? "",
        contractNumber: `${eventId.slice(0, 8).toUpperCase()}-001`,
        title: `${event.title ?? "Event"} - Standard Catering Agreement`,
        documentUrl: "",
        documentType: "draft",
        notes: "Auto-created during setup",
      });
      result.steps.contractCreated = {
        completed: true,
        skipped: false,
        detail: "Draft contract created",
      };
    }
  } catch (error) {
    result.steps.contractCreated = {
      completed: false,
      skipped: false,
      detail: "Failed to create contract",
      error: error instanceof Error ? error.message : String(error),
    };
    result.success = false;
  }

  try {
    const budget = (await listEventBudgets()).data.find(
      (entry) => entry.eventId === eventId && !entry.deletedAt
    );
    if (budget) {
      result.steps.budgetCreated = {
        completed: true,
        skipped: true,
        detail: "Budget already exists",
      };
    } else {
      await eventBudgetCreate({
        eventId,
        totalBudgetAmount: 0,
        notes: "Auto-created during setup",
      });
      result.steps.budgetCreated = {
        completed: true,
        skipped: false,
        detail: "Draft budget created (empty)",
      };
    }
  } catch (error) {
    result.steps.budgetCreated = {
      completed: false,
      skipped: false,
      detail: "Failed to create budget",
      error: error instanceof Error ? error.message : String(error),
    };
    result.success = false;
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return result;
}
