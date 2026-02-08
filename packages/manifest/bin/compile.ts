#!/usr/bin/env node

/**
 * Manifest Compiler CLI
 *
 * Compiles .manifest files to TypeScript code.
 *
 * Usage:
 *   manifest-compile <input.manifest> --output <directory>
 *
 * Example:
 *   manifest-compile recipe-rules.manifest --output ./generated
 *
 * Generates three files:
 *   - <output>/runtime.ts - Runtime code with entities and stores
 *   - <output>/server.ts - Server code with API routes
 *   - <output>/test.ts - Test code for the manifest
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CodeGenerator } from "@repo/manifest/generator";
import { Parser } from "@repo/manifest/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function printUsage() {
  console.error(
    "Usage: manifest-compile <input.manifest> --output <directory>"
  );
  console.error("");
  console.error("Arguments:");
  console.error("  <input.manifest>    Path to the .manifest file to compile");
  console.error(
    "  --output <dir>     Output directory for generated files (default: ./generated)"
  );
  console.error("");
  console.error("Example:");
  console.error(
    "  manifest-compile recipe-rules.manifest --output ./generated"
  );
}

function parseArgs(args: string[]): { input: string; output: string } {
  if (args.length < 1) {
    printUsage();
    process.exit(1);
  }

  const input = args[0];
  let output = "./generated";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--output" && i + 1 < args.length) {
      output = args[i + 1];
      i++;
    }
  }

  return { input, output };
}

function resolvePath(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  return resolve(process.cwd(), path);
}

function main() {
  const args = process.argv.slice(2);
  const { input: inputArg, output: outputArg } = parseArgs(args);

  const inputPath = resolvePath(inputArg);
  const outputPath = resolvePath(outputArg);

  // Check if input file exists
  if (!existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.error(`Compiling: ${inputPath}`);

  try {
    // Read the manifest file
    const manifest = readFileSync(inputPath, "utf-8");

    // Compile to IR
    console.error("Parsing manifest...");
    const parser = new Parser();
    const { program, errors } = parser.parse(manifest);

    if (errors.length > 0) {
      console.error("");
      console.error("Parse errors:");
      for (const error of errors) {
        console.error(`  ${error.message}`);
      }
      process.exit(1);
    }

    // Generate code
    console.error("Generating code...");
    const generator = new CodeGenerator();
    const { code, serverCode, testCode } = generator.generate(program);

    // Create output directory
    mkdirSync(outputPath, { recursive: true });

    // Write generated files
    const runtimePath = `${outputPath}/runtime.ts`;
    const serverPath = `${outputPath}/server.ts`;
    const testPath = `${outputPath}/test.ts`;

    writeFileSync(runtimePath, code, "utf-8");
    writeFileSync(serverPath, serverCode, "utf-8");
    writeFileSync(testPath, testCode, "utf-8");

    console.error("");
    console.error("Generated files:");
    console.error(`  ${runtimePath}`);
    console.error(`  ${serverPath}`);
    console.error(`  ${testPath}`);
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
