import { z } from "zod";
import { createSDKError, ERROR_CODES, SDKError } from "./errors.js";

export type ToolParameterSchema = z.ZodType<unknown>;

export type ToolParameters = {
  [key: string]: ToolParameterSchema;
};

export type ToolResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: SDKError;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: ToolParameters;
  returns: ToolParameterSchema;
  retryable: boolean;
};

export type ToolFunction<
  TParameters extends Record<string, unknown> = Record<string, unknown>,
  TReturn = unknown,
> = (
  params: TParameters,
  context?: ToolContext
) => Promise<ToolResult<TReturn>>;

export type ToolContext = {
  agentId: string;
  executionId: string;
  abortSignal?: AbortSignal;
  onProgress?: (data: unknown) => void;
};

export type ToolOptions = {
  name: string;
  description: string;
  parameters?: ToolParameters;
  returns?: ToolParameterSchema;
  retryable?: boolean;
};

export class Tool<
  TParameters extends Record<string, unknown> = Record<string, unknown>,
  TReturn = unknown,
> {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters: ToolParameters;
  public readonly returns: ToolParameterSchema;
  public readonly retryable: boolean;
  private readonly func: ToolFunction<TParameters, TReturn>;

  constructor(func: ToolFunction<TParameters, TReturn>, options: ToolOptions) {
    this.name = options.name;
    this.description = options.description;
    this.parameters = options.parameters ?? {};
    this.returns = options.returns ?? z.unknown();
    this.retryable = options.retryable ?? true;
    this.func = func;
  }

  async execute(
    params: TParameters,
    context: ToolContext
  ): Promise<ToolResult<TReturn>> {
    try {
      const validatedParams = await this.validateParameters(params);
      const result = await this.func(validatedParams, context);
      return result;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof SDKError
            ? error
            : createSDKError(`Tool execution failed: ${String(error)}`, {
                code: ERROR_CODES.TOOL_EXECUTION_FAILED,
                toolName: this.name,
                retryable: this.retryable,
                context: { params },
              }),
      };
    }
  }

  private async validateParameters(params: unknown): Promise<TParameters> {
    const schema = this.createParameterSchema();
    const result = await schema.safeParseAsync(params);

    if (!result.success) {
      const errorMessages = result.error.issues
        .map((e: { message: string }) => e.message)
        .join(", ");
      throw createSDKError(`Invalid parameters: ${errorMessages}`, {
        code: ERROR_CODES.TOOL_VALIDATION_FAILED,
        toolName: this.name,
        retryable: false,
        context: { errors: result.error.issues, params },
      });
    }

    return result.data;
  }

  private createParameterSchema(): z.ZodType<TParameters> {
    const shape: Record<string, z.ZodType> = {};

    for (const [key, schema] of Object.entries(this.parameters)) {
      shape[key] = schema as z.ZodType;
    }

    return z.object(shape) as z.ZodType<TParameters>;
  }
}

export function createTool<
  TParameters extends Record<string, unknown>,
  TReturn,
>(
  func: ToolFunction<TParameters, TReturn>,
  options: ToolOptions
): Tool<TParameters, TReturn> {
  return new Tool(func, options);
}

export class ToolRegistry {
  private readonly tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw createSDKError(`Tool already registered: ${tool.name}`, {
        code: ERROR_CODES.TOOL_NOT_FOUND,
        toolName: tool.name,
        retryable: false,
      });
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  clear(): void {
    this.tools.clear();
  }
}
