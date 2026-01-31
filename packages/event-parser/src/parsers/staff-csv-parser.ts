/**
 * Staff CSV Parser
 * Parses Time & Attendance CSV exports to extract staff shift data
 */

import type { StaffShift } from "../types/index.js";

export type StaffCsvParseResult = {
  shifts: Map<string, StaffShift[]>; // eventName -> shifts
  errors: string[];
  totalShifts: number;
};

/**
 * Parse a staff roster CSV file
 * Expected columns: Event Name, First Name, Last Name, Position, Scheduled In, Scheduled Out, Scheduled Hours
 */
export function parseStaffCsv(csvContent: string): StaffCsvParseResult {
  const errors: string[] = [];
  const shifts = new Map<string, StaffShift[]>();
  let totalShifts = 0;

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    errors.push("CSV file has no data rows");
    return { shifts, errors, totalShifts };
  }

  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map((h) => h.toLowerCase().trim());

  // Find column indices
  const eventNameIdx = findColumnIndex(headers, [
    "event name",
    "event",
    "eventname",
  ]);
  const firstNameIdx = findColumnIndex(headers, [
    "first name",
    "firstname",
    "first",
  ]);
  const lastNameIdx = findColumnIndex(headers, [
    "last name",
    "lastname",
    "last",
  ]);
  const positionIdx = findColumnIndex(headers, ["position", "role", "title"]);
  const scheduledInIdx = findColumnIndex(headers, [
    "scheduled in",
    "start time",
    "start",
    "in",
  ]);
  const scheduledOutIdx = findColumnIndex(headers, [
    "scheduled out",
    "end time",
    "end",
    "out",
  ]);
  const hoursIdx = findColumnIndex(headers, [
    "scheduled hours",
    "hours",
    "total hours",
  ]);
  const rateIdx = findColumnIndex(headers, ["rate", "hourly rate", "pay rate"]);

  // Validate required columns
  if (eventNameIdx === -1) {
    errors.push("Missing required column: Event Name");
  }
  if (firstNameIdx === -1 && lastNameIdx === -1) {
    errors.push("Missing required column: First Name or Last Name");
  }
  if (scheduledInIdx === -1) {
    errors.push("Missing required column: Scheduled In");
  }

  if (errors.length > 0) {
    return { shifts, errors, totalShifts };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length === 0) {
      continue;
    }

    // Skip empty rows and totals rows
    const firstCell = row[0]?.trim().toLowerCase() || "";
    if (!firstCell || firstCell === "totals" || firstCell.startsWith("total")) {
      continue;
    }

    try {
      const eventName = row[eventNameIdx]?.trim() || "Unknown Event";

      // Skip if event name is empty or looks like a summary row
      if (!eventName || eventName.toLowerCase() === "totals") {
        continue;
      }
      const firstName = row[firstNameIdx]?.trim() || "";
      const lastName = row[lastNameIdx]?.trim() || "";
      const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
      const position = row[positionIdx]?.trim() || "Staff";
      const scheduledIn = row[scheduledInIdx]?.trim() || "";
      const scheduledOut = row[scheduledOutIdx]?.trim() || "";
      const hours = Number.parseFloat(row[hoursIdx]?.trim() || "0") || 0;

      // Parse times
      const { time: startTime24 } = parseTimeString(scheduledIn);
      const { time: endTime24 } = parseTimeString(scheduledOut);

      // Calculate hours if not provided
      let scheduledHours = hours;
      if (scheduledHours === 0 && startTime24 && endTime24) {
        scheduledHours = calculateHoursBetween(startTime24, endTime24);
      }

      // Parse rate (remove $ and commas)
      const rateStr = row[rateIdx]?.trim().replace(/[$,]/g, "") || "0";
      const rate = Number.parseFloat(rateStr) || 0;

      const shift: StaffShift = {
        name,
        position,
        scheduledIn: startTime24 || scheduledIn,
        scheduledOut: endTime24 || scheduledOut,
        scheduledHours,
        rate,
      };

      if (!shifts.has(eventName)) {
        shifts.set(eventName, []);
      }
      shifts.get(eventName)?.push(shift);
      totalShifts++;
    } catch (e) {
      errors.push(
        `Error parsing row ${i + 1}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  }

  return { shifts, errors, totalShifts };
}

/**
 * Get all event names from parsed shifts
 */
export function getEventNamesFromShifts(result: StaffCsvParseResult): string[] {
  return Array.from(result.shifts.keys());
}

/**
 * Get shifts for a specific event
 */
export function getShiftsForEvent(
  result: StaffCsvParseResult,
  eventName: string
): StaffShift[] {
  return result.shifts.get(eventName) || [];
}

// --- Helper Functions ---

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      // Start of quoted field
      inQuotes = true;
    } else if (char === ",") {
      // Field separator
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(
      (h) => h === candidate || h.includes(candidate)
    );
    if (idx !== -1) {
      return idx;
    }
  }
  return -1;
}

function parseTimeString(timeStr: string): { time: string; meridiem: string } {
  if (!timeStr) {
    return { time: "", meridiem: "" };
  }

  // Handle various time formats
  // HH:MM AM/PM, H:MM AM/PM, HH:MM, etc.
  const match = timeStr.match(
    /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i
  );

  if (!match) {
    return { time: timeStr, meridiem: "" };
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = (match[4] || "").toLowerCase().replace(".", "");

  // Convert to 24-hour format
  if (meridiem.includes("p") && hours < 12) {
    hours += 12;
  } else if (meridiem.includes("a") && hours === 12) {
    hours = 0;
  }

  const time24 = `${hours.toString().padStart(2, "0")}:${minutes}`;
  return { time: time24, meridiem };
}

function calculateHoursBetween(start: string, end: string): number {
  const [startHours, startMins] = start.split(":").map(Number);
  const [endHours, endMins] = end.split(":").map(Number);

  const startMinutes = startHours * 60 + startMins;
  let endMinutes = endHours * 60 + endMins;

  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}
