/**
 * Convert IR parameter types to Zod schemas.
 *
 * Used by plugins to generate input schemas for MCP tools
 * from the IR command parameter definitions.
 *
 * @packageDocumentation
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// IR type → Zod mapping
// ---------------------------------------------------------------------------

interface IRParameterType {
  name: string;
  nullable?: boolean;
}

interface IRParameter {
  name: string;
  type: IRParameterType;
  modifiers?: string[];
  defaultValue?: unknown;
}

/**
 * Convert a single IR type to a Zod schema.
 */
function irTypeToZod(type: IRParameterType): z.ZodType {
  let schema: z.ZodType;

  switch (type.name) {
    case "string":
      schema = z.string();
      break;
    case "number":
    case "integer":
    case "float":
    case "decimal":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "date":
    case "datetime":
      schema = z.string().describe("ISO 8601 date/datetime string");
      break;
    case "json":
    case "object":
      schema = z.record(z.string(), z.unknown());
      break;
    case "array":
      schema = z.array(z.unknown());
      break;
    default:
      // Unknown types fall back to string
      schema = z.string().describe(`IR type: ${type.name}`);
  }

  if (type.nullable) {
    schema = schema.nullable();
  }

  return schema;
}

/**
 * Convert an array of IR parameters to a Zod object schema.
 *
 * Required parameters (those with "required" modifier) are non-optional.
 * All others are optional.
 */
export function irParamsToZodSchema(
  params: IRParameter[]
): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {};

  for (const param of params) {
    const isRequired = param.modifiers?.includes("required") ?? false;
    const baseSchema = irTypeToZod(param.type);

    shape[param.name] = isRequired ? baseSchema : baseSchema.optional();
  }

  // biome-ignore lint/suspicious/noExplicitAny: Dynamic schema construction requires flexible typing
  return z.object(shape) as any;
}

/**
 * Get a human-readable description of an IR parameter's type.
 */
export function describeIrType(type: IRParameterType): string {
  const base = type.name;
  return type.nullable ? `${base} | null` : base;
}
