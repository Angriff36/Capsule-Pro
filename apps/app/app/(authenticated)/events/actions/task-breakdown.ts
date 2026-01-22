"use server";

import { database, Prisma } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";

export type TaskSection = "prep" | "setup" | "cleanup";

export interface TaskBreakdownItem {
  id: string;
  name: string;
  description?: string;
  section: TaskSection;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  relativeTime?: string;
  assignment?: string;
  ingredients?: string[];
  steps?: string[];
  isCritical: boolean;
  dueInHours?: number;
  historicalContext?: string;
  confidence?: number;
}

export interface TaskBreakdown {
  prep: TaskBreakdownItem[];
  setup: TaskBreakdownItem[];
  cleanup: TaskBreakdownItem[];
  totalPrepTime: number;
  totalSetupTime: number;
  totalCleanupTime: number;
  guestCount: number;
  eventDate: Date;
  generatedAt: Date;
  historicalEventCount?: number;
  disclaimer?: string;
}

export interface GenerateTaskBreakdownParams {
  eventId: string;
  customInstructions?: string;
}

export async function generateTaskBreakdown({
  eventId,
  customInstructions,
}: GenerateTaskBreakdownParams): Promise<TaskBreakdown> {
  const tenantId = await requireTenantId();

  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const similarEvents = await database.$queryRaw<
    { id: string; title: string; event_date: Date; guest_count: number }[]
  >(
    Prisma.sql`
      SELECT id, title, event_date, guest_count
      FROM tenant_events.events
      WHERE tenant_id = ${tenantId}
        AND id != ${eventId}
        AND deleted_at IS NULL
        AND event_type = ${event.eventType}
        AND ABS(guest_count - ${event.guestCount}) <= 10
      ORDER BY event_date DESC
      LIMIT 5
    `
  );

  const historicalContext =
    similarEvents.length > 0
      ? `Based on ${similarEvents.length} similar events`
      : undefined;

  const tasks = generateTasksFromAI(event, customInstructions, similarEvents);

  const totalPrepTime = tasks.prep.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );
  const totalSetupTime = tasks.setup.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );
  const totalCleanupTime = tasks.cleanup.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );

  return {
    ...tasks,
    totalPrepTime,
    totalSetupTime,
    totalCleanupTime,
    guestCount: event.guestCount,
    eventDate: event.eventDate,
    generatedAt: new Date(),
    historicalEventCount: similarEvents.length || undefined,
    disclaimer:
      similarEvents.length === 0
        ? "Generated from event details (no historical data available)"
        : undefined,
  };
}

function generateTasksFromAI(
  event: {
    id: string;
    title: string;
    eventType: string;
    eventDate: Date;
    guestCount: number;
    venueName?: string | null;
    venueAddress?: string | null;
    notes?: string | null;
    tags?: string[];
  },
  customInstructions?: string,
  similarEvents?: {
    id: string;
    title: string;
    event_date: Date;
    guest_count: number;
  }[]
): {
  prep: TaskBreakdownItem[];
  setup: TaskBreakdownItem[];
  cleanup: TaskBreakdownItem[];
} {
  const guestCount = event.guestCount;
  const eventDate = new Date(event.eventDate);

  const scaleFactor = guestCount / 25;

  const getPrepTasks = (): TaskBreakdownItem[] => {
    const tasks: TaskBreakdownItem[] = [];

    tasks.push({
      id: `prep-1-${Date.now()}`,
      name: "Review event details and menu",
      description: "Finalize menu items, guest count, and special requirements",
      section: "prep",
      durationMinutes: Math.round(30 * Math.min(scaleFactor, 2)),
      relativeTime: "48 hours before event",
      isCritical: false,
      confidence: 0.95,
    });

    if (guestCount >= 10) {
      tasks.push({
        id: `prep-2-${Date.now()}`,
        name: "Create shopping list",
        description: "Generate and review ingredient list based on menu",
        section: "prep",
        durationMinutes: Math.round(45 * Math.min(scaleFactor, 2)),
        relativeTime: "48 hours before event",
        isCritical: false,
        ingredients: generateIngredientList(guestCount),
        confidence: 0.9,
      });
    }

    tasks.push({
      id: `prep-3-${Date.now()}`,
      name: "Order special ingredients",
      description: "Place orders for items requiring advance procurement",
      section: "prep",
      durationMinutes: 20,
      relativeTime: "72 hours before event",
      isCritical: true,
      dueInHours: 72,
      confidence: 0.95,
    });

    if (guestCount >= 25) {
      tasks.push({
        id: `prep-4-${Date.now()}`,
        name: "Defrost proteins",
        description: "Begin defrosting frozen proteins and key ingredients",
        section: "prep",
        durationMinutes: 15,
        relativeTime: "24 hours before event",
        isCritical: true,
        dueInHours: 24,
        confidence: 0.9,
      });
    }

    tasks.push({
      id: `prep-5-${Date.now()}`,
      name: "Prep sauces and marinades",
      description:
        "Prepare bases, sauces, and marinades that benefit from resting",
      section: "prep",
      durationMinutes: Math.round(60 * Math.min(scaleFactor, 1.5)),
      relativeTime: "12 hours before event",
      isCritical: false,
      confidence: 0.85,
    });

    tasks.push({
      id: `prep-6-${Date.now()}`,
      name: "Chop vegetables and mise en place",
      description: "Complete all vegetable prep and station setup",
      section: "prep",
      durationMinutes: Math.round(90 * Math.min(scaleFactor, 1.5)),
      relativeTime: "6 hours before event",
      isCritical: false,
      steps: [
        "Wash and sanitize all produce",
        "Chop vegetables according to recipe specifications",
        "Portion and label all prep items",
        "Set up work stations",
      ],
      confidence: 0.9,
    });

    if (guestCount >= 50) {
      tasks.push({
        id: `prep-7-${Date.now()}`,
        name: "Prepare make-ahead dishes",
        description: "Complete items that can be prepared in advance",
        section: "prep",
        durationMinutes: Math.round(120 * scaleFactor),
        relativeTime: "24 hours before event",
        isCritical: false,
        confidence: 0.8,
      });
    }

    return tasks;
  };

  const getSetupTasks = (): TaskBreakdownItem[] => {
    const tasks: TaskBreakdownItem[] = [];

    tasks.push({
      id: `setup-1-${Date.now()}`,
      name: "Transport equipment to venue",
      description: "Load and transport all cooking equipment and supplies",
      section: "setup",
      durationMinutes: Math.round(45 * Math.min(scaleFactor, 1.5)),
      relativeTime: "4 hours before event",
      isCritical: false,
      confidence: 0.95,
    });

    tasks.push({
      id: `setup-2-${Date.now()}`,
      name: "Set up cooking stations",
      description: "Configure cooking equipment and work areas",
      section: "setup",
      durationMinutes: Math.round(60 * Math.min(scaleFactor, 1.5)),
      relativeTime: "3 hours before event",
      isCritical: false,
      confidence: 0.9,
    });

    tasks.push({
      id: `setup-3-${Date.now()}`,
      name: "Set up serving stations",
      description:
        "Arrange chafing dishes, serving utensils, and display areas",
      section: "setup",
      durationMinutes: Math.round(45 * Math.min(scaleFactor, 1.5)),
      relativeTime: "2 hours before event",
      isCritical: false,
      confidence: 0.9,
    });

    tasks.push({
      id: `setup-4-${Date.now()}`,
      name: "Final food prep and plating setup",
      description: "Complete final prep and arrange plating stations",
      section: "setup",
      durationMinutes: Math.round(60 * scaleFactor),
      relativeTime: "1 hour before event",
      isCritical: true,
      confidence: 0.85,
    });

    tasks.push({
      id: `setup-5-${Date.now()}`,
      name: "Team briefing",
      description: "Review timeline, assignments, and special requirements",
      section: "setup",
      durationMinutes: 15,
      relativeTime: "30 minutes before event",
      isCritical: false,
      confidence: 0.95,
    });

    return tasks;
  };

  const getCleanupTasks = (): TaskBreakdownItem[] => {
    const tasks: TaskBreakdownItem[] = [];

    tasks.push({
      id: `cleanup-1-${Date.now()}`,
      name: "Initial breakdown of serving stations",
      description: "Remove empty containers and organize service ware",
      section: "cleanup",
      durationMinutes: Math.round(30 * Math.min(scaleFactor, 1.5)),
      relativeTime: "During service",
      isCritical: false,
      confidence: 0.9,
    });

    tasks.push({
      id: `cleanup-2-${Date.now()}`,
      name: "Pack remaining food",
      description: "Properly store and package leftover food for client",
      section: "cleanup",
      durationMinutes: Math.round(30 * Math.min(scaleFactor, 1.5)),
      relativeTime: "During service",
      isCritical: false,
      confidence: 0.9,
    });

    tasks.push({
      id: `cleanup-3-${Date.now()}`,
      name: "Clean cooking equipment",
      description: "Wash, sanitize, and store all cooking equipment",
      section: "cleanup",
      durationMinutes: Math.round(60 * scaleFactor),
      relativeTime: "After service",
      isCritical: false,
      confidence: 0.9,
    });

    tasks.push({
      id: `cleanup-4-${Date.now()}`,
      name: "Clean serving equipment",
      description: "Wash and sanitize all serving dishes and utensils",
      section: "cleanup",
      durationMinutes: Math.round(45 * scaleFactor),
      relativeTime: "After service",
      isCritical: false,
      confidence: 0.9,
    });

    tasks.push({
      id: `cleanup-5-${Date.now()}`,
      name: "Transport equipment back",
      description: "Load and transport all equipment to home base",
      section: "cleanup",
      durationMinutes: Math.round(45 * Math.min(scaleFactor, 1.5)),
      relativeTime: "After service",
      isCritical: false,
      confidence: 0.95,
    });

    tasks.push({
      id: `cleanup-6-${Date.now()}`,
      name: "Final kitchen clean",
      description: "Complete final cleaning and organize storage",
      section: "cleanup",
      durationMinutes: Math.round(30 * scaleFactor),
      relativeTime: "After returning",
      isCritical: false,
      confidence: 0.9,
    });

    return tasks;
  };

  return {
    prep: getPrepTasks(),
    setup: getSetupTasks(),
    cleanup: getCleanupTasks(),
  };
}

function generateIngredientList(guestCount: number): string[] {
  const baseList = [
    `${Math.round(0.4 * guestCount)} lbs protein (chicken/beef/fish)`,
    `${Math.round(0.5 * guestCount)} lbs vegetables`,
    `${Math.round(0.3 * guestCount)} lbs starches`,
    `${guestCount * 0.5} cups sauces and marinades`,
    `${guestCount * 0.2} lbs cheese and dairy`,
    `${guestCount * 0.1} bunches fresh herbs`,
    `${Math.ceil(guestCount / 10)} loaves bread/crackers`,
    `${guestCount * 0.05} gallons beverages`,
  ];

  return baseList;
}

export async function saveTaskBreakdown(
  eventId: string,
  breakdown: TaskBreakdown
): Promise<void> {
  const tenantId = await requireTenantId();

  const allTasks = [
    ...breakdown.prep.map((t) => ({ ...t, taskType: "prep" as const })),
    ...breakdown.setup.map((t) => ({ ...t, taskType: "setup" as const })),
    ...breakdown.cleanup.map((t) => ({ ...t, taskType: "cleanup" as const })),
  ];

  const locationResult = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM tenant.locations
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `
  );

  const locationId =
    locationResult[0]?.id ?? "00000000-0000-0000-0000-000000000000";

  for (const task of allTasks) {
    const eventDate = new Date(breakdown.eventDate);
    const startByDate = new Date(eventDate);
    const dueByDate = new Date(eventDate);

    if (task.relativeTime?.includes("hours before")) {
      const hoursBefore = Number.parseInt(
        task.relativeTime.match(/\d+/)?.[0] || "0"
      );
      dueByDate.setHours(dueByDate.getHours() - hoursBefore);
    } else if (task.relativeTime?.includes("before event")) {
      if (task.relativeTime.includes("72")) {
        startByDate.setDate(startByDate.getDate() - 3);
        dueByDate.setDate(dueByDate.getDate() - 2);
      } else if (task.relativeTime.includes("48")) {
        startByDate.setDate(startByDate.getDate() - 2);
        dueByDate.setDate(dueByDate.getDate() - 2);
      } else if (task.relativeTime.includes("24")) {
        startByDate.setDate(startByDate.getDate() - 1);
        dueByDate.setDate(dueByDate.getDate() - 1);
      } else if (task.relativeTime.includes("12")) {
        dueByDate.setHours(dueByDate.getHours() - 12);
      } else if (task.relativeTime.includes("6")) {
        dueByDate.setHours(dueByDate.getHours() - 6);
      }
    }

    await database.prepTask.create({
      data: {
        tenantId,
        id: task.id,
        eventId,
        locationId,
        taskType:
          task.section === "prep"
            ? "prep"
            : task.section === "setup"
              ? "setup"
              : "cleanup",
        name: task.name,
        quantityTotal: breakdown.guestCount,
        servingsTotal: breakdown.guestCount,
        startByDate,
        dueByDate,
        estimatedMinutes: task.durationMinutes,
        status: "pending",
        priority: task.isCritical ? 8 : 5,
        notes: task.description,
      },
    });
  }
}
