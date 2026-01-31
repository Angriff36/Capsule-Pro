/**
 * Static data exports for event-parser package
 * Contains checklist templates and reference data
 */

import type { ChecklistSectionState } from "../types/checklist.js";

// Re-export task library from types
export { DEFAULT_TASK_LIBRARY } from "../types/battleBoard.js";

/**
 * Pre-Event Review Checklist Template
 * This is the standard checklist that kitchen staff must complete for every event.
 * The checklist-builder adapter attempts to auto-fill these questions from parsed PDFs.
 */
export const PRE_EVENT_REVIEW_TEMPLATE: ChecklistSectionState[] = [
  {
    id: "basic-info",
    title: "Basic Event Information",
    summary: "Core event details and type classification",
    questions: [
      {
        id: "event-type",
        type: "single-select",
        prompt: "What type of event is this?",
        description: "Select the service style that best describes this event",
        required: true,
        options: [
          "Bring Hot",
          "Full Service",
          "Delivery / Drop Off",
          "Action Station",
          "Vending",
          "Custom",
        ],
        value: null,
        allowNotes: true,
      },
      {
        id: "headcount-confirmed",
        type: "yes-no",
        prompt: "Has the headcount been confirmed?",
        description: "Verify final guest count with client",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "venue-confirmed",
        type: "yes-no",
        prompt: "Has the venue been confirmed?",
        description: "Confirm venue address and access details",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "contact-info-complete",
        type: "yes-no",
        prompt: "Do we have complete contact information?",
        description: "Client name, phone, email, and on-site contact",
        required: true,
        value: null,
        allowNotes: true,
      },
    ],
  },
  {
    id: "menu-section",
    title: "Menu Review",
    summary: "Menu items, dietary requirements, and prep instructions",
    questions: [
      {
        id: "menu-finalized",
        type: "yes-no",
        prompt: "Has the menu been finalized?",
        description: "No pending changes or client approvals needed",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "custom-menu-items",
        type: "yes-no-na",
        prompt: "Are there any custom or special request menu items?",
        description: "Items not on standard menu that require special prep",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "allergen-requirements",
        type: "yes-no-na",
        prompt: "Are there allergen or dietary restrictions to accommodate?",
        description: "Vegetarian, vegan, gluten-free, nut allergies, etc.",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "prep-instructions",
        type: "yes-no",
        prompt: "Have prep instructions been reviewed?",
        description: "Kitchen team understands all prep requirements",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "portion-sizes",
        type: "yes-no",
        prompt: "Have portion sizes been calculated?",
        description: "Based on headcount and service style",
        required: true,
        value: null,
        allowNotes: true,
      },
    ],
  },
  {
    id: "staffing-section",
    title: "Staffing",
    summary: "Staff assignments and coverage",
    questions: [
      {
        id: "staffing-confirmed",
        type: "yes-no",
        prompt: "Has staffing been confirmed?",
        description: "All positions filled with confirmed staff",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "captain-assigned",
        type: "yes-no",
        prompt: "Is there a designated event captain/lead?",
        description: "Point person responsible for on-site decisions",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "kitchen-staff-adequate",
        type: "yes-no",
        prompt: "Is kitchen staffing adequate for menu complexity?",
        description: "Enough cooks/prep staff for all menu items",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "service-staff-adequate",
        type: "yes-no",
        prompt: "Is front-of-house staffing adequate?",
        description: "Servers, bartenders, runners based on headcount",
        required: true,
        value: null,
        allowNotes: true,
      },
    ],
  },
  {
    id: "timeline-section",
    title: "Timeline & Logistics",
    summary: "Event schedule and logistics planning",
    questions: [
      {
        id: "timeline-received",
        type: "yes-no",
        prompt: "Has a detailed event timeline been received?",
        description: "Client-provided or created schedule of events",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "load-in-time",
        type: "yes-no",
        prompt: "Is the load-in/setup time confirmed?",
        description: "When team can access venue for setup",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "service-time",
        type: "yes-no",
        prompt: "Are service times confirmed?",
        description: "Start/end times for each course or service",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "breakdown-time",
        type: "yes-no",
        prompt: "Is the breakdown/load-out time confirmed?",
        description: "When venue needs to be cleared",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "timeline-changes",
        type: "single-select",
        prompt: "Do the arrival/setup times need adjustment?",
        description: "Based on menu complexity and venue access",
        required: true,
        options: ["No Change", "More", "Less"],
        value: null,
        allowNotes: true,
      },
    ],
  },
  {
    id: "equipment-section",
    title: "Equipment & Rentals",
    summary: "Equipment needs and rental coordination",
    questions: [
      {
        id: "equipment-list-complete",
        type: "yes-no",
        prompt: "Is the equipment pull list complete?",
        description: "All items needed from inventory identified",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "rentals-confirmed",
        type: "yes-no-na",
        prompt: "Are rental items confirmed?",
        description: "Tables, chairs, linens, dishes from rental company",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "special-equipment",
        type: "yes-no-na",
        prompt: "Is special equipment needed?",
        description: "Chafing dishes, heat lamps, action stations, etc.",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "transport-arranged",
        type: "yes-no",
        prompt: "Is transportation arranged?",
        description: "Vehicles assigned for equipment and food",
        required: true,
        value: null,
        allowNotes: true,
      },
    ],
  },
  {
    id: "additional-section",
    title: "Additional Considerations",
    summary: "Final review items and special notes",
    questions: [
      {
        id: "venue-kitchen-access",
        type: "yes-no-na",
        prompt: "Will we have access to venue kitchen facilities?",
        description: "Ovens, refrigeration, prep space at venue",
        required: false,
        value: null,
        allowNotes: true,
      },
      {
        id: "parking-loading",
        type: "yes-no",
        prompt: "Is parking and loading zone access confirmed?",
        description: "Where to park and unload equipment",
        required: true,
        value: null,
        allowNotes: true,
      },
      {
        id: "client-walkthrough",
        type: "yes-no-na",
        prompt: "Has a client walkthrough been scheduled?",
        description: "Pre-event meeting to review details",
        required: false,
        value: null,
        allowNotes: true,
      },
      {
        id: "special-requests",
        type: "textarea",
        prompt: "Are there any special requests or notes?",
        description: "Anything not covered above that the team should know",
        required: false,
        value: null,
        allowNotes: false,
      },
    ],
  },
];

/**
 * Create a fresh checklist instance from the template
 */
export function createChecklistFromTemplate(): ChecklistSectionState[] {
  return JSON.parse(JSON.stringify(PRE_EVENT_REVIEW_TEMPLATE));
}

/**
 * Count total questions in checklist
 */
export function countChecklistQuestions(sections: ChecklistSectionState[]): {
  total: number;
  required: number;
  answered: number;
  autoFilled: number;
} {
  let total = 0;
  let required = 0;
  let answered = 0;
  let autoFilled = 0;

  for (const section of sections) {
    for (const question of section.questions) {
      total++;
      if (question.required) {
        required++;
      }
      if (question.value !== null && question.value !== "") {
        answered++;
      }
      if (question.autoFilled) {
        autoFilled++;
      }
    }
  }

  return { total, required, answered, autoFilled };
}

/**
 * Allergen reference data
 */
export const COMMON_ALLERGENS = [
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soy",
  "Sesame",
  "Gluten",
] as const;

/**
 * Standard position/role mappings
 */
export const POSITION_ROLE_MAP: Record<string, string> = {
  "event captain": "Captain",
  "lead server": "Captain",
  captain: "Captain",
  lead: "Captain",
  "head chef": "Kitchen",
  "sous chef": "Kitchen",
  chef: "Kitchen",
  cook: "Kitchen",
  "line cook": "Kitchen",
  "prep cook": "Kitchen",
  server: "Server",
  waiter: "Server",
  waitress: "Server",
  bartender: "Bar",
  barback: "Bar",
  runner: "Runner",
  busser: "Runner",
  dishwasher: "Utility",
  utility: "Utility",
  steward: "Utility",
};
