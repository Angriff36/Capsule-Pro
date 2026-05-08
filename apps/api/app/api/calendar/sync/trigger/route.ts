import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

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

    const body = await request.json();
    const { provider, startDate, endDate } = body as {
      provider: string;
      startDate?: string;
      endDate?: string;
    };

    if (!(provider && SUPPORTED_PROVIDERS.includes(provider as any))) {
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

    if (!(sync && sync.accessToken)) {
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
          tenantId
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
          tenantId
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
 * Fetch events from Google Calendar API and import them.
 * Deduplicates by matching on tenantId + title + eventDate + eventType.
 */
async function syncGoogleCalendar(
  accessToken: string,
  calendarId: string,
  start: Date,
  end: Date,
  _tenantId: string
): Promise<{ imported: number; errors: number; errorDetails: SyncErrorDetail[] }> {
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

  for (const event of events) {
    try {
      const title = event.summary || "Untitled Event";
      const eventDate = new Date(
        event.start?.dateTime || event.start?.date || new Date()
      );
      const eventType = "external_google";

      const existing = await database.event.findFirst({
        where: {
          tenantId: _tenantId,
          title,
          eventDate,
          eventType,
          deletedAt: null,
        },
      });

      const eventData = {
        title,
        eventDate,
        eventType,
        status: "confirmed" as const,
        venueName: event.location || null,
        guestCount: event.attendees?.length || 0,
      };

      if (existing) {
        await database.event.update({
          where: { tenantId_id: { tenantId: _tenantId, id: existing.id } },
          data: eventData,
        });
      } else {
        await database.event.create({
          data: {
            tenantId: _tenantId,
            ...eventData,
          },
        });
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
  _tenantId: string
): Promise<{ imported: number; errors: number; errorDetails: SyncErrorDetail[] }> {
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

  for (const event of events) {
    try {
      const title = event.subject || "Untitled Event";
      const eventDate = new Date(event.start?.dateTime || new Date());
      const eventType = "external_outlook";

      const existing = await database.event.findFirst({
        where: {
          tenantId: _tenantId,
          title,
          eventDate,
          eventType,
          deletedAt: null,
        },
      });

      const eventData = {
        title,
        eventDate,
        eventType,
        status: "confirmed" as const,
        venueName: event.location?.displayName || null,
        guestCount: event.attendees?.length || 0,
      };

      if (existing) {
        await database.event.update({
          where: { tenantId_id: { tenantId: _tenantId, id: existing.id } },
          data: eventData,
        });
      } else {
        await database.event.create({
          data: {
            tenantId: _tenantId,
            ...eventData,
          },
        });
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
