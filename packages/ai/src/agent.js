import { Readable } from "node:stream";
import { generateText } from "ai";
import { v4 as uuidv4 } from "uuid";
import { CancellationError, ERROR_CODES, SDKError } from "./errors.js";
import { AgentEventEmitter } from "./events.js";
import { MetricsCollector } from "./metrics.js";
import { models } from "./models.js";
import { RetryManager } from "./retry.js";
import { ToolRegistry } from "./tool.js";
import { AgentConfigSchema, ExecutionOptionsSchema } from "./types.js";
export class Agent {
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
    this.timeout = parsed.timeout ?? 60_000;
    this.streaming = parsed.streaming ?? false;
    this.debug = parsed.debug ?? false;
    this.eventEmitter = new AgentEventEmitter();
    this.toolRegistry = new ToolRegistry();
    this.metricsCollector = options.metricsCollector ?? new MetricsCollector();
    this.executionHandler =
      options.executionHandler ?? this.defaultExecutionHandler.bind(this);
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
      throw new SDKError("Agent is already executing", {
        code: ERROR_CODES.AGENT_EXECUTION_FAILED,
        agentId: this.id,
        retryable: false,
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
        onRetry: (attempt, error) => {
          this.eventEmitter.emit("toolError", {
            type: "toolError",
            toolName: "agent",
            toolCallId: executionId,
            error,
          });
        },
      });
      const retryResult = await retryManager.execute(async () => {
        const response = await this.executionHandler(parsed.prompt, {
          agentId: this.id,
          executionId,
          tools: this.toolRegistry,
          abortSignal: this.abortController?.signal ?? new AbortSignal(),
          onProgress: (event) => this.eventEmitter.emit(event.type, event),
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
          total:
            this.estimateTokenCount(parsed.prompt) +
            this.estimateTokenCount(responseStr),
        },
        toolCalls: 0,
        retries: retryManager instanceof RetryManager ? this.maxRetries : 0,
        errors: 0,
        status: "success",
        timestamp: new Date(),
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
        metrics,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError =
        error instanceof SDKError
          ? error
          : new SDKError(String(error), {
              code: ERROR_CODES.AGENT_EXECUTION_FAILED,
              agentId: this.id,
              retryable: true,
            });
      const metrics = {
        agentId: this.id,
        duration,
        tokens: {
          input: this.estimateTokenCount(parsed.prompt),
          output: 0,
          total: this.estimateTokenCount(parsed.prompt),
        },
        toolCalls: 0,
        retries: 0,
        errors: 1,
        status: "error",
        timestamp: new Date(),
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
        onProgress: (event) => this.eventEmitter.emit(event.type, event),
      });
      if (!(response instanceof Readable)) {
        throw new SDKError(
          "Execution handler must return a Readable stream for streaming execution",
          {
            code: ERROR_CODES.AGENT_EXECUTION_FAILED,
            agentId: this.id,
            retryable: false,
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
        },
      });
      const duration = Date.now() - startTime;
      const metrics = {
        agentId: this.id,
        duration,
        tokens: {
          input: this.estimateTokenCount(parsed.prompt),
          output: this.estimateTokenCount(fullResponse),
          total:
            this.estimateTokenCount(parsed.prompt) +
            this.estimateTokenCount(fullResponse),
        },
        toolCalls: 0,
        retries: 0,
        errors: 0,
        status: "success",
        timestamp: new Date(),
      };
      this.metricsCollector.record(metrics);
      return {
        agentId: this.id,
        executionId,
        response: fullResponse,
        metrics,
        stream,
        streamed: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError =
        error instanceof SDKError
          ? error
          : new SDKError(String(error), {
              code: ERROR_CODES.AGENT_EXECUTION_FAILED,
              agentId: this.id,
              retryable: true,
            });
      const metrics = {
        agentId: this.id,
        duration,
        tokens: {
          input: this.estimateTokenCount(parsed.prompt),
          output: 0,
          total: this.estimateTokenCount(parsed.prompt),
        },
        toolCalls: 0,
        retries: 0,
        errors: 1,
        status: "error",
        timestamp: new Date(),
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
    if (duration > 2000) {
      throw new CancellationError("Cancellation took longer than 2 seconds", {
        agentId: this.id,
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
      // Emit progress event before making the API call
      context.onProgress({
        type: "progress",
        stage: "calling_llm",
        percentage: 0,
        message: "Calling GPT-4o-mini...",
      });
      // Make the actual LLM API call using Vercel AI SDK
      const result = await generateText({
        model: models.chat,
        system: this.instructions,
        prompt,
        temperature: 0.7,
      });
      // Emit progress event after successful API response
      context.onProgress({
        type: "progress",
        stage: "llm_response",
        percentage: 100,
        message: "Received response from GPT-4o-mini",
      });
      return result.text;
    } catch (error) {
      if (this.debug) {
        console.error("[Agent] LLM API call failed:", error);
      }
      // Re-throw as SDKError for proper retry handling
      throw new SDKError(
        `LLM API call failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: ERROR_CODES.AGENT_EXECUTION_FAILED,
          agentId: this.id,
          retryable: true,
          context: { originalError: error },
        }
      );
    }
  }
  emitStarted(executionId) {
    const event = {
      type: "started",
      agentId: this.id,
      timestamp: new Date(),
      data: { executionId },
    };
    this.eventEmitter.emit("started", event);
  }
  emitCompleted(executionId, response) {
    const event = {
      type: "completed",
      agentId: this.id,
      timestamp: new Date(),
      data: { executionId, response },
    };
    this.eventEmitter.emit("completed", event);
  }
  emitError(executionId, error) {
    const event = {
      type: "error",
      agentId: this.id,
      timestamp: new Date(),
      data: { executionId },
      error,
    };
    this.eventEmitter.emit("error", event);
  }
  emitToolError(executionId, toolName, event) {
    this.eventEmitter.emit("toolError", event);
  }
  estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
  }
}
export function createAgent(config, options) {
  return new Agent(config, options);
}
