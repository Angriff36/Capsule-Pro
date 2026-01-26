export const ERROR_CODES = {
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
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface SDKErrorOptions extends ErrorOptions {
  code: ErrorCode;
  agentId?: string;
  toolName?: string;
  retryable?: boolean;
  troubleshootingUrl?: string;
  context?: Record<string, unknown>;
}

export class SDKError extends Error {
  public readonly code: ErrorCode;
  public readonly agentId?: string;
  public readonly toolName?: string;
  public readonly retryable: boolean;
  public readonly troubleshootingUrl?: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(message: string, options: SDKErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = options.code;
    this.agentId = options.agentId;
    this.toolName = options.toolName;
    this.retryable = options.retryable ?? false;
    this.troubleshootingUrl = options.troubleshootingUrl;
    this.context = options.context;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
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
      stack: this.stack,
    };
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.AUTH_INVALID,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/auth",
    });
    this.name = "AuthenticationError";
  }
}

export class AuthenticationExpiredError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.AUTH_EXPIRED,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/auth#expired",
    });
    this.name = "AuthenticationExpiredError";
  }
}

export class RateLimitExceededError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/rate-limit",
    });
    this.name = "RateLimitExceededError";
  }
}

export class TimeoutError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.TIMEOUT,
      retryable: true,
      troubleshootingUrl: "https://docs.example.com/timeout",
    });
    this.name = "TimeoutError";
  }
}

export class ToolExecutionError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.TOOL_EXECUTION_FAILED,
      retryable: options?.retryable ?? true,
      troubleshootingUrl: "https://docs.example.com/tools#execution",
    });
    this.name = "ToolExecutionError";
  }
}

export class ToolNotFoundError extends SDKError {
  constructor(
    toolName: string,
    options?: Omit<SDKErrorOptions, "code" | "toolName">
  ) {
    super(`Tool not found: ${toolName}`, {
      ...options,
      code: ERROR_CODES.TOOL_NOT_FOUND,
      toolName,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/tools#not-found",
    });
    this.name = "ToolNotFoundError";
  }
}

export class ToolValidationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.TOOL_VALIDATION_FAILED,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/tools#validation",
    });
    this.name = "ToolValidationError";
  }
}

export class AgentNotFoundError extends SDKError {
  constructor(
    agentId: string,
    options?: Omit<SDKErrorOptions, "code" | "agentId">
  ) {
    super(`Agent not found: ${agentId}`, {
      ...options,
      code: ERROR_CODES.AGENT_NOT_FOUND,
      agentId,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/agents#not-found",
    });
    this.name = "AgentNotFoundError";
  }
}

export class AgentExecutionError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.AGENT_EXECUTION_FAILED,
      retryable: options?.retryable ?? true,
      troubleshootingUrl: "https://docs.example.com/agents#execution",
    });
    this.name = "AgentExecutionError";
  }
}

export class WorkflowError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.WORKFLOW_ERROR,
      retryable: options?.retryable ?? false,
      troubleshootingUrl: "https://docs.example.com/workflows#errors",
    });
    this.name = "WorkflowError";
  }
}

export class StateError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.STATE_ERROR,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/state#errors",
    });
    this.name = "StateError";
  }
}

export class CancellationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.CANCELLATION_FAILED,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/cancellation",
    });
    this.name = "CancellationError";
  }
}

export class ConfigurationError extends SDKError {
  constructor(message: string, options?: Omit<SDKErrorOptions, "code">) {
    super(message, {
      ...options,
      code: ERROR_CODES.CONFIG_INVALID,
      retryable: false,
      troubleshootingUrl: "https://docs.example.com/configuration",
    });
    this.name = "ConfigurationError";
  }
}

type SDKErrorFactory = (
  message: string,
  options: SDKErrorOptions
) => SDKError;

const SDK_ERROR_FACTORIES: Partial<Record<ErrorCode, SDKErrorFactory>> = {
  [ERROR_CODES.AUTH_INVALID]: (message, options) =>
    new AuthenticationError(message, options),
  [ERROR_CODES.AUTH_EXPIRED]: (message, options) =>
    new AuthenticationExpiredError(message, options),
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: (message, options) =>
    new RateLimitExceededError(message, options),
  [ERROR_CODES.TIMEOUT]: (message, options) => new TimeoutError(message, options),
  [ERROR_CODES.TOOL_EXECUTION_FAILED]: (message, options) =>
    new ToolExecutionError(message, options),
  [ERROR_CODES.TOOL_VALIDATION_FAILED]: (message, options) =>
    new ToolValidationError(message, options),
  [ERROR_CODES.AGENT_EXECUTION_FAILED]: (message, options) =>
    new AgentExecutionError(message, options),
  [ERROR_CODES.WORKFLOW_ERROR]: (message, options) =>
    new WorkflowError(message, options),
  [ERROR_CODES.STATE_ERROR]: (message, options) =>
    new StateError(message, options),
  [ERROR_CODES.CANCELLATION_FAILED]: (message, options) =>
    new CancellationError(message, options),
  [ERROR_CODES.INTERNAL_ERROR]: (message, options) =>
    new SDKError(message, options),
  [ERROR_CODES.TOOL_NOT_FOUND]: (message, options) =>
    new SDKError(message, options),
  [ERROR_CODES.AGENT_NOT_FOUND]: (message, options) =>
    new SDKError(message, options),
  [ERROR_CODES.CONFIG_INVALID]: (message, options) =>
    new SDKError(message, options),
};

export function createSDKError(
  message: string,
  options: SDKErrorOptions
): SDKError {
  const factory = SDK_ERROR_FACTORIES[options.code];
  return factory ? factory(message, options) : new SDKError(message, options);
}
