import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { UIMessage } from "ai";

interface ResponsesFunctionCall {
  type: "function_call";
  name: string;
  arguments: string;
  call_id: string;
}

interface ResponsesOutputMessage {
  type: "message";
  role: "assistant" | "user";
  content?: Array<{ type: string; text?: string }>;
}

interface ResponsesApiResult {
  id: string;
  output?: Array<ResponsesFunctionCall | ResponsesOutputMessage>;
  output_text?: string;
}

export interface AgentToolExecution {
  toolName: string;
  status: "success" | "error";
  summary: string;
}

export interface StructuredAgentResponse {
  summary: string;
  actionsTaken: string[];
  errors: string[];
  nextSteps: string[];
}

export interface RunManifestAgentParams {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: UIMessage[];
  context: {
    tenantId: string;
    userId: string;
    boardId?: string;
    authCookie?: string | null;
    correlationId: string;
  };
}

function getMessageText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function toResponsesInput(messages: UIMessage[]) {
  return messages
    .map((message) => {
      const text = getMessageText(message);
      if (!text) {
        return null;
      }

      const role = message.role === "assistant" ? "assistant" : "user";
      return { role, content: text };
    })
    .filter((entry): entry is { role: "assistant" | "user"; content: string } =>
      Boolean(entry)
    );
}

function extractAssistantText(result: ResponsesApiResult): string {
  if (
    typeof result.output_text === "string" &&
    result.output_text.trim().length > 0
  ) {
    return result.output_text.trim();
  }

  const textParts: string[] = [];
  for (const outputItem of result.output ?? []) {
    if (outputItem.type !== "message") {
      continue;
    }

    for (const contentItem of outputItem.content ?? []) {
      if (typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function extractFunctionCalls(
  result: ResponsesApiResult
): ResponsesFunctionCall[] {
  return (result.output ?? []).filter(
    (output): output is ResponsesFunctionCall => output.type === "function_call"
  );
}

function parseStructuredResponse(text: string): StructuredAgentResponse | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const candidateValues = [trimmed];

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidateValues.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidateValues) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      if (
        typeof parsed.summary === "string" &&
        Array.isArray(parsed.actionsTaken) &&
        Array.isArray(parsed.errors) &&
        Array.isArray(parsed.nextSteps)
      ) {
        return {
          summary: parsed.summary,
          actionsTaken: parsed.actionsTaken.filter(
            (item): item is string => typeof item === "string"
          ),
          errors: parsed.errors.filter(
            (item): item is string => typeof item === "string"
          ),
          nextSteps: parsed.nextSteps.filter(
            (item): item is string => typeof item === "string"
          ),
        };
      }
    } catch {
      // Keep trying additional candidates.
    }
  }

  return null;
}

export function normalizeStructuredAgentResponse(
  modelText: string,
  toolExecutions: AgentToolExecution[]
): StructuredAgentResponse {
  const parsed = parseStructuredResponse(modelText);
  if (parsed) {
    return parsed;
  }

  const successes = toolExecutions
    .filter((execution) => execution.status === "success")
    .map((execution) => execution.summary);

  const errors = toolExecutions
    .filter((execution) => execution.status === "error")
    .map((execution) => execution.summary);

  const fallbackSummary =
    modelText.trim() ||
    (successes.length > 0
      ? "Request processed using manifest tools."
      : "No assistant text returned; generated summary from tool outputs.");

  const nextSteps: string[] = [];
  if (errors.length > 0) {
    nextSteps.push("Resolve the listed errors and retry the request.");
  }
  if (successes.length > 0) {
    nextSteps.push(
      "Review applied actions on the board and confirm expected state."
    );
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Retry with a more specific command.");
  }

  return {
    summary: fallbackSummary,
    actionsTaken: successes,
    errors,
    nextSteps,
  };
}

async function callResponsesApi(params: {
  apiKey: string;
  model: string;
  instructions: string;
  input: unknown;
  tools: unknown[];
  previousResponseId?: string;
}): Promise<ResponsesApiResult> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      instructions: params.instructions,
      input: params.input,
      tools: params.tools,
      tool_choice: "auto",
      previous_response_id: params.previousResponseId,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI responses API failed (${response.status}): ${errorBody}`
    );
  }

  return (await response.json()) as ResponsesApiResult;
}

export async function runManifestActionAgent(
  params: RunManifestAgentParams
): Promise<StructuredAgentResponse> {
  const { createManifestToolRegistry } = await import("./tool-registry");

  const registry = createManifestToolRegistry(params.context);
  const toolExecutions: AgentToolExecution[] = [];
  const baseInput = toResponsesInput(params.messages);

  let input: unknown = baseInput;
  let previousResponseId: string | undefined;
  let latestAssistantText = "";

  for (let round = 0; round < 6; round += 1) {
    const result = await callResponsesApi({
      apiKey: params.apiKey,
      model: params.model,
      instructions: params.systemPrompt,
      input,
      tools: registry.definitions,
      previousResponseId,
    });

    latestAssistantText = extractAssistantText(result);
    const functionCalls = extractFunctionCalls(result);

    if (functionCalls.length === 0) {
      return normalizeStructuredAgentResponse(
        latestAssistantText,
        toolExecutions
      );
    }

    const functionOutputs: Array<{
      type: "function_call_output";
      call_id: string;
      output: string;
    }> = [];

    for (const functionCall of functionCalls) {
      log.info("[command-board-chat] Executing tool call", {
        toolName: functionCall.name,
        callId: functionCall.call_id,
        correlationId: params.context.correlationId,
      });

      const toolResult = await registry.executeToolCall({
        name: functionCall.name,
        argumentsJson: functionCall.arguments,
        callId: functionCall.call_id,
      });

      toolExecutions.push({
        toolName: functionCall.name,
        status: toolResult.ok ? "success" : "error",
        summary: toolResult.summary,
      });

      log.info("[command-board-chat] Tool call completed", {
        toolName: functionCall.name,
        callId: functionCall.call_id,
        ok: toolResult.ok,
        summary: toolResult.summary,
        correlationId: params.context.correlationId,
      });

      functionOutputs.push({
        type: "function_call_output",
        call_id: functionCall.call_id,
        output: JSON.stringify(toolResult),
      });
    }

    input = functionOutputs;
    previousResponseId = result.id;
  }

  return normalizeStructuredAgentResponse(
    latestAssistantText || "Tool loop reached max rounds.",
    toolExecutions
  );
}

export async function runManifestActionAgentSafe(
  params: RunManifestAgentParams
): Promise<StructuredAgentResponse> {
  try {
    return await runManifestActionAgent(params);
  } catch (error) {
    captureException(error, {
      tags: {
        route: "command-board-chat",
      },
      extra: {
        correlationId: params.context.correlationId,
      },
    });

    const message =
      error instanceof Error
        ? error.message
        : "Unexpected command board agent error";

    log.error("[command-board-chat] Agent loop failed", {
      error: message,
      correlationId: params.context.correlationId,
    });

    return {
      summary: "Agent failed while processing the request.",
      actionsTaken: [],
      errors: [message],
      nextSteps: ["Retry the request or check observability logs for details."],
    };
  }
}
