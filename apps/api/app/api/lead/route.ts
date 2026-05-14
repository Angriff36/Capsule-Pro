import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

interface WizardFormData {
  contactName: string;
  email: string;
  phone: string;
  company: string;
  eventName: string;
  occasionType: string;
  vibeDescription: string;
  eventFormat: string;
  guestCount: number;
  guestCountCertainty: string;
  serviceStyle: string;
  courseCount: number;
  cuisinePreferences: string[];
  dietaryNeeds: string[];
  dietaryPercentage: string;
  menuNotes: string;
  staffingLevel: string;
  staffingNotes: string;
  barService: string;
  rentalsNeeded: string[];
  addOns: string[];
  eventDate: string;
  dateFlexibility: string;
  venueType: string;
  city: string;
  venueName: string;
  budgetRange: string;
  referralSource: string;
  additionalNotes: string;
}

interface PriceEstimate {
  low: number;
  high: number;
}

/**
 * POST /api/lead
 *
 * Event intake lead submission endpoint.
 * Receives WizardFormData + PriceEstimate from the event intake wizard
 * and creates a Lead entity through the CRM system.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return executeManifestCommand(request, {
    entityName: "Lead",
    commandName: "create",
    transformBody: (body) => {
      const { formData, estimate } = body as {
        formData: WizardFormData;
        estimate: PriceEstimate;
      };

      const eventDateMs = formData.eventDate
        ? new Date(formData.eventDate).getTime()
        : 0;

      return {
        source: "website",
        companyName: formData.company || "",
        contactName: formData.contactName,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        eventType: formData.occasionType || formData.eventName,
        eventDate: eventDateMs,
        estimatedGuests: formData.guestCount || 0,
        estimatedValue: estimate?.high || 0,
        assignedTo: "",
        notes: buildNotesField(formData),
      };
    },
  });
}

function buildNotesField(data: WizardFormData): string {
  const parts: string[] = [];

  if (data.vibeDescription) {
    parts.push(`Vibe: ${data.vibeDescription}`);
  }
  if (data.eventFormat) {
    parts.push(`Format: ${data.eventFormat}`);
  }
  if (data.guestCountCertainty) {
    parts.push(`Guest count certainty: ${data.guestCountCertainty}`);
  }
  if (data.serviceStyle) {
    parts.push(`Service style: ${data.serviceStyle}`);
  }
  if (data.courseCount) {
    parts.push(`Courses: ${data.courseCount}`);
  }
  if (data.cuisinePreferences?.length) {
    parts.push(`Cuisine: ${data.cuisinePreferences.join(", ")}`);
  }
  if (data.dietaryNeeds?.length) {
    parts.push(`Dietary: ${data.dietaryNeeds.join(", ")} (${data.dietaryPercentage || "unknown"}%)`);
  }
  if (data.menuNotes) {
    parts.push(`Menu notes: ${data.menuNotes}`);
  }
  if (data.staffingLevel) {
    parts.push(`Staffing: ${data.staffingLevel}`);
  }
  if (data.staffingNotes) {
    parts.push(`Staffing notes: ${data.staffingNotes}`);
  }
  if (data.barService) {
    parts.push(`Bar service: ${data.barService}`);
  }
  if (data.rentalsNeeded?.length) {
    parts.push(`Rentals: ${data.rentalsNeeded.join(", ")}`);
  }
  if (data.addOns?.length) {
    parts.push(`Add-ons: ${data.addOns.join(", ")}`);
  }
  if (data.dateFlexibility) {
    parts.push(`Date flexibility: ${data.dateFlexibility}`);
  }
  if (data.venueType) {
    parts.push(`Venue type: ${data.venueType}`);
  }
  if (data.venueName) {
    parts.push(`Venue: ${data.venueName}`);
  }
  if (data.city) {
    parts.push(`City: ${data.city}`);
  }
  if (data.budgetRange) {
    parts.push(`Budget range: ${data.budgetRange}`);
  }
  if (data.referralSource) {
    parts.push(`Referral: ${data.referralSource}`);
  }
  if (data.additionalNotes) {
    parts.push(`Additional: ${data.additionalNotes}`);
  }

  return parts.join("\n");
}