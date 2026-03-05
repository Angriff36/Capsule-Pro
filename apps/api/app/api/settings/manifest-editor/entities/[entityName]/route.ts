/**
 * Get detailed information about a specific entity from the Manifest IR.
 * Returns all commands, guards, constraints, and policies for visual editing.
 */

import type { IR } from "@angriff36/manifest";
import { type NextRequest, NextResponse } from "next/server";

// Load the compiled IR from manifest-ir package
const getIR = (): IR => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const kitchenIR = require("@repo/manifest-ir/ir/kitchen/kitchen.ir.json");
  return kitchenIR as IR;
};

export interface EntityDetail {
  name: string;
  displayName: string;
  properties: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: unknown;
  }>;
  computed: Array<{
    name: string;
    type: string;
    expression: string;
  }>;
  constraints: ConstraintDetail[];
  commands: CommandDetail[];
  policies: PolicyDetail[];
}

export interface ConstraintDetail {
  name: string;
  code: string;
  severity: "block" | "warn" | "info";
  message: string;
  expression: string;
  level: "entity" | "command";
  commandName?: string;
  details?: string;
}

export interface GuardDetail {
  index: number;
  expression: string;
  message?: string;
}

export interface CommandDetail {
  name: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
  guards: GuardDetail[];
  constraints: ConstraintDetail[];
  mutations: Array<{
    property: string;
    expression: string;
  }>;
  emittedEvents: string[];
}

export interface PolicyDetail {
  name: string;
  type: "execute" | "read" | "create" | "update" | "delete";
  targetCommands: string[];
  expression: string;
  message: string;
}

function expressionToString(expr: unknown): string {
  if (typeof expr === "string") return expr;
  if (expr && typeof expr === "object" && "kind" in expr) {
    // It's an IRExpression - format it
    return JSON.stringify(expr);
  }
  return String(expr ?? "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityName: string }> }
) {
  try {
    const { entityName } = await params;
    const ir = getIR();

    const entity = ir.entities.find((e) => e.name === entityName);
    if (!entity) {
      return NextResponse.json(
        { error: `Entity "${entityName}" not found` },
        { status: 404 }
      );
    }

    // Build properties
    const properties = entity.properties.map((prop) => ({
      name: prop.name,
      type: prop.type.name,
      required: prop.modifiers.includes("required"),
      default: prop.defaultValue,
    }));

    // Build computed properties
    const computed = entity.computedProperties.map((comp) => ({
      name: comp.name,
      type: comp.type.name,
      expression: expressionToString(comp.expression),
    }));

    // Build entity-level constraints
    const constraints: ConstraintDetail[] = entity.constraints.map(
      (constraint) => ({
        name: constraint.name,
        code: constraint.code,
        severity: (constraint.severity === "warn" ? "warn" : "block") as
          | "block"
          | "warn",
        message: constraint.message || constraint.messageTemplate || "",
        expression: expressionToString(constraint.expression),
        level: "entity" as const,
        details: constraint.detailsMapping
          ? JSON.stringify(constraint.detailsMapping)
          : undefined,
      })
    );

    // Build commands with their guards and constraints
    const commands: CommandDetail[] = entity.commands.map((cmdRef) => {
      const command = ir.commands.find((c) => c.name === cmdRef);
      if (!command) {
        return {
          name: cmdRef,
          parameters: [],
          guards: [],
          constraints: [],
          mutations: [],
          emittedEvents: [],
        };
      }

      // Build guards
      const guards: GuardDetail[] = command.guards.map((guard, index) => ({
        index,
        expression: expressionToString(guard),
        message: "",
      }));

      // Build command-level constraints
      const cmdConstraints: ConstraintDetail[] = (
        command.constraints || []
      ).map((constraint) => ({
        name: constraint.name,
        code: constraint.code,
        severity: (constraint.severity === "warn" ? "warn" : "block") as
          | "block"
          | "warn",
        message: constraint.message || constraint.messageTemplate || "",
        expression: expressionToString(constraint.expression),
        level: "command" as const,
        commandName: command.name,
        details: constraint.detailsMapping
          ? JSON.stringify(constraint.detailsMapping)
          : undefined,
      }));

      // Build mutations from actions
      const mutations = command.actions
        .filter((action) => action.kind === "mutate")
        .map((action) => ({
          property: action.target || "",
          expression: expressionToString(action.expression),
        }));

      return {
        name: command.name,
        parameters: command.parameters.map((param) => ({
          name: param.name,
          type: param.type.name,
        })),
        guards,
        constraints: cmdConstraints,
        mutations,
        emittedEvents: command.emits,
      };
    });

    // Build policies
    const policies: PolicyDetail[] = ir.policies
      .filter((policy) => policy.entity === entityName || !policy.entity)
      .map((policy) => ({
        name: policy.name,
        type: (policy.action === "execute"
          ? "execute"
          : policy.action === "read"
            ? "read"
            : policy.action === "write"
              ? "update"
              : "execute") as
          | "execute"
          | "read"
          | "create"
          | "update"
          | "delete",
        targetCommands: [],
        expression: expressionToString(policy.expression),
        message: policy.message || "",
      }));

    const detail: EntityDetail = {
      name: entityName,
      displayName: entityName,
      properties,
      computed,
      constraints,
      commands,
      policies,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Failed to load entity detail:", error);
    return NextResponse.json(
      { error: "Failed to load entity detail" },
      { status: 500 }
    );
  }
}
