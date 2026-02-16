/**
 * Integration Tests: Command Board Multi-User Collaboration
 *
 * These tests validate real-time collaboration features in the Strategic Command Board:
 * 1. Two users editing the same board simultaneously
 * 2. Card creation sync across multiple clients
 * 3. Card position update propagation
 * 4. Card deletion synchronization
 * 5. User join/leave events
 * 6. Cursor position synchronization
 * 7. Conflict resolution for concurrent edits
 *
 * NOTE: These tests require a real database connection. Run with:
 *   pnpm test:integration
 *
 * @packageDocumentation
 */

import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Use valid UUIDs for tenant and user IDs
const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_1_ID = "00000000-0000-0000-0000-000000000010";
const TEST_USER_2_ID = "00000000-0000-0000-0000-000000000011";
const TEST_USER_3_ID = "00000000-0000-0000-0000-000000000012";
const TEST_BOARD_ID = "00000000-0000-0000-0000-000000000020";

// Simple UUID generator for test cards (v4 format)
function generateTestUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    // biome-ignore lint/suspicious/noBitwiseOperators: Required for UUID v4 spec
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Card counter for unique IDs
let cardCounter = 0;

function generateCardId(): string {
  // Generate UUIDs in a predictable range for testing
  const segment1 = String(1_000_000 + cardCounter).padStart(7, "0");
  cardCounter++;
  return `00000000-0000-4000-8000-${segment1.padEnd(12, "0")}`;
}

/**
 * Type guard for cursor moved payloads
 */
function isCursorMovedPayload(
  payload: Prisma.JsonValue
): payload is { userId: string; position: { x: number; y: number } } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload &&
    "position" in payload
  );
}

/**
 * Type guard for card created payloads
 */
function isCardCreatedPayload(
  payload: Prisma.JsonValue
): payload is { cardId: string; boardId: string; createdBy: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "cardId" in payload &&
    "boardId" in payload &&
    "createdBy" in payload
  );
}

/**
 * Type guard for card moved payloads
 */
function isCardMovedPayload(
  payload: Prisma.JsonValue
): payload is { cardId: string; boardId: string; movedBy: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "cardId" in payload &&
    "boardId" in payload &&
    "movedBy" in payload
  );
}

/**
 * Type guard for card deleted payloads
 */
function isCardDeletedPayload(
  payload: Prisma.JsonValue
): payload is { cardId: string; boardId: string; deletedBy: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "cardId" in payload &&
    "boardId" in payload &&
    "deletedBy" in payload
  );
}

/**
 * Type guard for user joined payloads
 */
function isUserJoinedPayload(
  payload: Prisma.JsonValue
): payload is { boardId: string; userId: string; userName: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "boardId" in payload &&
    "userId" in payload &&
    "userName" in payload
  );
}

/**
 * Type guard for user left payloads
 */
function isUserLeftPayload(
  payload: Prisma.JsonValue
): payload is { boardId: string; userId: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "boardId" in payload &&
    "userId" in payload
  );
}

/**
 * Simulated user context for testing multi-user scenarios
 */
interface SimulatedUser {
  userId: string;
  userName: string;
  tenantId: string;
}

/**
 * Cleanup test data from database
 */
async function cleanupTestData() {
  // Delete cards first (due to foreign key constraints)
  await database.commandBoardCard.deleteMany({
    where: {
      tenantId: TEST_TENANT_ID,
      boardId: TEST_BOARD_ID,
    },
  });

  // Delete outbox events for our test cards
  await database.outboxEvent.deleteMany({
    where: {
      tenantId: TEST_TENANT_ID,
      aggregateId: { startsWith: "00000000-0000-4000-8000-" },
    },
  });

  // Delete board
  await database.commandBoard.deleteMany({
    where: {
      tenantId: TEST_TENANT_ID,
      id: TEST_BOARD_ID,
    },
  });
}

/**
 * Create a test board for collaboration tests
 */
async function createTestBoard() {
  const board = await database.commandBoard.create({
    data: {
      tenantId: TEST_TENANT_ID,
      id: TEST_BOARD_ID,
      name: "Test Collaboration Board",
      description: "Board for testing multi-user collaboration",
      status: "active",
      isTemplate: false,
      tags: ["test", "collaboration"],
    },
  });
  return board;
}

/**
 * Simulate creating a card as a specific user
 */
async function createCardAsUser(
  user: SimulatedUser,
  boardId: string,
  cardData: {
    title: string;
    positionX: number;
    positionY: number;
    cardType?: string;
  }
) {
  const cardId = generateCardId();

  const card = await database.$transaction(async (tx) => {
    const createdCard = await tx.commandBoardCard.create({
      data: {
        tenantId: user.tenantId,
        id: cardId,
        boardId,
        title: cardData.title,
        content: null,
        cardType: cardData.cardType || "task",
        status: "pending",
        positionX: cardData.positionX,
        positionY: cardData.positionY,
        width: 200,
        height: 150,
        zIndex: 0,
        color: null,
        metadata: {},
      },
    });

    // Publish outbox event for real-time sync
    await createOutboxEvent(tx, {
      tenantId: user.tenantId,
      aggregateType: "CommandBoardCard",
      aggregateId: createdCard.id,
      eventType: "command.board.card.created",
      payload: {
        boardId,
        cardId: createdCard.id,
        cardType: createdCard.cardType,
        title: createdCard.title,
        positionX: createdCard.positionX,
        positionY: createdCard.positionY,
        createdBy: user.userId,
        createdAt: createdCard.createdAt.toISOString(),
      },
    });

    return createdCard;
  });

  return card;
}

/**
 * Simulate updating a card position as a specific user
 */
async function moveCardAsUser(
  user: SimulatedUser,
  boardId: string,
  cardId: string,
  newPosition: { x: number; y: number }
) {
  const card = await database.commandBoardCard.findFirst({
    where: {
      tenantId: user.tenantId,
      id: cardId,
      boardId,
    },
  });

  if (!card) {
    throw new Error(`Card ${cardId} not found`);
  }

  const previousPosition = { x: card.positionX, y: card.positionY };

  const updatedCard = await database.$transaction(async (tx) => {
    const updated = await tx.commandBoardCard.update({
      where: {
        tenantId_id: {
          tenantId: user.tenantId,
          id: cardId,
        },
      },
      data: {
        positionX: newPosition.x,
        positionY: newPosition.y,
      },
    });

    // Publish outbox event for real-time sync
    await createOutboxEvent(tx, {
      tenantId: user.tenantId,
      aggregateType: "CommandBoardCard",
      aggregateId: cardId,
      eventType: "command.board.card.moved",
      payload: {
        boardId,
        cardId,
        previousPosition,
        newPosition,
        movedBy: user.userId,
        movedAt: new Date().toISOString(),
      },
    });

    return updated;
  });

  return updatedCard;
}

/**
 * Simulate deleting a card as a specific user
 */
async function deleteCardAsUser(
  user: SimulatedUser,
  boardId: string,
  cardId: string
) {
  const deletedCard = await database.$transaction(async (tx) => {
    const deleted = await tx.commandBoardCard.update({
      where: {
        tenantId_id: {
          tenantId: user.tenantId,
          id: cardId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // Publish outbox event for real-time sync
    await createOutboxEvent(tx, {
      tenantId: user.tenantId,
      aggregateType: "CommandBoardCard",
      aggregateId: cardId,
      eventType: "command.board.card.deleted",
      payload: {
        boardId,
        cardId,
        deletedBy: user.userId,
        deletedAt: new Date().toISOString(),
      },
    });

    return deleted;
  });

  return deletedCard;
}

/**
 * Simulate user joining a board
 */
async function userJoinsBoard(user: SimulatedUser, boardId: string) {
  await createOutboxEvent(database, {
    tenantId: user.tenantId,
    aggregateType: "CommandBoard",
    aggregateId: boardId,
    eventType: "command.board.user.joined",
    payload: {
      boardId,
      userId: user.userId,
      userName: user.userName,
      joinedAt: new Date().toISOString(),
    },
  });
}

/**
 * Simulate user leaving a board
 */
async function userLeavesBoard(user: SimulatedUser, boardId: string) {
  await createOutboxEvent(database, {
    tenantId: user.tenantId,
    aggregateType: "CommandBoard",
    aggregateId: boardId,
    eventType: "command.board.user.left",
    payload: {
      boardId,
      userId: user.userId,
      leftAt: new Date().toISOString(),
    },
  });
}

/**
 * Simulate cursor movement for a user
 */
async function userMovesCursor(
  user: SimulatedUser,
  boardId: string,
  position: { x: number; y: number }
) {
  await createOutboxEvent(database, {
    tenantId: user.tenantId,
    aggregateType: "CommandBoard",
    aggregateId: boardId,
    eventType: "command.board.cursor.moved",
    payload: {
      boardId,
      userId: user.userId,
      position,
      movedAt: new Date().toISOString(),
    },
  });
}

describe("Command Board - Multi-User Collaboration Integration", () => {
  // Simulated users
  const user1: SimulatedUser = {
    userId: TEST_USER_1_ID,
    userName: "Alice Johnson",
    tenantId: TEST_TENANT_ID,
  };

  const user2: SimulatedUser = {
    userId: TEST_USER_2_ID,
    userName: "Bob Smith",
    tenantId: TEST_TENANT_ID,
  };

  const user3: SimulatedUser = {
    userId: TEST_USER_3_ID,
    userName: "Carol Williams",
    tenantId: TEST_TENANT_ID,
  };

  beforeAll(async () => {
    console.log(
      "[TEST] Starting command board collaboration integration tests"
    );
    await cleanupTestData();
    await createTestBoard();
  });

  describe("Card Creation Synchronization", () => {
    it("should propagate card creation events to all users", async () => {
      // User 1 creates a card
      const card1 = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Task from Alice",
        positionX: 100,
        positionY: 200,
      });

      // Verify card was created in database
      const retrievedCard = await database.commandBoardCard.findFirst({
        where: {
          tenantId: TEST_TENANT_ID,
          id: card1.id,
        },
      });

      expect(retrievedCard).toBeDefined();
      expect(retrievedCard?.title).toBe("Task from Alice");
      expect(retrievedCard?.positionX).toBe(100);
      expect(retrievedCard?.positionY).toBe(200);

      // Verify outbox event was created
      const outboxEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card1.id,
          eventType: "command.board.card.created",
        },
      });

      expect(outboxEvents.length).toBeGreaterThan(0);
      expect(
        outboxEvents[0].payload &&
          isCardCreatedPayload(outboxEvents[0].payload) &&
          outboxEvents[0].payload.cardId
      ).toBe(card1.id);
      expect(
        outboxEvents[0].payload &&
          isCardCreatedPayload(outboxEvents[0].payload) &&
          outboxEvents[0].payload.createdBy
      ).toBe(user1.userId);
    });

    it("should support concurrent card creation by multiple users", async () => {
      // Both users create cards simultaneously
      const [card1, card2] = await Promise.all([
        createCardAsUser(user1, TEST_BOARD_ID, {
          title: "Alice's Task",
          positionX: 100,
          positionY: 100,
        }),
        createCardAsUser(user2, TEST_BOARD_ID, {
          title: "Bob's Task",
          positionX: 300,
          positionY: 300,
        }),
      ]);

      // Verify both cards exist
      const allCards = await database.commandBoardCard.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          boardId: TEST_BOARD_ID,
          deletedAt: null,
        },
      });

      const card1Exists = allCards.some((c) => c.id === card1.id);
      const card2Exists = allCards.some((c) => c.id === card2.id);

      expect(card1Exists).toBe(true);
      expect(card2Exists).toBe(true);

      // Verify both outbox events were created
      const events = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: { in: [card1.id, card2.id] },
          eventType: "command.board.card.created",
        },
      });

      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it("should maintain card ownership information in events", async () => {
      const card = await createCardAsUser(user2, TEST_BOARD_ID, {
        title: "Bob's Important Task",
        positionX: 500,
        positionY: 500,
      });

      const events = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card.id,
          eventType: "command.board.card.created",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(events.length).toBeGreaterThan(0);
      const latestEvent = events[0];
      expect(
        latestEvent.payload &&
          isCardCreatedPayload(latestEvent.payload) &&
          latestEvent.payload.createdBy
      ).toBe(user2.userId);
      expect(
        latestEvent.payload &&
          isCardCreatedPayload(latestEvent.payload) &&
          latestEvent.payload.cardId
      ).toBe(card.id);
    });
  });

  describe("Card Position Update Propagation", () => {
    it("should broadcast position changes to all connected users", async () => {
      // Create a card
      const card = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Movable Card",
        positionX: 100,
        positionY: 100,
      });

      // User 2 moves the card
      const newPosition = { x: 250, y: 350 };
      const updatedCard = await moveCardAsUser(
        user2,
        TEST_BOARD_ID,
        card.id,
        newPosition
      );

      expect(updatedCard.positionX).toBe(newPosition.x);
      expect(updatedCard.positionY).toBe(newPosition.y);

      // Verify move event was created
      const moveEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card.id,
          eventType: "command.board.card.moved",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(moveEvents.length).toBeGreaterThan(0);
      const latestMoveEvent = moveEvents[0];
      expect(
        latestMoveEvent.payload &&
          isCardMovedPayload(latestMoveEvent.payload) &&
          latestMoveEvent.payload.movedBy
      ).toBe(user2.userId);
      expect(
        latestMoveEvent.payload &&
          typeof latestMoveEvent.payload === "object" &&
          "newPosition" in latestMoveEvent.payload &&
          latestMoveEvent.payload.newPosition
      ).toEqual(newPosition);
      expect(
        latestMoveEvent.payload &&
          typeof latestMoveEvent.payload === "object" &&
          "previousPosition" in latestMoveEvent.payload &&
          latestMoveEvent.payload.previousPosition
      ).toEqual({
        x: 100,
        y: 100,
      });
    });

    it("should track position history in events", async () => {
      const card = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Tracked Card",
        positionX: 0,
        positionY: 0,
      });

      // Move card multiple times
      await moveCardAsUser(user1, TEST_BOARD_ID, card.id, { x: 100, y: 100 });
      await moveCardAsUser(user2, TEST_BOARD_ID, card.id, { x: 200, y: 200 });
      await moveCardAsUser(user1, TEST_BOARD_ID, card.id, { x: 300, y: 300 });

      const moveEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card.id,
          eventType: "command.board.card.moved",
        },
        orderBy: { createdAt: "asc" },
      });

      expect(moveEvents.length).toBeGreaterThanOrEqual(3);

      // Verify position progression
      const moveEvent0 = moveEvents[0];
      const moveEvent1 = moveEvents[1];
      const moveEvent2 = moveEvents[2];

      expect(
        moveEvent0.payload &&
          typeof moveEvent0.payload === "object" &&
          "previousPosition" in moveEvent0.payload &&
          moveEvent0.payload.previousPosition
      ).toEqual({ x: 0, y: 0 });
      expect(
        moveEvent0.payload &&
          typeof moveEvent0.payload === "object" &&
          "newPosition" in moveEvent0.payload &&
          moveEvent0.payload.newPosition
      ).toEqual({ x: 100, y: 100 });

      expect(
        moveEvent1.payload &&
          typeof moveEvent1.payload === "object" &&
          "previousPosition" in moveEvent1.payload &&
          moveEvent1.payload.previousPosition
      ).toEqual({
        x: 100,
        y: 100,
      });
      expect(
        moveEvent1.payload &&
          typeof moveEvent1.payload === "object" &&
          "newPosition" in moveEvent1.payload &&
          moveEvent1.payload.newPosition
      ).toEqual({ x: 200, y: 200 });

      expect(
        moveEvent2.payload &&
          typeof moveEvent2.payload === "object" &&
          "previousPosition" in moveEvent2.payload &&
          moveEvent2.payload.previousPosition
      ).toEqual({
        x: 200,
        y: 200,
      });
      expect(
        moveEvent2.payload &&
          typeof moveEvent2.payload === "object" &&
          "newPosition" in moveEvent2.payload &&
          moveEvent2.payload.newPosition
      ).toEqual({ x: 300, y: 300 });
    });

    it("should handle concurrent position updates", async () => {
      const card = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Race Condition Card",
        positionX: 100,
        positionY: 100,
      });

      // Simulate concurrent moves
      await Promise.all([
        moveCardAsUser(user1, TEST_BOARD_ID, card.id, { x: 150, y: 150 }),
        moveCardAsUser(user2, TEST_BOARD_ID, card.id, { x: 200, y: 200 }),
      ]);

      // Both events should be recorded
      const moveEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card.id,
          eventType: "command.board.card.moved",
        },
      });

      expect(moveEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Card Deletion Synchronization", () => {
    it("should propagate deletion events to all users", async () => {
      const card = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "To Be Deleted",
        positionX: 100,
        positionY: 100,
      });

      // User 2 deletes the card
      await deleteCardAsUser(user2, TEST_BOARD_ID, card.id);

      // Verify soft delete in database
      const deletedCard = await database.commandBoardCard.findFirst({
        where: {
          tenantId: TEST_TENANT_ID,
          id: card.id,
        },
      });

      expect(deletedCard?.deletedAt).toBeDefined();

      // Verify deletion event was created
      const deleteEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card.id,
          eventType: "command.board.card.deleted",
        },
      });

      expect(deleteEvents.length).toBeGreaterThan(0);
      expect(
        deleteEvents[0].payload &&
          isCardDeletedPayload(deleteEvents[0].payload) &&
          deleteEvents[0].payload.deletedBy
      ).toBe(user2.userId);
      expect(
        deleteEvents[0].payload &&
          isCardDeletedPayload(deleteEvents[0].payload) &&
          deleteEvents[0].payload.cardId
      ).toBe(card.id);
    });

    it("should prevent deleted cards from being visible in queries", async () => {
      const card1 = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Active Card 1",
        positionX: 100,
        positionY: 100,
      });

      const card2 = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Active Card 2",
        positionX: 200,
        positionY: 200,
      });

      // Delete one card
      await deleteCardAsUser(user2, TEST_BOARD_ID, card1.id);

      // Query active cards
      const activeCards = await database.commandBoardCard.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          boardId: TEST_BOARD_ID,
          deletedAt: null,
        },
      });

      const card1Visible = activeCards.some((c) => c.id === card1.id);
      const card2Visible = activeCards.some((c) => c.id === card2.id);

      expect(card1Visible).toBe(false);
      expect(card2Visible).toBe(true);
    });
  });

  describe("User Join/Leave Events", () => {
    it("should record user join events", async () => {
      await userJoinsBoard(user1, TEST_BOARD_ID);

      const joinEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: TEST_BOARD_ID,
          eventType: "command.board.user.joined",
          aggregateType: "CommandBoard",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(joinEvents.length).toBeGreaterThan(0);
      const latestJoinEvent = joinEvents[0];
      expect(
        latestJoinEvent.payload &&
          isUserJoinedPayload(latestJoinEvent.payload) &&
          latestJoinEvent.payload.userId
      ).toBe(user1.userId);
      expect(
        latestJoinEvent.payload &&
          isUserJoinedPayload(latestJoinEvent.payload) &&
          latestJoinEvent.payload.userName
      ).toBe(user1.userName);
    });

    it("should record user leave events", async () => {
      await userLeavesBoard(user1, TEST_BOARD_ID);

      const leaveEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: TEST_BOARD_ID,
          eventType: "command.board.user.left",
          aggregateType: "CommandBoard",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(leaveEvents.length).toBeGreaterThan(0);
      const latestLeaveEvent = leaveEvents[0];
      expect(
        latestLeaveEvent.payload &&
          isUserLeftPayload(latestLeaveEvent.payload) &&
          latestLeaveEvent.payload.userId
      ).toBe(user1.userId);
    });

    it("should track multiple users joining and leaving", async () => {
      // Multiple users join
      await userJoinsBoard(user1, TEST_BOARD_ID);
      await userJoinsBoard(user2, TEST_BOARD_ID);
      await userJoinsBoard(user3, TEST_BOARD_ID);

      // One user leaves
      await userLeavesBoard(user2, TEST_BOARD_ID);

      const joinEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: TEST_BOARD_ID,
          eventType: "command.board.user.joined",
          aggregateType: "CommandBoard",
        },
      });

      const leaveEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: TEST_BOARD_ID,
          eventType: "command.board.user.left",
          aggregateType: "CommandBoard",
        },
      });

      expect(joinEvents.length).toBeGreaterThanOrEqual(3);
      expect(leaveEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Cursor Position Synchronization", () => {
    it("should record cursor movement events", async () => {
      const position = { x: 500, y: 750 };
      await userMovesCursor(user1, TEST_BOARD_ID, position);

      const cursorEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: TEST_BOARD_ID,
          eventType: "command.board.cursor.moved",
          aggregateType: "CommandBoard",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(cursorEvents.length).toBeGreaterThan(0);
      const latestCursorEvent = cursorEvents[0];
      expect(
        latestCursorEvent.payload &&
          isCursorMovedPayload(latestCursorEvent.payload) &&
          latestCursorEvent.payload.userId
      ).toBe(user1.userId);
      expect(
        latestCursorEvent.payload &&
          isCursorMovedPayload(latestCursorEvent.payload) &&
          latestCursorEvent.payload.position
      ).toEqual(position);
    });

    it("should track cursor movements from multiple users", async () => {
      const positions = [
        { user: user1, position: { x: 100, y: 100 } as const },
        { user: user2, position: { x: 200, y: 200 } as const },
        { user: user3, position: { x: 300, y: 300 } as const },
      ];

      await Promise.all(
        positions.map((p) => userMovesCursor(p.user, TEST_BOARD_ID, p.position))
      );

      const cursorEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: TEST_BOARD_ID,
          eventType: "command.board.cursor.moved",
          aggregateType: "CommandBoard",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(cursorEvents.length).toBeGreaterThanOrEqual(3);

      // Verify each user's cursor event
      for (const { user, position } of positions) {
        const userEvents = cursorEvents.filter(
          (e) =>
            e.payload !== null &&
            isCursorMovedPayload(e.payload) &&
            e.payload.userId === user.userId
        );
        expect(userEvents.length).toBeGreaterThan(0);
        expect(
          userEvents[0].payload &&
            isCursorMovedPayload(userEvents[0].payload) &&
            userEvents[0].payload.position
        ).toEqual(position);
      }
    });

    it("should handle rapid cursor movements", async () => {
      const movements = 10;
      const basePosition = { x: 0, y: 0 };

      const promises = Array.from({ length: movements }, (_, i) =>
        userMovesCursor(user1, TEST_BOARD_ID, {
          x: basePosition.x + i * 10,
          y: basePosition.y + i * 10,
        })
      );

      await Promise.all(promises);

      const cursorEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: TEST_BOARD_ID,
          eventType: "command.board.cursor.moved",
          aggregateType: "CommandBoard",
        },
      });

      expect(cursorEvents.length).toBeGreaterThanOrEqual(movements);
    });
  });

  describe("Conflict Resolution for Concurrent Edits", () => {
    it("should maintain event ordering for concurrent card creations", async () => {
      // Create multiple cards rapidly
      const cards = await Promise.all([
        createCardAsUser(user1, TEST_BOARD_ID, {
          title: "Card 1",
          positionX: 100,
          positionY: 100,
        }),
        createCardAsUser(user2, TEST_BOARD_ID, {
          title: "Card 2",
          positionX: 200,
          positionY: 200,
        }),
        createCardAsUser(user3, TEST_BOARD_ID, {
          title: "Card 3",
          positionX: 300,
          positionY: 300,
        }),
      ]);

      const events = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: { in: cards.map((c) => c.id) },
          eventType: "command.board.card.created",
        },
        orderBy: { createdAt: "asc" },
      });

      expect(events.length).toBeGreaterThanOrEqual(3);

      // Verify chronological ordering
      for (let i = 1; i < events.length; i++) {
        expect(events[i - 1].createdAt.getTime()).toBeLessThanOrEqual(
          events[i].createdAt.getTime()
        );
      }
    });

    it("should handle concurrent moves of the same card", async () => {
      const card = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Hot Potato Card",
        positionX: 100,
        positionY: 100,
      });

      // Multiple users move the same card concurrently
      await Promise.all([
        moveCardAsUser(user1, TEST_BOARD_ID, card.id, { x: 150, y: 150 }),
        moveCardAsUser(user2, TEST_BOARD_ID, card.id, { x: 200, y: 200 }),
        moveCardAsUser(user3, TEST_BOARD_ID, card.id, { x: 250, y: 250 }),
      ]);

      const moveEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card.id,
          eventType: "command.board.card.moved",
        },
        orderBy: { createdAt: "asc" },
      });

      expect(moveEvents.length).toBeGreaterThanOrEqual(3);

      // All events should be recorded, even if they conflict
      // The application layer would determine which move "wins"
      for (const event of moveEvents) {
        const payload = event.payload;
        expect(payload && isCardMovedPayload(payload) && payload.cardId).toBe(
          card.id
        );
        expect(payload && isCardMovedPayload(payload) && payload.boardId).toBe(
          TEST_BOARD_ID
        );
      }
    });

    it("should preserve audit trail for conflicting edits", async () => {
      const card = await createCardAsUser(user1, TEST_BOARD_ID, {
        title: "Audit Trail Card",
        positionX: 100,
        positionY: 100,
      });

      // Perform multiple operations
      await moveCardAsUser(user1, TEST_BOARD_ID, card.id, { x: 150, y: 150 });
      await moveCardAsUser(user2, TEST_BOARD_ID, card.id, { x: 200, y: 200 });
      await deleteCardAsUser(user3, TEST_BOARD_ID, card.id);

      const allEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: card.id,
        },
        orderBy: { createdAt: "asc" },
      });

      expect(allEvents.length).toBeGreaterThanOrEqual(3);

      // Verify event sequence
      const eventTypes = allEvents.map((e) => e.eventType);
      expect(eventTypes).toContain("command.board.card.created");
      expect(eventTypes).toContain("command.board.card.moved");
      expect(eventTypes).toContain("command.board.card.deleted");

      // Verify each event has proper user attribution
      for (const event of allEvents) {
        expect(event.tenantId).toBe(TEST_TENANT_ID);
        expect(event.aggregateId).toBe(card.id);
        if (event.eventType === "command.board.card.created") {
          expect(
            event.payload &&
              isCardCreatedPayload(event.payload) &&
              event.payload.createdBy
          ).toBeDefined();
        } else if (event.eventType === "command.board.card.moved") {
          expect(
            event.payload &&
              isCardMovedPayload(event.payload) &&
              event.payload.movedBy
          ).toBeDefined();
        } else if (event.eventType === "command.board.card.deleted") {
          expect(
            event.payload &&
              isCardDeletedPayload(event.payload) &&
              event.payload.deletedBy
          ).toBeDefined();
        }
      }
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("should isolate events by tenant", async () => {
      const otherTenantId = "00000000-0000-0000-0000-000000000999";

      // Create board for other tenant with unique ID
      const otherBoardId = generateTestUUID();
      await database.commandBoard.create({
        data: {
          tenantId: otherTenantId,
          id: otherBoardId,
          name: "Other Tenant Board",
          status: "active",
          isTemplate: false,
          tags: [],
        },
      });

      const otherCard = await createCardAsUser(
        { ...user1, tenantId: otherTenantId },
        otherBoardId,
        {
          title: "Other Tenant Card",
          positionX: 100,
          positionY: 100,
        }
      );

      // Query events for test tenant
      const testTenantEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
        },
      });

      // Query events for other tenant
      const otherTenantEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: otherTenantId,
        },
      });

      // Verify isolation - no overlap
      const testTenantIds = new Set(testTenantEvents.map((e) => e.id));
      const otherTenantIds = new Set(otherTenantEvents.map((e) => e.id));

      const overlap = [...testTenantIds].filter((id) => otherTenantIds.has(id));
      expect(overlap).toHaveLength(0);

      // Verify other tenant's event exists
      const otherCardEvent = otherTenantEvents.find(
        (e) => e.aggregateId === otherCard.id
      );
      expect(otherCardEvent).toBeDefined();
      expect(otherCardEvent?.tenantId).toBe(otherTenantId);

      // Cleanup other tenant data
      await database.commandBoardCard.deleteMany({
        where: {
          tenantId: otherTenantId,
          boardId: otherBoardId,
        },
      });
      await database.commandBoard.deleteMany({
        where: {
          tenantId: otherTenantId,
          id: otherBoardId,
        },
      });
      await database.outboxEvent.deleteMany({
        where: {
          tenantId: otherTenantId,
        },
      });
    });
  });

  describe("Real-time Event Performance", () => {
    it("should handle high-volume card creation events", async () => {
      const cardCount = 20;
      const batchSize = 5;

      // Create cards in batches
      for (let batch = 0; batch < cardCount / batchSize; batch++) {
        const promises = Array.from({ length: batchSize }, (_, i) =>
          createCardAsUser(user1, TEST_BOARD_ID, {
            title: `Performance Card ${batch * batchSize + i}`,
            positionX: batch * 100,
            positionY: i * 50,
          })
        );
        await Promise.all(promises);
      }

      // Verify all cards were created
      const cards = await database.commandBoardCard.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          boardId: TEST_BOARD_ID,
          deletedAt: null,
        },
      });

      expect(cards.length).toBeGreaterThanOrEqual(cardCount);

      // Verify all events were created
      const events = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: { startsWith: "00000000-0000-4000-8000-" },
          eventType: "command.board.card.created",
        },
      });

      expect(events.length).toBeGreaterThanOrEqual(cardCount);
    });
  });
});

// Final cleanup
afterAll(async () => {
  await cleanupTestData();
  console.log("[TEST] Completed command board collaboration integration tests");
});
