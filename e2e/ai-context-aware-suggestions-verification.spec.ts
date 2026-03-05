import { expect, test } from "@playwright/test";

test.describe("AI Context-Aware Suggestions", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to command board
    await page.goto("/command-board");
  });

  test("API endpoint returns suggestions with board analysis", async ({
    request,
  }) => {
    // First, get a list of boards to use a valid boardId
    const boardsResponse = await request.get("/api/command-board/boards/list");
    expect(boardsResponse.ok()).toBeTruthy();

    const boardsData = await boardsResponse.json();
    const boards = boardsData.boards || boardsData;

    // Skip test if no boards exist
    if (boards.length === 0) {
      test.skip();
      return;
    }

    const boardId = boards[0].id;

    // Call the AI context-aware suggestions endpoint
    const response = await request.get(
      `/api/ai/context-aware-suggestions?boardId=${boardId}&maxSuggestions=5`
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty("suggestions");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("analysis");
    expect(data).toHaveProperty("generatedAt");
    expect(data).toHaveProperty("method");

    // Verify suggestions array structure
    expect(Array.isArray(data.suggestions)).toBeTruthy();

    // Verify analysis structure when available
    if (data.analysis) {
      expect(data.analysis).toHaveProperty("boardId");
      expect(data.analysis).toHaveProperty("entitySummary");
      expect(data.analysis).toHaveProperty("capacityMetrics");
      expect(data.analysis).toHaveProperty("temporalPatterns");
      expect(data.analysis.capacityMetrics).toHaveProperty("totalEntities");
      expect(data.analysis.capacityMetrics).toHaveProperty("upcomingDeadlines");
      expect(data.analysis.capacityMetrics).toHaveProperty("conflicts");
    }

    console.log(
      "AI Context-Aware Suggestions Response:",
      JSON.stringify(data, null, 2)
    );
  });

  test("Fallback suggestions work without AI", async ({ request }) => {
    // First, get a list of boards to use a valid boardId
    const boardsResponse = await request.get("/api/command-board/boards/list");
    expect(boardsResponse.ok()).toBeTruthy();

    const boardsData = await boardsResponse.json();
    const boards = boardsData.boards || boardsData;

    // Skip test if no boards exist
    if (boards.length === 0) {
      test.skip();
      return;
    }

    const boardId = boards[0].id;

    // Call with useAi=false to force fallback mode
    const response = await request.get(
      `/api/ai/context-aware-suggestions?boardId=${boardId}&useAi=false`
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify response uses fallback method
    expect(data.method).toBe("fallback");

    // Verify suggestions array structure
    expect(Array.isArray(data.suggestions)).toBeTruthy();

    console.log(
      "Fallback Suggestions Response:",
      JSON.stringify(data, null, 2)
    );
  });

  test("Board analysis includes temporal patterns", async ({ request }) => {
    // First, get a list of boards to use a valid boardId
    const boardsResponse = await request.get("/api/command-board/boards/list");
    expect(boardsResponse.ok()).toBeTruthy();

    const boardsData = await boardsResponse.json();
    const boards = boardsData.boards || boardsData;

    // Skip test if no boards exist
    if (boards.length === 0) {
      test.skip();
      return;
    }

    const boardId = boards[0].id;

    const response = await request.get(
      `/api/ai/context-aware-suggestions?boardId=${boardId}&timeframe=week`
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify analysis includes temporal patterns
    if (data.analysis) {
      expect(Array.isArray(data.analysis.temporalPatterns)).toBeTruthy();

      // If there are temporal patterns, verify their structure
      data.analysis.temporalPatterns.forEach((pattern: unknown) => {
        const p = pattern as {
          type: string;
          severity: string;
          entities: unknown[];
        };
        expect(p).toHaveProperty("type");
        expect(p).toHaveProperty("severity");
        expect(p).toHaveProperty("entities");
        expect(Array.isArray(p.entities)).toBeTruthy();
      });

      console.log(
        "Temporal Patterns:",
        JSON.stringify(data.analysis.temporalPatterns, null, 2)
      );
    }
  });

  test("Bulk create cards API endpoint exists", async ({ request }) => {
    // First, get a list of boards to use a valid boardId
    const boardsResponse = await request.get("/api/command-board/boards/list");
    expect(boardsResponse.ok()).toBeTruthy();

    const boardsData = await boardsResponse.json();
    const boards = boardsData.boards || boardsData;

    // Skip test if no boards exist
    if (boards.length === 0) {
      test.skip();
      return;
    }

    const boardId = boards[0].id;

    // Test bulk create cards endpoint
    const bulkCreateResponse = await request.post(
      "/api/command-board/cards/bulk",
      {
        data: {
          boardId,
          cards: [
            {
              entityType: "note",
              title: "Test note from verification",
              content: "This is a test note created during verification",
              position: {
                x: 100,
                y: 100,
                width: 220,
                height: 160,
                zIndex: 1,
              },
            },
          ],
        },
      }
    );

    // The endpoint should exist (might fail auth, but 401 is OK, 404 is not)
    expect([200, 201, 401, 403]).toContain(bulkCreateResponse.status());

    if (bulkCreateResponse.ok()) {
      const data = await bulkCreateResponse.json();
      expect(data).toHaveProperty("success");
      console.log("Bulk Create Cards Response:", JSON.stringify(data, null, 2));
    }
  });
});
