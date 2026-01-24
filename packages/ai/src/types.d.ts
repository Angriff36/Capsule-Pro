import { z } from "zod";
export declare const AgentConfigSchema: z.ZodObject<
  {
    name: z.ZodString;
    instructions: z.ZodString;
    tools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
    timeout: z.ZodOptional<z.ZodNumber>;
    streaming: z.ZodOptional<z.ZodBoolean>;
    debug: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export declare const ToolConfigSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    returns: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    retryable: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export declare const ExecutionOptionsSchema: z.ZodObject<
  {
    prompt: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    stream: z.ZodOptional<z.ZodBoolean>;
    onProgress: z.ZodOptional<
      z.ZodFunction<z.core.$ZodFunctionArgs, z.core.$ZodFunctionOut>
    >;
    signal: z.ZodOptional<z.ZodCustom<AbortSignal, AbortSignal>>;
  },
  z.core.$strip
>;
export type ExecutionOptions = z.infer<typeof ExecutionOptionsSchema>;
export declare const RetryConfigSchema: z.ZodObject<
  {
    maxAttempts: z.ZodOptional<z.ZodNumber>;
    initialDelay: z.ZodOptional<z.ZodNumber>;
    maxDelay: z.ZodOptional<z.ZodNumber>;
    backoffMultiplier: z.ZodOptional<z.ZodNumber>;
    retryableErrors: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export declare const MetricsSchema: z.ZodObject<
  {
    agentId: z.ZodString;
    duration: z.ZodNumber;
    tokens: z.ZodObject<
      {
        input: z.ZodNumber;
        output: z.ZodNumber;
        total: z.ZodNumber;
      },
      z.core.$strip
    >;
    toolCalls: z.ZodNumber;
    retries: z.ZodNumber;
    errors: z.ZodNumber;
    status: z.ZodEnum<{
      error: "error";
      cancelled: "cancelled";
      success: "success";
    }>;
    timestamp: z.ZodDate;
  },
  z.core.$strip
>;
export type Metrics = z.infer<typeof MetricsSchema>;
export declare const SDKConfigSchema: z.ZodObject<
  {
    apiKey: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
    defaultTimeout: z.ZodOptional<z.ZodNumber>;
    defaultMaxRetries: z.ZodOptional<z.ZodNumber>;
    debug: z.ZodOptional<z.ZodBoolean>;
    environmentVariables: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
export type SDKConfig = z.infer<typeof SDKConfigSchema>;
//# sourceMappingURL=types.d.ts.map
