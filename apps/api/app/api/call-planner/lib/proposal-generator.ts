/**
 * Proposal Content Generator
 *
 * Generates proposal content from event planning draft data.
 * Creates structured event summary, menu sections, service plan, and pricing.
 */

import type { EventPlanningDraft, ExtractedDetail } from "@repo/database";

export interface ProposalContent {
  eventSummary: EventSummary;
  menuSections: MenuSection[];
  servicePlan: ServicePlan;
  pricingBreakdown: PricingBreakdown;
  timeline?: Timeline;
  upgradeOptions?: UpgradeOptions;
  visionSummary?: string;
  notes?: string;
  nextSteps?: string;
}

export interface EventSummary {
  title: string;
  eventType: string;
  eventDate: string | null;
  eventTime: string | null;
  guestCount: number | null;
  venuePreference: string | null;
  venueId: string | null;
  serviceStyle: string | null;
  dietaryRestrictions: string | null;
  hostNotes: string | null;
}

export interface MenuSection {
  id: string;
  title: string;
  description: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface ServicePlan {
  serviceStyle: string;
  staffRequired: number;
  setupTime: string;
  breakdownTime: string;
  includes: string[];
}

export interface PricingBreakdown {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  lineItems: LineItem[];
}

export interface LineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Timeline {
  id: string;
  time: string;
  activity: string;
  duration: string;
  responsible: string;
}

export interface UpgradeOptions {
  title: string;
  description: string;
  options: UpgradeOption[];
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

/**
 * Generate proposal content from draft
 */
export function generateProposalContent(
  draft: EventPlanningDraft & {
    extractedDetails?: ExtractedDetail[];
  },
  options: {
    includePricing?: boolean;
    includeUpgrades?: boolean;
  } = {}
): ProposalContent {
  const { includePricing = true, includeUpgrades = true } = options;

  // Generate event summary
  const eventSummary: EventSummary = {
    title: `${draft.eventType || "Event"}${draft.clientName ? ` for ${draft.clientName}` : ""}`,
    eventType: draft.eventType || "event",
    eventDate: draft.eventDate?.toISOString() || null,
    eventTime: draft.eventTime || null,
    guestCount: draft.guestCount || null,
    venuePreference: draft.venuePreference || null,
    venueId: draft.venueId || null,
    serviceStyle: draft.serviceStyle || null,
    dietaryRestrictions: draft.dietaryRestrictions || null,
    hostNotes: draft.specialNotes || null,
  };

  // Generate service plan
  const servicePlan: ServicePlan = generateServicePlan(draft);

  // Generate menu sections (placeholder - would be populated from catalog)
  const menuSections: MenuSection[] = generateMenuSections(draft);

  // Generate pricing breakdown
  const pricingBreakdown: PricingBreakdown = includePricing
    ? generatePricing(draft, menuSections)
    : {
        subtotal: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 0,
        currency: "USD",
        lineItems: [],
      };

  // Generate timeline (placeholder)
  const timeline: Timeline = {
    id: "timeline-1",
    time: draft.eventTime || "TBD",
    activity: "Event Service",
    duration: "4-6 hours",
    responsible: "Catering Team",
  };

  // Generate upgrade options
  const upgradeOptions: UpgradeOptions | undefined = includeUpgrades
    ? {
        title: "Optional Enhancements",
        description: "Add these special touches to make your event even more memorable",
        options: [
          {
            id: "upgrade-1",
            name: "Floral Arrangements",
            description: "Custom floral centerpieces and arrangements",
            price: 500,
            category: "decor",
          },
          {
            id: "upgrade-2",
            name: "Photography Package",
            description: "Professional event photography (4 hours)",
            price: 800,
            category: "media",
          },
          {
            id: "upgrade-3",
            name: "Enhanced Lighting",
            description: "Ambient uplighting and spotlighting",
            price: 300,
            category: "lighting",
          },
        ],
      }
    : undefined;

  // Generate vision summary
  const visionSummary = generateVisionSummary(draft);

  // Generate notes
  const notes = draft.specialNotes || "";

  // Generate next steps
  const nextSteps = generateNextSteps(draft);

  return {
    eventSummary,
    menuSections,
    servicePlan,
    pricingBreakdown,
    timeline,
    upgradeOptions,
    visionSummary,
    notes,
    nextSteps,
  };
}

/**
 * Generate service plan from draft
 */
function generateServicePlan(draft: EventPlanningDraft): ServicePlan {
  const serviceStyle = draft.serviceStyle || "full_service";
  const guestCount = draft.guestCount || 50;

  let staffRequired = Math.max(2, Math.ceil(guestCount / 20));
  let setupTime = "2 hours";
  let breakdownTime = "1 hour";

  switch (serviceStyle) {
    case "buffet":
      staffRequired = Math.max(3, Math.ceil(guestCount / 25));
      setupTime = "2 hours";
      breakdownTime = "1.5 hours";
      break;
    case "plated":
      staffRequired = Math.max(4, Math.ceil(guestCount / 15));
      setupTime = "3 hours";
      breakdownTime = "2 hours";
      break;
    case "cocktail":
      staffRequired = Math.max(2, Math.ceil(guestCount / 30));
      setupTime = "1.5 hours";
      breakdownTime = "1 hour";
      break;
    default:
      staffRequired = Math.max(2, Math.ceil(guestCount / 20));
  }

  return {
    serviceStyle,
    staffRequired,
    setupTime,
    breakdownTime,
    includes: [
      "Professional service staff",
      "All necessary equipment and linens",
      "Setup and breakdown services",
      "Basic cleanup",
    ],
  };
}

/**
 * Generate menu sections from draft
 */
function generateMenuSections(draft: EventPlanningDraft): MenuSection[] {
  const sections: MenuSection[] = [];

  // Appetizers section
  sections.push({
    id: "menu-appetizers",
    title: "Appetizers & Hors d'Oeuvres",
    description: "Selection of seasonal appetizers",
    items: [
      {
        id: "item-1",
        name: "Bruschetta Trio",
        description: "Toasted baguette with tomato basil, mushroom truffle, and olive tapenade",
        quantity: draft.guestCount || 50,
        unitPrice: 4.5,
        totalPrice: (draft.guestCount || 50) * 4.5,
        category: "appetizer",
      },
      {
        id: "item-2",
        name: "Stuffed Mushrooms",
        description: "Cream cheese and herb stuffed mushrooms",
        quantity: draft.guestCount || 50,
        unitPrice: 3.5,
        totalPrice: (draft.guestCount || 50) * 3.5,
        category: "appetizer",
      },
    ],
  });

  // Main course section
  sections.push({
    id: "menu-main",
    title: "Main Course",
    description: "Chef's selection of main courses",
    items: [
      {
        id: "item-3",
        name: "Grilled Salmon",
        description: "Atlantic salmon with lemon herb butter",
        quantity: draft.guestCount || 50,
        unitPrice: 12,
        totalPrice: (draft.guestCount || 50) * 12,
        category: "entree",
      },
      {
        id: "item-4",
        name: "Beef Tenderloin",
        description: "Herb-crusted beef tenderloin with red wine reduction",
        quantity: draft.guestCount || 50,
        unitPrice: 14,
        totalPrice: (draft.guestCount || 50) * 14,
        category: "entree",
      },
      {
        id: "item-5",
        name: "Vegetable Risotto",
        description: "Creamy risotto with seasonal vegetables",
        quantity: draft.guestCount || 50,
        unitPrice: 9,
        totalPrice: (draft.guestCount || 50) * 9,
        category: "entree",
      },
    ],
  });

  // Sides section
  sections.push({
    id: "menu-sides",
    title: "Sides & Accompaniments",
    description: "Assorted sides and accompaniments",
    items: [
      {
        id: "item-6",
        name: "Roasted Vegetables",
        description: "Seasonal vegetables roasted with herbs",
        quantity: draft.guestCount || 50,
        unitPrice: 3,
        totalPrice: (draft.guestCount || 50) * 3,
        category: "side",
      },
      {
        id: "item-7",
        name: "Garlic Mashed Potatoes",
        description: "Creamy mashed potatoes with roasted garlic",
        quantity: draft.guestCount || 50,
        unitPrice: 2.5,
        totalPrice: (draft.guestCount || 50) * 2.5,
        category: "side",
      },
    ],
  });

  // Dessert section
  sections.push({
    id: "menu-desserts",
    title: "Desserts",
    description: "Sweet finale selection",
    items: [
      {
        id: "item-8",
        name: "Chocolate Mousse Cake",
        description: "Rich Belgian chocolate mousse with raspberry coulis",
        quantity: draft.guestCount || 50,
        unitPrice: 5,
        totalPrice: (draft.guestCount || 50) * 5,
        category: "dessert",
      },
      {
        id: "item-9",
        name: "Crème Brûlée",
        description: "Classic vanilla bean crème brûlée",
        quantity: draft.guestCount || 50,
        unitPrice: 5.5,
        totalPrice: (draft.guestCount || 50) * 5.5,
        category: "dessert",
      },
    ],
  });

  return sections;
}

/**
 * Generate pricing breakdown from draft and menu
 */
function generatePricing(
  _draft: EventPlanningDraft,
  menuSections: MenuSection[]
): PricingBreakdown {
  // Calculate subtotal from menu items
  let subtotal = 0;
  const lineItems: LineItem[] = [];

  for (const section of menuSections) {
    for (const item of section.items) {
      subtotal += item.totalPrice;
      lineItems.push({
        id: item.id,
        category: item.category,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }
  }

  // Add service fee
  const serviceFee = Math.round(subtotal * 0.2); // 20% service fee
  lineItems.push({
    id: "service-fee",
    category: "service",
    description: "Service & Staffing",
    quantity: 1,
    unitPrice: serviceFee,
    totalPrice: serviceFee,
  });
  subtotal += serviceFee;

  // Tax
  const taxRate = 0.08; // 8%
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + taxAmount;

  return {
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: "USD",
    lineItems,
  };
}

/**
 * Generate vision summary from draft
 */
function generateVisionSummary(draft: EventPlanningDraft): string {
  const parts: string[] = [];

  if (draft.eventType) {
    const eventType =
      draft.eventType.charAt(0).toUpperCase() +
      draft.eventType.slice(1).replace(/_/g, " ");
    parts.push(`This ${eventType} event`);
  } else {
    parts.push("This event");
  }

  if (draft.clientName) {
    parts.push(`for ${draft.clientName}`);
  }

  parts.push("promises to be a memorable occasion.");

  if (draft.serviceStyle) {
    const service = draft.serviceStyle.replace(/_/g, " ");
    parts.push(
      `With ${service} service, guests will enjoy a professionally curated dining experience.`
    );
  }

  if (draft.venuePreference) {
    parts.push(`The venue at ${draft.venuePreference} provides an elegant backdrop for the celebration.`);
  }

  if (draft.dietaryRestrictions) {
    parts.push(
      `We'll accommodate dietary needs with ${draft.dietaryRestrictions} options.`
    );
  }

  return parts.join(" ");
}

/**
 * Generate next steps from draft
 */
function generateNextSteps(draft: EventPlanningDraft): string {
  const steps: string[] = [];

  if (!draft.clientName) {
    steps.push("Please confirm the client's name and contact information.");
  }

  if (!draft.eventDate) {
    steps.push("Confirm the event date and time.");
  }

  if (!draft.guestCount) {
    steps.push("Finalize the expected guest count.");
  }

  if (draft.status === "active") {
    steps.push("Review the extracted details and confirm or edit as needed.");
  }

  if (draft.openQuestions && Array.isArray(draft.openQuestions) && draft.openQuestions.length > 0) {
    steps.push(
      `Address open questions: ${(draft.openQuestions as string[]).join(", ")}.`
    );
  }

  if (steps.length === 0) {
    return "Ready for proposal generation and client review.";
  }

  return steps.join("\n");
}
