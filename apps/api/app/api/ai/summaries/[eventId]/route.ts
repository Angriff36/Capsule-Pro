import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// AI model configuration
const AI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.6;
const TARGET_WORD_COUNT = 300; // Target 200-400 words

interface EventSummaryData {
  id: string;
  title: string;
  eventType: string;
  eventDate: Date;
  guestCount: number;
  status: string;
  venueName: string | null;
  venueAddress: string | null;
  notes: string | null;
  tags: string[];
  client: {
    name: string | null;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  dishes: Array<{
    name: string;
    quantityServings: number;
    course: string | null;
    allergens: string[];
    dietaryTags: string[];
  }>;
  staffAssignments: Array<{
    role: string;
    startTime: Date;
    endTime: Date;
  }>;
  allergenWarnings: Array<{
    severity: string;
    allergen: string;
    description: string | null;
  }>;
}

async function getEventDataForSummary(
  tenantId: string,
  eventId: string
): Promise<EventSummaryData> {
  // Fetch event with client
  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
      deletedAt: null,
    },
    include: {
      client: {
        select: {
          name: true,
          companyName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Fetch event dishes with allergens and dietary tags
  const eventDishes = await database.$queryRaw<
    Array<{
      tenant_id: string;
      id: string;
      event_id: string;
      dish_id: string;
      course: string | null;
      quantity_servings: number;
    }>
  >`
  SELECT tenant_id, id, event_id, dish_id, course, quantity_servings
  FROM tenant_events.event_dishes
  WHERE tenant_id = ${tenantId}::uuid
    AND deleted_at IS NULL
    AND event_id = ${eventId}::uuid
  `;

  // Fetch dishes with allergens and dietary tags
  const dishIds = eventDishes.map((ed) => ed.dish_id);
  const dishes =
    dishIds.length > 0
      ? await database.dish.findMany({
          where: {
            tenantId,
            id: { in: dishIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            allergens: true,
            dietaryTags: true,
          },
        })
      : [];

  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  // Combine event dishes with dish details
  const dishesWithDetails = eventDishes
    .map((ed) => {
      const dish = dishMap.get(ed.dish_id);
      return dish
        ? {
            name: dish.name,
            quantityServings: ed.quantity_servings,
            course: ed.course,
            allergens: dish.allergens ?? [],
            dietaryTags: dish.dietaryTags ?? [],
          }
        : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  // Fetch staff assignments
  const staffAssignments = await database.eventStaffAssignment.findMany({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
    select: {
      role: true,
      startTime: true,
      endTime: true,
    },
    orderBy: { startTime: "asc" },
  });

  // Fetch allergen warnings for this event
  const allergenWarnings = await database.allergenWarning.findMany({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
      isAcknowledged: false,
    },
    select: {
      severity: true,
      allergen: true,
      description: true,
    },
  });

  return {
    id: event.id,
    title: event.title,
    eventType: event.eventType,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    status: event.status,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    notes: event.notes,
    tags: event.tags ?? [],
    client: event.client
      ? {
          name: event.client.name,
          companyName: event.client.companyName,
          email: event.client.email,
          phone: event.client.phone,
        }
      : null,
    dishes: dishesWithDetails,
    staffAssignments: staffAssignments.map((s) => ({
      role: s.role,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    allergenWarnings: allergenWarnings.map((w) => ({
      severity: w.severity,
      allergen: w.allergen,
      description: w.description,
    })),
  };
}

async function generateEventSummary(
  eventData: EventSummaryData
): Promise<{
  summary: string;
  wordCount: number;
  highlights: string[];
  criticalInfo: string[];
}> {
  // Build system prompt
  const systemPrompt = `You are an expert catering event coordinator with deep knowledge of event planning, food safety, and client communication.

Your role is to generate concise, readable event summaries that highlight critical information for team briefings and handoffs.

**Your summaries should:**
1. Be 1-2 paragraphs (${TARGET_WORD_COUNT} words target, range 200-400)
2. Start with the essentials: what, when, where, who, and how many
3. Include critical safety information (allergens, dietary restrictions, special requirements)
4. Highlight operational considerations (venue access, staffing, timing)
5. Use clear, professional language
6. NEVER omit critical safety information
7. NEVER include sensitive financial or confidential client information

**Response format (strict JSON):**
\`\`\`json
{
  "summary": "1-2 paragraph event summary (200-400 words)",
  "highlights": ["key operational highlight 1", "highlight 2", "highlight 3"],
  "criticalInfo": ["critical safety info 1", "critical safety info 2"]
}
\`\`\`

**Critical rules:**
- Allergen information MUST be included in the summary
- Dietary restrictions MUST be highlighted in criticalInfo
- Special venue access requirements MUST be mentioned
- Any special equipment or setup needs MUST be included
- High-priority client notes should be incorporated
- If information is missing, indicate it briefly (e.g., "Venue access: TBD")`;

  // Format event date
  const eventDateStr = eventData.eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format staff count
  const staffCount = eventData.staffAssignments.length;

  // Build dishes summary
  const dishNames = eventData.dishes.map((d) => d.name);
  const hasAllergens = eventData.dishes.some((d) => d.allergens.length > 0);
  const allergenList = [
    ...new Set(
      eventData.dishes.flatMap((d) => d.allergens.map((a) => a.toLowerCase()))
    ),
  ].sort();

  // Build dietary tags
  const dietaryTags = [
    ...new Set(
      eventData.dishes.flatMap((d) =>
        d.dietaryTags.map((t) => t.toLowerCase())
      )
    ),
  ].sort();

  // Build user prompt
  const userPrompt = `Generate a concise event summary for the following catering event:

**Event Details:**
- Title: ${eventData.title}
- Type: ${eventData.eventType}
- Date: ${eventDateStr}
- Guests: ${eventData.guestCount}
- Status: ${eventData.status}
${eventData.venueName ? `- Venue: ${eventData.venueName}` : ""}
${eventData.venueAddress ? `- Address: ${eventData.venueAddress}` : ""}

**Client:**
${eventData.client ? (eventData.client.companyName || eventData.client.name || "Client") : "No client information"}

**Menu (${eventData.dishes.length} dishes):**
${dishNames.length > 0 ? dishNames.join(", ") : "No menu items specified"}
${hasAllergens ? `**ALLERGENS PRESENT:** ${allergenList.join(", ")}` : ""}
${dietaryTags.length > 0 ? `**Dietary Options:** ${dietaryTags.join(", ")}` : ""}

**Staffing:** ${staffCount} assignment${staffCount !== 1 ? "s" : ""}

${eventData.allergenWarnings.length > 0 ? `**CRITICAL ALLERGEN WARNINGS:** ${eventData.allergenWarnings.map((w) => `${w.severity}: ${w.allergen}${w.description ? ` - ${w.description}` : ""}`).join("; ")}` : ""}

${eventData.tags.length > 0 ? `**Tags:** ${eventData.tags.join(", ")}` : ""}

${eventData.notes ? `**Special Notes:** ${eventData.notes}` : ""}

Generate a concise summary (${TARGET_WORD_COUNT} words) that includes all critical safety information and operational highlights.`;

  try {
    // Call AI model
    const result = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: TEMPERATURE,
    });

    // Parse AI response
    const aiResponse = JSON.parse(result.text.trim());

    // Calculate word count
    const wordCount = aiResponse.summary?.split(/\s+/).length ?? 0;

    return {
      summary: aiResponse.summary ?? "",
      wordCount,
      highlights: aiResponse.highlights ?? [],
      criticalInfo: aiResponse.criticalInfo ?? [],
    };
  } catch (error: unknown) {
    console.error("AI summary generation failed:", error);

    // Fallback to basic summary
    return generateFallbackSummary(eventData);
  }
}

function generateFallbackSummary(
  eventData: EventSummaryData
): {
  summary: string;
  wordCount: number;
  highlights: string[];
  criticalInfo: string[];
} {
  const eventDateStr = eventData.eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dishNames = eventData.dishes.map((d) => d.name);
  const hasAllergens = eventData.dishes.some((d) => d.allergens.length > 0);
  const allergenList = [
    ...new Set(
      eventData.dishes.flatMap((d) => d.allergens.map((a) => a.toLowerCase()))
    ),
  ].sort();

  const dietaryTags = [
    ...new Set(
      eventData.dishes.flatMap((d) =>
        d.dietaryTags.map((t) => t.toLowerCase())
      )
    ),
  ].sort();

  // Build basic summary
  let summary = `${eventData.title} is a ${eventData.eventType} event scheduled for ${eventDateStr}`;
  summary += ` for ${eventData.guestCount} guest${eventData.guestCount !== 1 ? "s" : ""}.`;
  if (eventData.venueName) {
    summary += ` The event will be held at ${eventData.venueName}.`;
  }

  if (dishNames.length > 0) {
    summary += ` Menu includes ${dishNames.length} dish${dishNames.length !== 1 ? "es" : ""}: ${dishNames.slice(0, 5).join(", ")}${dishNames.length > 5 ? ", and more" : ""}.`;
  }

  if (hasAllergens) {
    summary += ` IMPORTANT: Menu contains allergens: ${allergenList.join(", ")}.`;
  }

  if (dietaryTags.length > 0) {
    summary += ` Dietary options available: ${dietaryTags.join(", ")}.`;
  }

  const wordCount = summary.split(/\s+/).length;

  // Build highlights
  const highlights: string[] = [];
  if (eventData.venueName) {
    highlights.push(`Venue: ${eventData.venueName}`);
  }
  if (eventData.dishes.length > 0) {
    highlights.push(`${eventData.dishes.length} menu items`);
  }
  if (eventData.staffAssignments.length > 0) {
    highlights.push(`${eventData.staffAssignments.length} staff assigned`);
  }

  // Build critical info
  const criticalInfo: string[] = [];
  if (hasAllergens) {
    criticalInfo.push(`Allergens present: ${allergenList.join(", ")}`);
  }
  if (dietaryTags.length > 0) {
    criticalInfo.push(`Dietary accommodations: ${dietaryTags.join(", ")}`);
  }
  if (eventData.allergenWarnings.length > 0) {
    criticalInfo.push(
      `${eventData.allergenWarnings.length} active allergen warning${eventData.allergenWarnings.length !== 1 ? "s" : ""}`
    );
  }

  return {
    summary,
    wordCount,
    highlights,
    criticalInfo,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Auth check
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { eventId } = await params;

    // Validate eventId
    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 }
      );
    }

    // Fetch event data
    const eventData = await getEventDataForSummary(tenantId, eventId);

    // Generate summary
    const { summary, wordCount, highlights, criticalInfo } =
      await generateEventSummary(eventData);

    // Return response
    return NextResponse.json({
      eventId,
      summary,
      wordCount,
      highlights,
      criticalInfo,
      generatedAt: new Date(),
      eventTitle: eventData.title,
      eventDate: eventData.eventDate,
      model: AI_MODEL,
    });
  } catch (error: unknown) {
    console.error("Event summary generation error:", error);

    if (error instanceof Error && error.message === "Event not found") {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Failed to generate event summary",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
