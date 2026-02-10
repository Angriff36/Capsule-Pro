/**
 * @module EventServerToServerImport
 * @intent Import events from external systems via direct API
 * @responsibility Provide server-to-server event import endpoint
 * @domain Events
 * @tags events, import, api
 * @canonical true
 */

import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { z } from "zod";

/**
 * Schema for menu item in import request
 */
const MenuItemSchema = z.object({
  name: z.string().min(1, "Menu item name is required"),
  quantity: z.number().positive("Quantity must be positive").optional(),
  unit: z.string().optional(),
  servings: z.number().positive("Servings must be positive").optional(),
  specialInstructions: z.string().optional(),
  category: z.string().optional(),
  course: z.string().optional(),
});

/**
 * Schema for guest in import request
 */
const GuestSchema = z.object({
  name: z.string().min(1, "Guest name is required"),
  dietaryRestrictions: z.string().optional(),
  mealChoice: z.string().optional(),
  tableNumber: z.string().optional(),
  rsvpStatus: z.enum(["confirmed", "pending", "declined"]).optional(),
  notes: z.string().optional(),
});

/**
 * Schema for timeline task in import request
 */
const TimelineTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  assigneeEmail: z.string().email().optional(),
  status: z.enum(["pending", "in-progress", "completed", "cancelled"]).optional(),
});

/**
 * Schema for single event in import request
 */
const EventImportSchema = z.object({
  externalId: z.string().optional(),
  title: z.string().min(1, "Event title is required"),
  eventType: z.string().default("catering"),
  eventDate: z.string().min(1, "Event date is required (YYYY-MM-DD or ISO 8601)"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  guestCount: z.number().int().positive("Guest count must be at least 1").default(1),
  status: z
    .enum([
      "draft",
      "confirmed",
      "tentative",
      "postponed",
      "completed",
      "cancelled",
    ])
    .default("tentative"),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venueId: z.string().optional(),
  notes: z.string().optional(),
  budget: z.number().positive("Budget must be positive").optional().nullable(),
  ticketPrice: z.number().min(0).optional(),
  eventFormat: z.string().optional(),
  tags: z.array(z.string()).default([]),
  menuItems: z.array(MenuItemSchema).default([]),
  guestList: z.array(GuestSchema).default([]),
  timelineTasks: z.array(TimelineTaskSchema).default([]),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

/**
 * Schema for import options
 */
const ImportOptionsSchema = z.object({
  dryRun: z.boolean().default(false),
  skipDuplicates: z.boolean().default(false),
  autoCreateEntities: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(false),
  notificationUrl: z.string().url().optional(),
});

/**
 * Schema for server-to-server import request
 */
const ServerToServerImportSchema = z.object({
  events: z.array(EventImportSchema).min(1, "At least one event is required"),
  options: ImportOptionsSchema.optional(),
});

/**
 * Result type for event import operation
 */
interface EventImportResult {
  eventId?: string;
  externalId?: string;
  status: "success" | "skipped" | "failed";
  message: string;
  errors?: string[];
}

/**
 * Batch import response type
 */
interface BatchImportResponse {
  batchId: string;
  status: "completed" | "partial" | "failed";
  totalEvents: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  results: EventImportResult[];
  dryRun: boolean;
}

/**
 * Helper to ensure a location exists for the tenant
 */
async function ensureLocationId(
  tenantId: string,
  venueName?: string
): Promise<string> {
  const [location] = await database.$queryRaw<
    Array<{ id: string }>
  >(
    Prisma.sql`
      SELECT id
      FROM tenant.locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    `
  );

  if (location?.id) {
    return location.id;
  }

  const createdId = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant.locations (tenant_id, id, name, is_primary, is_active)
      VALUES (${tenantId}, ${createdId}, ${venueName || "Main Location"}, true, true)
    `
  );

  return createdId;
}

/**
 * Helper to find or create a venue
 */
async function findOrCreateVenue(
  tenantId: string,
  venueName?: string,
  venueAddress?: string
): Promise<string | null> {
  if (!venueName) {
    return null;
  }

  // Try to find existing venue by name
  const [existing] = await database.$queryRaw<
    Array<{ id: string }>
  >(
    Prisma.sql`
      SELECT id
      FROM tenant_events.venues
      WHERE tenant_id = ${tenantId}
        AND name = ${venueName}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (existing?.id) {
    return existing.id;
  }

  // Create new venue
  const venueId = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.venues (tenant_id, id, name, address, is_active)
      VALUES (${tenantId}, ${venueId}, ${venueName}, ${venueAddress || null}, true)
    `
  );

  return venueId;
}

/**
 * Helper to find or create a recipe/dish
 */
async function findOrCreateDish(
  tenantId: string,
  menuItem: z.infer<typeof MenuItemSchema>
): Promise<string | null> {
  if (!menuItem.name) {
    return null;
  }

  // Try to find existing dish
  const [existing] = await database.$queryRaw<
    Array<{ id: string }>
  >(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.dishes
      WHERE tenant_id = ${tenantId}
        AND name = ${menuItem.name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (existing?.id) {
    return existing.id;
  }

  // Create new dish
  const dishId = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.dishes (tenant_id, id, name, category, is_active)
      VALUES (${tenantId}, ${dishId}, ${menuItem.name}, ${menuItem.category || "Imported"}, true)
    `
  );

  return dishId;
}

/**
 * Helper to find employee by email
 */
async function findEmployeeByEmail(
  tenantId: string,
  email: string
): Promise<string | null> {
  const [employee] = await database.$queryRaw<
    Array<{ id: string }>
  >(
    Prisma.sql`
      SELECT id
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND email = ${email}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  return employee?.id ?? null;
}

/**
 * Check if event already exists
 */
async function findExistingEvent(
  tenantId: string,
  title: string,
  eventDate: string
): Promise<string | null> {
  const [event] = await database.$queryRaw<
    Array<{ id: string }>
  >(
    Prisma.sql`
      SELECT id
      FROM tenant_events.events
      WHERE tenant_id = ${tenantId}
        AND title = ${title}
        AND event_date = ${eventDate}::date
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  return event?.id ?? null;
}

/**
 * POST /api/events/import/server-to-server
 *
 * Import events from external systems via direct API call.
 * Supports batch processing, dry-run mode, and duplicate handling.
 */
export async function POST(request: Request) {
  try {
    // Authenticate the request
    const session = await auth();

    if (!session?.orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenantId = await getTenantIdForOrg(session.orgId);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ServerToServerImportSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { events, options: inputOptions } = validationResult.data;
    const importOptions = inputOptions ?? {
      dryRun: false,
      skipDuplicates: false,
      autoCreateEntities: true,
      notifyOnCompletion: false,
    };
    const batchId = randomUUID();
    const results: EventImportResult[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Dry run mode - validate without importing
    if (importOptions.dryRun) {
      for (const event of events) {
        const existingEvent = await findExistingEvent(
          tenantId,
          event.title,
          event.eventDate
        );

        if (existingEvent && importOptions.skipDuplicates) {
          skippedCount++;
          results.push({
            externalId: event.externalId,
            status: "skipped",
            message: "Event already exists (dry run)",
          });
        } else {
          successCount++;
          results.push({
            externalId: event.externalId,
            status: "success",
            message: "Event would be imported (dry run)",
          });
        }
      }

      const response: BatchImportResponse = {
        batchId,
        status: successCount === events.length ? "completed" : "partial",
        totalEvents: events.length,
        successCount,
        skippedCount,
        failedCount,
        results,
        dryRun: true,
      };

      return NextResponse.json(response);
    }

    // Process each event
    for (const event of events) {
      const eventErrors: string[] = [];
      let eventId: string | undefined;

      try {
        // Check for duplicates
        const existingEvent = await findExistingEvent(
          tenantId,
          event.title,
          event.eventDate
        );

        if (existingEvent) {
          if (importOptions.skipDuplicates) {
            skippedCount++;
            results.push({
              eventId: existingEvent,
              externalId: event.externalId,
              status: "skipped",
              message: "Event already exists",
            });
            continue;
          } else {
            eventErrors.push("Event with same title and date already exists");
          }
        }

        // Parse event date
        const parsedDate = new Date(event.eventDate);
        if (Number.isNaN(parsedDate.getTime())) {
          eventErrors.push("Invalid event date format");
        }

        // Ensure location exists
        const locationId = await ensureLocationId(tenantId, event.venueName);

        // Find or create venue
        const venueId = event.venueId
          ? event.venueId
          : event.venueName
            ? (await findOrCreateVenue(event.venueName, event.venueAddress)) ?? undefined
            : undefined;

        // Create event
        eventId = randomUUID();

        await database.$executeRaw(
          Prisma.sql`
            INSERT INTO tenant_events.events (
              tenant_id,
              id,
              event_number,
              title,
              event_type,
              event_date,
              start_time,
              end_time,
              guest_count,
              status,
              venue_id,
              venue_name,
              venue_address,
              notes,
              budget,
              ticket_price,
              event_format,
              tags,
              contact_name,
              contact_email,
              contact_phone,
              created_at,
              updated_at
            )
            VALUES (
              ${tenantId},
              ${eventId},
              ${randomUUID().slice(0, 8)},
              ${event.title},
              ${event.eventType},
              ${parsedDate.toISOString().split("T")[0]},
              ${event.startTime ? event.startTime : null},
              ${event.endTime ? event.endTime : null},
              ${event.guestCount},
              ${event.status},
              ${venueId},
              ${event.venueName || null},
              ${event.venueAddress || null},
              ${event.notes || null},
              ${event.budget ?? null},
              ${event.ticketPrice ?? null},
              ${event.eventFormat || null},
              ${event.tags.length > 0 ? event.tags : null},
              ${event.contactName || null},
              ${event.contactEmail || null},
              ${event.contactPhone || null},
              NOW(),
              NOW()
            )
          `
        );

        // Import menu items if enabled
        if (importOptions.autoCreateEntities && event.menuItems.length > 0) {
          for (const menuItem of event.menuItems) {
            const dishId = await findOrCreateDish(tenantId, menuItem);

            if (dishId) {
              await database.$executeRaw(
                Prisma.sql`
                  INSERT INTO tenant_events.event_dishes (
                    tenant_id,
                    id,
                    event_id,
                    dish_id,
                    quantity,
                    unit,
                    servings,
                    special_instructions,
                    course,
                    created_at
                  )
                  VALUES (
                    ${tenantId},
                    ${randomUUID()},
                    ${eventId},
                    ${dishId},
                    ${menuItem.quantity ?? null},
                    ${menuItem.unit || null},
                    ${menuItem.servings ?? null},
                    ${menuItem.specialInstructions || null},
                    ${menuItem.course || null},
                    NOW()
                  )
                `
              );
            }
          }
        }

        // Import guest list
        if (event.guestList.length > 0) {
          for (const guest of event.guestList) {
            await database.$executeRaw(
              Prisma.sql`
                INSERT INTO tenant_events.event_guests (
                  tenant_id,
                  id,
                  event_id,
                  name,
                  dietary_restrictions,
                  meal_choice,
                  table_number,
                  rsvp_status,
                  notes,
                  created_at
                )
                VALUES (
                  ${tenantId},
                  ${randomUUID()},
                  ${eventId},
                  ${guest.name},
                  ${guest.dietaryRestrictions || null},
                  ${guest.mealChoice || null},
                  ${guest.tableNumber || null},
                  ${guest.rsvpStatus || "pending"},
                  ${guest.notes || null},
                  NOW()
                )
              `
            );
          }
        }

        // Import timeline tasks
        if (event.timelineTasks.length > 0) {
          for (const task of event.timelineTasks) {
            let assigneeId: string | null = null;

            if (task.assigneeEmail) {
              assigneeId = await findEmployeeByEmail(
                tenantId,
                task.assigneeEmail
              );
            }

            await database.$executeRaw(
              Prisma.sql`
                INSERT INTO tenant_events.event_tasks (
                  tenant_id,
                  id,
                  event_id,
                  title,
                  description,
                  start_time,
                  end_time,
                  assignee_id,
                  status,
                  created_at
                )
                VALUES (
                  ${tenantId},
                  ${randomUUID()},
                  ${eventId},
                  ${task.title},
                  ${task.description || null},
                  ${task.startTime ? new Date(task.startTime).toISOString() : null},
                  ${task.endTime ? new Date(task.endTime).toISOString() : null},
                  ${assigneeId},
                  ${task.status || "pending"},
                  NOW()
                )
              `
            );
          }
        }

        successCount++;
        results.push({
          eventId,
          externalId: event.externalId,
          status: "success",
          message: "Event imported successfully",
        });
      } catch (error) {
        failedCount++;
        results.push({
          externalId: event.externalId,
          status: "failed",
          message: "Failed to import event",
          errors: eventErrors.length > 0 ? eventErrors : [
            error instanceof Error ? error.message : "Unknown error"
          ],
        });
      }
    }

    // Build response
    const response: BatchImportResponse = {
      batchId,
      status:
        failedCount === 0
          ? "completed"
          : successCount > 0
            ? "partial"
            : "failed",
      totalEvents: events.length,
      successCount,
      skippedCount,
      failedCount,
      results,
      dryRun: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Server-to-server import error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
