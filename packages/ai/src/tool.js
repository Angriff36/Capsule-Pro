import { z } from "zod";
import { ERROR_CODES, SDKError } from "./errors.js";
export class Tool {
  name;
  description;
  parameters;
  returns;
  retryable;
  func;
  constructor(func, options) {
    this.name = options.name;
    this.description = options.description;
    this.parameters = options.parameters ?? {};
    this.returns = options.returns ?? z.unknown();
    this.retryable = options.retryable ?? true;
    this.func = func;
  }
  async execute(params, context) {
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
            : new SDKError(`Tool execution failed: ${String(error)}`, {
                code: ERROR_CODES.TOOL_EXECUTION_FAILED,
                toolName: this.name,
                retryable: this.retryable,
                context: { params },
              }),
      };
    }
  }
  async validateParameters(params) {
    const schema = this.createParameterSchema();
    const result = await schema.safeParseAsync(params);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((e) => e.message)
        .join(", ");
      throw new SDKError(`Invalid parameters: ${errorMessages}`, {
        code: ERROR_CODES.TOOL_VALIDATION_FAILED,
        toolName: this.name,
        retryable: false,
        context: { errors: result.error.issues, params },
      });
    }
    return result.data;
  }
  createParameterSchema() {
    const shape = {};
    for (const [key, schema] of Object.entries(this.parameters)) {
      shape[key] = schema;
    }
    return z.object(shape);
  }
}
export function createTool(func, options) {
  return new Tool(func, options);
}
export class ToolRegistry {
  tools = new Map();
  register(tool) {
    if (this.tools.has(tool.name)) {
      throw new SDKError(`Tool already registered: ${tool.name}`, {
        code: ERROR_CODES.TOOL_NOT_FOUND,
        toolName: tool.name,
        retryable: false,
      });
    }
    this.tools.set(tool.name, tool);
  }
  unregister(name) {
    return this.tools.delete(name);
  }
  get(name) {
    return this.tools.get(name);
  }
  has(name) {
    return this.tools.has(name);
  }
  getAll() {
    return Array.from(this.tools.values());
  }
  clear() {
    this.tools.clear();
  }
}
