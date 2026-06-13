/**
 * Transcript Extractor
 *
 * Rule-based extraction of event planning details from call transcripts.
 * This is a deterministic fallback when AI extraction is not available.
 */

export interface ExtractedEventDetails {
  clientName?: string;
  eventType?: string;
  eventDate?: Date;
  eventTime?: string;
  guestCount?: number;
  guestCountMin?: number;
  guestCountMax?: number;
  venuePreference?: string;
  serviceStyle?: string;
  dietaryRestrictions?: string;
  menuPreferences?: Record<string, unknown> | null;
  budgetMin?: number;
  budgetMax?: number;
  customItems?: Record<string, unknown> | null;
  timelineNotes?: string;
  openQuestions?: string[] | null;
  specialNotes?: string;
  aiSummary?: string;
  overallConfidence?: number;
  details: ExtractedDetail[];
}

export interface ExtractedDetail {
  fieldName: string;
  rawValue: string;
  normalizedValue?: string | number | Date;
  confidence?: "high" | "medium" | "low";
  sourceQuote?: string;
  sourceTimestamp?: number;
  catalogMatchType?: "exact" | "possible" | "custom_unmatched";
}

// Patterns for extracting information from transcripts
const PATTERNS = {
  // Client name patterns
  clientName: [
    /(?:my name is|i'm|i am|this is|this is for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(?:planning for|organizing a)\s+(?:a\s+)?(?:wedding|event|party|birthday|anniversary|celebration)\s+for\s+([A-Z][a-z]+)/gi,
  ],

  // Event type patterns
  eventType: [
    /(?:it's a|this is a|planning a|we're having|organizing)\s+(wedding|birthday|anniversary|corporate event|holiday party|baby shower|graduation|bar mitzvah|bat mitzvah|quinceañera|reception|gala|fundraiser|conference|meeting|seminar|workshop)/gi,
    /(?:for\s+)?(?:a\s+)?(?:wedding|birthday|anniversary|corporate event|holiday party|baby shower|graduation|bar mitzvah|bat mitzvah|quinceañera|reception|gala|fundraiser|conference|meeting|seminar|workshop)/gi,
  ],

  // Date patterns
  dates: [
    /(?:on|for|the date is|date:?|when:?|scheduled for)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*(\d{4})?/gi,
    /(?:on|for|the date is|date:?|when:?|scheduled for)\s+(?:the\s+)?(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi,
    /(?:on|for|the date is|date:?|when:?)\s+(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})/gi,
    /(?:on|for|the date is|date:?|when:?)\s+(?:next\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?)?/gi,
  ],

  // Time patterns
  times: [
    /(?:at|around|approximately|about)\s+(?:(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|noon|midnight))/gi,
    /(?:for|starting|beginning|from)\s+(?:(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.))/gi,
    /(?:lunch|dinner|breakfast|evening|morning|afternoon)(?:\s+service)?/gi,
  ],

  // Guest count patterns
  guestCounts: [
    /(?:for|about|approximately|around|expecting|planning for)\s+(\d+)\s+(?:guests?|people|attendees|folks|guest)/gi,
    /(?:guests?|people|attendees)\s+(?:of|:|approximately|about|around)\s+(\d+)/gi,
    /(\d+)\s*(?:to|\-|\–)\s*(\d+)\s+(?:guests?|people|attendees)/gi,
  ],

  // Venue patterns
  venues: [
    /(?:at|in|located|venue:?|location:?)\s+(?:the\s+)?([A-Z][A-Za-z0-9\s&'`]+?)(?:\s+(?:Hotel|Resort|Club|Hall|Center|Room|Gardens?|Ballroom?|Lodge|Inn|Estate|Venue|Place))/gi,
    /(?:at|in|located)\s+(?:the\s+)?([A-Z][A-Za-z0-9\s&'`]+?)(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct|Plaza|Square))/gi,
  ],

  // Service style patterns
  serviceStyles: [
    /(?:we're|looking for|want|need)\s+(?:a\s+)?(?:buffet|plated|sit-down|family style|cocktail|standing|hors d'oeuvres|appetizers only|full service)(?:\s+(?:dinner|lunch|breakfast))?/gi,
    /(?:service style|serving style|format|style)\s+(?:is|:)\s*(?:buffet|plated|sit-down|family style|cocktail|standing|hors d'oeuvres|appetizers only|full service)/gi,
  ],

  // Budget patterns
  budgets: [
    /(?:budget|price|cost|spending|looking to spend|willing to spend)\s+(?:is|:|of|around|about|approximately)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(?:between|from)\s+\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:to|\-|\–|and)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
  ],

  // Dietary restrictions patterns
  dietary: [
    /(?:dietary restrictions|dietary needs|allergies|allergic to|can't eat|cannot eat|no|without)\s+(?:any\s+)?(?:gluten|nuts|peanuts|tree nuts|dairy|milk|shellfish|fish|soy|eggs|sesame|vegetarian|vegan|halal|kosher)/gi,
    /(?:have|with)\s+(?:some\s+)?(?:guests? with|allergies|restrictions)\s+(?:to\s+)?(?:gluten|nuts|peanuts|tree nuts|dairy|milk|shellfish|fish|soy|eggs|sesame|vegetarian|vegan|halal|kosher)/gi,
    /(?:gluten|nut|peanut|dairy|shellfish|fish|soy|egg|sesame)\s+(?:free|free|allergy|allergic|intolerant)/gi,
  ],
};

// Event type mapping
const EVENT_TYPE_MAPPING: Record<string, string> = {
  wedding: "wedding",
  birthday: "birthday",
  anniversary: "anniversary",
  "corporate event": "corporate",
  "holiday party": "holiday_party",
  "baby shower": "baby_shower",
  graduation: "graduation",
  "bar mitzvah": "bar_mitzvah",
  "bat mitzvah": "bat_mitzvah",
  quinceañera: "quinceanera",
  reception: "reception",
  gala: "gala",
  fundraiser: "fundraiser",
  conference: "conference",
  meeting: "meeting",
  seminar: "seminar",
  workshop: "workshop",
};

// Service style mapping
const SERVICE_STYLE_MAPPING: Record<string, string> = {
  buffet: "buffet",
  plated: "plated",
  "sit-down": "sit_down",
  "family style": "family_style",
  cocktail: "cocktail",
  standing: "cocktail",
  "hors d'oeuvres": "cocktail",
  "appetizers only": "cocktail",
  "full service": "full_service",
};

// Month mapping
const MONTH_MAPPING: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Extract event details from a transcript using rule-based patterns
 */
export function extractEventDetails(transcript: string): ExtractedEventDetails {
  const details: ExtractedDetail[] = [];
  const result: ExtractedEventDetails = {
    details: [],
  };

  // Extract client name
  for (const pattern of PATTERNS.clientName) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const name = match[1].trim();
        if (name && name.length > 1) {
          result.clientName = name;
          details.push({
            fieldName: "clientName",
            rawValue: name,
            confidence: "high",
            sourceQuote: match[0],
          });
          break;
        }
      }
    }
    if (result.clientName) break;
  }

  // Extract event type
  for (const pattern of PATTERNS.eventType) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const eventType = match[1].toLowerCase().trim();
        const mappedType = EVENT_TYPE_MAPPING[eventType];
        if (mappedType) {
          result.eventType = mappedType;
          details.push({
            fieldName: "eventType",
            rawValue: match[1],
            normalizedValue: mappedType,
            confidence: "high",
            sourceQuote: match[0],
          });
          break;
        }
      }
    }
    if (result.eventType) break;
  }

  // Extract dates
  for (const pattern of PATTERNS.dates) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      try {
        let date: Date | null = null;

        if (match[1] && match[2]) {
          // Format: "15 January 2024" or "January 15 2024"
          const day = parseInt(match[1], 10);
          const monthStr = match[2].toLowerCase();
          const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

          const month = MONTH_MAPPING[monthStr];
          if (month && day > 0 && day <= 31) {
            date = new Date(year, month - 1, day);
          }
        } else if (match[1] && match[2] && match[3]) {
          // Format: "01/15/2024"
          const month = parseInt(match[1], 10);
          const day = parseInt(match[2], 10);
          const yearStr = match[3];
          const year = parseInt(yearStr, 10) || (parseInt(yearStr, 10) < 100 ? 2000 + parseInt(yearStr, 10) : new Date().getFullYear());

          if (month >= 1 && month <= 12 && day > 0 && day <= 31) {
            date = new Date(year, month - 1, day);
          }
        }

        if (date && date.getTime() > Date.now()) {
          result.eventDate = date;
          details.push({
            fieldName: "eventDate",
            rawValue: match[0],
            normalizedValue: date.toISOString(),
            confidence: "high",
            sourceQuote: match[0],
          });
          break;
        }
      } catch {
        // Skip invalid dates
      }
    }
    if (result.eventDate) break;
  }

  // Extract times
  for (const pattern of PATTERNS.times) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        const timeStr = match[0].trim();
        result.eventTime = timeStr;
        details.push({
          fieldName: "eventTime",
          rawValue: timeStr,
          confidence: "medium",
          sourceQuote: match[0],
        });
        break;
      }
    }
    if (result.eventTime) break;
  }

  // Extract guest counts
  for (const pattern of PATTERNS.guestCounts) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const count = parseInt(match[1], 10);
        if (count > 0) {
          result.guestCount = count;
          details.push({
            fieldName: "guestCount",
            rawValue: match[1],
            normalizedValue: count,
            confidence: "high",
            sourceQuote: match[0],
          });
          break;
        }
      }
      // Check for range pattern (match[2] would be the max value)
      if (match[1] && match[2]) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        if (min > 0 && max > 0 && min <= max) {
          result.guestCountMin = min;
          result.guestCountMax = max;
          // Use average as primary count
          result.guestCount = Math.floor((min + max) / 2);
          details.push({
            fieldName: "guestCount",
            rawValue: match[0],
            normalizedValue: result.guestCount,
            confidence: "medium",
            sourceQuote: match[0],
          });
          break;
        }
      }
    }
    if (result.guestCount) break;
  }

  // Extract venue
  for (const pattern of PATTERNS.venues) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const venue = match[1].trim();
        if (venue && venue.length > 2) {
          result.venuePreference = venue;
          details.push({
            fieldName: "venuePreference",
            rawValue: venue,
            confidence: "medium",
            sourceQuote: match[0],
            catalogMatchType: "custom_unmatched",
          });
          break;
        }
      }
    }
    if (result.venuePreference) break;
  }

  // Extract service style
  for (const pattern of PATTERNS.serviceStyles) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      const serviceStyle = match[0]
        .toLowerCase()
        .replace(/\s+(?:dinner|lunch|breakfast)?/, "")
        .trim();
      const mappedStyle = SERVICE_STYLE_MAPPING[serviceStyle];
      if (mappedStyle) {
        result.serviceStyle = mappedStyle;
        details.push({
          fieldName: "serviceStyle",
          rawValue: match[0],
          normalizedValue: mappedStyle,
          confidence: "high",
          sourceQuote: match[0],
        });
        break;
      }
    }
    if (result.serviceStyle) break;
  }

  // Extract budget
  for (const pattern of PATTERNS.budgets) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      try {
        let budget: number | null = null;
        let budgetMin: number | null = null;
        let budgetMax: number | null = null;

        if (match[1] && match[2]) {
          // Range pattern
          budgetMin = parseCurrency(match[1]);
          budgetMax = parseCurrency(match[2]);
          if (budgetMin && budgetMax) {
            budget = (budgetMin + budgetMax) / 2;
          }
        } else if (match[1]) {
          // Single value
          budget = parseCurrency(match[1]);
        }

        if (budget && budget > 0) {
          result.budgetMin = budgetMin || budget;
          result.budgetMax = budgetMax || budget;
          details.push({
            fieldName: "budget",
            rawValue: match[0],
            normalizedValue: budget,
            confidence: "medium",
            sourceQuote: match[0],
          });
          break;
        }
      } catch {
        // Skip invalid budgets
      }
    }
    if (result.budgetMin || result.budgetMax) break;
  }

  // Extract dietary restrictions
  const dietaryRestrictions: string[] = [];
  for (const pattern of PATTERNS.dietary) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      const restriction = match[0]
        .toLowerCase()
        .replace(/(?:have|with|some|guests?|allergic?|restrictions?|cannot|can't)\s+(?:to\s+)?/g, "")
        .trim();
      if (restriction && !dietaryRestrictions.includes(restriction)) {
        dietaryRestrictions.push(restriction);
      }
    }
  }
  if (dietaryRestrictions.length > 0) {
    result.dietaryRestrictions = dietaryRestrictions.join(", ");
    details.push({
      fieldName: "dietaryRestrictions",
      rawValue: result.dietaryRestrictions,
      confidence: "medium",
    });
  }

  // Generate summary
  result.aiSummary = generateSummary(result, transcript);

  // Calculate overall confidence
  const confidenceScores = details.map((d) => {
    switch (d.confidence) {
      case "high":
        return 1.0;
      case "medium":
        return 0.6;
      case "low":
        return 0.3;
      default:
        return 0.5;
    }
  });
  result.overallConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0.5;

  // Extract open questions (sentences that are uncertain or questions)
  const openQuestions = extractOpenQuestions(transcript);
  if (openQuestions.length > 0) {
    result.openQuestions = openQuestions;
  }

  // Store all details
  result.details = details;

  return result;
}

/**
 * Parse currency string to number
 */
function parseCurrency(value: string): number {
  // Remove currency symbols, commas, and convert to number
  const cleaned = value.replace(/[$,]/g, "").trim();
  return parseFloat(cleaned) || 0;
}

/**
 * Generate a summary of the extracted event details
 */
function generateSummary(result: ExtractedEventDetails, transcript: string): string {
  const parts: string[] = [];

  if (result.clientName) {
    parts.push(`Event for ${result.clientName}`);
  }

  if (result.eventType) {
    parts.push(result.eventType.replace(/_/g, " "));
  }

  if (result.eventDate) {
    parts.push(`on ${result.eventDate.toLocaleDateString()}`);
  }

  if (result.guestCount) {
    parts.push(`for ${result.guestCount} guests`);
    if (result.guestCountMin && result.guestCountMax) {
      parts.push(`(${result.guestCountMin}-${result.guestCountMax} range)`);
    }
  }

  if (result.venuePreference) {
    parts.push(`at ${result.venuePreference}`);
  }

  if (result.serviceStyle) {
    parts.push(`${result.serviceStyle.replace(/_/g, " ")} service`);
  }

  if (result.budgetMin || result.budgetMax) {
    if (result.budgetMin === result.budgetMax) {
      parts.push(`budget of $${result.budgetMin?.toFixed(0)}`);
    } else {
      parts.push(
        `budget range $${result.budgetMin?.toFixed(0)} - $${result.budgetMax?.toFixed(0)}`
      );
    }
  }

  if (result.dietaryRestrictions) {
    parts.push(`with dietary restrictions: ${result.dietaryRestrictions}`);
  }

  if (parts.length === 0) {
    return "No specific event details detected in transcript.";
  }

  return parts.join(" ") + ".";
}

/**
 * Extract open questions from transcript
 */
function extractOpenQuestions(transcript: string): string[] {
  const questions: string[] = [];

  // Look for question patterns
  const questionPatterns = [
    /(?:do you|can you|would you|could you|should we|will we|how many|what kind|what type|which|when|where|who)\s+[^.!?]*[?]/gi,
    /(?:we're|i'm|we are|i am)\s+(?:not sure|uncertain|unsure|don't know|thinking about|considering)[^.!?]*[.!?]/gi,
    /(?:need to|have to|must)\s+(?:decide|determine|figure out|confirm|check)[^.!?]*[.!?]/gi,
  ];

  for (const pattern of questionPatterns) {
    const matches = transcript.match(pattern);
    if (matches) {
      questions.push(...matches);
    }
  }

  // Return unique questions, limited to 5
  return [...new Set(questions)].slice(0, 5);
}
