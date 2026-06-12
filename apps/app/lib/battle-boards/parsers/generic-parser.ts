import type { ParsedDocumentResult } from "../types";

export function parseGenericPdf(lines: string[]): ParsedDocumentResult {
  const warnings: string[] = [];

  const meta: ParsedDocumentResult["data"]["meta"] = {};
  const timeline: ParsedDocumentResult["data"]["timeline"] = [];
  const staff: ParsedDocumentResult["data"]["staff"] = [];

  for (const line of lines) {
    const kvMatch = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].toLowerCase().trim();
      const value = kvMatch[2].trim();

      if (
        key.includes("client") ||
        key.includes("customer") ||
        key.includes("company")
      ) {
        meta.event_name = value;
      } else if (
        key.includes("invoice") ||
        key.includes("event number") ||
        key.includes("job")
      ) {
        meta.event_number = value;
      } else if (key.includes("date") && !key.includes("update")) {
        try {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            meta.event_date = d.toISOString().split("T")[0];
          }
        } catch {
          /* skip */
        }
      } else if (key.includes("venue") || key.includes("location")) {
        meta.venue_name = value;
      } else if (key.includes("address")) {
        meta.venue_address = value;
      } else if (
        key.includes("guest") ||
        key.includes("headcount") ||
        key.includes("attendee")
      ) {
        const num = Number.parseInt(value, 10);
        if (!isNaN(num)) {
          meta.headcount = num;
        }
      } else if (key.includes("style") || key.includes("service")) {
        meta.service_style = value;
      }
    }

    const timeMatch = line.match(
      /^(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–:]\s*(.+)/i
    );
    if (timeMatch) {
      timeline.push({
        time: timeMatch[1].trim(),
        item: timeMatch[2].trim(),
        team: "",
        location: "",
        style: "",
        notes: "",
        highlighted: false,
        sort_order: timeline.length,
      });
    }
  }

  if (!(meta.event_name || meta.event_number)) {
    warnings.push("Could not identify event name or number from document");
  }
  if (timeline.length === 0) {
    warnings.push("No timeline entries detected");
  }

  return {
    success: true,
    format: "generic",
    confidence: meta.event_name ? "medium" : "low",
    data: { meta, staff, timeline, layouts: [] },
    warnings,
  };
}
