export interface WizardFormData {
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

export interface PriceEstimate {
  low: number;
  high: number;
}

export interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface WebhookPayload {
  lead_id: string;
  timestamp: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  event: {
    name: string;
    occasion_type: string;
    vibe: string;
    format: string;
    guest_count: number;
    guest_count_certainty: string;
    date: string;
    date_flexibility: string;
    venue_type: string;
    venue_name: string;
    city: string;
  };
  service: {
    style: string;
    course_count: number;
    cuisine_preferences: string[];
    dietary_needs: string[];
    dietary_percentage: string;
    menu_notes: string;
  };
  staffing: {
    level: string;
    notes: string;
  };
  extras: {
    bar_service: string;
    rentals: string[];
    add_ons: string[];
  };
  budget: {
    client_range: string;
    estimated_low: number;
    estimated_high: number;
    estimate_disclaimer: string;
  };
  notes: string;
  referral_source: string;
  ai_summary: string;
  followup_email_draft: string;
}
