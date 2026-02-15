import { Readable } from "node:stream";
import { v4 as uuidv4 } from "uuid";
import { CancellationError, ERROR_CODES, SDKError } from "./errors.js";
import {
  type AgentEvent,
  AgentEventEmitter,
  type GenericListener,
  type LifecycleEvent,
} from "./events.js";
import { MetricsCollector } from "./metrics.js";
import { RetryManager } from "./retry.js";
import { type Tool, ToolRegistry } from "./tool.js";
import {
  type AgentConfig,
  AgentConfigSchema,
  type ExecutionOptions,
  ExecutionOptionsSchema,
  type Metrics,
} from "./types.js";

export interface ExecutionResult {
  agentId: string;
  executionId: string;
  response: string;
  metrics: Metrics;
  streamed?: boolean;
}

export interface StreamingResult extends ExecutionResult {
  stream: Readable;
}

export type ExecutionHandler = (
  prompt: string,
  context: {
    agentId: string;
    executionId: string;
    tools: ToolRegistry;
    abortSignal: AbortSignal;
    onProgress: (data: AgentEvent) => void;
  }
) => Promise<string> | Readable;

export class Agent {
  public readonly id: string;
  public readonly name: string;
  public readonly instructions: string;
  public readonly toolNames: string[];
  public readonly maxRetries: number;
  public readonly timeout: number;
  public readonly streaming: boolean;
  public readonly debug: boolean;
  private readonly eventEmitter: AgentEventEmitter;
  private readonly toolRegistry: ToolRegistry;
  private readonly metricsCollector: MetricsCollector;
  private state: Record<string, unknown> = {};
  private executionHandler: ExecutionHandler;
  private abortController?: AbortController;
  private isExecuting = false;

  constructor(
    config: AgentConfig,
    options: {
      executionHandler?: ExecutionHandler;
      metricsCollector?: MetricsCollector;
    } = {}
  ) {
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

  registerTool(tool: Tool): this {
    this.toolRegistry.register(tool);
    this.toolNames.push(tool.name);

    if (this.debug) {
      console.log(
        `[Agent] Registered tool: ${tool.name} for agent ${this.name}`
      );
    }

    return this;
  }

  setExecutionHandler(handler: ExecutionHandler): this {
    this.executionHandler = handler;
    return this;
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
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
      const metrics: Metrics = {
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

      const metrics: Metrics = {
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

  async executeStreaming(options: ExecutionOptions): Promise<StreamingResult> {
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
      const metrics: Metrics = {
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

      const metrics: Metrics = {
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

  async cancel(): Promise<void> {
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

  setState(state: Record<string, unknown>): void {
    this.state = { ...state };
  }

  getState(): Record<string, unknown> {
    return { ...this.state };
  }

  getMetrics(): Metrics[] {
    return this.metricsCollector.getByAgentId(this.id);
  }

  getLatestMetrics(): Metrics | undefined {
    return this.metricsCollector.getLatestByAgentId(this.id);
  }

  getAggregateMetrics() {
    return this.metricsCollector.getAggregateByAgentId(this.id);
  }

  onProgress(callback: (event: AgentEvent) => void): this {
    this.eventEmitter.on("progress", callback);
    return this;
  }

  onCompleted(callback: (event: LifecycleEvent) => void): this {
    this.eventEmitter.on("completed", callback as GenericListener);
    return this;
  }

  onError(callback: (event: LifecycleEvent) => void): this {
    this.eventEmitter.on("error", callback as GenericListener);
    return this;
  }

  onCancelled(callback: (event: LifecycleEvent) => void): this {
    this.eventEmitter.on("cancelled", callback as GenericListener);
    return this;
  }

  onToolStarted(
    callback: (event: import("./events.js").ToolEvent) => void
  ): this {
    this.eventEmitter.on("toolStarted", callback as GenericListener);
    return this;
  }

  onToolCompleted(
    callback: (event: import("./events.js").ToolEvent) => void
  ): this {
    this.eventEmitter.on("toolCompleted", callback as GenericListener);
    return this;
  }

  onToolError(
    callback: (event: import("./events.js").ToolEvent) => void
  ): this {
    this.eventEmitter.on("toolError", callback as GenericListener);
    return this;
  }

  private async defaultExecutionHandler(
    prompt: string,
    context: {
      agentId: string;
      executionId: string;
      tools: ToolRegistry;
      abortSignal: AbortSignal;
      onProgress: (data: AgentEvent) => void;
    }
  ): Promise<string> {
    return `[Agent: ${this.name}] ${this.instructions}\n\nUser: ${prompt}`;
  }

  private emitStarted(executionId: string): void {
    const event: LifecycleEvent = {
      type: "started",
      agentId: this.id,
      timestamp: new Date(),
      data: { executionId },
    };
    this.eventEmitter.emit("started", event);
  }

  private emitCompleted(executionId: string, response: string): void {
    const event: LifecycleEvent = {
      type: "completed",
      agentId: this.id,
      timestamp: new Date(),
      data: { executionId, response },
    };
    this.eventEmitter.emit("completed", event);
  }

  private emitError(executionId: string, error: SDKError): void {
    const event: LifecycleEvent = {
      type: "error",
      agentId: this.id,
      timestamp: new Date(),
      data: { executionId },
      error,
    };
    this.eventEmitter.emit("error", event);
  }

  private emitToolError(
    executionId: string,
    toolName: string,
    event: import("./events.js").ToolEvent
  ): void {
    this.eventEmitter.emit("toolError", event);
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export function createAgent(
  config: AgentConfig,
  options?: {
    executionHandler?: ExecutionHandler;
    metricsCollector?: MetricsCollector;
  }
): Agent {
  return new Agent(config, options);
}
