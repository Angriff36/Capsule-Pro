// apps/app/lib/battle-boards/parsers/csv-parser.ts
import type { ParsedDocumentResult } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

interface StaffShift {
  name: string;
  position: string;
  scheduledIn: string;
  scheduledOut: string;
  tasks?: string[];
}

interface StaffCsvParseResult {
  groups: Map<string, StaffShift[]>;
  warnings: string[];
}

// ── Public entry point ───────────────────────────────────────────────────────

export function parseCsvDocument(text: string): ParsedDocumentResult {
  const { groups, warnings } = parseStaffCsv(text);
  const events = [...groups.keys()];
  const eventName = events[0];

  if (eventName === undefined) {
    return {
      success: false,
      format: "csv",
      confidence: "low",
      data: { meta: {}, staff: [], timeline: [], layouts: [] },
      warnings,
      error: "No events found in CSV file",
    };
  }

  const eventStaff = groups.get(eventName) || [];

  return {
    success: true,
    format: "csv",
    confidence: "high",
    data: {
      meta: { event_name: eventName },
      staff: eventStaff.map((shift, idx) => ({
        name: shift.name,
        role: shift.position || "Staff",
        shift_start: formatTime12Hour(shift.scheduledIn),
        shift_end: formatTime12Hour(shift.scheduledOut),
        station: inferStation(shift),
        sort_order: idx,
      })),
      timeline: [],
      layouts: [],
    },
    warnings,
  };
}

// ── Core parser (from Battle-Boards staffCsvParser.ts) ──────────────────────

function parseStaffCsv(text: string): StaffCsvParseResult {
  const rows = parseCsvRows(text);
  const warnings: string[] = [];

  const headerRow = rows[0];
  if (!headerRow) {
    return { groups: new Map(), warnings: ["CSV file is empty"] };
  }

  const header = headerRow.map((cell) => cell.trim());
  const column = (name: string) =>
    header.findIndex((col) => col.toLowerCase() === name.toLowerCase());

  const eventNameIdx = column("Event Name");
  const firstNameIdx = column("First Name");
  const lastNameIdx = column("Last Name");
  const positionIdx = column("Position");
  const scheduledInIdx = column("Scheduled In");
  const scheduledOutIdx = column("Scheduled Out");

  const required = [
    eventNameIdx,
    firstNameIdx,
    lastNameIdx,
    positionIdx,
    scheduledInIdx,
    scheduledOutIdx,
  ];
  if (required.some((idx) => idx === -1)) {
    warnings.push(
      "One or more required columns missing (Event Name, First Name, Last Name, Position, Scheduled In, Scheduled Out)."
    );
  }

  const groups = new Map<string, StaffShift[]>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) {
      continue;
    }
    if (row.every((c) => !c.trim())) {
      continue;
    }

    const eventName = (row[eventNameIdx] ?? "").trim();
    if (!eventName) {
      warnings.push(`Row ${i + 1}: missing event name`);
      continue;
    }

    const firstName = (row[firstNameIdx] ?? "").trim();
    const lastName = (row[lastNameIdx] ?? "").trim();
    const name = lastName ? `${firstName} ${lastName}` : firstName;
    if (!name.trim()) {
      continue;
    }

    if (!groups.has(eventName)) {
      groups.set(eventName, []);
    }
    groups.get(eventName)!.push({
      name,
      position: (row[positionIdx] ?? "").trim(),
      scheduledIn: parseTime(row[scheduledInIdx]),
      scheduledOut: parseTime(row[scheduledOutIdx]),
    });
  }

  return { groups, warnings };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (char === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }
    currentValue += char;
  }
  currentRow.push(currentValue);
  rows.push(currentRow);
  return rows;
}

function parseTime(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|am|pm)?$/i);
  if (!match) {
    return trimmed;
  }
  const [, hourStr, minuteStr, meridiem] = match;
  let hour = Number.parseInt(hourStr ?? "", 10);
  const minute = Number.parseInt(minuteStr ?? "", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return trimmed;
  }
  if (meridiem) {
    const lower = meridiem.toLowerCase();
    if (lower.includes("p") && hour < 12) {
      hour += 12;
    }
    if (lower.includes("a") && hour === 12) {
      hour = 0;
    }
  }
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// ── Adapter helpers ──────────────────────────────────────────────────────────

function formatTime12Hour(time24: string): string {
  if (!time24?.trim()) {
    return "";
  }
  if (/[AP]M/i.test(time24)) {
    return time24;
  }
  if (!time24.includes(":")) {
    return time24;
  }
  const [hoursStr, minutesStr] = time24.split(":");
  const hours = Number.parseInt(hoursStr ?? "", 10);
  const minutes = Number.parseInt(minutesStr ?? "", 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time24;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function inferStation(shift: StaffShift): string {
  const position = shift.position.toLowerCase();
  if (
    position.includes("chef") ||
    position.includes("cook") ||
    position.includes("boh")
  ) {
    return "Kitchen";
  }
  if (
    position.includes("server") ||
    position.includes("waiter") ||
    position.includes("foh")
  ) {
    return "Front of House";
  }
  if (position.includes("bartender") || position.includes("bar")) {
    return "Bar";
  }
  if (position.includes("captain") || position.includes("lead")) {
    return "Lead";
  }
  if (position.includes("expo")) {
    return "Expo";
  }
  if (position.includes("driver") || position.includes("delivery")) {
    return "Transport";
  }
  return "General";
}
