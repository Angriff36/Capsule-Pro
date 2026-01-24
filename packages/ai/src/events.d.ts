import type { SDKError } from "./errors.js";
export type EventType =
  | "started"
  | "progress"
  | "completed"
  | "error"
  | "cancelled"
  | "toolStarted"
  | "toolProgress"
  | "toolCompleted"
  | "toolError";
export interface ProgressEvent {
  type: "progress";
  stage: string;
  percentage: number;
  message: string;
  estimatedTimeRemaining?: number;
}
export interface ToolEvent {
  type: "toolStarted" | "toolProgress" | "toolCompleted" | "toolError";
  toolName: string;
  toolCallId: string;
  data?: unknown;
  error?: SDKError;
}
export interface LifecycleEvent {
  type: "started" | "completed" | "error" | "cancelled";
  agentId: string;
  timestamp: Date;
  data?: unknown;
  error?: SDKError;
}
export type AgentEvent = ProgressEvent | ToolEvent | LifecycleEvent;
export type GenericListener = (event: AgentEvent) => void;
export declare class AgentEventEmitter {
  private emitter;
  constructor();
  on(event: EventType, listener: GenericListener): this;
  once(event: EventType, listener: GenericListener): this;
  off(event: EventType, listener: GenericListener): this;
  emit(event: EventType, eventObject: AgentEvent): boolean;
  onStarted(listener: (event: LifecycleEvent) => void): this;
  onProgress(listener: (event: ProgressEvent) => void): this;
  onCompleted(listener: (event: LifecycleEvent) => void): this;
  onError(listener: (event: LifecycleEvent) => void): this;
  onCancelled(listener: (event: LifecycleEvent) => void): this;
  onToolStarted(listener: (event: ToolEvent) => void): this;
  onToolProgress(listener: (event: ToolEvent) => void): this;
  onToolCompleted(listener: (event: ToolEvent) => void): this;
  onToolError(listener: (event: ToolEvent) => void): this;
  removeAllListeners(): this;
}
//# sourceMappingURL=events.d.ts.map
