import { z } from "zod";
import type { ExecutionResult } from "./agent.js";
import { Agent, createAgent } from "./agent.js";
import {
  AgentExecutionError,
  AgentNotFoundError,
  AuthenticationError,
  CancellationError,
  createSDKError,
  ERROR_CODES,
  RateLimitExceededError,
  SDKError,
  TimeoutError,
  ToolExecutionError,
} from "./errors.js";
import type {
  AgentEvent,
  LifecycleEvent,
  ProgressEvent,
  ToolEvent,
} from "./events.js";
import { AgentEventEmitter } from "./events.js";
import type { AggregateMetrics } from "./metrics.js";
import { MetricsCollector } from "./metrics.js";
import { RetryManager } from "./retry.js";
import { createTool, Tool, ToolRegistry } from "./tool.js";
import type {
  AgentConfig,
  ExecutionOptions,
  Metrics,
  RetryConfig,
  SDKConfig,
  ToolConfig,
} from "./types.js";
import { AgentWorkflow, createWorkflow } from "./workflow.js";

export interface SDKOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultTimeout?: number;
  defaultMaxRetries?: number;
  debug?: boolean;
  metricsCollector?: MetricsCollector;
}

class AISDK {
  private readonly config: Required<SDKOptions>;
  private readonly metricsCollector: MetricsCollector;
  private initialized = false;
  private credentialValidator?: () => Promise<boolean>;

  constructor(options: SDKOptions = {}) {
    this.config = {
      apiKey: options.apiKey ?? process.env.API_KEY ?? "",
      baseUrl: options.baseUrl ?? "https://api.example.com",
      defaultTimeout: options.defaultTimeout ?? 60_000,
      defaultMaxRetries: options.defaultMaxRetries ?? 3,
      debug: options.debug ?? false,
      metricsCollector: options.metricsCollector ?? new MetricsCollector(),
    };
    this.metricsCollector = this.config.metricsCollector;

    if (this.config.debug) {
      console.log("[AISDK] SDK initialized");
    }
  }

  async initialize(): Promise<void> {
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
          troubleshootingUrl:
            "https://docs.example.com/getting-started#api-key",
        });
      }
    }

    this.initialized = true;

    if (this.config.debug) {
      console.log("[AISDK] Initialization complete");
    }
  }

  createAgent(
    config: AgentConfig,
    options?: {
      executionHandler?: import("./agent.js").ExecutionHandler;
      metricsCollector?: MetricsCollector;
    }
  ): Agent {
    const agent = createAgent(
      {
        ...config,
        timeout: config.timeout ?? this.config.defaultTimeout,
        maxRetries: config.maxRetries ?? this.config.defaultMaxRetries,
      },
      options as Parameters<typeof createAgent>[1]
    );

    return agent;
  }

  createTool<TParams extends Record<string, unknown>, TReturn>(
    func: (
      params: TParams,
      context?: import("./tool.js").ToolContext
    ) => Promise<import("./tool.js").ToolResult<TReturn>>,
    options: ToolConfig
  ): Tool<TParams, TReturn> {
    const tool = new Tool(func, {
      name: options.name,
      description: options.description,
      parameters: (options.parameters ?? {}) as Record<
        string,
        import("zod").ZodType
      >,
      returns: (options.returns ?? z.unknown()) as import("zod").ZodType,
      retryable: options.retryable,
    });
    return tool;
  }

  createWorkflow(config: {
    name: string;
    steps: import("./workflow.js").WorkflowStep[];
    parallelExecution?: boolean;
    timeout?: number;
  }): AgentWorkflow {
    return createWorkflow(config);
  }

  getMetrics(agentId?: string): Metrics[] {
    if (agentId) {
      return this.metricsCollector.getByAgentId(agentId);
    }
    return this.metricsCollector.getAll();
  }

  getAggregateMetrics(agentId: string): AggregateMetrics {
    return this.metricsCollector.getAggregateByAgentId(agentId);
  }

  setCredentialValidator(validator: () => Promise<boolean>): void {
    this.credentialValidator = validator;
  }

  async validateCredentials(): Promise<boolean> {
    if (this.credentialValidator) {
      return this.credentialValidator();
    }
    return true;
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  getConfig(): Readonly<Required<SDKOptions>> {
    return Object.freeze({ ...this.config });
  }

  updateConfig(updates: Partial<SDKOptions>): void {
    Object.assign(this.config, updates);
  }
}

let sdkInstance: AISDK | null = null;

export function initializeSDK(options?: SDKOptions): AISDK {
  if (!sdkInstance) {
    sdkInstance = new AISDK(options);
  }
  return sdkInstance;
}

export function getSDK(): AISDK {
  if (!sdkInstance) {
    throw createSDKError("SDK not initialized. Call initializeSDK() first.", {
      code: ERROR_CODES.CONFIG_INVALID,
      retryable: false,
      troubleshootingUrl:
        "https://docs.example.com/getting-started#initialization",
    });
  }
  return sdkInstance;
}

export {
  AISDK,
  createAgent,
  createTool,
  createWorkflow,
  Agent,
  Tool,
  ToolRegistry,
  AgentWorkflow,
  AgentEventEmitter,
  type AgentEvent,
  type LifecycleEvent,
  type ProgressEvent,
  type ToolEvent,
  SDKError,
  createSDKError,
  MetricsCollector,
  RetryManager,
  ERROR_CODES,
  AuthenticationError,
  RateLimitExceededError,
  TimeoutError,
  ToolExecutionError,
  AgentNotFoundError,
  AgentExecutionError,
  CancellationError,
};

export type {
  ExecutionResult,
  AgentConfig,
  ExecutionOptions,
  SDKConfig,
  Metrics,
  RetryConfig,
  ToolConfig,
  AggregateMetrics,
};
