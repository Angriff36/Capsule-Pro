// src/index.ts
import { z as z5 } from "zod";

// src/agent.ts
import { Readable } from "stream";
import { generateText } from "ai";
import { v4 as uuidv4 } from "uuid";

// src/errors.ts
var ERROR_CODES = {
  AUTH_INVALID: "AUTH_INVALID",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TIMEOUT: "TIMEOUT",
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED",
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  AGENT_EXECUTION_FAILED: "AGENT_EXECUTION_FAILED",
  WORKFLOW_ERROR: "WORKFLOW_ERROR",
  STATE_ERROR: "STATE_ERROR",
  CANCELLATION_FAILED: "CANCELLATION_FAILED",
  METRICS_ERROR: "METRICS_ERROR",
  CONFIG_INVALID: "CONFIG_INVALID",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};
var SDKError = class extends Error {
  code;
  agentId;
  toolName;
  retryable;
  troubleshootingUrl;
  context;
  timestamp;
  constructor(message, options) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = options.code;
    this.agentId = options.agentId;
    this.toolName = options.toolName;
    this.retryable = options.retryable ?? false;
    this.troubleshootingUrl = options.troubleshootingUrl;
    this.context = options.context;
    this.timestamp = /* @__PURE__ */ new Date();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      agentId: this.agentId,
      toolName: this.toolName,
      retryable: this.retryable,
      troubleshootingUrl: this.troubleshootingUrl,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
};
var AuthenticationError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.AUTH_INVALID,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/auth"
    });
    this.name = "AuthenticationError";
  }
};
var AuthenticationExpiredError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.AUTH_EXPIRED,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/auth#expired"
    });
    this.name = "AuthenticationExpiredError";
  }
};
var RateLimitExceededError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/rate-limit"
    });
    this.name = "RateLimitExceededError";
  }
};
var TimeoutError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.TIMEOUT,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/timeout"
    });
    this.name = "TimeoutError";
  }
};
var ToolExecutionError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.TOOL_EXECUTION_FAILED,
      retryable: options?.retryable ?? true,
      troubleshootingUrl: "https://docs.example.com/tools#execution"
    });
    this.name = "ToolExecutionError";
  }
};
var ToolValidationError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.TOOL_VALIDATION_FAILED,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/tools#validation"
    });
    this.name = "ToolValidationError";
  }
};
var AgentNotFoundError = class extends SDKError {
  constructor(agentId, options) {
    super(`Agent not found: ${agentId}`, {
      ...options,
      code: ERROR_CODES.AGENT_NOT_FOUND,
      agentId,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/agents#not-found"
    });
    this.name = "AgentNotFoundError";
  }
};
var AgentExecutionError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.AGENT_EXECUTION_FAILED,
      retryable: options?.retryable ?? true,
      troubleshootingUrl: "https://docs.example.com/agents#execution"
    });
    this.name = "AgentExecutionError";
  }
};
var WorkflowError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.WORKFLOW_ERROR,
      retryable: options?.retryable ?? false,
      troubleshootingUrl: "https://docs.example.com/workflows#errors"
    });
    this.name = "WorkflowError";
  }
};
var StateError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.STATE_ERROR,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/state#errors"
    });
    this.name = "StateError";
  }
};
var CancellationError = class extends SDKError {
  constructor(message, options) {
    super(message, {
      ...options,
      code: ERROR_CODES.CANCELLATION_FAILED,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/cancellation"
    });
    this.name = "CancellationError";
  }
};
var SDK_ERROR_FACTORIES = {
  [ERROR_CODES.AUTH_INVALID]: (message, options) => new AuthenticationError(message, options),
  [ERROR_CODES.AUTH_EXPIRED]: (message, options) => new AuthenticationExpiredError(message, options),
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: (message, options) => new RateLimitExceededError(message, options),
  [ERROR_CODES.TIMEOUT]: (message, options) => new TimeoutError(message, options),
  [ERROR_CODES.TOOL_EXECUTION_FAILED]: (message, options) => new ToolExecutionError(message, options),
  [ERROR_CODES.TOOL_VALIDATION_FAILED]: (message, options) => new ToolValidationError(message, options),
  [ERROR_CODES.AGENT_EXECUTION_FAILED]: (message, options) => new AgentExecutionError(message, options),
  [ERROR_CODES.WORKFLOW_ERROR]: (message, options) => new WorkflowError(message, options),
  [ERROR_CODES.STATE_ERROR]: (message, options) => new StateError(message, options),
  [ERROR_CODES.CANCELLATION_FAILED]: (message, options) => new CancellationError(message, options),
  [ERROR_CODES.INTERNAL_ERROR]: (message, options) => new SDKError(message, options),
  [ERROR_CODES.TOOL_NOT_FOUND]: (message, options) => new SDKError(message, options),
  [ERROR_CODES.AGENT_NOT_FOUND]: (message, options) => new SDKError(message, options),
  [ERROR_CODES.CONFIG_INVALID]: (message, options) => new SDKError(message, options)
};
function createSDKError(message, options) {
  const factory = SDK_ERROR_FACTORIES[options.code];
  return factory ? factory(message, options) : new SDKError(message, options);
}

// src/events.ts
import { EventEmitter as NodeEventEmitter } from "events";
var AgentEventEmitter = class {
  emitter;
  constructor() {
    this.emitter = new NodeEventEmitter();
    this.emitter.setMaxListeners(100);
  }
  on(event, listener) {
    this.emitter.on(event, listener);
    return this;
  }
  once(event, listener) {
    this.emitter.once(event, listener);
    return this;
  }
  off(event, listener) {
    this.emitter.off(event, listener);
    return this;
  }
  emit(event, eventObject) {
    return this.emitter.emit(event, eventObject);
  }
  onStarted(listener) {
    this.emitter.on("started", listener);
    return this;
  }
  onProgress(listener) {
    this.emitter.on("progress", listener);
    return this;
  }
  onCompleted(listener) {
    this.emitter.on("completed", listener);
    return this;
  }
  onError(listener) {
    this.emitter.on("error", listener);
    return this;
  }
  onCancelled(listener) {
    this.emitter.on("cancelled", listener);
    return this;
  }
  onToolStarted(listener) {
    this.emitter.on("toolStarted", listener);
    return this;
  }
  onToolProgress(listener) {
    this.emitter.on("toolProgress", listener);
    return this;
  }
  onToolCompleted(listener) {
    this.emitter.on("toolCompleted", listener);
    return this;
  }
  onToolError(listener) {
    this.emitter.on("toolError", listener);
    return this;
  }
  removeAllListeners() {
    this.emitter.removeAllListeners();
    return this;
  }
};

// src/metrics.ts
import { z } from "zod";
var MetricsExportSchema = z.object({
  format: z.enum(["json", "prometheus", "datadog", "webhook"]),
  destination: z.string()
});
var MetricsCollector = class {
  entries = [];
  maxEntries;
  exportConfig;
  exportInterval;
  exportStrategies = {
    json: () => JSON.stringify(this.entries, null, 2),
    prometheus: () => this.exportToPrometheus(),
    datadog: () => this.exportToDatadog(),
    webhook: () => this.exportToWebhook()
  };
  constructor(options = {}) {
    this.maxEntries = options.maxEntries ?? 1e3;
    this.exportConfig = options.exportConfig;
    if (this.exportConfig) {
      this.startExportInterval();
    }
  }
  record(metrics) {
    this.entries.push(metrics);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }
  getByAgentId(agentId) {
    return this.entries.filter((m) => m.agentId === agentId);
  }
  getLatestByAgentId(agentId) {
    const agentMetrics = this.getByAgentId(agentId);
    return agentMetrics.at(-1);
  }
  getAggregateByAgentId(agentId) {
    const agentMetrics = this.getByAgentId(agentId);
    if (agentMetrics.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        totalTokens: 0,
        totalToolCalls: 0,
        totalRetries: 0,
        totalErrors: 0
      };
    }
    const successfulExecutions = agentMetrics.filter(
      (m) => m.status === "success"
    );
    const totalDuration = agentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalTokens = agentMetrics.reduce(
      (sum, m) => sum + m.tokens.total,
      0
    );
    const totalToolCalls = agentMetrics.reduce(
      (sum, m) => sum + m.toolCalls,
      0
    );
    const totalRetries = agentMetrics.reduce((sum, m) => sum + m.retries, 0);
    const totalErrors = agentMetrics.reduce((sum, m) => sum + m.errors, 0);
    return {
      totalExecutions: agentMetrics.length,
      successRate: successfulExecutions.length / agentMetrics.length,
      averageDuration: totalDuration / agentMetrics.length,
      totalTokens,
      totalToolCalls,
      totalRetries,
      totalErrors
    };
  }
  getAll() {
    return [...this.entries];
  }
  clear() {
    this.entries.length = 0;
  }
  async export() {
    if (!this.exportConfig) {
      throw new Error("Export not configured");
    }
    const strategy = this.exportStrategies[this.exportConfig.format];
    if (!strategy) {
      throw new Error(`Unsupported export format: ${this.exportConfig.format}`);
    }
    return await strategy();
  }
  startExportInterval() {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
    this.exportInterval = setInterval(async () => {
      try {
        await this.exportToWebhook();
      } catch (error) {
        console.error("Failed to export metrics:", error);
      }
    }, 6e4);
  }
  async exportToWebhook() {
    if (!this.exportConfig) {
      throw new Error("Export not configured");
    }
    const response = await fetch(this.exportConfig.destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(this.entries)
    });
    if (!response.ok) {
      throw new Error(`Failed to export metrics: ${response.statusText}`);
    }
    return "Metrics exported successfully";
  }
  exportToPrometheus() {
    const lines = [];
    for (const metric of this.entries) {
      lines.push(`# Agent: ${metric.agentId}`);
      lines.push(`agent_execution_duration_seconds ${metric.duration / 1e3}`);
      lines.push(`agent_tokens_input ${metric.tokens.input}`);
      lines.push(`agent_tokens_output ${metric.tokens.output}`);
      lines.push(`agent_tokens_total ${metric.tokens.total}`);
      lines.push(`agent_tool_calls_total ${metric.toolCalls}`);
      lines.push(`agent_retries_total ${metric.retries}`);
      lines.push(`agent_errors_total ${metric.errors}`);
      lines.push(
        `agent_execution_status ${metric.status === "success" ? 1 : 0}`
      );
    }
    return lines.join("\n");
  }
  exportToDatadog() {
    const _series = this.entries.map((metric) => ({
      metric: "agent.execution",
      points: [
        [Math.floor(metric.timestamp.getTime() / 1e3), metric.duration]
      ],
      tags: [
        `agent:${metric.agentId}`,
        `status:${metric.status}`,
        `errors:${metric.errors}`
      ]
    }));
    return this.exportToWebhook();
  }
  destroy() {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
  }
};

// src/models.ts
import { createOpenAI } from "@ai-sdk/openai";

// src/keys.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z as z2 } from "zod";
var keys = () => createEnv({
  server: {
    OPENAI_API_KEY: z2.string().startsWith("sk-").optional()
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  }
});

// src/models.ts
var openai = createOpenAI({
  apiKey: keys().OPENAI_API_KEY
});
var models = {
  chat: openai("gpt-4o-mini"),
  embeddings: openai("text-embedding-3-small")
};

// src/retry.ts
var RetryManager = class {
  maxAttempts;
  initialDelay;
  maxDelay;
  backoffMultiplier;
  retryableErrors;
  onRetry;
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.initialDelay = options.initialDelay ?? 1e3;
    this.maxDelay = options.maxDelay ?? 3e4;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.retryableErrors = new Set(
      options.retryableErrors ?? [
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        ERROR_CODES.TIMEOUT,
        ERROR_CODES.TOOL_EXECUTION_FAILED,
        ERROR_CODES.AUTH_EXPIRED
      ]
    );
    this.onRetry = options.onRetry;
  }
  async execute(operation, abortSignal) {
    let lastError;
    let attempt = 0;
    while (attempt < this.maxAttempts) {
      try {
        if (abortSignal?.aborted) {
          throw createSDKError("Operation was cancelled", {
            code: ERROR_CODES.CANCELLATION_FAILED,
            retryable: false
          });
        }
        return await operation();
      } catch (error) {
        const sdkError = this.ensureSDKError(error);
        lastError = sdkError;
        if (!this.isRetryable(sdkError) || attempt >= this.maxAttempts - 1) {
          throw sdkError;
        }
        const delay = this.calculateDelay(attempt);
        if (this.onRetry) {
          this.onRetry(attempt + 1, sdkError);
        }
        await this.delay(delay, abortSignal);
        attempt++;
      }
    }
    throw lastError;
  }
  isRetryable(error) {
    return error.retryable || this.retryableErrors.has(error.code);
  }
  calculateDelay(attempt) {
    const delay = this.initialDelay * this.backoffMultiplier ** attempt;
    return Math.min(delay, this.maxDelay);
  }
  async delay(ms, abortSignal) {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(
          createSDKError("Operation was cancelled during retry delay", {
            code: ERROR_CODES.CANCELLATION_FAILED,
            retryable: false
          })
        );
        return;
      }
      const timeoutId = setTimeout(resolve, ms);
      abortSignal?.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(
          createSDKError("Operation was cancelled during retry delay", {
            code: ERROR_CODES.CANCELLATION_FAILED,
            retryable: false
          })
        );
      });
    });
  }
  ensureSDKError(error) {
    if (error instanceof SDKError) {
      return error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : void 0;
    const sdkError = createSDKError(message, {
      code: ERROR_CODES.INTERNAL_ERROR,
      retryable: false
    });
    if (stack) {
      sdkError.stack = stack;
    }
    return sdkError;
  }
};

// src/tool.ts
import { z as z3 } from "zod";
var Tool = class {
  name;
  description;
  parameters;
  returns;
  retryable;
  func;
  constructor(func, options) {
    this.name = options.name;
    this.description = options.description;
    this.parameters = options.parameters ?? {};
    this.returns = options.returns ?? z3.unknown();
    this.retryable = options.retryable ?? true;
    this.func = func;
  }
  async execute(params, context) {
    try {
      const validatedParams = await this.validateParameters(params);
      const result = await this.func(validatedParams, context);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof SDKError ? error : createSDKError(`Tool execution failed: ${String(error)}`, {
          code: ERROR_CODES.TOOL_EXECUTION_FAILED,
          toolName: this.name,
          retryable: this.retryable,
          context: { params }
        })
      };
    }
  }
  async validateParameters(params) {
    const schema = this.createParameterSchema();
    const result = await schema.safeParseAsync(params);
    if (!result.success) {
      const errorMessages = result.error.issues.map((e) => e.message).join(", ");
      throw createSDKError(`Invalid parameters: ${errorMessages}`, {
        code: ERROR_CODES.TOOL_VALIDATION_FAILED,
        toolName: this.name,
        retryable: false,
        context: { errors: result.error.issues, params }
      });
    }
    return result.data;
  }
  createParameterSchema() {
    const shape = {};
    for (const [key, schema] of Object.entries(this.parameters)) {
      shape[key] = schema;
    }
    return z3.object(shape);
  }
};
function createTool(func, options) {
  return new Tool(func, options);
}
var ToolRegistry = class {
  tools = /* @__PURE__ */ new Map();
  register(tool) {
    if (this.tools.has(tool.name)) {
      throw createSDKError(`Tool already registered: ${tool.name}`, {
        code: ERROR_CODES.TOOL_NOT_FOUND,
        toolName: tool.name,
        retryable: false
      });
    }
    this.tools.set(tool.name, tool);
  }
  unregister(name) {
    return this.tools.delete(name);
  }
  get(name) {
    return this.tools.get(name);
  }
  has(name) {
    return this.tools.has(name);
  }
  getAll() {
    return Array.from(this.tools.values());
  }
  clear() {
    this.tools.clear();
  }
};

// src/types.ts
import { z as z4 } from "zod";
var AgentConfigSchema = z4.object({
  name: z4.string().min(1).max(100),
  instructions: z4.string().min(1).max(1e4),
  tools: z4.array(z4.string()).optional(),
  maxRetries: z4.number().min(0).max(10).optional(),
  timeout: z4.number().min(1e3).max(3e5).optional(),
  streaming: z4.boolean().optional(),
  debug: z4.boolean().optional()
});
var ToolConfigSchema = z4.object({
  name: z4.string().min(1).max(100),
  description: z4.string().min(1).max(1e3),
  parameters: z4.record(z4.string(), z4.unknown()).optional(),
  returns: z4.record(z4.string(), z4.unknown()).optional(),
  retryable: z4.boolean().optional()
});
var ExecutionOptionsSchema = z4.object({
  prompt: z4.string().min(1),
  context: z4.record(z4.string(), z4.unknown()).optional(),
  stream: z4.boolean().optional(),
  onProgress: z4.function().optional(),
  signal: z4.instanceof(AbortSignal).optional()
});
var RetryConfigSchema = z4.object({
  maxAttempts: z4.number().min(1).max(10).optional(),
  initialDelay: z4.number().min(100).max(1e4).optional(),
  maxDelay: z4.number().min(1e3).max(6e4).optional(),
  backoffMultiplier: z4.number().min(1.1).max(5).optional(),
  retryableErrors: z4.array(z4.string()).optional()
});
var MetricsSchema = z4.object({
  agentId: z4.string(),
  duration: z4.number(),
  tokens: z4.object({
    input: z4.number(),
    output: z4.number(),
    total: z4.number()
  }),
  toolCalls: z4.number(),
  retries: z4.number(),
  errors: z4.number(),
  status: z4.enum(["success", "error", "cancelled"]),
  timestamp: z4.date()
});
var SDKConfigSchema = z4.object({
  apiKey: z4.string().optional(),
  baseUrl: z4.string().url().optional(),
  defaultTimeout: z4.number().min(1e3).max(3e5).optional(),
  defaultMaxRetries: z4.number().min(0).max(10).optional(),
  debug: z4.boolean().optional(),
  environmentVariables: z4.boolean().optional()
});

// src/agent.ts
var Agent = class {
  id;
  name;
  instructions;
  toolNames;
  maxRetries;
  timeout;
  streaming;
  debug;
  eventEmitter;
  toolRegistry;
  metricsCollector;
  state = {};
  executionHandler;
  abortController;
  isExecuting = false;
  constructor(config, options = {}) {
    const parsed = AgentConfigSchema.parse(config);
    this.id = uuidv4();
    this.name = parsed.name;
    this.instructions = parsed.instructions;
    this.toolNames = parsed.tools ?? [];
    this.maxRetries = parsed.maxRetries ?? 3;
    this.timeout = parsed.timeout ?? 6e4;
    this.streaming = parsed.streaming ?? false;
    this.debug = parsed.debug ?? false;
    this.eventEmitter = new AgentEventEmitter();
    this.toolRegistry = new ToolRegistry();
    this.metricsCollector = options.metricsCollector ?? new MetricsCollector();
    this.executionHandler = options.executionHandler ?? this.defaultExecutionHandler.bind(this);
    if (this.debug) {
      console.log(`[Agent] Created agent: ${this.name} (${this.id})`);
    }
  }
  registerTool(tool) {
    this.toolRegistry.register(tool);
    this.toolNames.push(tool.name);
    if (this.debug) {
      console.log(
        `[Agent] Registered tool: ${tool.name} for agent ${this.name}`
      );
    }
    return this;
  }
  setExecutionHandler(handler) {
    this.executionHandler = handler;
    return this;
  }
  async execute(options) {
    if (this.isExecuting) {
      throw createSDKError("Agent is already executing", {
        code: ERROR_CODES.AGENT_EXECUTION_FAILED,
        agentId: this.id,
        retryable: false
      });
    }
    const parsed = ExecutionOptionsSchema.parse(options);
    const executionId = uuidv4();
    const startTime = Date.now();
    this.isExecuting = true;
    this.abortController = new AbortController();
    if (parsed.signal) {
      parsed.signal.addEventListener("abort", () => {
        this.abortController?.abort();
      });
    }
    try {
      this.emitStarted(executionId);
      const retryManager = new RetryManager({
        maxAttempts: this.maxRetries,
        onRetry: (_attempt, error) => {
          this.eventEmitter.emit("toolError", {
            type: "toolError",
            toolName: "agent",
            toolCallId: executionId,
            error
          });
        }
      });
      const retryResult = await retryManager.execute(async () => {
        const response = await this.executionHandler(parsed.prompt, {
          agentId: this.id,
          executionId,
          tools: this.toolRegistry,
          abortSignal: this.abortController?.signal ?? new AbortSignal(),
          onProgress: (event) => this.eventEmitter.emit(event.type, event)
        });
        return response;
      }, this.abortController?.signal);
      const responseStr = typeof retryResult === "string" ? retryResult : "";
      const duration = Date.now() - startTime;
      const metrics = {
        agentId: this.id,
        duration,
        tokens: {
          input: this.estimateTokenCount(parsed.prompt),
          output: this.estimateTokenCount(responseStr),
          total: this.estimateTokenCount(parsed.prompt) + this.estimateTokenCount(responseStr)
        },
        toolCalls: 0,
        retries: retryManager instanceof RetryManager ? this.maxRetries : 0,
        errors: 0,
        status: "success",
        timestamp: /* @__PURE__ */ new Date()
      };
      this.metricsCollector.record(metrics);
      this.emitCompleted(executionId, responseStr);
      if (this.debug) {
        console.log(
          `[Agent] Execution completed: ${executionId} in ${duration}ms`
        );
      }
      return {
        agentId: this.id,
        executionId,
        response: responseStr,
        metrics
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError = error instanceof SDKError ? error : createSDKError(String(error), {
        code: ERROR_CODES.AGENT_EXECUTION_FAILED,
        agentId: this.id,
        retryable: true
      });
      const metrics = {
        agentId: this.id,
        duration,
        tokens: {
          input: this.estimateTokenCount(parsed.prompt),
          output: 0,
          total: this.estimateTokenCount(parsed.prompt)
        },
        toolCalls: 0,
        retries: 0,
        errors: 1,
        status: "error",
        timestamp: /* @__PURE__ */ new Date()
      };
      this.metricsCollector.record(metrics);
      this.emitError(executionId, sdkError);
      if (this.debug) {
        console.log(`[Agent] Execution failed: ${executionId}`, sdkError);
      }
      throw sdkError;
    } finally {
      this.isExecuting = false;
    }
  }
  async executeStreaming(options) {
    const parsed = ExecutionOptionsSchema.parse(options);
    const executionId = uuidv4();
    const startTime = Date.now();
    this.isExecuting = true;
    this.abortController = new AbortController();
    if (parsed.signal) {
      parsed.signal.addEventListener("abort", () => {
        this.abortController?.abort();
      });
    }
    try {
      this.emitStarted(executionId);
      const response = await this.executionHandler(parsed.prompt, {
        agentId: this.id,
        executionId,
        tools: this.toolRegistry,
        abortSignal: this.abortController?.signal ?? new AbortSignal(),
        onProgress: (event) => this.eventEmitter.emit(event.type, event)
      });
      if (!(response instanceof Readable)) {
        throw createSDKError(
          "Execution handler must return a Readable stream for streaming execution",
          {
            code: ERROR_CODES.AGENT_EXECUTION_FAILED,
            agentId: this.id,
            retryable: false
          }
        );
      }
      let fullResponse = "";
      const stream = new Readable({
        async read() {
          for await (const chunk of response) {
            fullResponse += chunk;
            this.push(chunk);
          }
          this.push(null);
        }
      });
      const duration = Date.now() - startTime;
      const metrics = {
        agentId: this.id,
        duration,
        tokens: {
          input: this.estimateTokenCount(parsed.prompt),
          output: this.estimateTokenCount(fullResponse),
          total: this.estimateTokenCount(parsed.prompt) + this.estimateTokenCount(fullResponse)
        },
        toolCalls: 0,
        retries: 0,
        errors: 0,
        status: "success",
        timestamp: /* @__PURE__ */ new Date()
      };
      this.metricsCollector.record(metrics);
      return {
        agentId: this.id,
        executionId,
        response: fullResponse,
        metrics,
        stream,
        streamed: true
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError = error instanceof SDKError ? error : createSDKError(String(error), {
        code: ERROR_CODES.AGENT_EXECUTION_FAILED,
        agentId: this.id,
        retryable: true
      });
      const metrics = {
        agentId: this.id,
        duration,
        tokens: {
          input: this.estimateTokenCount(parsed.prompt),
          output: 0,
          total: this.estimateTokenCount(parsed.prompt)
        },
        toolCalls: 0,
        retries: 0,
        errors: 1,
        status: "error",
        timestamp: /* @__PURE__ */ new Date()
      };
      this.metricsCollector.record(metrics);
      this.emitError(executionId, sdkError);
      throw sdkError;
    }
  }
  async cancel() {
    if (!this.isExecuting) {
      return;
    }
    const startTime = Date.now();
    this.abortController?.abort();
    let attempts = 0;
    while (this.isExecuting && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    const duration = Date.now() - startTime;
    if (duration > 2e3) {
      throw new CancellationError("Cancellation took longer than 2 seconds", {
        agentId: this.id
      });
    }
    if (this.debug) {
      console.log(
        `[Agent] Cancelled execution for agent ${this.name} in ${duration}ms`
      );
    }
  }
  setState(state) {
    this.state = { ...state };
  }
  getState() {
    return { ...this.state };
  }
  getMetrics() {
    return this.metricsCollector.getByAgentId(this.id);
  }
  getLatestMetrics() {
    return this.metricsCollector.getLatestByAgentId(this.id);
  }
  getAggregateMetrics() {
    return this.metricsCollector.getAggregateByAgentId(this.id);
  }
  onProgress(callback) {
    this.eventEmitter.on("progress", callback);
    return this;
  }
  onCompleted(callback) {
    this.eventEmitter.on("completed", callback);
    return this;
  }
  onError(callback) {
    this.eventEmitter.on("error", callback);
    return this;
  }
  onCancelled(callback) {
    this.eventEmitter.on("cancelled", callback);
    return this;
  }
  onToolStarted(callback) {
    this.eventEmitter.on("toolStarted", callback);
    return this;
  }
  onToolCompleted(callback) {
    this.eventEmitter.on("toolCompleted", callback);
    return this;
  }
  onToolError(callback) {
    this.eventEmitter.on("toolError", callback);
    return this;
  }
  async defaultExecutionHandler(prompt, context) {
    try {
      context.onProgress({
        type: "progress",
        stage: "calling_llm",
        percentage: 0,
        message: "Calling GPT-4o-mini..."
      });
      const result = await generateText({
        model: models.chat,
        system: this.instructions,
        prompt,
        temperature: 0.7
      });
      context.onProgress({
        type: "progress",
        stage: "llm_response",
        percentage: 100,
        message: "Received response from GPT-4o-mini"
      });
      return result.text;
    } catch (error) {
      if (this.debug) {
        console.error("[Agent] LLM API call failed:", error);
      }
      throw createSDKError(
        `LLM API call failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: ERROR_CODES.AGENT_EXECUTION_FAILED,
          agentId: this.id,
          retryable: true,
          context: { originalError: error }
        }
      );
    }
  }
  emitStarted(executionId) {
    const event = {
      type: "started",
      agentId: this.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { executionId }
    };
    this.eventEmitter.emit("started", event);
  }
  emitCompleted(executionId, response) {
    const event = {
      type: "completed",
      agentId: this.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { executionId, response }
    };
    this.eventEmitter.emit("completed", event);
  }
  emitError(executionId, error) {
    const event = {
      type: "error",
      agentId: this.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { executionId },
      error
    };
    this.eventEmitter.emit("error", event);
  }
  estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
  }
};
function createAgent(config, options) {
  return new Agent(config, options);
}

// src/workflow.ts
import { v4 as uuidv42 } from "uuid";
var AgentWorkflow = class {
  id;
  name;
  steps;
  parallelExecution;
  timeout;
  eventEmitter;
  context;
  stepExecutionOrder = [];
  constructor(config) {
    this.id = uuidv42();
    this.name = config.name;
    this.steps = config.steps;
    this.parallelExecution = config.parallelExecution ?? false;
    this.timeout = config.timeout ?? 3e5;
    this.eventEmitter = new AgentEventEmitter();
    this.context = {
      workflowId: this.id,
      stepResults: /* @__PURE__ */ new Map(),
      sharedState: {},
      startTime: /* @__PURE__ */ new Date()
    };
    this.validateAndOrderSteps();
  }
  validateAndOrderSteps() {
    const stepIds = new Set(this.steps.map((s) => s.id));
    const visited = /* @__PURE__ */ new Set();
    const tempVisited = /* @__PURE__ */ new Set();
    const topologicalSort = (stepId) => {
      if (tempVisited.has(stepId)) {
        throw createSDKError(`Circular dependency detected: ${stepId}`, {
          code: ERROR_CODES.WORKFLOW_ERROR,
          retryable: false
        });
      }
      if (visited.has(stepId)) {
        return;
      }
      tempVisited.add(stepId);
      const step = this.steps.find((s) => s.id === stepId);
      if (step) {
        for (const depId of step.dependsOn) {
          if (!stepIds.has(depId)) {
            throw createSDKError(
              `Invalid dependency: ${depId} for step ${stepId}`,
              {
                code: ERROR_CODES.WORKFLOW_ERROR,
                retryable: false
              }
            );
          }
          topologicalSort(depId);
        }
      }
      tempVisited.delete(stepId);
      visited.add(stepId);
      this.stepExecutionOrder.push(stepId);
    };
    for (const step of this.steps) {
      if (!visited.has(step.id)) {
        topologicalSort(step.id);
      }
    }
  }
  setSharedState(state) {
    this.context.sharedState = { ...state };
  }
  getSharedState() {
    return { ...this.context.sharedState };
  }
  async execute(context) {
    if (context) {
      this.context.sharedState = { ...this.context.sharedState, ...context };
    }
    const startTime = Date.now();
    try {
      this.emitWorkflowStarted();
      if (this.parallelExecution) {
        await this.executeParallel();
      } else {
        await this.executeSequential();
      }
      const duration = Date.now() - startTime;
      this.emitWorkflowCompleted(duration);
      return {
        workflowId: this.id,
        success: true,
        stepResults: this.context.stepResults,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError = error instanceof SDKError ? error : createSDKError(String(error), {
        code: ERROR_CODES.WORKFLOW_ERROR,
        retryable: true
      });
      this.emitWorkflowError(sdkError, duration);
      return {
        workflowId: this.id,
        success: false,
        stepResults: this.context.stepResults,
        duration,
        error: sdkError
      };
    }
  }
  async executeSequential() {
    for (const stepId of this.stepExecutionOrder) {
      const step = this.steps.find((s) => s.id === stepId);
      if (!step) {
        continue;
      }
      if (step.condition && !step.condition(this.context)) {
        continue;
      }
      await this.executeStep(step);
    }
  }
  async executeParallel() {
    const levels = this.identifyExecutionLevels();
    for (const level of levels) {
      const promises = level.map(async (stepId) => {
        const step = this.steps.find((s) => s.id === stepId);
        if (!step) {
          return;
        }
        if (step.condition && !step.condition(this.context)) {
          return;
        }
        await this.executeStep(step);
      });
      await Promise.all(promises);
    }
  }
  identifyExecutionLevels() {
    const levels = [];
    const remainingSteps = new Set(this.steps.map((s) => s.id));
    while (remainingSteps.size > 0) {
      const currentLevel = [];
      for (const stepId of remainingSteps) {
        const step = this.steps.find((s) => s.id === stepId);
        if (!step) {
          continue;
        }
        const allDepsExecuted = step.dependsOn.every(
          (depId) => !remainingSteps.has(depId)
        );
        if (allDepsExecuted) {
          currentLevel.push(stepId);
        }
      }
      if (currentLevel.length === 0) {
        throw createSDKError(
          "Cannot determine execution order - possible circular dependency",
          {
            code: ERROR_CODES.WORKFLOW_ERROR,
            retryable: false
          }
        );
      }
      levels.push(currentLevel);
      currentLevel.forEach((id) => remainingSteps.delete(id));
    }
    return levels;
  }
  async executeStep(step) {
    const stepStartTime = Date.now();
    this.emitStepStarted(step);
    try {
      const input = this.prepareStepInput(step);
      const result = await step.agent.execute({
        prompt: input
      });
      this.context.stepResults.set(step.id, result);
      if (step.outputMapping) {
        for (const [outputKey, contextKey] of Object.entries(
          step.outputMapping
        )) {
          this.context.sharedState[contextKey] = result[outputKey];
        }
      }
      const duration = Date.now() - stepStartTime;
      this.emitStepCompleted(step, duration);
    } catch (error) {
      const duration = Date.now() - stepStartTime;
      const sdkError = error instanceof SDKError ? error : createSDKError(String(error), {
        code: ERROR_CODES.AGENT_EXECUTION_FAILED,
        retryable: false
      });
      this.emitStepError(step, sdkError, duration);
      throw sdkError;
    }
  }
  prepareStepInput(step) {
    if (!step.inputMapping) {
      return "";
    }
    const parts = [];
    for (const [inputKey, contextKey] of Object.entries(step.inputMapping)) {
      const value = this.context.sharedState[contextKey] ?? this.context.stepResults.get(contextKey);
      if (value !== void 0) {
        parts.push(`${inputKey}: ${JSON.stringify(value)}`);
      }
    }
    return parts.join("\n");
  }
  emitWorkflowStarted() {
    const event = {
      type: "started",
      agentId: this.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { workflowName: this.name, stepCount: this.steps.length }
    };
    this.eventEmitter.emit("started", event);
  }
  emitWorkflowCompleted(duration) {
    const event = {
      type: "completed",
      agentId: this.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { workflowName: this.name, duration, stepCount: this.steps.length }
    };
    this.eventEmitter.emit("completed", event);
  }
  emitWorkflowError(error, duration) {
    const event = {
      type: "error",
      agentId: this.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { workflowName: this.name, duration },
      error
    };
    this.eventEmitter.emit("error", event);
  }
  emitStepStarted(step) {
    const event = {
      type: "started",
      agentId: step.agent.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { stepId: step.id, stepName: step.agent.name }
    };
    this.eventEmitter.emit("started", event);
  }
  emitStepCompleted(step, duration) {
    const event = {
      type: "completed",
      agentId: step.agent.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { stepId: step.id, stepName: step.agent.name, duration }
    };
    this.eventEmitter.emit("completed", event);
  }
  emitStepError(step, error, duration) {
    const event = {
      type: "error",
      agentId: step.agent.id,
      timestamp: /* @__PURE__ */ new Date(),
      data: { stepId: step.id, stepName: step.agent.name, duration },
      error
    };
    this.eventEmitter.emit("error", event);
  }
  onProgress(callback) {
    this.eventEmitter.on("progress", callback);
    return this;
  }
  onCompleted(callback) {
    this.eventEmitter.on("completed", callback);
    return this;
  }
  onError(callback) {
    this.eventEmitter.on("error", callback);
    return this;
  }
};
function createWorkflow(config) {
  return new AgentWorkflow(config);
}

// src/index.ts
var AISDK = class {
  config;
  metricsCollector;
  initialized = false;
  credentialValidator;
  constructor(options = {}) {
    this.config = {
      apiKey: options.apiKey ?? process.env.API_KEY ?? "",
      baseUrl: options.baseUrl ?? "https://api.example.com",
      defaultTimeout: options.defaultTimeout ?? 6e4,
      defaultMaxRetries: options.defaultMaxRetries ?? 3,
      debug: options.debug ?? false,
      metricsCollector: options.metricsCollector ?? new MetricsCollector()
    };
    this.metricsCollector = this.config.metricsCollector;
    if (this.config.debug) {
      console.log("[AISDK] SDK initialized");
    }
  }
  async initialize() {
    if (this.initialized) {
      return;
    }
    if (this.config.debug) {
      console.log("[AISDK] Initializing...");
    }
    if (this.credentialValidator) {
      const isValid = await this.credentialValidator();
      if (!isValid) {
        throw new AuthenticationError("Invalid API key provided", {
          troubleshootingUrl: "https://docs.example.com/getting-started#api-key"
        });
      }
    }
    this.initialized = true;
    if (this.config.debug) {
      console.log("[AISDK] Initialization complete");
    }
  }
  createAgent(config, options) {
    const agent = createAgent(
      {
        ...config,
        timeout: config.timeout ?? this.config.defaultTimeout,
        maxRetries: config.maxRetries ?? this.config.defaultMaxRetries
      },
      options
    );
    return agent;
  }
  createTool(func, options) {
    const tool = new Tool(func, {
      name: options.name,
      description: options.description,
      parameters: options.parameters ?? {},
      returns: options.returns ?? z5.unknown(),
      retryable: options.retryable
    });
    return tool;
  }
  createWorkflow(config) {
    return createWorkflow(config);
  }
  getMetrics(agentId) {
    if (agentId) {
      return this.metricsCollector.getByAgentId(agentId);
    }
    return this.metricsCollector.getAll();
  }
  getAggregateMetrics(agentId) {
    return this.metricsCollector.getAggregateByAgentId(agentId);
  }
  setCredentialValidator(validator) {
    this.credentialValidator = validator;
  }
  async validateCredentials() {
    if (this.credentialValidator) {
      return this.credentialValidator();
    }
    return true;
  }
  getMetricsCollector() {
    return this.metricsCollector;
  }
  getConfig() {
    return Object.freeze({ ...this.config });
  }
  updateConfig(updates) {
    Object.assign(this.config, updates);
  }
};
var sdkInstance = null;
function initializeSDK(options) {
  if (!sdkInstance) {
    sdkInstance = new AISDK(options);
  }
  return sdkInstance;
}
function getSDK() {
  if (!sdkInstance) {
    throw createSDKError("SDK not initialized. Call initializeSDK() first.", {
      code: ERROR_CODES.CONFIG_INVALID,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/getting-started#initialization"
    });
  }
  return sdkInstance;
}
export {
  AISDK,
  Agent,
  AgentEventEmitter,
  AgentExecutionError,
  AgentNotFoundError,
  AgentWorkflow,
  AuthenticationError,
  CancellationError,
  ERROR_CODES,
  MetricsCollector,
  RateLimitExceededError,
  RetryManager,
  SDKError,
  TimeoutError,
  Tool,
  ToolExecutionError,
  ToolRegistry,
  createAgent,
  createSDKError,
  createTool,
  createWorkflow,
  getSDK,
  initializeSDK
};
//# sourceMappingURL=index.js.map