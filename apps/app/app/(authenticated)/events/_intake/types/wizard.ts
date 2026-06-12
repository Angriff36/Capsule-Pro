export interface WizardFormData {
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

export interface PriceEstimate {
  high: number;
  low: number;
}

export interface WizardStep {
  icon: string;
  id: string;
  subtitle: string;
  title: string;
}

export interface WebhookPayload {
  ai_summary: string;
  budget: {
    client_range: string;
    estimated_low: number;
    estimated_high: number;
    estimate_disclaimer: string;
  };
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
  extras: {
    bar_service: string;
    rentals: string[];
    add_ons: string[];
  };
  followup_email_draft: string;
  lead_id: string;
  notes: string;
  referral_source: string;
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
  timestamp: string;
}
