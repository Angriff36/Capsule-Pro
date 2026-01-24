export declare const ERROR_CODES: {
  readonly AUTH_INVALID: "AUTH_INVALID";
  readonly AUTH_EXPIRED: "AUTH_EXPIRED";
  readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
  readonly TIMEOUT: "TIMEOUT";
  readonly TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED";
  readonly TOOL_NOT_FOUND: "TOOL_NOT_FOUND";
  readonly TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED";
  readonly AGENT_NOT_FOUND: "AGENT_NOT_FOUND";
  readonly AGENT_EXECUTION_FAILED: "AGENT_EXECUTION_FAILED";
  readonly WORKFLOW_ERROR: "WORKFLOW_ERROR";
  readonly STATE_ERROR: "STATE_ERROR";
  readonly CANCELLATION_FAILED: "CANCELLATION_FAILED";
  readonly METRICS_ERROR: "METRICS_ERROR";
  readonly CONFIG_INVALID: "CONFIG_INVALID";
  readonly INTERNAL_ERROR: "INTERNAL_ERROR";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export interface SDKErrorOptions extends ErrorOptions {
  code: ErrorCode;
  agentId?: string;
  toolName?: string;
  retryable?: boolean;
  troubleshootingUrl?: string;
  context?: Record<string, unknown>;
}
export declare class SDKError extends Error {
  readonly code: ErrorCode;
  readonly agentId?: string;
  readonly toolName?: string;
  readonly retryable: boolean;
  readonly troubleshootingUrl?: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: Date;
  constructor(message: string, options: SDKErrorOptions);
  toJSON(): Record<string, unknown>;
}
export declare class AuthenticationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class AuthenticationExpiredError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class RateLimitExceededError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class TimeoutError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class ToolExecutionError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class ToolNotFoundError extends SDKError {
  constructor(
    toolName: string,
    options?: Omit<SDKErrorOptions, "code" | "toolName">
  );
}
export declare class ToolValidationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class AgentNotFoundError extends SDKError {
  constructor(
    agentId: string,
    options?: Omit<SDKErrorOptions, "code" | "agentId">
  );
}
export declare class AgentExecutionError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class WorkflowError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class StateError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class CancellationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
export declare class ConfigurationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
//# sourceMappingURL=errors.d.ts.map
