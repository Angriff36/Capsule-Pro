/**
 * List all entities from the Manifest IR for the policy editor.
 * Returns entity names with their associated commands, guards, constraints, and policies.
 */

import type { IR } from "@angriff36/manifest";
import { NextResponse } from "next/server";

// Load the compiled IR from manifest-ir package
const getIR = (): IR => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const kitchenIR = require("@repo/manifest-ir/ir/kitchen/kitchen.ir.json");
  return kitchenIR as IR;
};

export interface EntityListItem {
  name: string;
  displayName: string;
  commands: string[];
  constraints: string[];
  policies: string[];
  properties: Array<{ name: string; type: string; required: boolean }>;
}

export async function GET() {
  try {
    const ir = getIR();
    const entities: EntityListItem[] = [];

    // Create a lookup for commands to find entity-specific ones
    const entityCommands = new Map<string, string[]>();
    for (const entity of ir.entities) {
      entityCommands.set(
        entity.name,
        entity.commands.map((cmdRef) => {
          // Commands are stored as references - find the actual command
          const cmd = ir.commands.find((c) => c.name === cmdRef);
          return cmd?.name || cmdRef;
        })
      );
    }

    for (const entity of ir.entities) {
      const commands = entityCommands.get(entity.name) || [];
      const entityConstraints = entity.constraints.map((c) => c.name);

      // Add command-level constraints
      const commandConstraints: string[] = [];
      for (const cmdRef of entity.commands) {
        const command = ir.commands.find((c) => c.name === cmdRef);
        if (command?.constraints) {
          commandConstraints.push(...command.constraints.map((c) => c.name));
        }
      }

      const properties = entity.properties.map((prop) => ({
        name: prop.name,
        type: prop.type.name,
        required: prop.modifiers.includes("required"),
      }));

      entities.push({
        name: entity.name,
        displayName: entity.name,
        commands,
        constraints: [...entityConstraints, ...commandConstraints],
        policies: entity.policies,
        properties,
      });
    }

    return NextResponse.json({ entities });
  } catch (error) {
    console.error("Failed to load IR:", error);
    return NextResponse.json(
      { error: "Failed to load manifest IR" },
      { status: 500 }
    );
  }
}
