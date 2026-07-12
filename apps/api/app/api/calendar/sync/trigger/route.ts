import { auth } from "@repo/auth/server";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Uses createManifestRuntime — requires Node.js runtime (not Edge)
export const runtime = "nodejs";

/** User context required by Manifest runtime commands */
interface ManifestUser {
  id: string;
  role: string;
  tenantId: string;
}

/**
 * Run a Manifest command internally (not returning HTTP Response).
 * Returns the created/mutated entity data including `id`.
 */
async function execCommand(
  entity: string,
  command: string,
  body: Record<string, unknown>,
  user: ManifestUser,
  instanceId?: string
) {
  const result = await runManifestCommandCore(
    {
      createRuntime: ({ user: u, entityName }) =>
        createManifestRuntime({
          user: { id: u.id, tenantId: u.tenantId, role: u.role },
          entityName,
        }),
    },
    { entity, command, body, user, instanceId }
  );
  if (!result.ok) {
    throw new Error(`Manifest ${entity}.${command} failed: ${result.message}`);
  }
  return result.result as Record<string, unknown>;
}

interface SyncErrorDetail {
  externalId: string;
  message: string;
}

const SUPPORTED_PROVIDERS = ["google", "outlook"] as const;

/**
 * POST /api/calendar/sync/trigger
 * Body: { provider: "google" | "outlook", startDate?: string, endDate?: string }
 *
 * Fetches events from the external calendar provider and imports them as Event records.
 * This is a manual trigger - automatic sync would require a background job.
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const currentUser = await resolveCurrentUser(request);
    const manifestUser: ManifestUser = {
      id: currentUser.id,
      tenantId: currentUser.tenantId,
      role: currentUser.role,
    };

    const body = await request.json();
    const { provider, startDate, endDate } = body as {
      provider: string;
      startDate?: string;
      endDate?: string;
    };

    if (
      !(
        provider &&
        (SUPPORTED_PROVIDERS as readonly string[]).includes(provider)
      )
    ) {
      return NextResponse.json(
        {
          error: `Unsupported provider. Must be one of: ${SUPPORTED_PROVIDERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { database } = await import("@repo/database");

    // Get the sync record with tokens
    const sync = await database.providerSync.findFirst({
      where: {
        tenantId,
        provider,
        deletedAt: null,
        status: "connected",
      },
    });

    if (!sync?.accessToken) {
      return NextResponse.json(
        { error: `${provider} is not connected. Please connect first.` },
        { status: 400 }
      );
    }

    // Check token expiry
    if (sync.tokenExpiry && new Date(sync.tokenExpiry) < new Date()) {
      // Token expired - would need to refresh
      await database.providerSync.update({
        where: { tenantId_id: { tenantId, id: sync.id } },
        data: {
          status: "error",
          lastSyncError: "Token expired. Please reconnect.",
        },
      });
      return NextResponse.json(
        { error: `${provider} token expired. Please reconnect.` },
        { status: 401 }
      );
    }

    // Default date range: next 30 days
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let importedCount = 0;
    let errorCount = 0;
    let errorDetails: SyncErrorDetail[] = [];

    try {
      if (provider === "google") {
        const result = await syncGoogleCalendar(
          sync.accessToken,
          sync.calendarId || "primary",
          start,
          end,
          tenantId,
          manifestUser
        );
        importedCount = result.imported;
        errorCount = result.errors;
        errorDetails = result.errorDetails;
      } else if (provider === "outlook") {
        const result = await syncOutlookCalendar(
          sync.accessToken,
          sync.calendarId || "primary",
          start,
          end,
          tenantId,
          manifestUser
        );
        importedCount = result.imported;
        errorCount = result.errors;
        errorDetails = result.errorDetails;
      }

      // Update sync status
      await database.providerSync.update({
        where: { tenantId_id: { tenantId, id: sync.id } },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
          lastSyncError: null,
        },
      });

      return NextResponse.json({
        success: true,
        provider,
        imported: importedCount,
        errors: errorCount,
        errorDetails,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
      });
    } catch (syncError) {
      captureException(syncError);
      const errorMessage =
        syncError instanceof Error ? syncError.message : "Unknown error";

      await database.providerSync.update({
        where: { tenantId_id: { tenantId, id: sync.id } },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncError: errorMessage,
        },
      });

      return NextResponse.json(
        { error: `Sync failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    captureException(error);
    log.error("[calendar/sync/trigger] Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger sync" },
      { status: 500 }
    );
  }
}

/**
 * Dedup key matching the original per-event `findFirst` predicate
 * (tenantId + title + eventDate + eventType). tenantId is constant per sync,
 * so the key is title | eventDate ISO | eventType.
 */
function eventDedupKey(
  title: string,
  eventDate: Date,
  eventType: string
): string {
  return `${title}|${eventDate.toISOString()}|${eventType}`;
}

/**
 * Preload existing external events for this tenant/type into a Map keyed by
 * {@link eventDedupKey}, so the per-event existence check is an in-memory
 * lookup instead of a `findFirst` round-trip per event (collapses up to 250
 * sequential queries into 1). `findFirst` matched on (tenantId, title,
 * eventDate, eventType) with no date window, so the preload intentionally
 * scopes only by tenant + type (+ not-deleted) to preserve exact dedup
 * semantics.
 */
async function loadExistingEventIds(
  database: typeof import("@repo/database")["database"],
  tenantId: string,
  eventType: string
): Promise<Map<string, string>> {
  const rows = await database.event.findMany({
    where: { tenantId, eventType, deletedAt: null },
    select: { id: true, title: true, eventDate: true, eventType: true },
  });
  const existing = new Map<string, string>();
  for (const row of rows) {
    existing.set(
      eventDedupKey(row.title, row.eventDate, row.eventType),
      row.id
    );
  }
  return existing;
}

/**
 * Fetch events from Google Calendar API and import them.
 * Deduplicates by matching on tenantId + title + eventDate + eventType.
 */
async function syncGoogleCalendar(
  accessToken: string,
  calendarId: string,
  start: Date,
  end: Date,
  _tenantId: string,
  manifestUser: ManifestUser
): Promise<{
  imported: number;
  errors: number;
  errorDetails: SyncErrorDetail[];
}> {
  const { database } = await import("@repo/database");

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set("timeMin", start.toISOString());
  url.searchParams.set("timeMax", end.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "250");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Calendar API error: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const events = data.items || [];

  let imported = 0;
  let errors = 0;
  const errorDetails: SyncErrorDetail[] = [];

  const eventType = "external_google";
  const existingIds = await loadExistingEventIds(
    database,
    _tenantId,
    eventType
  );

  for (const event of events) {
    try {
      const title = event.summary || "Untitled Event";
      const eventDate = new Date(
        event.start?.dateTime || event.start?.date || new Date()
      );

      const existingId = existingIds.get(
        eventDedupKey(title, eventDate, eventType)
      );

      const eventPayload: Record<string, unknown> = {
        tenantId: _tenantId,
        title,
        eventDate,
        eventType,
        status: "confirmed",
        venueName: event.location || "",
        guestCount: event.attendees?.length || 0,
        // Required IR params with sensible defaults for external sync
        clientId: "",
        eventNumber: `ext-google-${event.id || Date.now()}`,
        venueAddress: "",
        notes: "",
        tags: [],
        budget: 0,
        ticketPrice: 0,
        ticketTier: "",
        eventFormat: "",
        accessibilityOptions: [],
        featuredMediaUrl: "",
      };

      if (existingId) {
        await execCommand(
          "Event",
          "update",
          { ...eventPayload, id: existingId },
          manifestUser,
          existingId
        );
      } else {
        await execCommand("Event", "create", eventPayload, manifestUser);
      }
      imported++;
    } catch (error) {
      errors++;
      errorDetails.push({
        externalId: event.id || "unknown",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      log.error("[calendar-sync] Failed to import Google event:", error);
    }
  }

  return { imported, errors, errorDetails };
}

/**
 * Fetch events from Microsoft Graph API and import them.
 * Deduplicates by matching on tenantId + title + eventDate + eventType.
 */
async function syncOutlookCalendar(
  accessToken: string,
  _calendarId: string,
  start: Date,
  end: Date,
  _tenantId: string,
  manifestUser: ManifestUser
): Promise<{
  imported: number;
  errors: number;
  errorDetails: SyncErrorDetail[];
}> {
  const { database } = await import("@repo/database");

  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", start.toISOString());
  url.searchParams.set("endDateTime", end.toISOString());
  url.searchParams.set("$top", "250");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Microsoft Graph API error: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const events = data.value || [];

  let imported = 0;
  let errors = 0;
  const errorDetails: SyncErrorDetail[] = [];

  const eventType = "external_outlook";
  const existingIds = await loadExistingEventIds(
    database,
    _tenantId,
    eventType
  );

  for (const event of events) {
    try {
      const title = event.subject || "Untitled Event";
      const eventDate = new Date(event.start?.dateTime || new Date());

      const existingId = existingIds.get(
        eventDedupKey(title, eventDate, eventType)
      );

      const eventPayload: Record<string, unknown> = {
        tenantId: _tenantId,
        title,
        eventDate,
        eventType,
        status: "confirmed",
        venueName: event.location?.displayName || "",
        guestCount: event.attendees?.length || 0,
        // Required IR params with sensible defaults for external sync
        clientId: "",
        eventNumber: `ext-outlook-${event.id || Date.now()}`,
        venueAddress: "",
        notes: "",
        tags: [],
        budget: 0,
        ticketPrice: 0,
        ticketTier: "",
        eventFormat: "",
        accessibilityOptions: [],
        featuredMediaUrl: "",
      };

      if (existingId) {
        await execCommand(
          "Event",
          "update",
          { ...eventPayload, id: existingId },
          manifestUser,
          existingId
        );
      } else {
        await execCommand("Event", "create", eventPayload, manifestUser);
      }
      imported++;
    } catch (error) {
      errors++;
      errorDetails.push({
        externalId: event.id || "unknown",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      log.error("[calendar-sync] Failed to import Outlook event:", error);
    }
  }

  return { imported, errors, errorDetails };
}
