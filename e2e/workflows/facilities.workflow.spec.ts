/**
 * Facilities — New Facility Creation Workflow Test
 *
 * Closes P0.2 of IMPLEMENTATION_PLAN.md (the "New Facility" backpressure
 * spec). Mirrors the structure of facilities-assets.workflow.spec.ts so any
 * future regression in the facility-creation chain (UI dialog → POST
 * /api/facilities/commands/create → tenant_facilities.facilities → loadData
 * refetch → reload survival → independent /list verification) fails this
 * test rather than silently shipping.
 *
 * Covers:
 *  1. /facilities page loads and renders the "Add Facility" toolbar button
 *  2. Clicking "Add Facility" opens the create dialog
 *  3. Filling the dialog form and submitting POSTs to
 *     /api/facilities/commands/create and returns
 *     {success:true, facility:{id, name, status, facility_type, ...}}
 *  4. The new facility appears in the UI immediately (refetch path —
 *     loadFacilities() runs after a 200, NOT optimistic prepend)
 *  5. After a hard page reload, the row is still visible — proves DB
 *     persistence (not just React state)
 *  6. The row is queryable via GET /api/facilities/list?status=all — proves
 *     API/DB persistence independently of the UI cache
 *
 * Why this matters: prior to this test, no contract pinned the round trip
 * between the new "Add Facility" dialog and the new tenant_facilities.facilities
 * table. A future refactor (e.g. wrapping the response in `.data`, dropping
 * `status` from the projection, forgetting RETURNING, or breaking the
 * facility_type allow-list) would silently leave the UI empty without any
 * error surfacing to the user. This test exercises the full UI → API → DB →
 * refetch loop and re-verifies persistence after a hard reload, so a
 * regression at any layer fails the test.
 *
 * Notes on selectors:
 * - The dialog's <Input> controls don't have id/htmlFor pairs, so getByLabel
 *   cannot reach them. We rely on (a) the first textbox in the dialog for the
 *   Name field (it has no placeholder) and (b) placeholder text for the
 *   optional fields — matches the actual DOM contract in facilities/page.tsx.
 * - Both the toolbar trigger AND the dialog's submit button read "Add
 *   Facility". We disambiguate the toolbar with `.first()` and the submit by
 *   scoping the locator to the dialog.
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  attachErrorCollector,
  BASE_URL,
  goto,
  log,
  unique,
} from "../helpers/workflow";

const FACILITY_NAME = unique("Facility");
const FACILITY_CODE = `E2E-${Date.now()}`;
const FACILITY_PHONE = "+1 555 123 9999";
const FACILITY_ADDRESS = "123 E2E Test Way";
const FACILITY_CITY = "Austin";
const FACILITY_STATE = "TX";
const FACILITY_POSTAL = "78701";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe("Facilities: Add Facility creation backpressure", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page, storageState }) => {
    // Authenticated workflow — skip in the chromium-unauth project.
    // Without storageState, /facilities redirects to /sign-in and every
    // assertion below would fail in a way unrelated to the fix.
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

  test("facilities page loads and renders the Add Facility button", async ({
    page,
  }, testInfo) => {
    await goto(page, "/facilities");

    // Heading proves the page rendered
    await expect(
      page.getByRole("heading", { name: /^facilities$/i })
    ).toBeVisible({ timeout: 15_000 });

    // The CTA must exist before any subsequent test can rely on it.
    // `.first()` because once the dialog opens it also has an "Add Facility"
    // submit button — we want the toolbar trigger here.
    await expect(
      page.getByRole("button", { name: /add facility/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    await assertNoErrors(
      page,
      testInfo,
      errors,
      "facilities page initial load"
    );
  });

  test("create facility via UI persists to API and survives reload", async ({
    page,
  }, testInfo) => {
    await goto(page, "/facilities");

    // 1. Click toolbar "Add Facility" — opens the create dialog
    await page
      .getByRole("button", { name: /add facility/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(
      dialog.getByRole("heading", { name: /add facility/i })
    ).toBeVisible({ timeout: 5000 });
    log.ok("Dialog opened");

    // 2. Fill the form. No id/htmlFor pairs exist on the Input controls, so
    //    placeholder + first-textbox locators are the only reliable hooks.
    //    The first textbox has no placeholder — that's the required Name field.
    await dialog.getByRole("textbox").first().fill(FACILITY_NAME);
    await dialog.getByPlaceholder("MAIN-KIT").fill(FACILITY_CODE);
    await dialog.getByPlaceholder("+1 555 123 4567").fill(FACILITY_PHONE);
    await dialog.getByPlaceholder("123 Main Street").fill(FACILITY_ADDRESS);
    await dialog.getByPlaceholder("Austin").fill(FACILITY_CITY);
    await dialog.getByPlaceholder("TX").fill(FACILITY_STATE);
    await dialog.getByPlaceholder("78701").fill(FACILITY_POSTAL);

    // 3. Capture the create response so we can assert on the persisted shape
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/facilities/commands/create") &&
        response.request().method() === "POST",
      { timeout: 15_000 }
    );

    await dialog.getByRole("button", { name: /^add facility$/i }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.status(), "POST create returned non-2xx").toBe(200);

    const createBody = (await createResponse.json()) as {
      success?: boolean;
      facility?: {
        id?: string;
        name?: string;
        status?: string;
        facility_type?: string;
        code?: string | null;
        city?: string | null;
        phone?: string | null;
      };
    };
    expect(createBody.success, "create response missing success=true").toBe(
      true
    );
    expect(
      createBody.facility,
      "create response missing facility"
    ).toBeTruthy();
    expect(
      createBody.facility?.id,
      "create response missing facility.id"
    ).toBeTruthy();
    expect(
      createBody.facility?.id,
      "facility.id is not a UUID — RETURNING projection drift?"
    ).toMatch(UUID_RE);
    expect(createBody.facility?.name, "create response name mismatch").toBe(
      FACILITY_NAME
    );
    expect(
      createBody.facility?.status,
      "new facility must default to status=active"
    ).toBe("active");
    expect(
      createBody.facility?.facility_type,
      "new facility must use the form's selected type (default 'kitchen')"
    ).toBe("kitchen");
    expect(createBody.facility?.code, "code was not persisted to the row").toBe(
      FACILITY_CODE
    );
    expect(createBody.facility?.city, "city was not persisted to the row").toBe(
      FACILITY_CITY
    );

    const createdId = createBody.facility?.id ?? "";
    log.ok(`Created facility id=${createdId}`);

    // 4. UI refetch path: dialog closes and the new facility card appears.
    //    handleSave() calls loadFacilities() after a 200, so the new row
    //    surfaces via the canonical /list endpoint, not an optimistic prepend.
    await expect(dialog).toBeHidden({ timeout: 8000 });
    await expect(
      page.getByText(FACILITY_NAME, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // 5. Full page reload — proves the row survived past the React state.
    //    The reload triggers a fresh loadFacilities() →
    //    GET /api/facilities/list?status=all, which only returns rows from
    //    `tenant_facilities.facilities`.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(FACILITY_NAME, { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });
    log.ok("Facility still visible after reload — DB persistence confirmed");

    // 6. Independent API verification: hit the list endpoint directly. This
    //    proves the row is accessible via the canonical read path, not just
    //    present in some UI cache.
    const listResponse = await page.request.get(
      `${BASE_URL}/api/facilities/list?status=all`
    );
    expect(listResponse.status()).toBe(200);
    const listBody = (await listResponse.json()) as {
      success?: boolean;
      facilities?: Array<{
        id: string;
        name: string;
        status: string;
        facility_type: string;
        code: string | null;
        city: string | null;
      }>;
    };
    expect(listBody.success).toBe(true);
    const matched = listBody.facilities?.find((f) => f.id === createdId);
    expect(
      matched,
      "created facility missing from /list response"
    ).toBeTruthy();
    expect(matched?.name).toBe(FACILITY_NAME);
    expect(matched?.status).toBe("active");
    expect(matched?.facility_type).toBe("kitchen");
    expect(matched?.code).toBe(FACILITY_CODE);
    expect(matched?.city).toBe(FACILITY_CITY);

    await assertNoErrors(
      page,
      testInfo,
      errors,
      "after facility creation + reload"
    );
  });
});
