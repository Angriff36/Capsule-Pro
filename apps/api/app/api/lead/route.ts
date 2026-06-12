import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface WizardFormData {
  additionalNotes: string;
  addOns: string[];
  barService: string;
  budgetRange: string;
  city: string;
  company: string;
  contactName: string;
  courseCount: number;
  cuisinePreferences: string[];
  dateFlexibility: string;
  dietaryNeeds: string[];
  dietaryPercentage: string;
  email: string;
  eventDate: string;
  eventFormat: string;
  eventName: string;
  guestCount: number;
  guestCountCertainty: string;
  menuNotes: string;
  occasionType: string;
  phone: string;
  referralSource: string;
  rentalsNeeded: string[];
  serviceStyle: string;
  staffingLevel: string;
  staffingNotes: string;
  venueName: string;
  venueType: string;
  vibeDescription: string;
}

interface PriceEstimate {
  high: number;
  low: number;
}

/**
 * POST /api/lead
 *
 * Event intake lead submission endpoint.
 * Receives WizardFormData + PriceEstimate from the event intake wizard
 * and creates a Lead entity through the CRM system.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const { formData, estimate } = rawBody as {
    formData: WizardFormData;
    estimate: PriceEstimate;
  };

  const eventDateMs = formData.eventDate
    ? new Date(formData.eventDate).getTime()
    : 0;

  return runManifestCommand({
    entity: "Lead",
    command: "create",
    body: {
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
    },
    user: {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
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
    parts.push(
      `Dietary: ${data.dietaryNeeds.join(", ")} (${data.dietaryPercentage || "unknown"}%)`
    );
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
