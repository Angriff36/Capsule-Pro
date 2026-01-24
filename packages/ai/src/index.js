import { z } from "zod";
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
import { AgentEventEmitter } from "./events.js";
import { MetricsCollector } from "./metrics.js";
import { RetryManager } from "./retry.js";
import { createTool, Tool, ToolRegistry } from "./tool.js";
import { AgentWorkflow, createWorkflow } from "./workflow.js";

class AISDK {
  config;
  metricsCollector;
  initialized = false;
  credentialValidator;
  constructor(options = {}) {
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
  async initialize() {
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
  createAgent(config, options) {
    const agent = createAgent(
      {
        ...config,
        timeout: config.timeout ?? this.config.defaultTimeout,
        maxRetries: config.maxRetries ?? this.config.defaultMaxRetries,
      },
      options
    );
    return agent;
  }
  createTool(func, options) {
    const tool = new Tool(func, {
      name: options.name,
      description: options.description,
      parameters: options.parameters ?? {},
      returns: options.returns ?? z.unknown(),
      retryable: options.retryable,
    });
    return tool;
  }
  createWorkflow(config) {
    return createWorkflow(config);
  }
  getMetrics(agentId) {
    if (agentId) {
      return this.metricsCollector.getByAgentId(agentId);
    }
    return this.metricsCollector.getAll();
  }
  getAggregateMetrics(agentId) {
    return this.metricsCollector.getAggregateByAgentId(agentId);
  }
  setCredentialValidator(validator) {
    this.credentialValidator = validator;
  }
  async validateCredentials() {
    if (this.credentialValidator) {
      return this.credentialValidator();
    }
    return true;
  }
  getMetricsCollector() {
    return this.metricsCollector;
  }
  getConfig() {
    return Object.freeze({ ...this.config });
  }
  updateConfig(updates) {
    Object.assign(this.config, updates);
  }
}
let sdkInstance = null;
export function initializeSDK(options) {
  if (!sdkInstance) {
    sdkInstance = new AISDK(options);
  }
  return sdkInstance;
}
export function getSDK() {
  if (!sdkInstance) {
    throw new SDKError("SDK not initialized. Call initializeSDK() first.", {
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
