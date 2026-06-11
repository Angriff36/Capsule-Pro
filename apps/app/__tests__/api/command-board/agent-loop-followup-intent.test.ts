// @vitest-environment node
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  applyCreatedEntityIds,
  buildPlanningConversation,
  detectQueryIntent,
  extractCreatedEntityId,
} from "@/app/api/command-board/chat/agent-loop";

function userMessage(text: string): UIMessage {
  return {
    id: `user-${text.slice(0, 10)}`,
    role: "user",
    parts: [{ type: "text", text }],
  } as UIMessage;
}

function assistantMessage(text: string): UIMessage {
  return {
    id: `assistant-${text.slice(0, 10)}`,
    role: "assistant",
    parts: [{ type: "text", text }],
  } as UIMessage;
}

describe("detectQueryIntent write follow-ups", () => {
  it("routes 'fill in the fields' follow-ups to the planner, not list_events", () => {
    // Regression: this exact message was misrouted to list_events because
    // "fill" was not a recognized write verb while "event" matched the
    // event-query pattern.
    expect(
      detectQueryIntent(
        "just fill in the fields with random information but include a full menu, its a test event"
      )
    ).toBeNull();
  });

  it("treats make/populate/generate/build as write signals", () => {
    expect(detectQueryIntent("make a test event with random data")).toBeNull();
    expect(detectQueryIntent("populate the event with sample data")).toBeNull();
    expect(detectQueryIntent("generate a menu for the event")).toBeNull();
    expect(detectQueryIntent("build out the full menu")).toBeNull();
  });

  it("still routes genuine questions to query tools", () => {
    expect(detectQueryIntent("what events are coming up this week")).toBe(
      "list_events"
    );
    expect(detectQueryIntent("show me low stock inventory")).toBe(
      "list_inventory"
    );
  });
});

describe("buildPlanningConversation", () => {
  it("includes prior turns so follow-ups carry context", () => {
    const conversation = buildPlanningConversation([
      userMessage("Help me create a new event"),
      assistantMessage("Missing required args for Event.create: title, ..."),
      userMessage("just fill in the fields with random information"),
    ]);

    expect(conversation).toHaveLength(3);
    expect(conversation[0]).toEqual({
      role: "user",
      content: "Help me create a new event",
    });
    expect(conversation[1]?.role).toBe("assistant");
    expect(conversation[2]?.content).toContain("fill in the fields");
  });

  it("caps history and drops empty messages", () => {
    const messages: UIMessage[] = [];
    for (let index = 0; index < 30; index += 1) {
      messages.push(userMessage(`message number ${index}`));
    }
    messages.push({
      id: "empty",
      role: "user",
      parts: [],
    } as unknown as UIMessage);

    const conversation = buildPlanningConversation(messages);
    expect(conversation.length).toBeLessThanOrEqual(12);
    expect(conversation.at(-1)?.content).toBe("message number 29");
  });

  it("returns a placeholder when no usable messages exist", () => {
    const conversation = buildPlanningConversation([]);
    expect(conversation).toHaveLength(1);
    expect(conversation[0]?.role).toBe("user");
  });
});

describe("created-entity id threading", () => {
  it("extracts the created id from a dispatcher tool result", () => {
    expect(
      extractCreatedEntityId({
        routePath: "/api/manifest/Menu/commands/create",
        response: { success: true, result: { id: "menu-123" }, events: [] },
      })
    ).toBe("menu-123");
  });

  it("returns null when no id is present", () => {
    expect(extractCreatedEntityId({ response: { success: true } })).toBeNull();
    expect(extractCreatedEntityId(undefined)).toBeNull();
    expect(extractCreatedEntityId("not an object")).toBeNull();
  });

  it("fills missing <entity>Id args from previously created entities", () => {
    const args: Record<string, unknown> = {
      menuId: null,
      name: "Spring Salad",
    };
    applyCreatedEntityIds(
      args,
      [
        { name: "menuId", type: "string", required: true, location: "body" },
        { name: "name", type: "string", required: true, location: "body" },
      ],
      new Map([
        ["Menu", "menu-123"],
        ["Event", "event-456"],
      ])
    );

    expect(args.menuId).toBe("menu-123");
    expect(args.name).toBe("Spring Salad");
  });

  it("never overwrites a value the plan already provided", () => {
    const args: Record<string, unknown> = { menuId: "explicit-menu" };
    applyCreatedEntityIds(
      args,
      [{ name: "menuId", type: "string", required: true, location: "body" }],
      new Map([["Menu", "menu-123"]])
    );
    expect(args.menuId).toBe("explicit-menu");
  });

  it("only fills params the command actually accepts", () => {
    const args: Record<string, unknown> = {};
    applyCreatedEntityIds(
      args,
      [{ name: "title", type: "string", required: true, location: "body" }],
      new Map([["Menu", "menu-123"]])
    );
    expect(args).toEqual({});
  });
});
