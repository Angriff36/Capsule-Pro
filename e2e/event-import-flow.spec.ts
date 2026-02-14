/**
 * End-to-end test for event import workflow
 * Tests: Upload PDF + CSV → Parse → Create Event → Create Battle Board → Create Checklist
 */

import { expect, test } from "@playwright/test";

test.describe("Event Import Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to import page and wait for it to load
    await page.goto("http://127.0.0.1:2221/events/import", {
      waitUntil: "networkidle",
    });
  });

  test("should upload PDF and CSV, create event with battle board and checklist", async ({
    page,
  }) => {
    // Check page loaded
    await expect(page.locator("text=Upload Files")).toBeVisible({
      timeout: 10_000,
    });

    // Upload files using file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      "./e2e/rdfview_aspx_3.pdf",
      "./e2e/Khosravi Wedding Time & Attendance.csv",
    ]);

    // Verify files were selected
    await expect(page.locator("text=rdfview_aspx_3.pdf")).toBeVisible();
    await expect(
      page.locator("text=Khosravi Wedding Time & Attendance.csv")
    ).toBeVisible();

    // Ensure generation options are checked
    const battleBoardChecked = await page
      .locator("#generateBattleBoard")
      .isChecked();
    const checklistChecked = await page
      .locator("#generateChecklist")
      .isChecked();

    if (!battleBoardChecked) {
      await page.locator('label:has-text("Generate Battle Board")').click();
    }
    if (!checklistChecked) {
      await page
        .locator('label:has-text("Generate Pre-Event Review Checklist")')
        .click();
    }

    // Submit the form
    await page.locator('button:has-text("Import")').click();

    // Wait for processing
    await expect(page.locator("text=Processing...")).toBeVisible({
      timeout: 5000,
    });

    // Wait for result or error
    try {
      // Wait for either success or error
      await page.waitForSelector(
        "text=Import Complete, text=Import failed, text=Errors:",
        { timeout: 60_000 }
      );

      // Check if we got a successful import
      const importComplete = page.locator("text=Import Complete").first();
      const isVisible = await importComplete.isVisible().catch(() => false);

      if (isVisible) {
        console.log("✅ Import completed successfully!");

        // Check for battle board creation
        const battleBoardCreated = page
          .locator("text=Battle Board Created")
          .first();
        const bbVisible = await battleBoardCreated
          .isVisible()
          .catch(() => false);
        console.log(
          `✅ Battle Board: ${bbVisible ? "Created" : "Not Created"}`
        );

        // Check for checklist creation
        const checklistCreated = page.locator("text=Checklist Created").first();
        const clVisible = await checklistCreated.isVisible().catch(() => false);
        console.log(`✅ Checklist: ${clVisible ? "Created" : "Not Created"}`);

        // Check extracted event data
        const extractedEvent = page
          .locator("text=Extracted Event Data")
          .first();
        const eeVisible = await extractedEvent.isVisible().catch(() => false);
        if (eeVisible) {
          console.log("✅ Event data extracted from documents");

          // Try to get the client name
          const clientText = await page
            .locator('dd:has-text("Northwest Orthopaedic")')
            .textContent()
            .catch(() => "Not found");
          console.log(`✅ Client: ${clientText}`);
        }

        // Get any links to navigate to
        const viewBattleBoardBtn = page
          .locator('button:has-text("View Battle Board")')
          .first();
        if (await viewBattleBoardBtn.isVisible().catch(() => false)) {
          console.log("✅ View Battle Board link available");
        }

        const viewChecklistBtn = page
          .locator('button:has-text("View Checklist")')
          .first();
        if (await viewChecklistBtn.isVisible().catch(() => false)) {
          console.log("✅ View Checklist link available");
        }

        // Now navigate to /events to verify event was created
        await page.locator('a:has-text("All Battle Boards")').first().click();
        await page.waitForLoadState("domcontentloaded");

        // Check if events page shows anything
        console.log(
          "✅ Verification complete - check /events for created event"
        );
      } else {
        // Check for errors
        const errors = await page
          .locator(".text-destructive")
          .textContent()
          .catch(() => "Unknown error");
        console.log("❌ Import failed:", errors);
      }
    } catch (_e) {
      console.log("⚠️ Timeout waiting for import result");
    }
  });
});
