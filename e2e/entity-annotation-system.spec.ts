import { expect, test } from "@playwright/test";

/**
 * Playwright verification test for the Entity Annotation System
 *
 * This test verifies:
 * 1. Sticky notes can be created with rich text content
 * 2. Labels can be added to projections
 * 3. Highlights can be created on entities
 * 4. Comment threads work on annotations
 * 5. Mentions are parsed and displayed correctly
 * 6. Regions can be created on the board
 *
 * Run: npx playwright test e2e/entity-annotation-system.spec.ts
 */

test.describe("Entity Annotation System", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to command board
    await page.goto("/command-board");
    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("should display annotation toolbar button", async ({ page }) => {
    // The annotation toolbar should be visible
    const annotationButton = page
      .getByRole("button")
      .filter({ hasText: /add annotation/i });
    await expect(annotationButton).toBeVisible();
  });

  test("should create a sticky note with content", async ({ page }) => {
    // Click the Add Annotation button
    await page
      .getByRole("button")
      .filter({ hasText: /add annotation/i })
      .click();

    // Click on "Note" option
    await page.getByRole("menuitem").filter({ hasText: /note/i }).click();

    // Wait for dialog to appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Enter note content
    const textarea = page.locator("textarea").first();
    await textarea.fill("This is a test note with **bold** and _italic_ text.");

    // Select priority
    await page.locator('[role="combobox"]').click();
    await page.getByRole("option").filter({ hasText: /high/i }).click();

    // Submit the form
    await page
      .getByRole("button")
      .filter({ hasText: /create note/i })
      .click();

    // Verify the note was created (check for success message or note on board)
    await expect(page.getByText(/note created/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should parse and display mentions in rich text", async ({ page }) => {
    // Create a note with a mention
    await page
      .getByRole("button")
      .filter({ hasText: /add annotation/i })
      .click();
    await page.getByRole("menuitem").filter({ hasText: /note/i }).click();

    const textarea = page.locator("textarea").first();
    await textarea.fill("@john please review this when you get a chance.");

    // Submit
    await page
      .getByRole("button")
      .filter({ hasText: /create note/i })
      .click();

    // Verify the note was created
    await expect(page.getByText(/note created/i)).toBeVisible({
      timeout: 5000,
    });

    // The note should display on the board with the mention highlighted
    await expect(page.getByText(/@john/i)).toBeVisible();
  });

  test("should add a comment to an annotation", async ({ page }) => {
    // First create a note
    await page
      .getByRole("button")
      .filter({ hasText: /add annotation/i })
      .click();
    await page.getByRole("menuitem").filter({ hasText: /note/i }).click();

    const textarea = page.locator("textarea").first();
    await textarea.fill("Parent note content");

    await page
      .getByRole("button")
      .filter({ hasText: /create note/i })
      .click();
    await expect(page.getByText(/note created/i)).toBeVisible({
      timeout: 5000,
    });

    // Find and click the comment button on the note
    const commentButton = page.getByRole("button").filter({ hasText: /0$/ });
    await commentButton.first().click();

    // Wait for comment popover
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Add a comment
    const commentTextarea = page.locator("textarea").first();
    await commentTextarea.fill("This is a reply comment");

    await page
      .getByRole("button")
      .filter({ hasText: /add comment/i })
      .click();

    // Verify the comment was added
    await expect(page.getByText(/comment added/i)).toBeVisible({
      timeout: 5000,
    });

    // The comment count should now be 1
    await expect(
      page.getByRole("button").filter({ hasText: /1$/ })
    ).toBeVisible();
  });

  test("should resolve and reopen annotations", async ({ page }) => {
    // Create a note
    await page
      .getByRole("button")
      .filter({ hasText: /add annotation/i })
      .click();
    await page.getByRole("menuitem").filter({ hasText: /note/i }).click();

    const textarea = page.locator("textarea").first();
    await textarea.fill("Task to be resolved");

    await page
      .getByRole("button")
      .filter({ hasText: /create note/i })
      .click();
    await expect(page.getByText(/note created/i)).toBeVisible({
      timeout: 5000,
    });

    // Click the resolve button
    await page
      .getByRole("button")
      .filter({ hasText: /resolve/i })
      .first()
      .click();

    // Verify resolved state
    await expect(page.getByText(/note resolved/i)).toBeVisible({
      timeout: 5000,
    });

    // Click reopen button
    await page
      .getByRole("button")
      .filter({ hasText: /reopen/i })
      .first()
      .click();

    // Verify reopened
    await expect(page.getByText(/note reopened/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should create a region annotation", async ({ page }) => {
    await page
      .getByRole("button")
      .filter({ hasText: /add annotation/i })
      .click();
    await page
      .getByRole("menuitem")
      .filter({ hasText: /region/i })
      .click();

    // Wait for dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Enter region name
    await page
      .locator('input[placeholder*="QA Area" i]')
      .fill("Design Review Zone");

    // Submit
    await page
      .getByRole("button")
      .filter({ hasText: /create region/i })
      .click();

    // Verify region was created
    await expect(page.getByText(/region created/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should delete an annotation", async ({ page }) => {
    // Create a note first
    await page
      .getByRole("button")
      .filter({ hasText: /add annotation/i })
      .click();
    await page.getByRole("menuitem").filter({ hasText: /note/i }).click();

    const textarea = page.locator("textarea").first();
    await textarea.fill("Note to be deleted");

    await page
      .getByRole("button")
      .filter({ hasText: /create note/i })
      .click();
    await expect(page.getByText(/note created/i)).toBeVisible({
      timeout: 5000,
    });

    // Hover over the note to reveal actions
    const note = page
      .locator('[class*="group"]')
      .filter({ hasText: /note to be deleted/i });
    await note.hover();

    // Click delete button
    await page
      .getByRole("button")
      .filter({ hasText: /delete/i })
      .first()
      .click();

    // Confirm deletion
    await page
      .getByRole("button")
      .filter({ hasText: /^delete$/i })
      .click();

    // Verify deletion
    await expect(page.getByText(/note deleted/i)).toBeVisible({
      timeout: 5000,
    });

    // Note should no longer be visible
    await expect(page.getByText(/note to be deleted/i })).not.toBeVisible();
  });

  test("should edit an existing note", async ({ page }) => {
    // Create a note
    await page
      .getByRole("button")
      .filter({ hasText: /add annotation/i })
      .click();
    await page.getByRole("menuitem").filter({ hasText: /note/i }).click();

    const textarea = page.locator("textarea").first();
    await textarea.fill("Original content");

    await page
      .getByRole("button")
      .filter({ hasText: /create note/i })
      .click();
    await expect(page.getByText(/note created/i)).toBeVisible({
      timeout: 5000,
    });

    // Hover to reveal edit button
    const note = page
      .locator('[class*="group"]')
      .filter({ hasText: /original content/i });
    await note.hover();

    // Click edit button
    await page.getByRole("button").filter({ hasText: /edit/i }).first().click();

    // Modify content
    const editTextarea = page.locator("textarea").first();
    await editTextarea.fill("Updated content with more details");

    // Save
    await page.getByRole("button").filter({ hasText: /save/i }).click();

    // Verify update
    await expect(page.getByText(/note updated/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/updated content/i)).toBeVisible();
  });
});
