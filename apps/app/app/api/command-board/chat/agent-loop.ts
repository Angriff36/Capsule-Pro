import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { UIMessage } from "ai";
import {
  buildSimulationPlanSchema,
  type CommandCatalog,
  loadCommandCatalog,
  resolveAliases,
  resolveCanonicalEntityCommandPairFromPair,
} from "./manifest-command-tools";

// Timeout configuration constants
const TOOL_CALL_TIMEOUT_MS = 30_000; // 30 seconds per tool call
const API_CALL_TIMEOUT_MS = 60_000; // 60 seconds for OpenAI API calls
const MAX_TOOL_RETRIES = 2; // Max retries for retryable tool failures

// Patterns that indicate retryable (transient) errors
const RETRYABLE_ERROR_PATTERNS = [
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /network/i,
  /timeout/i,
  /5\d{2}/, // 5xx status codes
  /rate.?limit/i,
  /too many requests/i,
  /service unavailable/i,
  /bad gateway/i,
  /gateway timeout/i,
];

/**
 * Wraps a promise with a timeout using AbortController.
 * Returns a tuple of [result, timedOut] where timedOut is true if the operation timed out.
 */
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<[result: T, timedOut: false] | [result: null, timedOut: true]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await operation;
    clearTimeout(timeoutId);
    return [result, false];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      log.warn("[command-board-chat] Operation timed out", {
        operation: operationName,
        timeoutMs,
      });
      return [null, true];
    }
    throw error;
  }
}

/**
 * Delay helper for retry backoff.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an error is retryable (transient failures).
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

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

interface SimulationPlanAlias {
  userTerm: string;
  canonical: string;
  note: string;
}

interface SimulationPlanStep {
  entity: string;
  command: string;
  route: string;
  args: Record<string, unknown>;
}

interface SimulationUnfulfilledIntent {
  requested: string;
  reason: string;
  closestSupportedSequence: string[];
}

interface SimulationPlan {
  requestedSimulation: string;
  resolvedAliases: SimulationPlanAlias[];
  commandSequence: SimulationPlanStep[];
  unfulfilledIntents: SimulationUnfulfilledIntent[];
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
  timeoutMs?: number;
  textFormat?: Record<string, unknown>;
}): Promise<ResponsesApiResult> {
  const timeoutMs = params.timeoutMs ?? API_CALL_TIMEOUT_MS;

  const responsePromise = fetch("https://api.openai.com/v1/responses", {
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
      ...(params.textFormat
        ? {
            text: {
              format: params.textFormat,
            },
          }
        : {}),
    }),
  });

  const [response, timedOut] = await withTimeout(
    responsePromise,
    timeoutMs,
    "callResponsesApi"
  );

  if (timedOut) {
    throw new Error(
      `OpenAI API request timed out after ${timeoutMs}ms. Please try again.`
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI responses API failed (${response.status}): ${errorBody}`
    );
  }

  return (await response.json()) as ResponsesApiResult;
}

function latestUserMessage(messages: UIMessage[]): string {
  const ordered = [...messages].reverse();
  for (const message of ordered) {
    if (message.role !== "user") {
      continue;
    }
    const text = getMessageText(message);
    if (text.length > 0) {
      return text;
    }
  }
  return "";
}

function buildPlanningInstructions(
  userRequest: string,
  aliases: ReturnType<typeof resolveAliases>
): string {
  const aliasLines =
    aliases.length === 0
      ? "- none detected"
      : aliases
          .map(
            (alias) =>
              `- ${alias.userTerm} => ${alias.canonical} (${alias.note})`
          )
          .join("\n");

  return [
    "Return only JSON matching the provided schema.",
    "Plan executable manifest commands only from canonical route surface.",
    "For each commandSequence item, provide entityCommand using canonical 'Entity.command' and argsKv only. Do not provide route; route is derived server-side.",
    "argsKv must be an array of {name,value}; never emit args as an object.",
    "Never emit pseudo entities/commands (Venue, Bill, Staff, create_venue, create_bill, add_staff, create_full_menu).",
    "Alias rules that must be applied before planning:",
    "- venue -> Event.create fields venueName + venueAddress",
    "- staff -> User.create",
    "- bill -> EventBudget.create",
    "- full menu -> Menu.create + MenuDish.create[] (+ BattleBoard.* optional)",
    "Ordering guidance: Event.create before EventBudget.create and BattleBoard.create; Menu.create before MenuDish.create; BattleBoard.create before BattleBoard.addDish.",
    `Detected aliases from user request:\n${aliasLines}`,
    `User request: ${userRequest}`,
  ].join("\n");
}

export function parseSimulationPlan(
  text: string,
  catalog: CommandCatalog
): SimulationPlan | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;

  if (
    typeof candidate.requestedSimulation !== "string" ||
    !Array.isArray(candidate.resolvedAliases) ||
    !Array.isArray(candidate.commandSequence) ||
    !Array.isArray(candidate.unfulfilledIntents)
  ) {
    return null;
  }

  const resolvedAliases = candidate.resolvedAliases
    .filter(
      (item): item is SimulationPlanAlias =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as SimulationPlanAlias).userTerm === "string" &&
        typeof (item as SimulationPlanAlias).canonical === "string" &&
        typeof (item as SimulationPlanAlias).note === "string"
    )
    .map((item) => ({
      userTerm: item.userTerm,
      canonical: item.canonical,
      note: item.note,
    }));

  const commandSequence: SimulationPlanStep[] = [];
  for (const item of candidate.commandSequence) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const step = item as Record<string, unknown>;
    if (
      !(
        typeof step.entityCommand === "string" &&
        Array.isArray(step.argsKv)
      )
    ) {
      continue;
    }

    const canonicalPair = resolveCanonicalEntityCommandPairFromPair(
      catalog,
      step.entityCommand
    );
    const route = canonicalPair
      ? catalog.byEntityCommand.get(canonicalPair)
      : null;
    if (!canonicalPair || !route) {
      continue;
    }

    const argsKv = step.argsKv as Array<{ name?: unknown; value?: unknown }>;
    const args: Record<string, unknown> = {};
    let invalidKv = false;
    for (const entry of argsKv) {
      if (!(entry && typeof entry.name === "string")) {
        invalidKv = true;
        break;
      }
      const value = entry.value;
      const isAllowedValue =
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean";
      if (!isAllowedValue) {
        invalidKv = true;
        break;
      }
      args[entry.name] = value;
    }
    if (invalidKv) {
      continue;
    }

    const allowedArgNames = new Set(route.params.map((param) => param.name));
    const hasUnsupportedArgs = Object.keys(args).some(
      (name) => !allowedArgNames.has(name)
    );
    if (hasUnsupportedArgs) {
      continue;
    }

    const [entity, command] = canonicalPair.split(".");
    commandSequence.push({
      entity: entity ?? "",
      command: command ?? "",
      route: route.path,
      args,
    });
  }

  const unfulfilledIntents = candidate.unfulfilledIntents
    .filter(
      (item): item is SimulationUnfulfilledIntent =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as SimulationUnfulfilledIntent).requested === "string" &&
        typeof (item as SimulationUnfulfilledIntent).reason === "string" &&
        Array.isArray(
          (item as SimulationUnfulfilledIntent).closestSupportedSequence
        )
    )
    .map((item) => ({
      requested: item.requested,
      reason: item.reason,
      closestSupportedSequence: item.closestSupportedSequence.filter(
        (entry): entry is string => typeof entry === "string"
      ),
    }));

  return {
    requestedSimulation: candidate.requestedSimulation,
    resolvedAliases,
    commandSequence,
    unfulfilledIntents,
  };
}

function isTypedValueMatch(
  value: unknown,
  type: "string" | "number" | "boolean"
): boolean {
  if (type === "string") return typeof value === "string";
  if (type === "number") return typeof value === "number";
  return typeof value === "boolean";
}

function validateStepArgs(
  step: SimulationPlanStep,
  args: Record<string, unknown>,
  catalog: CommandCatalog
): string | null {
  const pair = `${step.entity}.${step.command}`;
  const canonicalPair = resolveCanonicalEntityCommandPairFromPair(catalog, pair);
  const route = canonicalPair
    ? catalog.byEntityCommand.get(canonicalPair)
    : null;
  if (!route) {
    return "Not supported by current route surface";
  }

  const allowedArgNames = new Set(route.params.map((param) => param.name));
  const unsupported = Object.keys(args).filter(
    (name) => !allowedArgNames.has(name)
  );
  if (unsupported.length > 0) {
    return `Unsupported args for ${canonicalPair}: ${unsupported.join(", ")}`;
  }

  for (const param of route.params) {
    const value = args[param.name];
    if (value === undefined || value === null) {
      if (param.required) {
        return `Missing required arg '${param.name}' for ${canonicalPair}`;
      }
      continue;
    }

    if (!isTypedValueMatch(value, param.type)) {
      return `Invalid type for arg '${param.name}' in ${canonicalPair}; expected ${param.type}`;
    }
  }

  return null;
}

function defaultArgValue(type: "string" | "number" | "boolean"): unknown {
  if (type === "number") return 1;
  if (type === "boolean") return false;
  return "TBD";
}

function coerceArgValue(
  value: unknown,
  type: "string" | "number" | "boolean"
): unknown {
  if (type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return value;
      }

      const asNumber = Number(trimmed);
      if (Number.isFinite(asNumber)) {
        return asNumber;
      }

      const asDate = Date.parse(trimmed);
      if (Number.isFinite(asDate)) {
        return asDate;
      }
    }
    return value;
  }

  if (type === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const lowered = value.trim().toLowerCase();
      if (lowered === "true" || lowered === "1" || lowered === "yes") {
        return true;
      }
      if (lowered === "false" || lowered === "0" || lowered === "no") {
        return false;
      }
    }
    return value;
  }

  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return value;
}

function defaultArgsForPair(
  catalog: CommandCatalog,
  pair: string
): Record<string, unknown> {
  const canonicalPair = resolveCanonicalEntityCommandPairFromPair(catalog, pair);
  const command = canonicalPair
    ? catalog.byEntityCommand.get(canonicalPair)
    : null;
  if (!command) {
    return {};
  }

  const args: Record<string, unknown> = {};
  for (const param of command.params) {
    args[param.name] = defaultArgValue(param.type);
  }
  return args;
}

function materializeStepArgs(
  step: SimulationPlanStep,
  catalog: CommandCatalog
): Record<string, unknown> {
  const pair = `${step.entity}.${step.command}`;
  const canonicalPair = resolveCanonicalEntityCommandPairFromPair(catalog, pair);
  const command = canonicalPair
    ? catalog.byEntityCommand.get(canonicalPair)
    : null;
  const defaults = defaultArgsForPair(catalog, pair);
  const merged = {
    ...defaults,
    ...step.args,
  };

  if (!command) {
    return merged;
  }

  const coerced: Record<string, unknown> = { ...merged };
  for (const param of command.params) {
    if (coerced[param.name] === undefined || coerced[param.name] === null) {
      continue;
    }
    coerced[param.name] = coerceArgValue(coerced[param.name], param.type);
  }
  return coerced;
}

export function buildFallbackSimulationPlan(
  userRequest: string,
  catalog: CommandCatalog,
  aliases: ReturnType<typeof resolveAliases>
): SimulationPlan {
  const lowered = userRequest.toLowerCase();
  const wantsEvent = /\bevent\b/i.test(lowered);
  const wantsStaff = /\bstaff\b/i.test(lowered);
  const wantsMenu = /\bmenu\b/i.test(lowered);
  const wantsFullMenu = /\bfull\s+menu\b/i.test(lowered);
  const wantsBattleBoard = /\bbattle\s*board\b/i.test(lowered);
  const wantsBill = /\bbill\b/i.test(lowered);

  const commandSequence: SimulationPlanStep[] = [];
  const append = (pair: string, args?: Record<string, unknown>) => {
    const route = catalog.byEntityCommand.get(pair);
    if (!route) {
      return false;
    }

    const [entity, command] = pair.split(".");
    commandSequence.push({
      entity: entity ?? "",
      command: command ?? "",
      route: route.path,
      args: args ?? defaultArgsForPair(catalog, pair),
    });
    return true;
  };

  if (wantsEvent) {
    const eventArgs = defaultArgsForPair(catalog, "Event.create");
    if (/\bvenue\b/i.test(lowered)) {
      eventArgs.venueName = "Main Hall";
      eventArgs.venueAddress = "123 Event St";
    }
    append("Event.create", eventArgs);
  }

  if (wantsStaff) {
    append("User.create");
    append("User.create");
  }

  if (wantsFullMenu || wantsMenu) {
    append("Menu.create");
    if (wantsFullMenu) {
      append("MenuDish.create");
      append("MenuDish.create");
    }
  }

  if (wantsBattleBoard) {
    append("BattleBoard.create");
    append("BattleBoard.addDish");
    append("BattleBoard.addDish");
  }

  if (wantsBill) {
    append("EventBudget.create");
  }

  const unfulfilledIntents: SimulationUnfulfilledIntent[] = [];
  const unsupported: Array<[string, string[]]> = [
    ["venue", ["Event.create"]],
    ["staff", ["User.create"]],
    ["bill", ["EventBudget.create"]],
    [
      "full menu",
      [
        "Menu.create",
        "MenuDish.create",
        "BattleBoard.create",
        "BattleBoard.addDish",
      ],
    ],
  ];

  for (const [term, closest] of unsupported) {
    if (!lowered.includes(term)) {
      continue;
    }

    if (
      (term === "venue" && !catalog.byEntityCommand.has("Event.create")) ||
      (term === "staff" && !catalog.byEntityCommand.has("User.create")) ||
      (term === "bill" && !catalog.byEntityCommand.has("EventBudget.create")) ||
      (term === "full menu" &&
        (!catalog.byEntityCommand.has("Menu.create") ||
          !catalog.byEntityCommand.has("MenuDish.create")))
    ) {
      unfulfilledIntents.push({
        requested: term,
        reason: "Not supported by current route surface",
        closestSupportedSequence: closest.filter((pair) =>
          catalog.byEntityCommand.has(pair)
        ),
      });
    }
  }

  return {
    requestedSimulation: userRequest,
    resolvedAliases: aliases,
    commandSequence,
    unfulfilledIntents,
  };
}

function ensureNonEmptyCommandSequence(
  plan: SimulationPlan,
  catalog: CommandCatalog
): SimulationPlan {
  if (plan.commandSequence.length > 0 || catalog.commands.length === 0) {
    return plan;
  }

  const candidatePairs = [
    ...plan.unfulfilledIntents.flatMap((intent) => intent.closestSupportedSequence),
    ...(catalog.byEntityCommand.has("Event.create")
      ? ["Event.create"]
      : []),
    ...catalog.canonicalEntityCommandPairs,
  ];

  const selectedPair = candidatePairs.find((pair) =>
    catalog.byEntityCommand.has(pair)
  );
  if (!selectedPair) {
    return plan;
  }

  const route = catalog.byEntityCommand.get(selectedPair);
  if (!route) {
    return plan;
  }

  const [entity, command] = selectedPair.split(".");
  return {
    ...plan,
    commandSequence: [
      {
        entity: entity ?? "",
        command: command ?? "",
        route: route.path,
        args: defaultArgsForPair(catalog, selectedPair),
      },
    ],
  };
}

async function planSimulation(
  params: RunManifestAgentParams
): Promise<SimulationPlan> {
  const commandCatalog = loadCommandCatalog();
  const userRequest = latestUserMessage(params.messages);
  const aliases = resolveAliases(userRequest);
  const schema = buildSimulationPlanSchema(commandCatalog);

  const result = await callResponsesApi({
    apiKey: params.apiKey,
    model: params.model,
    instructions: `${params.systemPrompt}\n\n${buildPlanningInstructions(
      userRequest,
      aliases
    )}`,
    input: [{ role: "user", content: userRequest || "No user request provided." }],
    tools: [],
    timeoutMs: API_CALL_TIMEOUT_MS,
    textFormat: {
      type: "json_schema",
      name: "simulation_plan",
      strict: true,
      schema,
    },
  });

  const rawPlanText = extractAssistantText(result);
  const parsedPlan = parseSimulationPlan(rawPlanText, commandCatalog);
  if (parsedPlan) {
    if (parsedPlan.resolvedAliases.length === 0 && aliases.length > 0) {
      parsedPlan.resolvedAliases = aliases;
    }
    const withSequence =
      parsedPlan.commandSequence.length === 0
        ? buildFallbackSimulationPlan(userRequest, commandCatalog, aliases)
        : parsedPlan;
    return ensureNonEmptyCommandSequence(withSequence, commandCatalog);
  }

  return ensureNonEmptyCommandSequence(
    buildFallbackSimulationPlan(userRequest, commandCatalog, aliases),
    commandCatalog
  );
}

async function summarizeExecution(params: {
  agent: RunManifestAgentParams;
  plan: SimulationPlan;
  toolExecutions: AgentToolExecution[];
}): Promise<StructuredAgentResponse> {
  const responseSchema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      actionsTaken: { type: "array", items: { type: "string" } },
      errors: { type: "array", items: { type: "string" } },
      nextSteps: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "actionsTaken", "errors", "nextSteps"],
    additionalProperties: false,
  };

  const result = await callResponsesApi({
    apiKey: params.agent.apiKey,
    model: params.agent.model,
    instructions: [
      "Summarize the simulation outcome in strict JSON matching the schema.",
      "If unsupported actions were requested, include exactly 'Not supported by current route surface' in errors.",
      "Use concrete, actionable next steps.",
    ].join("\n"),
    input: [
      {
        role: "user",
        content: JSON.stringify(
          {
            request: latestUserMessage(params.agent.messages),
            plan: params.plan,
            toolExecutions: params.toolExecutions,
          },
          null,
          2
        ),
      },
    ],
    tools: [],
    timeoutMs: API_CALL_TIMEOUT_MS,
    textFormat: {
      type: "json_schema",
      name: "simulation_summary",
      strict: true,
      schema: responseSchema,
    },
  });

  return normalizeStructuredAgentResponse(
    extractAssistantText(result),
    params.toolExecutions
  );
}

export async function runManifestActionAgent(
  params: RunManifestAgentParams
): Promise<StructuredAgentResponse> {
  const { createManifestToolRegistry } = await import("./tool-registry");
  const commandCatalog = loadCommandCatalog();
  const registry = createManifestToolRegistry(params.context);
  const toolExecutions: AgentToolExecution[] = [];

  const plan = await planSimulation(params);

  if (plan.unfulfilledIntents.length > 0 && plan.commandSequence.length === 0) {
    return {
      summary: "Not all requested actions are supported by the current route surface.",
      actionsTaken: [],
      errors: ["Not supported by current route surface"],
      nextSteps: plan.unfulfilledIntents.flatMap((missing) =>
        missing.closestSupportedSequence.length > 0
          ? [
              `${missing.requested}: ${missing.reason}`,
              `Closest supported sequence: ${missing.closestSupportedSequence.join(" -> ")}`,
            ]
          : [`${missing.requested}: ${missing.reason}`]
      ),
    };
  }

  for (let index = 0; index < plan.commandSequence.length; index += 1) {
    const step = plan.commandSequence[index];
    const pair = `${step.entity}.${step.command}`;
    const toolName = "execute_manifest_command";

    const executionArgs = materializeStepArgs(step, commandCatalog);
    const validationError = validateStepArgs(
      step,
      executionArgs,
      commandCatalog
    );
    if (validationError) {
      toolExecutions.push({
        toolName: pair,
        status: "error",
        summary: validationError,
      });
      continue;
    }

    log.info("[command-board-chat] Executing planned command", {
      step: index + 1,
      total: plan.commandSequence.length,
      toolName,
      pair,
      correlationId: params.context.correlationId,
    });

    const toolCall: ResponsesFunctionCall = {
      type: "function_call",
      name: toolName,
      arguments: JSON.stringify({
        entityName: step.entity,
        commandName: step.command,
        args: executionArgs,
      }),
      call_id: `${params.context.correlationId}:plan:${index}`,
    };

    const toolResult = await executeToolWithRetry(
      registry,
      toolCall,
      params.context.correlationId
    );

    toolExecutions.push({
      toolName: pair,
      status: toolResult.ok ? "success" : "error",
      summary: toolResult.summary,
    });
  }

  return await summarizeExecution({
    agent: params,
    plan,
    toolExecutions,
  });
}

/**
 * Executes a tool call with timeout and retry logic for transient failures.
 */
async function executeToolWithRetry(
  registry: ReturnType<
    typeof import("./tool-registry").createManifestToolRegistry
  >,
  functionCall: ResponsesFunctionCall,
  correlationId: string
): Promise<import("./tool-registry").AgentToolResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_TOOL_RETRIES; attempt += 1) {
    if (attempt > 0) {
      // Exponential backoff: 500ms, 1000ms
      const backoffMs = 500 * 2 ** (attempt - 1);
      log.info("[command-board-chat] Retrying tool call", {
        toolName: functionCall.name,
        callId: functionCall.call_id,
        attempt,
        backoffMs,
        correlationId,
      });
      await delay(backoffMs);
    }

    // Execute with timeout
    const toolPromise = registry.executeToolCall({
      name: functionCall.name,
      argumentsJson: functionCall.arguments,
      callId: functionCall.call_id,
    });

    const [result, timedOut] = await withTimeout(
      toolPromise,
      TOOL_CALL_TIMEOUT_MS,
      `tool:${functionCall.name}`
    );

    if (timedOut) {
      lastError = new Error(
        `Tool call timed out after ${TOOL_CALL_TIMEOUT_MS}ms`
      );
      continue; // Retry on timeout
    }

    // If tool returned an error that might be retryable, check and retry
    if (!result.ok && result.error) {
      const error = new Error(result.error);
      if (isRetryableError(error)) {
        lastError = error;
        continue; // Retry on transient errors
      }
    }

    // Success or non-retryable error - return result
    return result;
  }

  // All retries exhausted - return structured error envelope
  log.error("[command-board-chat] Tool call failed after retries", {
    toolName: functionCall.name,
    callId: functionCall.call_id,
    attempts: MAX_TOOL_RETRIES + 1,
    lastError: lastError?.message,
    correlationId,
  });

  return {
    ok: false,
    summary:
      "The operation timed out or encountered a transient error. Please try again.",
    error:
      "The operation timed out or encountered a transient error. Please try again.",
  };
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
