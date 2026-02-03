import { z } from 'zod';
import { Readable } from 'node:stream';

declare const ERROR_CODES: {
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
type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
interface SDKErrorOptions extends ErrorOptions {
    code: ErrorCode;
    agentId?: string;
    toolName?: string;
    retryable?: boolean;
    troubleshootingUrl?: string;
    context?: Record<string, unknown>;
}
declare class SDKError extends Error {
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
declare class AuthenticationError extends SDKError {
    constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
declare class RateLimitExceededError extends SDKError {
    constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
declare class TimeoutError extends SDKError {
    constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
declare class ToolExecutionError extends SDKError {
    constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
declare class AgentNotFoundError extends SDKError {
    constructor(agentId: string, options?: Omit<SDKErrorOptions, "code" | "agentId">);
}
declare class AgentExecutionError extends SDKError {
    constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
declare class CancellationError extends SDKError {
    constructor(message: string, options?: Omit<SDKErrorOptions, "code">);
}
declare function createSDKError(message: string, options: SDKErrorOptions): SDKError;

type EventType = "started" | "progress" | "completed" | "error" | "cancelled" | "toolStarted" | "toolProgress" | "toolCompleted" | "toolError";
type ProgressEvent = {
    type: "progress";
    stage: string;
    percentage: number;
    message: string;
    estimatedTimeRemaining?: number;
};
type ToolEvent = {
    type: "toolStarted" | "toolProgress" | "toolCompleted" | "toolError";
    toolName: string;
    toolCallId: string;
    data?: unknown;
    error?: SDKError;
};
type LifecycleEvent = {
    type: "started" | "completed" | "error" | "cancelled";
    agentId: string;
    timestamp: Date;
    data?: unknown;
    error?: SDKError;
};
type AgentEvent = ProgressEvent | ToolEvent | LifecycleEvent;
type GenericListener = (event: AgentEvent) => void;
declare class AgentEventEmitter {
    private readonly emitter;
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

declare const AgentConfigSchema: z.ZodObject<{
    name: z.ZodString;
    instructions: z.ZodString;
    tools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
    timeout: z.ZodOptional<z.ZodNumber>;
    streaming: z.ZodOptional<z.ZodBoolean>;
    debug: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
type AgentConfig = z.infer<typeof AgentConfigSchema>;
declare const ToolConfigSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    returns: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    retryable: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
type ToolConfig = z.infer<typeof ToolConfigSchema>;
declare const ExecutionOptionsSchema: z.ZodObject<{
    prompt: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    stream: z.ZodOptional<z.ZodBoolean>;
    onProgress: z.ZodOptional<z.ZodFunction<z.core.$ZodFunctionArgs, z.core.$ZodFunctionOut>>;
    signal: z.ZodOptional<z.ZodCustom<AbortSignal, AbortSignal>>;
}, z.core.$strip>;
type ExecutionOptions = z.infer<typeof ExecutionOptionsSchema>;
declare const RetryConfigSchema: z.ZodObject<{
    maxAttempts: z.ZodOptional<z.ZodNumber>;
    initialDelay: z.ZodOptional<z.ZodNumber>;
    maxDelay: z.ZodOptional<z.ZodNumber>;
    backoffMultiplier: z.ZodOptional<z.ZodNumber>;
    retryableErrors: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
type RetryConfig = z.infer<typeof RetryConfigSchema>;
declare const MetricsSchema: z.ZodObject<{
    agentId: z.ZodString;
    duration: z.ZodNumber;
    tokens: z.ZodObject<{
        input: z.ZodNumber;
        output: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>;
    toolCalls: z.ZodNumber;
    retries: z.ZodNumber;
    errors: z.ZodNumber;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
        cancelled: "cancelled";
    }>;
    timestamp: z.ZodDate;
}, z.core.$strip>;
type Metrics = z.infer<typeof MetricsSchema>;
declare const SDKConfigSchema: z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
    defaultTimeout: z.ZodOptional<z.ZodNumber>;
    defaultMaxRetries: z.ZodOptional<z.ZodNumber>;
    debug: z.ZodOptional<z.ZodBoolean>;
    environmentVariables: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
type SDKConfig = z.infer<typeof SDKConfigSchema>;

declare const MetricsExportSchema: z.ZodObject<{
    format: z.ZodEnum<{
        json: "json";
        prometheus: "prometheus";
        datadog: "datadog";
        webhook: "webhook";
    }>;
    destination: z.ZodString;
}, z.core.$strip>;
type MetricsExportConfig = z.infer<typeof MetricsExportSchema>;
type MetricsCollectorOptions = {
    maxEntries?: number;
    exportConfig?: MetricsExportConfig;
};
declare class MetricsCollector {
    private readonly entries;
    private readonly maxEntries;
    private readonly exportConfig?;
    private exportInterval?;
    private readonly exportStrategies;
    constructor(options?: MetricsCollectorOptions);
    record(metrics: Metrics): void;
    getByAgentId(agentId: string): Metrics[];
    getLatestByAgentId(agentId: string): Metrics | undefined;
    getAggregateByAgentId(agentId: string): AggregateMetrics;
    getAll(): Metrics[];
    clear(): void;
    export(): Promise<string>;
    private startExportInterval;
    private exportToWebhook;
    private exportToPrometheus;
    private exportToDatadog;
    destroy(): void;
}
type AggregateMetrics = {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    totalTokens: number;
    totalToolCalls: number;
    totalRetries: number;
    totalErrors: number;
};

type ToolParameterSchema = z.ZodType<unknown>;
type ToolParameters = {
    [key: string]: ToolParameterSchema;
};
type ToolResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: SDKError;
};
type ToolFunction<TParameters extends Record<string, unknown> = Record<string, unknown>, TReturn = unknown> = (params: TParameters, context?: ToolContext) => Promise<ToolResult<TReturn>>;
type ToolContext = {
    agentId: string;
    executionId: string;
    abortSignal?: AbortSignal;
    onProgress?: (data: unknown) => void;
};
type ToolOptions = {
    name: string;
    description: string;
    parameters?: ToolParameters;
    returns?: ToolParameterSchema;
    retryable?: boolean;
};
declare class Tool<TParameters extends Record<string, unknown> = Record<string, unknown>, TReturn = unknown> {
    readonly name: string;
    readonly description: string;
    readonly parameters: ToolParameters;
    readonly returns: ToolParameterSchema;
    readonly retryable: boolean;
    private readonly func;
    constructor(func: ToolFunction<TParameters, TReturn>, options: ToolOptions);
    execute(params: TParameters, context: ToolContext): Promise<ToolResult<TReturn>>;
    private validateParameters;
    private createParameterSchema;
}
declare function createTool<TParameters extends Record<string, unknown>, TReturn>(func: ToolFunction<TParameters, TReturn>, options: ToolOptions): Tool<TParameters, TReturn>;
declare class ToolRegistry {
    private readonly tools;
    register(tool: Tool): void;
    unregister(name: string): boolean;
    get(name: string): Tool | undefined;
    has(name: string): boolean;
    getAll(): Tool[];
    clear(): void;
}

type ExecutionResult = {
    agentId: string;
    executionId: string;
    response: string;
    metrics: Metrics;
    streamed?: boolean;
};
interface StreamingResult extends ExecutionResult {
    stream: Readable;
}
type ExecutionHandler = (prompt: string, context: {
    agentId: string;
    executionId: string;
    tools: ToolRegistry;
    abortSignal: AbortSignal;
    onProgress: (data: AgentEvent) => void;
}) => Promise<string> | Readable;
declare class Agent {
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
    constructor(config: AgentConfig, options?: {
        executionHandler?: ExecutionHandler;
        metricsCollector?: MetricsCollector;
    });
    registerTool(tool: Tool): this;
    setExecutionHandler(handler: ExecutionHandler): this;
    execute(options: ExecutionOptions): Promise<ExecutionResult>;
    executeStreaming(options: ExecutionOptions): Promise<StreamingResult>;
    cancel(): Promise<void>;
    setState(state: Record<string, unknown>): void;
    getState(): Record<string, unknown>;
    getMetrics(): Metrics[];
    getLatestMetrics(): Metrics | undefined;
    getAggregateMetrics(): AggregateMetrics;
    onProgress(callback: (event: AgentEvent) => void): this;
    onCompleted(callback: (event: LifecycleEvent) => void): this;
    onError(callback: (event: LifecycleEvent) => void): this;
    onCancelled(callback: (event: LifecycleEvent) => void): this;
    onToolStarted(callback: (event: ToolEvent) => void): this;
    onToolCompleted(callback: (event: ToolEvent) => void): this;
    onToolError(callback: (event: ToolEvent) => void): this;
    private defaultExecutionHandler;
    private emitStarted;
    private emitCompleted;
    private emitError;
    private estimateTokenCount;
}
declare function createAgent(config: AgentConfig, options?: {
    executionHandler?: ExecutionHandler;
    metricsCollector?: MetricsCollector;
}): Agent;

type WorkflowStep = {
    id: string;
    agent: Agent;
    dependsOn: string[];
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
    condition?: (context: WorkflowContext) => boolean;
};
type WorkflowConfig = {
    name: string;
    steps: WorkflowStep[];
    parallelExecution?: boolean;
    timeout?: number;
};
type WorkflowContext = {
    workflowId: string;
    stepResults: Map<string, unknown>;
    sharedState: Record<string, unknown>;
    startTime: Date;
};
type WorkflowResult = {
    workflowId: string;
    success: boolean;
    stepResults: Map<string, ExecutionResult>;
    duration: number;
    error?: SDKError;
};
declare class AgentWorkflow {
    readonly id: string;
    readonly name: string;
    readonly steps: WorkflowStep[];
    readonly parallelExecution: boolean;
    readonly timeout: number;
    private readonly eventEmitter;
    private readonly context;
    private readonly stepExecutionOrder;
    constructor(config: WorkflowConfig);
    private validateAndOrderSteps;
    setSharedState(state: Record<string, unknown>): void;
    getSharedState(): Record<string, unknown>;
    execute(context?: Record<string, unknown>): Promise<WorkflowResult>;
    private executeSequential;
    private executeParallel;
    private identifyExecutionLevels;
    private executeStep;
    private prepareStepInput;
    private emitWorkflowStarted;
    private emitWorkflowCompleted;
    private emitWorkflowError;
    private emitStepStarted;
    private emitStepCompleted;
    private emitStepError;
    onProgress(callback: (event: AgentEvent) => void): this;
    onCompleted(callback: (event: LifecycleEvent) => void): this;
    onError(callback: (event: LifecycleEvent) => void): this;
}
declare function createWorkflow(config: WorkflowConfig): AgentWorkflow;

type RetryOptions = {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: ErrorCode[];
    onRetry?: (attempt: number, error: SDKError) => void;
};
declare class RetryManager {
    private readonly maxAttempts;
    private readonly initialDelay;
    private readonly maxDelay;
    private readonly backoffMultiplier;
    private readonly retryableErrors;
    private readonly onRetry?;
    constructor(options?: RetryOptions);
    execute<T>(operation: () => Promise<T>, abortSignal?: AbortSignal): Promise<T>;
    private isRetryable;
    private calculateDelay;
    private delay;
    private ensureSDKError;
}

type SDKOptions = {
    apiKey?: string;
    baseUrl?: string;
    defaultTimeout?: number;
    defaultMaxRetries?: number;
    debug?: boolean;
    metricsCollector?: MetricsCollector;
};
declare class AISDK {
    private readonly config;
    private readonly metricsCollector;
    private initialized;
    private credentialValidator?;
    constructor(options?: SDKOptions);
    initialize(): Promise<void>;
    createAgent(config: AgentConfig, options?: {
        executionHandler?: ExecutionHandler;
        metricsCollector?: MetricsCollector;
    }): Agent;
    createTool<TParams extends Record<string, unknown>, TReturn>(func: (params: TParams, context?: ToolContext) => Promise<ToolResult<TReturn>>, options: ToolConfig): Tool<TParams, TReturn>;
    createWorkflow(config: {
        name: string;
        steps: WorkflowStep[];
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
declare function initializeSDK(options?: SDKOptions): AISDK;
declare function getSDK(): AISDK;

export { AISDK, Agent, type AgentConfig, type AgentEvent, AgentEventEmitter, AgentExecutionError, AgentNotFoundError, AgentWorkflow, type AggregateMetrics, AuthenticationError, CancellationError, ERROR_CODES, type ExecutionOptions, type ExecutionResult, type LifecycleEvent, type Metrics, MetricsCollector, type ProgressEvent, RateLimitExceededError, type RetryConfig, RetryManager, type SDKConfig, SDKError, type SDKOptions, TimeoutError, Tool, type ToolConfig, type ToolEvent, ToolExecutionError, ToolRegistry, createAgent, createSDKError, createTool, createWorkflow, getSDK, initializeSDK };
