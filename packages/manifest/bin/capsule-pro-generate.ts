#!/usr/bin/env node

/**
 * Capsule-Pro Route Generator CLI
 *
 * Generates Next.js App Router route handlers for Manifest entities.
 *
 * Usage:
 *   capsule-pro-generate <entity> <input.manifest> --output <file>
 *
 * Example:
 *   capsule-pro-generate Recipe recipe-rules.manifest --output apps/app/app/api/kitchen/manifest/recipes/route.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileToIR,
  generateCapsuleProRouteHandler,
  type RouteOperation,
} from "@repo/manifest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CliArgs {
  entityName: string;
  inputFile: string;
  outputFile: string;
  operations: string[];
}

function printUsage() {
  console.error(
    "Usage: capsule-pro-generate <entity> <input.manifest> --output <file> [--ops <operations>]"
  );
  console.error("");
  console.error("Arguments:");
  console.error("  <entity>           Entity name (e.g., Recipe, Dish, Menu)");
  console.error("  <input.manifest>   Path to the .manifest file");
  console.error("  --output <file>    Output route.ts file path");
  console.error(
    "  --ops <operations> Comma-separated operations (default: list)"
  );
  console.error("");
  console.error("Operations:");
  console.error("  list    - GET /api/kitchen/manifest/:entity (list all)");
  console.error("  get     - GET /api/kitchen/manifest/:entity/:id (get one)");
  console.error("  create  - POST /api/kitchen/manifest/:entity (create)");
  console.error("  update  - PUT /api/kitchen/manifest/:entity/:id (update)");
  console.error(
    "  delete  - DELETE /api/kitchen/manifest/:entity/:id (delete)"
  );
  console.error("");
  console.error("Example:");
  console.error(
    "  capsule-pro-generate Recipe recipe-rules.manifest --output apps/app/app/api/kitchen/manifest/recipes/route.ts"
  );
  console.error(
    "  capsule-pro-generate Recipe recipe-rules.manifest --output apps/app/app/api/kitchen/manifest/recipes/route.ts --ops list,get"
  );
}

function parseArgs(args: string[]): CliArgs {
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const entityName = args[0];
  const inputFile = args[1];
  let outputFile = "";
  const operations: string[] = ["list"];

  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--output" && i + 1 < args.length) {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === "--ops" && i + 1 < args.length) {
      operations.push(...args[i + 1].split(",").map((s) => s.trim()));
      i++;
    }
  }

  if (!outputFile) {
    console.error("Error: --output is required");
    console.error("");
    printUsage();
    process.exit(1);
  }

  return { entityName, inputFile, outputFile, operations };
}

function resolvePath(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  return resolve(process.cwd(), path);
}

function main() {
  const args = process.argv.slice(2);
  const { entityName, inputFile, outputFile, operations } = parseArgs(args);

  const inputPath = resolvePath(inputFile);
  const outputPath = resolvePath(outputFile);

  // Check if input file exists
  if (!existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.error("Capsule-Pro Route Generator");
  console.error("==========================");
  console.error(`Entity: ${entityName}`);
  console.error(`Input: ${inputPath}`);
  console.error(`Output: ${outputPath}`);
  console.error(`Operations: ${operations.join(", ")}`);
  console.error("");

  try {
    // Read the manifest file
    const manifest = readFileSync(inputPath, "utf-8");

    // Compile to IR
    console.error("Compiling manifest to IR...");
    const result = compileToIR(manifest);

    if (result.diagnostics && result.diagnostics.length > 0) {
      console.error("");
      console.error("Diagnostics:");
      for (const diag of result.diagnostics) {
        console.error(`  ${diag.level}: ${diag.message}`);
      }
    }

    if (!result.ir) {
      console.error("");
      console.error("Error: Failed to compile manifest to IR");
      process.exit(1);
    }

    // Generate route handler
    console.error("Generating route handler...");

    const routeOperations = operations.map((op) => {
      const methodMap: Record<string, "GET" | "POST" | "PUT" | "DELETE"> = {
        list: "GET",
        get: "GET",
        create: "POST",
        update: "PUT",
        delete: "DELETE",
      };
      return {
        method: methodMap[op] || "GET",
        path: `/${entityName.toLowerCase()}s`,
        operation: op as RouteOperation["operation"],
      };
    });

    const code = generateCapsuleProRouteHandler(result.ir, {
      entityName,
      operations: routeOperations,
      sourceManifest: inputPath,
    });

    // Create output directory
    const outputDir = dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });

    // Write generated file
    writeFileSync(outputPath, code, "utf-8");

    console.error("");
    console.error(`Generated: ${outputPath}`);
    console.error("");
    console.error("Done!");
  } catch (error) {
    if (error instanceof Error) {
      console.error("");
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error("");
      console.error("Unknown error occurred");
    }
    process.exit(1);
  }
}

main();
