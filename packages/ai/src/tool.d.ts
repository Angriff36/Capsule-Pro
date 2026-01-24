import { z } from "zod";
import { SDKError } from "./errors.js";
export type ToolParameterSchema = z.ZodType<unknown>;
export interface ToolParameters {
  [key: string]: ToolParameterSchema;
}
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: SDKError;
}
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameters;
  returns: ToolParameterSchema;
  retryable: boolean;
}
export type ToolFunction<
  TParameters extends Record<string, unknown> = Record<string, unknown>,
  TReturn = unknown,
> = (
  params: TParameters,
  context?: ToolContext
) => Promise<ToolResult<TReturn>>;
export interface ToolContext {
  agentId: string;
  executionId: string;
  abortSignal?: AbortSignal;
  onProgress?: (data: unknown) => void;
}
export interface ToolOptions {
  name: string;
  description: string;
  parameters?: ToolParameters;
  returns?: ToolParameterSchema;
  retryable?: boolean;
}
export declare class Tool<
  TParameters extends Record<string, unknown> = Record<string, unknown>,
  TReturn = unknown,
> {
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameters;
  readonly returns: ToolParameterSchema;
  readonly retryable: boolean;
  private readonly func;
  constructor(func: ToolFunction<TParameters, TReturn>, options: ToolOptions);
  execute(
    params: TParameters,
    context: ToolContext
  ): Promise<ToolResult<TReturn>>;
  private validateParameters;
  private createParameterSchema;
}
export declare function createTool<
  TParameters extends Record<string, unknown>,
  TReturn,
>(
  func: ToolFunction<TParameters, TReturn>,
  options: ToolOptions
): Tool<TParameters, TReturn>;
export declare class ToolRegistry {
  private readonly tools;
  register(tool: Tool): void;
  unregister(name: string): boolean;
  get(name: string): Tool | undefined;
  has(name: string): boolean;
  getAll(): Tool[];
  clear(): void;
}
//# sourceMappingURL=tool.d.ts.map
