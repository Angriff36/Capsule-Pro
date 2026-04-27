/**
 * Logistics Module — Full Workflow Test
 *
 * Covers (P0 backpressure for "New Route" creation):
 *  1. /logistics/routes page loads
 *  2. "New Route" button opens the create dialog
 *  3. Filling the dialog form and submitting POSTs to /api/logistics/routes/commands/create
 *  4. The newly created route appears in the UI immediately (optimistic state)
 *  5. After a full page reload, the route is still visible — proves DB persistence
 *     (not just optimistic state)
 *  6. The route is queryable via /api/logistics/routes/list — proves API/DB persistence
 *     independently of the UI state
 *
 * Why this matters: prior to this test, nothing pinned the contract that the
 * "New Route" dialog actually persists a row to `tenant_logistics.delivery_routes`.
 * A regression that broke the `database.deliveryRoute.create(...)` call (e.g. a
 * Prisma rename, a missing tenantId, a silent 500) would have left the dialog
 * appearing to work — the optimistic `setRoutes((prev) => [data.route, ...prev])`
 * call hides API failures from the user-facing surface unless the response is
 * outright invalid. This test exercises the full UI → API → DB → refetch loop,
 * so a regression at any layer fails the test instead of silently shipping.
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  attachErrorCollector,
  BASE_URL,
  fillById,
  goto,
  log,
  TEST_DATE,
  unique,
} from "../helpers/workflow";

const ROUTE_NAME = unique("LogisticsRoute");
const ROUTE_DESCRIPTION = "E2E persistence verification for New Route dialog";

test.describe("Logistics: New Route creation backpressure", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page, storageState }) => {
    // Authenticated workflow — skip in the chromium-unauth project.
    // Without storageState, /logistics/routes redirects to /sign-in and
    // every assertion below would fail in a way unrelated to the fix.
    test.skip(
      !(
        typeof storageState === "string" ||
        (typeof storageState === "object" && storageState !== undefined)
      ),
      "Authenticated workflow requires storageState"
    );
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("routes page loads and renders the New Route button", async ({
    page,
  }, testInfo) => {
    await goto(page, "/logistics/routes");

    // Heading proves the page rendered server-side
    await expect(
      page.getByRole("heading", { name: /delivery routes/i })
    ).toBeVisible({ timeout: 15_000 });

    // The CTA must exist before any subsequent test can rely on it
    await expect(page.getByRole("button", { name: /new route/i })).toBeVisible({
      timeout: 10_000,
    });

    await assertNoErrors(page, testInfo, errors, "routes page initial load");
  });

  test("create route via UI persists to API and survives reload", async ({
    page,
  }, testInfo) => {
    await goto(page, "/logistics/routes");

    // 1. Click "New Route" — opens the create dialog
    await page.getByRole("button", { name: /new route/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole("heading", { name: /create new route/i })
    ).toBeVisible({ timeout: 5000 });
    log.ok("Dialog opened");

    // 2. Fill the form
    await fillById(page, "routeName", ROUTE_NAME);
    await fillById(page, "scheduledDate", TEST_DATE);
    await fillById(page, "description", ROUTE_DESCRIPTION);

    // 3. Capture the create response so we can assert on the persisted shape
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/logistics/routes/commands/create") &&
        response.request().method() === "POST",
      { timeout: 15_000 }
    );

    await page.getByRole("button", { name: /^create route$/i }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.status(), "POST create returned non-2xx").toBe(200);

    const createBody = (await createResponse.json()) as {
      route?: { id?: string; routeNumber?: string; name?: string };
    };
    expect(createBody.route, "create response missing route").toBeTruthy();
    expect(
      createBody.route?.id,
      "create response missing route.id"
    ).toBeTruthy();
    expect(createBody.route?.name, "create response name mismatch").toBe(
      ROUTE_NAME
    );
    expect(
      createBody.route?.routeNumber,
      "create response missing routeNumber"
    ).toMatch(/^RT-\d{6}$/);

    const createdId = createBody.route?.id ?? "";
    const createdRouteNumber = createBody.route?.routeNumber ?? "";
    log.ok(`Created route id=${createdId} number=${createdRouteNumber}`);

    // 4. Optimistic UI state: dialog closes and the new card is visible
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 8000 });
    await expect(
      page.getByText(`${createdRouteNumber} - ${ROUTE_NAME}`)
    ).toBeVisible({ timeout: 8000 });

    // 5. Full page reload — proves the row survives the optimistic in-memory
    //    state and was actually persisted to the database. The reload triggers
    //    a fresh GET /api/logistics/routes/list, which only returns rows from
    //    `database.deliveryRoute.findMany`.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(`${createdRouteNumber} - ${ROUTE_NAME}`)
    ).toBeVisible({ timeout: 15_000 });
    log.ok("Route still visible after reload — DB persistence confirmed");

    // 6. Independent API verification: hit the list endpoint directly.
    //    This proves the row is accessible via the canonical read path,
    //    not just present in some UI cache.
    const listResponse = await page.request.get(
      `${BASE_URL}/api/logistics/routes/list`
    );
    expect(listResponse.status()).toBe(200);
    const listBody = (await listResponse.json()) as {
      routes?: Array<{ id: string; name: string; routeNumber: string }>;
    };
    const matched = listBody.routes?.find((r) => r.id === createdId);
    expect(matched, "created route missing from /list response").toBeTruthy();
    expect(matched?.name).toBe(ROUTE_NAME);
    expect(matched?.routeNumber).toBe(createdRouteNumber);

    await assertNoErrors(
      page,
      testInfo,
      errors,
      "after route creation + reload"
    );
  });
});
