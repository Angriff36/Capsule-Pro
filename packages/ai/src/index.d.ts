import type { ExecutionResult } from "./agent.js";
import { Agent, createAgent } from "./agent.js";
import {
  AgentExecutionError,
  AgentNotFoundError,
  AuthenticationError,
  CancellationError,
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
declare class AISDK {
  private readonly config;
  private readonly metricsCollector;
  private initialized;
  private credentialValidator?;
  constructor(options?: SDKOptions);
  initialize(): Promise<void>;
  createAgent(
    config: AgentConfig,
    options?: {
      executionHandler?: import("./agent.js").ExecutionHandler;
      metricsCollector?: MetricsCollector;
    }
  ): Agent;
  createTool<TParams extends Record<string, unknown>, TReturn>(
    func: (
      params: TParams,
      context?: import("./tool.js").ToolContext
    ) => Promise<import("./tool.js").ToolResult<TReturn>>,
    options: ToolConfig
  ): Tool<TParams, TReturn>;
  createWorkflow(config: {
    name: string;
    steps: import("./workflow.js").WorkflowStep[];
    parallelExecution?: boolean;
    timeout?: number;
  }): AgentWorkflow;
  getMetrics(agentId?: string): Metrics[];
  getAggregateMetrics(agentId: string): AggregateMetrics;
  setCredentialValidator(validator: () => Promise<boolean>): void;
  validateCredentials(): Promise<boolean>;
  getMetricsCollector(): MetricsCollector;
  getConfig(): Readonly<Required<SDKOptions>>;
  updateConfig(updates: Partial<SDKOptions>): void;
}
export declare function initializeSDK(options?: SDKOptions): AISDK;
export declare function getSDK(): AISDK;
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
//# sourceMappingURL=index.d.ts.map
