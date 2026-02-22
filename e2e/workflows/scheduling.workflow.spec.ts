/**
 * Scheduling Module — Full Workflow Test
 *
 * Covers:
 *  1. Scheduling overview
 *  2. Shifts page — verifies "New Shift" button exists
 *  3. Shift creation — fixme (requires seeded schedules/locations/employees)
 *  4. Availability page
 *  5. Requests page
 *  6. Time-off page
 *  7. Budgets page
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  assertVisible,
  attachErrorCollector,
  BASE_URL,
  goto,
} from "../helpers/workflow";

test.describe("Scheduling: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("scheduling overview loads", async ({ page }, testInfo) => {
    await goto(page, "/scheduling");
    await assertVisible(page, /scheduling/i);
    await assertNoErrors(page, testInfo, errors, "scheduling overview");
  });

  test("shifts page loads with create button", async ({ page }, testInfo) => {
    await goto(page, "/scheduling/shifts");
    await expect(page).toHaveURL(/scheduling\/shifts/);
    // Verify the "New Shift" button exists (even if we can't test creation)
    await expect(page.getByRole("button", { name: /new shift/i })).toBeVisible({
      timeout: 10_000,
    });
    await assertNoErrors(page, testInfo, errors, "shifts page");
  });

  test.fixme(
    "create shift — requires seeded schedules/locations/employees in test DB",
    async () => {
      // The shift creation modal requires existing schedule, location, and employee records.
      // The Shadcn Selects for scheduleId/locationId/employeeId will be empty without seeded data.
      // Implement once test data seeding is in place.
      // Note: The modal is NOT a Shadcn Dialog — no [role="dialog"]. It's a raw div.fixed.inset-0.
    }
  );

  test("availability page loads", async ({ page }, testInfo) => {
    await goto(page, "/scheduling/availability");
    await expect(page).toHaveURL(/scheduling\/availability/);
    await assertNoErrors(page, testInfo, errors, "availability page");
  });

  test("requests page loads", async ({ page }, testInfo) => {
    await goto(page, "/scheduling/requests");
    await expect(page).toHaveURL(/scheduling\/requests/);
    await assertNoErrors(page, testInfo, errors, "requests page");
  });

  test("time-off page loads", async ({ page }, testInfo) => {
    await goto(page, "/scheduling/time-off");
    await expect(page).toHaveURL(/scheduling\/time-off/);
    await assertNoErrors(page, testInfo, errors, "time-off page");
  });

  test("scheduling budgets page loads", async ({ page }, testInfo) => {
    await goto(page, "/scheduling/budgets");
    await expect(page).toHaveURL(/scheduling\/budgets/);
    await assertNoErrors(page, testInfo, errors, "scheduling budgets");
  });
});
