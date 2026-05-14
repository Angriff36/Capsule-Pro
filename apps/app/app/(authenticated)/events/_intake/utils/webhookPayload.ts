import type {
  PriceEstimate,
  WebhookPayload,
  WizardFormData,
} from "../types/wizard";

export function buildWebhookPayload(
  data: WizardFormData,
  estimate: PriceEstimate,
  leadId: string,
  aiSummary: string,
  emailDraft: string
): WebhookPayload {
  return {
    lead_id: leadId,
    timestamp: new Date().toISOString(),
    contact: {
      name: data.contactName,
      email: data.email,
      phone: data.phone,
      company: data.company,
    },
    event: {
      name: data.eventName,
      occasion_type: data.occasionType,
      vibe: data.vibeDescription,
      format: data.eventFormat,
      guest_count: data.guestCount,
      guest_count_certainty: data.guestCountCertainty,
      date: data.eventDate,
      date_flexibility: data.dateFlexibility,
      venue_type: data.venueType,
      venue_name: data.venueName,
      city: data.city,
    },
    service: {
      style: data.serviceStyle,
      course_count: data.courseCount,
      cuisine_preferences: data.cuisinePreferences,
      dietary_needs: data.dietaryNeeds,
      dietary_percentage: data.dietaryPercentage,
      menu_notes: data.menuNotes,
    },
    staffing: {
      level: data.staffingLevel,
      notes: data.staffingNotes,
    },
    extras: {
      bar_service: data.barService,
      rentals: data.rentalsNeeded,
      add_ons: data.addOns,
    },
    budget: {
      client_range: data.budgetRange,
      estimated_low: estimate.low,
      estimated_high: estimate.high,
      estimate_disclaimer:
        "This is a non-binding estimate based on the information provided. Final pricing will be determined after a consultation with our team.",
    },
    notes: data.additionalNotes,
    referral_source: data.referralSource,
    ai_summary: aiSummary,
    followup_email_draft: emailDraft,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
