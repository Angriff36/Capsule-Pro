import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { requireTenantId } from "@/app/lib/tenant";
import {
  runManifestActionAgentSafe,
  type StructuredAgentResponse,
} from "./agent-loop";
import { formatStructuredAgentResponseForDisplay } from "./response-format";

const AI_MODEL = process.env.COMMAND_BOARD_AI_MODEL ?? "gpt-4o-mini";
const NEWLINE_REGEX = /\r?\n/;

const SYSTEM_PROMPT = `You are Capsule AI, the built-in assistant for Capsule Pro — a catering management platform.

You help users across ALL modules: events, calendar, kitchen, inventory, staffing, logistics, procurement, analytics, CRM, payroll, facilities, and more.

## How to respond

**For questions and lookups:** Use the query tools (list_events, list_staff, list_clients, list_inventory, list_kitchen_tasks, get_dashboard_summary) to fetch real data, then summarize the results in clear, natural language. Do NOT make up data — always query first.

**For actions:** Use the write tools (create_event_draft, set_event_menu, etc.) or execute_manifest_command. Before executing any write, ensure ALL required fields are provided. If fields are missing, ask the user to provide them.

## Rules
1. Always use tools to get real data before answering. Never guess or fabricate numbers.
2. tenantId and userId are already in tool context; never ask the user for them.
3. Respond in natural, conversational language — NOT raw JSON. Be concise but helpful.
4. If a tool returns an error, explain what went wrong and suggest what the user can do.
5. If a requested capability isn't available, say so clearly and suggest alternatives.

## Event Creation Flow
When a user asks to create/schedule/plan an event:
1. Use parse_natural_language_event to extract structured data.
2. If readyToCreate is true, call create_event_draft with parsed values (status "draft" unless specified).
3. If missingFields is not empty, ask the user for those details first.
4. After success, confirm with the event details.`;

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  messages: UIMessage[];
  boardId?: string;
}

function resolveOpenAiApiKey(): string | null {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }

  try {
    const userProfile = process.env.USERPROFILE;
    if (!userProfile) {
      return null;
    }

    const envTxtPath = join(userProfile, "Documents", "env.txt");
    if (!existsSync(envTxtPath)) {
      return null;
    }

    const envContents = readFileSync(envTxtPath, "utf8");
    const line = envContents
      .split(NEWLINE_REGEX)
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("OPENAI_API_KEY="));

    if (!line) {
      return null;
    }

    const key = line.slice("OPENAI_API_KEY=".length).trim();
    return key ? key.replace(/^['"]|['"]$/g, "") : null;
  } catch (error) {
    captureException(error, {
      tags: { route: "command-board-chat" },
    });
    log.error("[command-board-chat] Failed to resolve OPENAI_API_KEY", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

function toStreamResponse(
  messages: UIMessage[],
  payload: StructuredAgentResponse
): Response {
  const text = formatStructuredAgentResponseForDisplay(payload);

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = randomUUID();
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
    originalMessages: messages,
  });

  return createUIMessageStreamResponse({ stream });
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = randomUUID();
  let parsedMessages: UIMessage[] = [];

  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const tenantId = await requireTenantId();
    const body = (await request.json()) as ChatRequestBody;
    parsedMessages = body.messages ?? [];

    if (!(body.messages && Array.isArray(body.messages))) {
      return new Response("Invalid request: messages are required", {
        status: 400,
      });
    }

    const apiKey = resolveOpenAiApiKey();
    if (!apiKey) {
      return toStreamResponse(body.messages, {
        summary:
          "OPENAI_API_KEY is not configured, so no model response was generated.",
        actionsTaken: [],
        errors: ["Missing OPENAI_API_KEY"],
        nextSteps: [
          "Set OPENAI_API_KEY in environment and retry.",
          "If running locally, add OPENAI_API_KEY to Documents/env.txt.",
        ],
      });
    }

    const structuredResponse = await runManifestActionAgentSafe({
      apiKey,
      model: AI_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      messages: body.messages,
      context: {
        tenantId,
        userId,
        boardId: body.boardId,
        authCookie: request.headers.get("cookie"),
        correlationId,
      },
    });

    return toStreamResponse(body.messages, structuredResponse);
  } catch (error) {
    captureException(error, {
      tags: {
        route: "command-board-chat",
      },
      extra: {
        correlationId,
      },
    });

    const message =
      error instanceof Error
        ? error.message
        : "Unknown command board chat error";

    log.error("[command-board-chat] Route failed", {
      error: message,
      correlationId,
    });

    const fallbackBody: StructuredAgentResponse = {
      summary: "Failed to process request.",
      actionsTaken: [],
      errors: [message],
      nextSteps: ["Retry request.", "Check server logs for correlation id."],
    };

    return toStreamResponse(parsedMessages, fallbackBody);
  }
}
