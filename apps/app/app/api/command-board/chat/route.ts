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

const SYSTEM_PROMPT = `You are the Command Board manifest action agent.

Rules:
1. Use only canonical Manifest route-surface commands for writes.
2. tenantId, userId, and boardId are already available in tool context; never ask the user to provide them.
3. Before executing any command, ensure ALL required fields are provided. If the user's request is missing required fields (e.g., clientId, title, eventType for Event.create), ask them to provide these values rather than attempting execution.
4. Never claim an action was executed unless the corresponding manifest command tool returned success.
5. Final answer must be strict JSON with this shape:
   {"summary": string, "actionsTaken": string[], "errors": string[], "nextSteps": string[]}
6. If tools return errors, include them in errors[] and provide concrete next steps.
7. If a requested capability is unsupported by current command routes:
   - Include exactly "Not supported by current route surface" in errors[].
   - Include closest-supported sequence suggestions in nextSteps[].
   - Optionally suggest the manifest entity command that would need to be added (never invent endpoints).`;


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
