/**
 * Facilities — New Asset Creation Workflow Test
 *
 * Covers (P0 backpressure for "New Asset" creation):
 *  1. /facilities/assets page loads
 *  2. The "Add Asset" toolbar button opens the create dialog
 *  3. Filling the dialog form and submitting POSTs to
 *     /api/facilities/assets/commands/create
 *  4. The newly created asset appears in the UI immediately (refetch via
 *     loadData() after a 200)
 *  5. After a full page reload, the asset is still visible — proves DB
 *     persistence (not just the in-memory state from loadData)
 *  6. The asset is queryable via /api/facilities/assets/list?status=all —
 *     proves API/DB persistence independently of the UI state
 *
 * Why this matters: prior to this test, nothing pinned the contract that the
 * "Add Asset" dialog actually persists a row to
 * `tenant_facilities.facility_assets`. The page calls a raw `INSERT … RETURNING`
 * (apps/api/app/api/facilities/assets/commands/create/route.ts) and on success
 * the UI calls `loadData()` to refetch the list — so a malformed response that
 * still returned 200 (e.g. a future refactor that wraps the row in `.data`, or
 * forgets `RETURNING`, or drops `status` from the projection) would silently
 * leave the UI empty without any error surfacing to the user. This test
 * exercises the full UI → API → DB → refetch loop and re-verifies persistence
 * after a hard reload, so a regression at any layer fails the test rather than
 * silently shipping.
 *
 * Notes on selectors:
 * - The asset dialog's `<Input>` controls do NOT have `id`/`htmlFor` pairs, so
 *   `getByLabel()` cannot locate them. We rely on (a) the first textbox in the
 *   dialog for the Name field (which has no placeholder) and (b) placeholder
 *   text for the optional fields. This matches the actual DOM contract.
 * - The toolbar trigger and the submit button both read "Add Asset". We disambiguate
 *   by scoping the submit to the dialog and using `.first()` on the toolbar button.
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

const ASSET_NAME = unique("Asset");
const ASSET_MANUFACTURER = "E2E Manufacturer";
const ASSET_MODEL = "E2E-Model-X1";
const ASSET_SERIAL = `SN-E2E-${Date.now()}`;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe("Facilities: Add Asset creation backpressure", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page, storageState }) => {
    // Authenticated workflow — skip in the chromium-unauth project.
    // Without storageState, /facilities/assets redirects to /sign-in and
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

  test("assets page loads and renders the Add Asset button", async ({
    page,
  }, testInfo) => {
    await goto(page, "/facilities/assets");

    // Heading proves the page rendered
    await expect(page.getByRole("heading", { name: /^assets$/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // The CTA must exist before any subsequent test can rely on it.
    // `.first()` because the dialog (when open in another test) also has an
    // "Add Asset" submit button — we want the toolbar trigger here.
    await expect(
      page.getByRole("button", { name: /add asset/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    await assertNoErrors(page, testInfo, errors, "assets page initial load");
  });

  test("create asset via UI persists to API and survives reload", async ({
    page,
  }, testInfo) => {
    await goto(page, "/facilities/assets");

    // 1. Click toolbar "Add Asset" — opens the create dialog
    await page
      .getByRole("button", { name: /add asset/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(
      dialog.getByRole("heading", { name: /add asset/i })
    ).toBeVisible({ timeout: 5000 });
    log.ok("Dialog opened");

    // 2. Fill the form. No id/htmlFor pairs exist on the Input controls, so
    //    placeholder + first-textbox locators are the only reliable hooks.
    await dialog.getByRole("textbox").first().fill(ASSET_NAME);
    await dialog.getByPlaceholder("Vulcan").fill(ASSET_MANUFACTURER);
    await dialog.getByPlaceholder("VSH96E").fill(ASSET_MODEL);
    await dialog.getByPlaceholder("SN-12345").fill(ASSET_SERIAL);

    // 3. Capture the create response so we can assert on the persisted shape
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/facilities/assets/commands/create") &&
        response.request().method() === "POST",
      { timeout: 15_000 }
    );

    await dialog.getByRole("button", { name: /^add asset$/i }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.status(), "POST create returned non-2xx").toBe(200);

    const createBody = (await createResponse.json()) as {
      success?: boolean;
      asset?: {
        id?: string;
        name?: string;
        status?: string;
        asset_type?: string;
        serial_number?: string | null;
      };
    };
    expect(createBody.success, "create response missing success=true").toBe(
      true
    );
    expect(createBody.asset, "create response missing asset").toBeTruthy();
    expect(
      createBody.asset?.id,
      "create response missing asset.id"
    ).toBeTruthy();
    expect(
      createBody.asset?.id,
      "asset.id is not a UUID — RETURNING projection drift?"
    ).toMatch(UUID_RE);
    expect(createBody.asset?.name, "create response name mismatch").toBe(
      ASSET_NAME
    );
    expect(
      createBody.asset?.status,
      "new asset must default to status=active"
    ).toBe("active");
    expect(
      createBody.asset?.serial_number,
      "serial_number was not persisted"
    ).toBe(ASSET_SERIAL);

    const createdId = createBody.asset?.id ?? "";
    log.ok(`Created asset id=${createdId}`);

    // 4. UI refetch path: dialog closes and the new asset card is visible.
    //    The page calls loadData() after a 200, so the new row appears via
    //    the canonical /list endpoint, not an optimistic prepend.
    await expect(dialog).toBeHidden({ timeout: 8000 });
    await expect(
      page.getByText(ASSET_NAME, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // 5. Full page reload — proves the row survived past the in-memory React
    //    state. The reload triggers a fresh loadData() →
    //    GET /api/facilities/assets/list?status=all, which only returns rows
    //    from `tenant_facilities.facility_assets`.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(ASSET_NAME, { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });
    log.ok("Asset still visible after reload — DB persistence confirmed");

    // 6. Independent API verification: hit the list endpoint directly.
    //    This proves the row is accessible via the canonical read path,
    //    not just present in some UI cache.
    const listResponse = await page.request.get(
      `${BASE_URL}/api/facilities/assets/list?status=all`
    );
    expect(listResponse.status()).toBe(200);
    const listBody = (await listResponse.json()) as {
      success?: boolean;
      assets?: Array<{
        id: string;
        name: string;
        status: string;
        asset_type: string;
        serial_number: string | null;
      }>;
    };
    expect(listBody.success).toBe(true);
    const matched = listBody.assets?.find((a) => a.id === createdId);
    expect(matched, "created asset missing from /list response").toBeTruthy();
    expect(matched?.name).toBe(ASSET_NAME);
    expect(matched?.status).toBe("active");
    expect(matched?.serial_number).toBe(ASSET_SERIAL);

    await assertNoErrors(
      page,
      testInfo,
      errors,
      "after asset creation + reload"
    );
  });
});
