import { z } from "zod";

export const AgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  instructions: z.string().min(1).max(10_000),
  tools: z.array(z.string()).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  timeout: z.number().min(1000).max(300_000).optional(),
  streaming: z.boolean().optional(),
  debug: z.boolean().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const ToolConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  parameters: z.record(z.string(), z.unknown()).optional(),
  returns: z.record(z.string(), z.unknown()).optional(),
  retryable: z.boolean().optional(),
});

export type ToolConfig = z.infer<typeof ToolConfigSchema>;

export const ExecutionOptionsSchema = z.object({
  prompt: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  stream: z.boolean().optional(),
  onProgress: z.function().optional(),
  signal: z.instanceof(AbortSignal).optional(),
});

export type ExecutionOptions = z.infer<typeof ExecutionOptionsSchema>;

export const RetryConfigSchema = z.object({
  maxAttempts: z.number().min(1).max(10).optional(),
  initialDelay: z.number().min(100).max(10_000).optional(),
  maxDelay: z.number().min(1000).max(60_000).optional(),
  backoffMultiplier: z.number().min(1.1).max(5).optional(),
  retryableErrors: z.array(z.string()).optional(),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

export const MetricsSchema = z.object({
  agentId: z.string(),
  duration: z.number(),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    total: z.number(),
  }),
  toolCalls: z.number(),
  retries: z.number(),
  errors: z.number(),
  status: z.enum(["success", "error", "cancelled"]),
  timestamp: z.date(),
});

export type Metrics = z.infer<typeof MetricsSchema>;

export const SDKConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  defaultTimeout: z.number().min(1000).max(300_000).optional(),
  defaultMaxRetries: z.number().min(0).max(10).optional(),
  debug: z.boolean().optional(),
  environmentVariables: z.boolean().optional(),
});

export type SDKConfig = z.infer<typeof SDKConfigSchema>;
