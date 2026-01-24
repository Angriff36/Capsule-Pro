import { Readable } from "node:stream";
import { type AgentEvent, type LifecycleEvent } from "./events.js";
import { MetricsCollector } from "./metrics.js";
import { type Tool, ToolRegistry } from "./tool.js";
import {
  type AgentConfig,
  type ExecutionOptions,
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
export declare class Agent {
  readonly id: string;
  readonly name: string;
  readonly instructions: string;
  readonly toolNames: string[];
  readonly maxRetries: number;
  readonly timeout: number;
  readonly streaming: boolean;
  readonly debug: boolean;
  private readonly eventEmitter;
  private readonly toolRegistry;
  private readonly metricsCollector;
  private state;
  private executionHandler;
  private abortController?;
  private isExecuting;
  constructor(
    config: AgentConfig,
    options?: {
      executionHandler?: ExecutionHandler;
      metricsCollector?: MetricsCollector;
    }
  );
  registerTool(tool: Tool): this;
  setExecutionHandler(handler: ExecutionHandler): this;
  execute(options: ExecutionOptions): Promise<ExecutionResult>;
  executeStreaming(options: ExecutionOptions): Promise<StreamingResult>;
  cancel(): Promise<void>;
  setState(state: Record<string, unknown>): void;
  getState(): Record<string, unknown>;
  getMetrics(): Metrics[];
  getLatestMetrics(): Metrics | undefined;
  getAggregateMetrics(): import("./metrics.js").AggregateMetrics;
  onProgress(callback: (event: AgentEvent) => void): this;
  onCompleted(callback: (event: LifecycleEvent) => void): this;
  onError(callback: (event: LifecycleEvent) => void): this;
  onCancelled(callback: (event: LifecycleEvent) => void): this;
  onToolStarted(
    callback: (event: import("./events.js").ToolEvent) => void
  ): this;
  onToolCompleted(
    callback: (event: import("./events.js").ToolEvent) => void
  ): this;
  onToolError(callback: (event: import("./events.js").ToolEvent) => void): this;
  private defaultExecutionHandler;
  private emitStarted;
  private emitCompleted;
  private emitError;
  private emitToolError;
  private estimateTokenCount;
}
export declare function createAgent(
  config: AgentConfig,
  options?: {
    executionHandler?: ExecutionHandler;
    metricsCollector?: MetricsCollector;
  }
): Agent;
//# sourceMappingURL=agent.d.ts.map
