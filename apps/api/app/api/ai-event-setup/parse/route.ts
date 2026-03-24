// AI Event Setup Session - Parse Command
// Handles natural language parsing for event creation
// Route: POST /api/ai-event-setup/parse

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export const runtime = "nodejs";

// ── Natural Language Event Parsing Logic ─────────────────────────────────

interface ParsedEventData {
  title: string;
  eventType: string;
  eventDate: number | null;
  guestCount: number;
  venueName: string;
  venueAddress: string;
  notes: string;
  tags: string;
  confidence: number;
  missingFields: string[];
  suggestions: string[];
}

const EVENT_TYPE_PATTERNS: Array<{
  pattern: RegExp;
  eventType: string;
}> = [
  { pattern: /\b(wedding|marriage|bride|groom)\b/i, eventType: "wedding" },
  { pattern: /\b(corporate|business|company|conference|meeting)\b/i, eventType: "corporate" },
  { pattern: /\b(birthday|b-day|bday)\b/i, eventType: "birthday" },
  { pattern: /\b(anniversary)\b/i, eventType: "anniversary" },
  { pattern: /\b(graduation|graduate)\b/i, eventType: "graduation" },
  { pattern: /\b(holiday|christmas|thanksgiving|easter|hanukkah)\b/i, eventType: "holiday" },
  { pattern: /\b(gala|fundraiser|charity)\b/i, eventType: "gala" },
  { pattern: /\b(catering|catered)\b/i, eventType: "catering" },
  { pattern: /\b(party|celebration|celebrate)\b/i, eventType: "party" },
];

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH_ABBREVIATIONS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "sept", "oct", "nov", "dec",
];

function parseMonth(text: string): number | null {
  const lower = text.toLowerCase();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(MONTH_NAMES[i])) return i;
  }
  for (let i = 0; i < MONTH_ABBREVIATIONS.length; i++) {
    const regex = new RegExp(`\\b${MONTH_ABBREVIATIONS[i]}\\.?\\b`, "i");
    if (regex.test(lower)) return i;
  }
  return null;
}

function parseDayOfMonth(text: string): number | null {
  const monthDayPattern = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthDayMatch = text.match(monthDayPattern);
  if (monthDayMatch) {
    const day = parseInt(monthDayMatch[1], 10);
    if (day >= 1 && day <= 31) return day;
  }

  const onDayPattern = /\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const onDayMatch = text.match(onDayPattern);
  if (onDayMatch) {
    const day = parseInt(onDayMatch[1], 10);
    if (day >= 1 && day <= 31) return day;
  }

  const standalonePattern = /(?<!\bfor\s+)(\d{1,2})(?:st|nd|rd|th)\b/i;
  const standaloneMatch = text.match(standalonePattern);
  if (standaloneMatch) {
    const day = parseInt(standaloneMatch[1], 10);
    if (day >= 1 && day <= 31) return day;
  }

  return null;
}

function parseYear(text: string): number | null {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[1], 10) : null;
}

function parseRelativeDate(text: string, referenceDate: Date): { date: Date; confidence: number } | null {
  const lower = text.toLowerCase();

  if (/\btomorrow\b/.test(lower)) {
    const tomorrow = new Date(referenceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { date: tomorrow, confidence: 0.95 };
  }

  if (/\bnext\s+week\b/.test(lower)) {
    const nextWeek = new Date(referenceDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return { date: nextWeek, confidence: 0.7 };
  }

  const inWeeksMatch = lower.match(/\bin\s+(\d+)\s+weeks?\b/);
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1], 10);
    const result = new Date(referenceDate);
    result.setDate(result.getDate() + weeks * 7);
    return { date: result, confidence: 0.95 };
  }

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextDayMatch = lower.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1].toLowerCase());
    const result = new Date(referenceDate);
    const currentDay = result.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    daysUntil += 7;
    result.setDate(result.getDate() + daysUntil);
    return { date: result, confidence: 0.9 };
  }

  const thisDayMatch = lower.match(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (thisDayMatch) {
    const targetDay = dayNames.indexOf(thisDayMatch[1].toLowerCase());
    const result = new Date(referenceDate);
    const currentDay = result.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    result.setDate(result.getDate() + daysUntil);
    return { date: result, confidence: 0.9 };
  }

  const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const result = new Date(referenceDate);
    result.setDate(result.getDate() + days);
    return { date: result, confidence: 0.95 };
  }

  return null;
}

function parseAbsoluteDate(text: string, referenceDate: Date): { date: Date; confidence: number } | null {
  const month = parseMonth(text);
  if (month === null) return null;

  const day = parseDayOfMonth(text);
  if (day === null) return null;

  let year = parseYear(text);
  if (year === null) {
    year = referenceDate.getFullYear();
    const candidateDate = new Date(year, month, day);
    if (candidateDate < referenceDate) year++;
  }

  const date = new Date(year, month, day);
  if (date.getMonth() !== month || date.getDate() !== day) return null;

  return { date, confidence: 0.95 };
}

function parseEventDate(text: string, referenceDate: Date): { timestamp: number; confidence: number } | null {
  const relative = parseRelativeDate(text, referenceDate);
  if (relative) {
    return { timestamp: Math.floor(relative.date.getTime() / 1000), confidence: relative.confidence };
  }

  const absolute = parseAbsoluteDate(text, referenceDate);
  if (absolute) {
    return { timestamp: Math.floor(absolute.date.getTime() / 1000), confidence: absolute.confidence };
  }

  return null;
}

function parseGuestCount(text: string): number | null {
  const patterns = [
    /(?:for\s+)?(\d+)\s*(?:people|guests?|pax|persons?|attendees?)\b/i,
    /(\d+)\s*(?:people|guests?|pax|persons?|attendees?)\b/i,
    /\bfor\s+(\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count > 0 && count <= 100000) return count;
    }
  }

  return null;
}

function parseVenue(text: string): { name: string; address: string } {
  const stopWords = [
    "on", "in", "for", "with", "by", "from", "to", "next", "this",
    "tomorrow", "today", "january", "february", "march", "april", "may",
    "june", "july", "august", "september", "october", "november", "december"
  ];

  const atMatch = text.match(/\b(?:at|@)\s+(?:the\s+)?([A-Z][A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
  if (atMatch) {
    let venueName = atMatch[1].trim();
    const words = venueName.split(/\s+/);
    const filteredWords: string[] = [];
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      if (stopWords.includes(lowerWord) || /^\d/.test(word)) break;
      filteredWords.push(word);
    }
    venueName = filteredWords.join(" ");
    if (venueName.length > 2 && !/^\d/.test(venueName)) {
      return { name: venueName, address: "" };
    }
  }

  const venueColonMatch = text.match(/\bvenue[:\s]+["']?([A-Za-z\s]+?)["']?(?:\s|$)/i);
  if (venueColonMatch) {
    const venueName = venueColonMatch[1].trim();
    if (venueName.length > 2) return { name: venueName, address: "" };
  }

  const venueTypes = ["ballroom", "hall", "hotel", "center", "centre", "house", "home", "restaurant", "venue", "garden", "park"];
  const venueTypeRegex = new RegExp(`\\b(?:at|@)\\s+(?:the\\s+)?([A-Za-z]+\\s+(?:${venueTypes.join("|")}))`, "i");
  const venueTypeMatch = text.match(venueTypeRegex);
  if (venueTypeMatch) {
    return { name: venueTypeMatch[1].trim(), address: "" };
  }

  return { name: "", address: "" };
}

function inferEventType(text: string): { eventType: string; confidence: number } {
  for (const { pattern, eventType } of EVENT_TYPE_PATTERNS) {
    if (pattern.test(text)) return { eventType, confidence: 0.9 };
  }

  if (/\b(food|menu|catering|dinner|lunch|breakfast|meal|buffet)\b/i.test(text)) {
    return { eventType: "catering", confidence: 0.7 };
  }

  return { eventType: "general", confidence: 0.5 };
}

function generateTitle(
  text: string,
  eventType: string,
  guestCount: number | null,
  venueName: string
): string {
  let cleaned = text
    .replace(/^(create|plan|schedule|set up|organize|need|want)\s+(an?\s+)?/i, "")
    .replace(/\bfor\s+\d+\s*(people|guests?|pax)?\b/gi, "")
    .replace(/\bon\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?/gi, "")
    .replace(/\bat\s+\d+\s*(pm|am)?/gi, "")
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  const parts: string[] = [];
  if (eventType && eventType !== "general") {
    parts.push(eventType.charAt(0).toUpperCase() + eventType.slice(1));
  }
  if (venueName) parts.push(`at ${venueName}`);
  if (guestCount && guestCount > 0) parts.push(`(${guestCount} guests)`);

  const generatedTitle = parts.join(" ");
  return generatedTitle || cleaned || "New Event";
}

function parseNaturalLanguageEvent(text: string, referenceDate: Date = new Date()): ParsedEventData {
  const missingFields: string[] = [];
  const suggestions: string[] = [];

  const guestCount = parseGuestCount(text) ?? 0;
  if (guestCount === 0) {
    missingFields.push("guestCount");
    suggestions.push("How many guests will attend?");
  }

  const dateResult = parseEventDate(text, referenceDate);
  const eventDate = dateResult?.timestamp ?? null;
  if (!eventDate) {
    missingFields.push("eventDate");
    suggestions.push("When is the event? (e.g., 'March 25th', 'next Friday')");
  }

  const venue = parseVenue(text);
  if (!venue.name) {
    missingFields.push("venueName");
    suggestions.push("Where will the event be held?");
  }

  const typeResult = inferEventType(text);
  const title = generateTitle(text, typeResult.eventType, guestCount, venue.name);

  let confidence = 0.5;
  if (guestCount > 0) confidence += 0.15;
  if (eventDate) confidence += 0.2;
  if (venue.name) confidence += 0.1;
  if (typeResult.confidence > 0.7) confidence += 0.05;
  confidence = Math.min(confidence, 1);

  return {
    title,
    eventType: typeResult.eventType,
    eventDate,
    guestCount: guestCount > 0 ? guestCount : 1,
    venueName: venue.name,
    venueAddress: venue.address,
    notes: "",
    tags: typeResult.eventType !== "general" ? typeResult.eventType : "",
    confidence,
    missingFields,
    suggestions,
  };
}

// ── Route Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const originalInput = typeof body.originalInput === "string" ? body.originalInput : "";

    if (!originalInput.trim()) {
      return manifestErrorResponse("originalInput is required", 400);
    }

    console.log("[ai-event-setup/parse] Parsing natural language event:", {
      input: originalInput.substring(0, 100),
      tenantId,
    });

    // Parse the reference date if provided
    let referenceDate = new Date();
    if (typeof body.referenceDate === "string") {
      try {
        referenceDate = new Date(body.referenceDate);
      } catch {
        // Use default
      }
    }

    // Perform the parsing
    const parsed = parseNaturalLanguageEvent(originalInput, referenceDate);

    // Generate a session ID for tracking
    const sessionId = crypto.randomUUID();

    console.log("[ai-event-setup/parse] Parse result:", {
      sessionId,
      title: parsed.title,
      eventType: parsed.eventType,
      guestCount: parsed.guestCount,
      confidence: parsed.confidence,
      missingFields: parsed.missingFields,
    });

    return manifestSuccessResponse({
      result: {
        sessionId,
        originalInput,
        parsedTitle: parsed.title,
        parsedEventType: parsed.eventType,
        parsedEventDate: parsed.eventDate,
        parsedGuestCount: parsed.guestCount,
        parsedVenueName: parsed.venueName,
        parsedVenueAddress: parsed.venueAddress,
        parsedNotes: parsed.notes,
        parsedTags: parsed.tags,
        status: "parsed",
        confidence: parsed.confidence,
        missingFields: parsed.missingFields,
        suggestions: parsed.suggestions,
        readyToCreate: parsed.missingFields.length === 0,
      },
      events: [{
        type: "ai-event-setup.session.parsed",
        payload: {
          sessionId,
          originalInput,
          parsedAt: Math.floor(Date.now() / 1000),
        },
      }],
    });
  } catch (error) {
    console.error("[ai-event-setup/parse] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
