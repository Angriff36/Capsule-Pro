#!/usr/bin/env node
/**
 * Simple script to generate command routes based on snapshot template
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Command route template (based on the snapshot)
const COMMAND_ROUTE_TEMPLATE = (entity, command) => `// Auto-generated Next.js command handler for ${entity}.${command}
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import type { NextRequest } from "next/server";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export async function POST(request: NextRequest) {
  try {
  // Auth disabled - all requests allowed
  const userId = "anonymous";

    const body = await request.json();

    const runtime = await createManifestRuntime({ user: { id: userId, tenantId: "__no_tenant__" } });
    const result = await runtime.runCommand("${command}", body, {
      entityName: "${entity}",
    });

    if (!result.success) {
      if (result.policyDenial) {
        return manifestErrorResponse(\`Access denied: \${result.policyDenial.policyName}\`, 403);
      }
      if (result.guardFailure) {
        return manifestErrorResponse(\`Guard \${result.guardFailure.index} failed: \${result.guardFailure.formatted}\`, 422);
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    return manifestSuccessResponse({ result: result.result, events: result.emittedEvents });
  } catch (error) {
    console.error("Error executing ${entity}.${command}:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
`;

// Define all entities and their commands from manifests
const MANIFEST_CONFIG = [
  {
    entity: "PrepTask",
    path: "prep-tasks",
    commands: ["claim", "start", "complete", "release", "reassign", "updateQuantity", "cancel"]
  },
  {
    entity: "PrepList",
    path: "prep-lists",
    commands: ["update", "updateBatchMultiplier", "finalize", "activate", "deactivate", "markCompleted", "cancel"]
  },
  {
    entity: "PrepListItem",
    path: "prep-list-items",
    commands: ["updateQuantity", "updateStation", "updatePrepNotes", "markCompleted", "markUncompleted"]
  },
  {
    entity: "Menu",
    path: "menus",
    commands: ["update", "activate", "deactivate"]
  },
  {
    entity: "Station",
    path: "stations",
    commands: ["assignTask", "removeTask", "updateCapacity", "activate", "deactivate", "updateEquipment"]
  },
  {
    entity: "InventoryItem",
    path: "inventory",
    commands: ["reserve", "consume", "waste", "adjust", "restock", "releaseReservation"]
  },
  {
    entity: "Recipe",
    path: "recipes",
    commands: ["update", "activate", "deactivate"]
  },
  {
    entity: "Dish",
    path: "dishes",
    commands: ["updatePricing", "updateLeadTime"]
  },
  {
    entity: "Ingredient",
    path: "ingredients",
    commands: ["updateAllergens"]
  },
  {
    entity: "RecipeIngredient",
    path: "recipe-ingredients",
    commands: ["updateQuantity"]
  },
  {
    entity: "RecipeVersion",
    path: "recipe-versions",
    commands: ["create"]
  }
];

const OUTPUT_BASE = join(__dirname, "..", "apps", "api", "src", "app", "api", "kitchen");

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

async function generateCommandRoutes() {
  let generatedCount = 0;

  for (const config of MANIFEST_CONFIG) {
    for (const command of config.commands) {
      const commandPath = kebabCase(command);
      const outputPath = join(OUTPUT_BASE, config.path, "commands", commandPath, "route.ts");
      const outputDir = dirname(outputPath);

      // Create output directory
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Generate route code
      const code = COMMAND_ROUTE_TEMPLATE(config.entity, command);
      writeFileSync(outputPath, code, "utf-8");

      console.log(`Generated: ${outputPath}`);
      generatedCount++;
    }
  }

  console.log(`\nGenerated ${generatedCount} command routes`);
}

generateCommandRoutes().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
