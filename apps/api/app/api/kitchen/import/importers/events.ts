import { database } from "@repo/database";
import { parseError as parseErrorToMessage } from "@repo/observability/error";
import { runKitchenImportCommand } from "../lib/manifest-command";
import {
  emptySummary,
  parseIntOpt,
  parseListOpt,
  trimOpt,
} from "../lib/parse-helpers";
import type { CsvRow, ImportSummary, ImportUserContext } from "../lib/types";

const VALID_STATUSES = new Set([
  "draft",
  "confirmed",
  "tentative",
  "postponed",
  "completed",
  "cancelled",
]);

async function resolveLocationId(tenantId: string): Promise<string> {
  const location = await database.location.findFirst({
    where: { tenantId, deletedAt: null, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  return location?.id ?? "";
}

function parseEventDate(raw: string | null | undefined): Date | null {
  const value = trimOpt(raw ?? undefined);
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function importEvents(
  rows: CsvRow[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const summary = emptySummary();
  const { tenantId, userId, userRole } = context;
  const locationId = await resolveLocationId(tenantId);

  for (const row of rows) {
    const title = trimOpt(row.title);
    if (!title) {
      summary.errors.push("Row missing event title, skipped");
      summary.skipped++;
      continue;
    }

    const eventDate = parseEventDate(row.event_date ?? row.date);
    if (!eventDate) {
      summary.errors.push(
        `"${title}": Invalid or missing event_date (use YYYY-MM-DD), skipped`
      );
      summary.skipped++;
      continue;
    }

    try {
      const statusRaw = trimOpt(row.status)?.toLowerCase() ?? "tentative";
      const status = VALID_STATUSES.has(statusRaw) ? statusRaw : "tentative";
      const guestCount = Math.max(1, parseIntOpt(row.guest_count) ?? 1);

      const duplicate = await database.event.findFirst({
        where: {
          tenantId,
          title,
          eventDate,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (duplicate) {
        summary.skipped++;
        summary.errors.push(
          `"${title}": Event already exists on ${eventDate.toISOString().slice(0, 10)}, skipped`
        );
        continue;
      }

      const result = await runKitchenImportCommand(
        { id: userId, tenantId, role: userRole },
        "Event",
        "create",
        {
          tenantId,
          title,
          eventDate,
          guestCount,
          locationId,
          status,
          eventType: trimOpt(row.event_type) ?? "catering",
          clientId: "",
          eventNumber: trimOpt(row.event_number) ?? "",
          venueName: trimOpt(row.venue_name) ?? "",
          venueAddress: trimOpt(row.venue_address) ?? "",
          notes: trimOpt(row.notes) ?? "",
          tags: parseListOpt(row.tags),
          budget: 0,
          ticketPrice: 0,
          ticketTier: "",
          eventFormat: trimOpt(row.event_format) ?? "",
          accessibilityOptions: [],
          featuredMediaUrl: "",
        }
      );

      if (!result.ok) {
        throw new Error(
          `Failed to create Event via Manifest: ${result.message}`
        );
      }

      summary.imported++;
      summary.created.push(
        `Event: ${title} (${eventDate.toISOString().slice(0, 10)})`
      );
    } catch (error) {
      summary.errors.push(`"${title}": ${parseErrorToMessage(error)}`);
      summary.skipped++;
    }
  }

  return summary;
}
