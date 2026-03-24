import { auth } from "@repo/auth/server";
import { database } from "@/lib/database";
import { PrepListPDF, type PrepListPDFData } from "@repo/pdf";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  id: string;
}>;

interface AuthContext {
  orgId: string;
  userId: string;
  tenantId: string;
}

async function getAuthContext(
  orgId: string | null,
  userId: string | null,
  orgIdParam: string
): Promise<AuthContext> {
  if (!(orgId && userId)) {
    throw new Error("Unauthorized");
  }
  const tenantId = await getTenantIdForOrg(orgIdParam);
  if (!tenantId) {
    throw new Error("Tenant not found");
  }
  return { orgId, userId, tenantId };
}

async function fetchPrepList(prepListId: string, tenantId: string) {
  // Try to fetch from saved prep lists first
  const savedPrepList = await database.prepList.findFirst({
    where: {
      id: prepListId,
      tenantId,
      deletedAt: null,
    },
  });

  if (savedPrepList) {
    return { type: "saved" as const, data: savedPrepList };
  }

  // If not found, check if it's an event ID
  const event = await database.event.findFirst({
    where: {
      id: prepListId,
      tenantId,
      deletedAt: null,
    },
    include: {
      venue: true,
      location: true,
    },
  });

  if (event) {
    return { type: "event" as const, data: event };
  }

  throw new Error("Prep list not found");
}

async function fetchUser(tenantId: string, userId: string) {
  const user = await database.user.findFirst({
    where: {
      tenantId,
      authUserId: userId,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return user || { firstName: "Unknown", lastName: "User", email: "unknown@example.com" };
}

function convertToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  for (const byte of uint8Array) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function generatePdfBlob(
  pdfComponent: React.ReactElement<unknown>
): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await pdf(pdfComponent);
  return await doc.toBlob();
}

async function generateBase64Pdf(
  pdfComponent: React.ReactElement<unknown>
): Promise<string> {
  const blob = await generatePdfBlob(pdfComponent);
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return convertToBase64(uint8Array);
}

function generatePrepListFilename(eventTitle: string, eventDate: Date): string {
  const dateStr = new Date(eventDate).toISOString().split("T")[0];
  return `prep-list-${eventTitle.replace(/\s+/g, "-").toLowerCase()}-${dateStr}.pdf`;
}

async function handlePdfDownload(
  pdfComponent: React.ReactElement<unknown>,
  eventTitle: string,
  eventDate: Date
): Promise<NextResponse> {
  const blob = await generatePdfBlob(pdfComponent);
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${generatePrepListFilename(eventTitle, eventDate)}"`,
    },
  });
}

async function handlePdfBase64(
  pdfComponent: React.ReactElement<unknown>,
  eventTitle: string,
  eventDate: Date
): Promise<NextResponse> {
  const base64 = await generateBase64Pdf(pdfComponent);
  return NextResponse.json({
    dataUrl: `data:application/pdf;base64,${base64}`,
    filename: generatePrepListFilename(eventTitle, eventDate),
  });
}

function handlePdfError(error: unknown): NextResponse {
  console.error("Failed to generate Prep List PDF:", error);

  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Tenant not found") {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    if (error.message === "Prep list not found") {
      return NextResponse.json(
        { error: "Prep list not found" },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    {
      error: "Failed to generate PDF",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}

// Station mapping for ingredient categorization
const STATION_MAP: Record<string, string[]> = {
  "hot-line": ["protein", "meat", "poultry", "fish", "seafood", "sauce"],
  "cold-prep": ["vegetable", "salad", "cold", "dressing", "marinade"],
  bakery: ["flour", "sugar", "baking", "dough", "bread", "pastry", "dessert"],
  "prep-station": ["prep", "base", "stock", "aromatic", "spice"],
  garnish: ["herb", "garnish", "finish", "topping"],
};

function determineStation(ingredientName: string, category?: string): string {
  const searchStr = `${ingredientName} ${category || ""}`.toLowerCase();
  
  for (const [station, keywords] of Object.entries(STATION_MAP)) {
    if (keywords.some((kw) => searchStr.includes(kw))) {
      return station;
    }
  }
  
  return "prep-station";
}

async function preparePdfData(
  eventId: string,
  tenantId: string,
  user: { firstName: string | null; lastName: string | null; email: string | null }
): Promise<{ pdfData: PrepListPDFData; eventTitle: string; eventDate: Date }> {
  // Fetch event
  const event = await database.event.findFirst({
    where: { id: eventId, tenantId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Fetch event dishes
  const eventDishes = await database.event_dishes.findMany({
    where: { event_id: eventId, tenant_id: tenantId },
  });

  // Build station lists from event dishes
  const stationMap = new Map<string, {
    stationId: string;
    stationName: string;
    totalIngredients: number;
    estimatedTime: number;
    color: string;
    ingredients: Array<{
      ingredientId: string;
      ingredientName: string;
      scaledQuantity: number;
      scaledUnit: string;
      category?: string;
      isOptional: boolean;
      preparationNotes?: string;
      allergens: string[];
      dietarySubstitutions: string[];
    }>;
    tasks: Array<unknown>;
  }>();

  const stationNames: Record<string, string> = {
    "hot-line": "Hot Line",
    "cold-prep": "Cold Prep",
    bakery: "Bakery",
    "prep-station": "Prep Station",
    garnish: "Garnish",
  };

  const stationColors: Record<string, string> = {
    "hot-line": "bg-red-500",
    "cold-prep": "bg-blue-500",
    bakery: "bg-amber-500",
    "prep-station": "bg-emerald-500",
    garnish: "bg-purple-500",
  };

  // For each dish, get its recipe and ingredients
  for (const eventDish of eventDishes) {
    // Get dish
    const dish = await database.dish.findFirst({
      where: { id: eventDish.dish_id, tenantId },
    });

    if (!dish?.recipeId) continue;

    // Get latest recipe version for this recipe
    const latestVersion = await database.recipeVersion.findFirst({
      where: { recipeId: dish.recipeId, tenantId },
      orderBy: { versionNumber: "desc" },
    });

    if (!latestVersion) continue;

    // Get ingredients for this version
    const recipeIngredients = await database.recipeIngredient.findMany({
      where: { recipeVersionId: latestVersion.id, tenantId },
    });

    // Fetch ingredient details
    const ingredientIds = [...new Set(recipeIngredients.map(ri => ri.ingredientId))];
    const ingredientDetails = await database.ingredient.findMany({
      where: { id: { in: ingredientIds }, tenantId },
    });
    const ingredientMap = new Map(ingredientDetails.map(i => [i.id, i]));

    for (const ing of recipeIngredients) {
      const ingredient = ingredientMap.get(ing.ingredientId);
      const stationId = determineStation(
        ingredient?.name || "unknown",
        ingredient?.category || undefined
      );

      if (!stationMap.has(stationId)) {
        stationMap.set(stationId, {
          stationId,
          stationName: stationNames[stationId] || stationId,
          totalIngredients: 0,
          estimatedTime: 0,
          color: stationColors[stationId] || "bg-gray-500",
          ingredients: [],
          tasks: [],
        });
      }

      const station = stationMap.get(stationId)!;
      const yieldQty = Number(latestVersion.yieldQuantity) || 1;
      const guestCount = event.guestCount || 1;
      const scaleFactor = guestCount / yieldQty;

      station.ingredients.push({
        ingredientId: ing.ingredientId,
        ingredientName: ingredient?.name || "Unknown",
        scaledQuantity: Number(ing.quantity) * scaleFactor,
        scaledUnit: "ea", // Simplified - would need unit lookup
        category: ingredient?.category || undefined,
        isOptional: false,
        preparationNotes: undefined,
        allergens: [],
        dietarySubstitutions: [],
      });
      station.totalIngredients++;
    }
  }

  // Convert to array and calculate times
  const stationLists = Array.from(stationMap.values()).map((station) => ({
    ...station,
    estimatedTime: Math.ceil(station.totalIngredients * 0.15), // ~9 min per ingredient
  }));

  const totalIngredients = stationLists.reduce((sum, s) => sum + s.totalIngredients, 0);
  const totalEstimatedTime = stationLists.reduce((sum, s) => sum + s.estimatedTime, 0);

  const pdfData: PrepListPDFData = {
    event: {
      id: event.id,
      title: event.title || "Untitled Event",
      eventDate: event.eventDate || new Date(),
      guestCount: event.guestCount || 0,
    },
    prepList: {
      eventId: event.id,
      eventTitle: event.title || "Untitled Event",
      eventDate: event.eventDate || new Date(),
      guestCount: event.guestCount || 0,
      batchMultiplier: 1,
      totalIngredients,
      totalEstimatedTime,
      stationLists,
    },
    metadata: {
      generatedAt: new Date(),
      generatedBy: user.email || `${user.firstName} ${user.lastName}`,
      version: "1.0.0",
    },
  };

  return {
    pdfData,
    eventTitle: event.title || "Prep List",
    eventDate: event.eventDate || new Date(),
  };
}

/**
 * GET /api/kitchen/prep-lists/[id]/pdf
 *
 * Generate a PDF export of a prep list.
 *
 * Query parameters:
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: prepListId } = await params;
    const { orgId, userId } = await auth();

    const authContext = await getAuthContext(
      orgId ?? null,
      userId ?? null,
      orgId ?? ""
    );

    const result = await fetchPrepList(prepListId, authContext.tenantId);
    const user = await fetchUser(authContext.tenantId, authContext.userId);

    let pdfData: PrepListPDFData;
    let eventTitle: string;
    let eventDate: Date;

    if (result.type === "saved") {
      const prepared = await preparePdfData(result.data.eventId, authContext.tenantId, user);
      pdfData = prepared.pdfData;
      eventTitle = prepared.eventTitle;
      eventDate = prepared.eventDate;
    } else {
      const prepared = await preparePdfData(result.data.id, authContext.tenantId, user);
      pdfData = prepared.pdfData;
      eventTitle = prepared.eventTitle;
      eventDate = prepared.eventDate;
    }

    const pdfComponent = PrepListPDF({ data: pdfData }) as React.ReactElement<unknown>;

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";

    if (shouldDownload) {
      return await handlePdfDownload(pdfComponent, eventTitle, eventDate);
    }

    return await handlePdfBase64(pdfComponent, eventTitle, eventDate);
  } catch (error) {
    return handlePdfError(error);
  }
}
