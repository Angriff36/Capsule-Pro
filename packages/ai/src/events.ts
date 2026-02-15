import { EventEmitter as NodeEventEmitter } from "node:events";
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

export class AgentEventEmitter {
  private readonly emitter: NodeEventEmitter;

  constructor() {
    this.emitter = new NodeEventEmitter();
    this.emitter.setMaxListeners(100);
  }

  on(event: EventType, listener: GenericListener): this {
    this.emitter.on(event, listener);
    return this;
  }

  once(event: EventType, listener: GenericListener): this {
    this.emitter.once(event, listener);
    return this;
  }

  off(event: EventType, listener: GenericListener): this {
    this.emitter.off(event, listener);
    return this;
  }

  emit(event: EventType, eventObject: AgentEvent): boolean {
    return this.emitter.emit(event, eventObject);
  }

  onStarted(listener: (event: LifecycleEvent) => void): this {
    this.emitter.on("started", listener as GenericListener);
    return this;
  }

  onProgress(listener: (event: ProgressEvent) => void): this {
    this.emitter.on("progress", listener as GenericListener);
    return this;
  }

  onCompleted(listener: (event: LifecycleEvent) => void): this {
    this.emitter.on("completed", listener as GenericListener);
    return this;
  }

  onError(listener: (event: LifecycleEvent) => void): this {
    this.emitter.on("error", listener as GenericListener);
    return this;
  }

  onCancelled(listener: (event: LifecycleEvent) => void): this {
    this.emitter.on("cancelled", listener as GenericListener);
    return this;
  }

  onToolStarted(listener: (event: ToolEvent) => void): this {
    this.emitter.on("toolStarted", listener as GenericListener);
    return this;
  }

  onToolProgress(listener: (event: ToolEvent) => void): this {
    this.emitter.on("toolProgress", listener as GenericListener);
    return this;
  }

  onToolCompleted(listener: (event: ToolEvent) => void): this {
    this.emitter.on("toolCompleted", listener as GenericListener);
    return this;
  }

  onToolError(listener: (event: ToolEvent) => void): this {
    this.emitter.on("toolError", listener as GenericListener);
    return this;
  }

  removeAllListeners(): this {
    this.emitter.removeAllListeners();
    return this;
  }
}
