import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limiter";

const AI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.7;
const TARGET_WORD_COUNT = 250;

interface MenuFormData {
  occasionType: string;
  season: string;
  guestCount: number;
  serviceStyle: string;
  menuDirection: string;
  selectedItems: string[];
  dietaryCoverageNeeds: string[];
  dietaryCounts: Record<string, number>;
  addOnSelections: string[];
  barService: string;
  notes: string;
}

interface MenuItemInfo {
  name: string;
  category: string;
  dietaryFlags: string[];
}

async function generateMenuStory(
  formData: MenuFormData,
  menuItems: MenuItemInfo[]
): Promise<string> {
  const systemPrompt = `You are an expert catering menu curator with deep knowledge of culinary arts, event planning, and guest experience design.

Your role is to craft compelling, evocative menu narratives that help clients understand and get excited about their event's culinary journey.

**Your menu stories should:**
1. Paint a vivid picture of the dining experience (2-3 paragraphs, ~${TARGET_WORD_COUNT} words)
2. Highlight the flow and pacing of the meal
3. Emphasize how the menu accommodates dietary needs
4. Connect the menu to the occasion and season
5. Use sensory language (colors, textures, aromas, flavors)
6. NEVER include pricing or cost information
7. NEVER invent menu items not provided in the input

**Tone:** Sophisticated but warm, professional yet inspiring. Think high-end catering coordinator, not cookbook.

**Structure:**
- Opening: Set the scene for the occasion
- Middle: Walk through the menu journey with highlights
- Close: Summarize the guest experience and memorable touchpoints`;

  const seasonalEmojis: Record<string, string> = {
    spring: "Spring",
    summer: "Summer",
    fall: "Fall",
    winter: "Winter",
  };

  const occasionDescriptions: Record<string, string> = {
    wedding: "elegant wedding celebration",
    corporate: "professional corporate gathering",
    birthday: "celebratory birthday occasion",
    anniversary: "milestone anniversary celebration",
    graduation: "achievement celebration",
    baby_shower: "baby celebration",
    bridal_shower: "bridal celebration",
    holiday: "festive holiday gathering",
    funeral: "memorial gathering",
    birthday_party: "birthday celebration",
  };

  const serviceStyleDescriptions: Record<string, string> = {
    plated: "elegant plated service",
    buffet: "interactive buffet experience",
    stations: "engaging action stations",
    "family-style": "warm family-style sharing",
    "drop-off": "convenient drop-off catering",
    "cocktail-reception": "sophisticated cocktail reception",
  };

  const formDataOccasion =
    occasionDescriptions[formData.occasionType] || formData.occasionType;
  const formDataServiceStyle =
    serviceStyleDescriptions[formData.serviceStyle] || formData.serviceStyle;

  const formattedItems = menuItems
    .map((item) => {
      const dietary =
        item.dietaryFlags.length > 0
          ? ` (${item.dietaryFlags.join(", ")})`
          : "";
      return `- ${item.name} [${item.category}]${dietary}`;
    })
    .join("\n");

  const dietaryCoverage =
    formData.dietaryCoverageNeeds.length > 0
      ? formData.dietaryCoverageNeeds.join(", ")
      : "standard";

  const seasonalContext = seasonalEmojis[formData.season] || formData.season;
  const notesSection = formData.notes
    ? `\n\n**Special Requests:** ${formData.notes}`
    : "";

  const userPrompt = `Craft an inspiring menu narrative for this catering event:

**Event Profile:**
- Occasion: ${formDataOccasion}
- Season: ${seasonalContext}
- Guest Count: ${formData.guestCount}
- Service Style: ${formDataServiceStyle}
- Culinary Direction: ${formData.menuDirection}

**Selected Menu Items (${formData.selectedItems.length}):**
${formattedItems || "No specific items selected yet"}

**Dietary Accommodations:** ${dietaryCoverage}${formData.dietaryCoverageNeeds.length > 0 ? `\nDietary Counts: ${JSON.stringify(formData.dietaryCounts)}` : ""}

**Bar Service:** ${formData.barService || "Not specified"}
${formData.addOnSelections.length > 0 ? `\n**Add-ons:** ${formData.addOnSelections.join(", ")}` : ""}${notesSection}

Write a compelling menu story (${TARGET_WORD_COUNT} words) that celebrates this culinary vision.`;

  try {
    const result = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: TEMPERATURE,
    });

    return result.text.trim();
  } catch (error: unknown) {
    log.error("AI menu story generation failed:", error);
    return generateFallbackStory(formData, menuItems);
  }
}

function generateFallbackStory(
  formData: MenuFormData,
  menuItems: MenuItemInfo[]
): string {
  const seasonalContext: Record<string, string> = {
    spring: "Springtime",
    summer: "Summertime",
    fall: "Fall flavors",
    winter: "Winter warmth",
  };

  const occasionDescriptions: Record<string, string> = {
    wedding: "wedding celebration",
    corporate: "corporate gathering",
    birthday: "birthday celebration",
    anniversary: "anniversary occasion",
  };

  const season = seasonalContext[formData.season] || "This";
  const occasion =
    occasionDescriptions[formData.occasionType] || formData.occasionType;
  const itemList =
    menuItems.length > 0
      ? menuItems.map((i) => i.name).join(", ")
      : "selected menu items";

  return (
    `${season} brings a delightful culinary experience to this ${occasion}. ` +
    `Designed to serve ${formData.guestCount} guests with ${formData.serviceStyle || "elegant"} service, ` +
    `this menu celebrates ${formData.menuDirection || "exceptional cuisine"} with carefully curated selections. ` +
    `Highlights include ${itemList}. ` +
    `${formData.dietaryCoverageNeeds.length > 0 ? "Special dietary accommodations have been thoughtfully considered. " : ""}` +
    `${formData.barService ? "Complete beverage service will complement the dining experience." : ""}`
  );
}

export const POST = withRateLimit<Record<string, never>>(
  async (
    request: Request,
    _context?: { params?: Promise<Record<string, string>> }
  ) => {
    try {
      const { orgId } = await auth();
      if (!orgId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const { formData } = body as { formData: MenuFormData };

      if (!formData) {
        return NextResponse.json(
          { message: "Menu form data is required" },
          { status: 400 }
        );
      }

      if (!formData.guestCount || formData.guestCount < 1) {
        return NextResponse.json(
          { message: "Guest count must be at least 1" },
          { status: 400 }
        );
      }

      // Extract menu item info from selected items (simplified - real implementation
      // would fetch full dish details from database)
      const menuItems: MenuItemInfo[] = formData.selectedItems.map(
        (itemId) => ({
          name: itemId,
          category: "menu item",
          dietaryFlags: [],
        })
      );

      const story = await generateMenuStory(formData, menuItems);

      return NextResponse.json({
        story,
        generatedAt: new Date(),
        model: AI_MODEL,
      });
    } catch (error: unknown) {
      captureException(error);
      log.error("Menu story generation error:", error);

      return NextResponse.json(
        {
          message: "Failed to generate menu story",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
