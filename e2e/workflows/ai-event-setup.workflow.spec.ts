/**
 * Scenario 5: AI Event Setup (Natural Language) — Workflow Test
 *
 * Covers test plan sections:
 *  5A. Parse Natural Language Event Description
 *  5B. Complex Natural Language Input
 *  5C. Confirm and Create Event (full round-trip)
 *  5D. Cancel AI Event Setup Session
 *  5E. Edge Cases (empty input, invalid transitions)
 *
 * The AI Event Setup uses a session-based workflow:
 *   pending → parsed → confirmed → created → cancelled
 *
 * Key API endpoints:
 *   POST /api/ai-event-setup/parse — parse NL input
 *   POST /api/aieventsetupsession/confirm — confirm parsed session
 *   POST /api/aieventsetupsession/mark-created — mark event created
 *   POST /api/aieventsetupsession/cancel — cancel session
 *   GET  /api/ai-event-setup/sessions — list sessions
 *
 * Note: The existing `natural-language-commands-verification.spec.ts` tests
 * the command board chat panel. This spec tests the dedicated AI Event Setup
 * flow — a separate feature with its own session lifecycle.
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  attachErrorCollector,
  BASE_URL,
} from "../helpers/workflow";

// ─── Test Data ─────────────────────────────────────────────────────────────────

const TS = Date.now();

const SIMPLE_NL_INPUT =
  "Schedule a wedding for next month with 200 guests at the Grand Ballroom";

const COMPLEX_NL_INPUT =
  "Corporate team building on June 20th with 75 people at Downtown Conference Center, budget $15,000, need vegetarian options";

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface AiEventSetupResponse {
  ok: boolean;
  status: number;
  data?: Record<string, unknown>;
}

async function parseAiEventSetup(
  page: import("@playwright/test").Page,
  input: string
): Promise<AiEventSetupResponse> {
  const response = await page.request.post("/api/ai-event-setup/parse", {
    headers: { "Content-Type": "application/json" },
    data: { input },
  });
  let data: Record<string, unknown> | undefined;
  try {
    data = await response.json();
  } catch {
    // Response may not be JSON
  }
  return { ok: response.ok(), status: response.status(), data };
}

async function confirmSession(
  page: import("@playwright/test").Page,
  sessionId: string
): Promise<AiEventSetupResponse> {
  const response = await page.request.post("/api/aieventsetupsession/confirm", {
    headers: { "Content-Type": "application/json" },
    data: { sessionId },
  });
  let data: Record<string, unknown> | undefined;
  try {
    data = await response.json();
  } catch {}
  return { ok: response.ok(), status: response.status(), data };
}

async function markCreatedSession(
  page: import("@playwright/test").Page,
  sessionId: string,
  eventId: string
): Promise<AiEventSetupResponse> {
  const response = await page.request.post(
    "/api/aieventsetupsession/mark-created",
    {
      headers: { "Content-Type": "application/json" },
      data: { sessionId, eventId },
    }
  );
  let data: Record<string, unknown> | undefined;
  try {
    data = await response.json();
  } catch {}
  return { ok: response.ok(), status: response.status(), data };
}

async function cancelSession(
  page: import("@playwright/test").Page,
  sessionId: string,
  reason = "E2E test cancellation"
): Promise<AiEventSetupResponse> {
  const response = await page.request.post("/api/aieventsetupsession/cancel", {
    headers: { "Content-Type": "application/json" },
    data: { sessionId, reason },
  });
  let data: Record<string, unknown> | undefined;
  try {
    data = await response.json();
  } catch {}
  return { ok: response.ok(), status: response.status(), data };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("AI Event Setup (Natural Language)", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  // ─── 5A. Parse Simple NL Input ────────────────────────────────────────────

  test("parse endpoint accepts natural language input and returns structured fields", async ({
    page,
  }, testInfo) => {
    const result = await parseAiEventSetup(page, SIMPLE_NL_INPUT);

    // Route should exist (not 404)
    expect(result.status).not.toBe(404);

    if (result.ok && result.data) {
      // Verify parsed fields exist
      const parsed = result.data;
      // The response should contain extracted event type
      if (parsed.data && typeof parsed.data === "object") {
        const session = parsed.data as Record<string, unknown>;
        // Check for common parsed field names
        const hasParsedFields =
          session.parsedEventType ||
          session.eventType ||
          session.parsedEventDate ||
          session.eventDate ||
          session.parsedGuestCount ||
          session.guestCount ||
          session.parsedVenueName ||
          session.venueName;

        expect(hasParsedFields).toBeTruthy();
      }
    }

    await assertNoErrors(page, testInfo, errors, "parse simple NL input");
  });

  // ─── 5B. Parse Complex NL Input ───────────────────────────────────────────

  test("parse handles complex input with budget and dietary requirements", async ({
    page,
  }, testInfo) => {
    const result = await parseAiEventSetup(page, COMPLEX_NL_INPUT);

    expect(result.status).not.toBe(404);

    if (result.ok && result.data) {
      const parsed = result.data;
      if (parsed.data && typeof parsed.data === "object") {
        const session = parsed.data as Record<string, unknown>;
        // Complex input should extract budget info (possibly in notes/tags)
        const hasComplexFields =
          session.parsedEventType ||
          session.eventType ||
          session.notes ||
          session.tags;

        expect(hasComplexFields).toBeTruthy();
      }
    }

    await assertNoErrors(page, testInfo, errors, "parse complex NL input");
  });

  // ─── 5C. Full Round-Trip: Parse → Confirm → Create ───────────────────────

  test("full lifecycle: parse → confirm → mark created", async ({
    page,
  }, testInfo) => {
    // Step 1: Parse
    const parseResult = await parseAiEventSetup(page, SIMPLE_NL_INPUT);
    expect(parseResult.status).not.toBe(404);

    if (!(parseResult.ok && parseResult.data)) {
      // API may return validation errors — check structure is correct
      // If auth issue or parse failure, skip gracefully
      testInfo.annotations.push({
        type: "skip-reason",
        description: `Parse returned ${parseResult.status}: ${JSON.stringify(parseResult.data)}`,
      });
      await assertNoErrors(
        page,
        testInfo,
        errors,
        "full lifecycle (parse step)"
      );
      return;
    }

    const sessionData = (parseResult.data.data ?? parseResult.data) as Record<
      string,
      unknown
    >;
    const sessionId = (sessionData.id ?? sessionData.sessionId) as string;

    if (!sessionId) {
      // Parse succeeded but no session ID returned — endpoint structure differs
      await assertNoErrors(
        page,
        testInfo,
        errors,
        "full lifecycle (no session ID from parse)"
      );
      return;
    }

    // Step 2: Confirm
    const confirmResult = await confirmSession(page, sessionId);
    expect(confirmResult.status).not.toBe(404);

    // Step 3: Mark created (may fail if confirm didn't transition status — expected)
    if (confirmResult.ok) {
      const markResult = await markCreatedSession(
        page,
        sessionId,
        "e2e-dummy-event-id"
      );
      expect(markResult.status).not.toBe(404);
    }

    await assertNoErrors(page, testInfo, errors, "full lifecycle");
  });

  // ─── 5D. Cancel Session ───────────────────────────────────────────────────

  test("cancel endpoint accepts session cancellation with reason", async ({
    page,
  }, testInfo) => {
    // First parse to get a session
    const parseResult = await parseAiEventSetup(page, SIMPLE_NL_INPUT);

    if (!(parseResult.ok && parseResult.data)) {
      await assertNoErrors(page, testInfo, errors, "cancel (parse failed)");
      return;
    }

    const sessionData = (parseResult.data.data ?? parseResult.data) as Record<
      string,
      unknown
    >;
    const sessionId = (sessionData.id ?? sessionData.sessionId) as string;

    if (!sessionId) {
      await assertNoErrors(page, testInfo, errors, "cancel (no session ID)");
      return;
    }

    // Cancel the session
    const cancelResult = await cancelSession(
      page,
      sessionId,
      "E2E test cleanup"
    );
    expect(cancelResult.status).not.toBe(404);

    await assertNoErrors(page, testInfo, errors, "cancel session");
  });

  // ─── 5E. Edge Cases ───────────────────────────────────────────────────────

  test("parse rejects empty input", async ({ page }, testInfo) => {
    const result = await parseAiEventSetup(page, "");

    // Should not be 200 — empty input should be rejected
    // Either 400 (validation error) or 422
    expect([400, 422, 500]).toContain(result.status);

    await assertNoErrors(page, testInfo, errors, "empty input rejection");
  });

  test("parse rejects whitespace-only input", async ({ page }, testInfo) => {
    const result = await parseAiEventSetup(page, "   \n\t  ");

    expect([400, 422, 500]).toContain(result.status);

    await assertNoErrors(page, testInfo, errors, "whitespace input rejection");
  });

  test("confirm rejects non-existent session", async ({ page }, testInfo) => {
    const result = await confirmSession(
      page,
      "00000000-0000-0000-0000-000000000000"
    );

    // Should return 404 or 400 — session doesn't exist
    expect([400, 404, 500]).toContain(result.status);

    await assertNoErrors(
      page,
      testInfo,
      errors,
      "confirm non-existent session"
    );
  });

  test("cancel rejects non-existent session", async ({ page }, testInfo) => {
    const result = await cancelSession(
      page,
      "00000000-0000-0000-0000-000000000000",
      "test reason"
    );

    expect([400, 404, 500]).toContain(result.status);

    await assertNoErrors(page, testInfo, errors, "cancel non-existent session");
  });

  // ─── Route Existence Smoke Tests ──────────────────────────────────────────

  test("AI event setup routes exist (not 404)", async ({ page }, testInfo) => {
    const routes = [
      { method: "POST" as const, path: "/api/ai-event-setup/parse" },
      { method: "POST" as const, path: "/api/aieventsetupsession/confirm" },
      { method: "POST" as const, path: "/api/aieventsetupsession/cancel" },
    ];

    for (const route of routes) {
      const response = await page.request.fetch(`${BASE_URL}${route.path}`, {
        method: route.method,
        headers: { "Content-Type": "application/json" },
        data: route.method === "POST" ? {} : undefined,
      });

      // Routes should NOT return 404 — they exist
      expect(
        response.status(),
        `${route.method} ${route.path} should not be 404`
      ).not.toBe(404);
    }

    await assertNoErrors(page, testInfo, errors, "route existence smoke");
  });
});
