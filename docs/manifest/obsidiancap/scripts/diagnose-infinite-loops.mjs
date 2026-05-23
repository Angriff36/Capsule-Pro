#!/usr/bin/env node
/**
 * Diagnose React Infinite Loop Issues
 *
 * Scans all TSX files for useEffect hooks that have potential infinite loop patterns:
 * 1. State variable in deps + setState called inside effect
 * 2. Object/array deps that create new references on every render
 * 3. Missing deps that could cause stale closures
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT_DIR = process.cwd();
const APPS_DIR = join(ROOT_DIR, "apps");

const COLORS = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

const issues = [];
let filesScanned = 0;
let effectsFound = 0;

/**
 * Recursively find all .tsx files
 */
function findTsxFiles(dir) {
  const files = [];

  // Skip these directories
  const skipDirs = ["node_modules", ".next", "dist", "build", ".git"];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Skip hidden files and skipDirs
      if (entry.startsWith(".") || skipDirs.includes(entry)) {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...findTsxFiles(fullPath));
        } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
          // Skip test files and type definitions
          if (
            !(
              entry.includes(".test.") ||
              entry.includes(".spec.") ||
              entry.endsWith(".d.ts")
            )
          ) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip files we can't access
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Parse useEffect hooks from code
 */
function parseUseEffects(code, filePath) {
  const effects = [];

  // Match useEffect patterns - handles multi-line
  // Pattern: useEffect(() => { ... }, [deps])
  const useEffectRegex =
    /useEffect\s*\(\s*(?:async\s*)?\(\s*(?:\([^)]*\)|[^)]*)\)?\s*=>\s*\{([^]*?)\n\s*\},\s*\[([^\]]*)\]/g;

  let match;
  while ((match = useEffectRegex.exec(code)) !== null) {
    const effectBody = match[1];
    const depsStr = match[2];

    // Extract state setters from effect body
    const setStateMatches = effectBody.matchAll(/set([A-Z][a-zA-Z]*)\s*\(/g);
    const stateSetters = [...setStateMatches].map(
      (m) => m[1].charAt(0).toLowerCase() + m[1].slice(1)
    );

    // Extract dependencies
    const deps = depsStr
      .split(",")
      .map((d) => d.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""))
      .filter((d) => d.length > 0);

    // Find line number
    const beforeMatch = code.substring(0, match.index);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

    effects.push({
      body: effectBody,
      deps,
      stateSetters: [...new Set(stateSetters)],
      lineNumber,
      rawMatch: match[0].substring(0, 200) + "...",
    });
  }

  return effects;
}

/**
 * Check for infinite loop patterns
 */
function checkInfiniteLoopPatterns(effect, filePath, code) {
  const warnings = [];

  const { body, deps, stateSetters, lineNumber } = effect;

  // Pattern 1: State variable in deps + setState called inside
  for (const setter of stateSetters) {
    // Check if the state variable (not setter) is in deps
    const stateVar = setter; // e.g., "connections" from "setConnections"

    if (deps.includes(stateVar)) {
      // Check if it's NOT using functional update pattern
      const functionalUpdatePattern = new RegExp(
        `set${setter.charAt(0).toUpperCase() + setter.slice(1)}\\s*\\(\\s*\\(?\\s*(prev|\\w+)\\s*\\)?\\s*=>`,
        "i"
      );
      const usesFunctionalUpdate = functionalUpdatePattern.test(body);

      if (usesFunctionalUpdate) {
        // Uses functional update but still has dep - not critical but worth noting
        warnings.push({
          severity: "WARNING",
          type: "UNNECESSARY_DEP",
          message: `'${stateVar}' in deps but functional update is used - dep may be unnecessary`,
          line: lineNumber,
          suggestion: `Consider removing '${stateVar}' from dependency array`,
        });
      } else {
        warnings.push({
          severity: "CRITICAL",
          type: "INFINITE_LOOP",
          message: `setState('${setter}') called inside useEffect with '${stateVar}' in dependencies (no functional update pattern)`,
          line: lineNumber,
          suggestion: `Use functional update: set${setter.charAt(0).toUpperCase() + setter.slice(1)}(prev => ...) or remove '${stateVar}' from deps`,
        });
      }
    }
  }

  // Pattern 2: Object/array literals in deps (new reference each render)
  const objectLiteralDeps = deps.filter((d) => {
    // Check if dep is an object spread or array in the actual code
    return d.includes("{") || d.includes("[") || d.includes("...");
  });

  if (objectLiteralDeps.length > 0) {
    warnings.push({
      severity: "WARNING",
      type: "OBJECT_IN_DEPS",
      message: `Object/array expressions in deps may cause infinite loops: ${objectLiteralDeps.join(", ")}`,
      line: lineNumber,
      suggestion: "Use useMemo or move object creation outside component",
    });
  }

  // Pattern 3: Functions in deps without useCallback
  const functionDeps = deps.filter((d) => {
    // Heuristic: function names typically start with 'handle' or 'on'
    return (
      d.startsWith("handle") || d.startsWith("on") || d.startsWith("fetch")
    );
  });

  if (functionDeps.length > 0) {
    // Check if these functions are defined with useCallback in the code
    for (const fn of functionDeps) {
      const useCallbackPattern = new RegExp(
        `useCallback\\s*\\([^)]*${fn}`,
        "s"
      );
      if (!useCallbackPattern.test(code)) {
        warnings.push({
          severity: "INFO",
          type: "FUNCTION_IN_DEPS",
          message: `Function '${fn}' in deps may cause re-renders if not wrapped in useCallback`,
          line: lineNumber,
          suggestion: `Wrap '${fn}' in useCallback or verify it's stable`,
        });
      }
    }
  }

  // Pattern 4: Empty deps but setState based on state
  if (deps.length === 0 && stateSetters.length > 0) {
    // Check if the setState uses state values without functional update
    for (const setter of stateSetters) {
      const stateVar = setter;
      const usesStateValue = new RegExp(`\\b${stateVar}\\b(?![^']*')`).test(
        body
      );
      const usesFunctionalUpdate = new RegExp(
        `set${setter.charAt(0).toUpperCase() + setter.slice(1)}\\s*\\(\\s*\\(?\\s*(prev|\\w+)\\s*\\)?\\s*=>`
      ).test(body);

      if (usesStateValue && !usesFunctionalUpdate) {
        warnings.push({
          severity: "WARNING",
          type: "STALE_CLOSURE",
          message: `Uses '${stateVar}' value in effect with empty deps - may have stale closure`,
          line: lineNumber,
          suggestion: `Add '${stateVar}' to deps or use functional update pattern`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Main diagnostic function
 */
function diagnose() {
  console.log(
    `\n${COLORS.bold}${COLORS.cyan}=== React Infinite Loop Diagnostic ===${COLORS.reset}\n`
  );

  // Find all TSX files
  const files = findTsxFiles(APPS_DIR);
  console.log(`Found ${files.length} files to scan...\n`);

  for (const filePath of files) {
    filesScanned++;

    try {
      const code = readFileSync(filePath, "utf-8");

      // Skip files without useEffect
      if (!code.includes("useEffect")) {
        continue;
      }

      const effects = parseUseEffects(code, filePath);
      effectsFound += effects.length;

      for (const effect of effects) {
        const warnings = checkInfiniteLoopPatterns(effect, filePath, code);

        if (warnings.length > 0) {
          const relPath = relative(ROOT_DIR, filePath);

          for (const warning of warnings) {
            issues.push({
              file: relPath,
              ...warning,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading ${filePath}: ${error.message}`);
    }
  }

  // Report results
  console.log(`${COLORS.bold}Scan Complete${COLORS.reset}`);
  console.log(`  Files scanned: ${filesScanned}`);
  console.log(`  useEffect hooks found: ${effectsFound}`);
  console.log(`  Potential issues: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log(
      `${COLORS.green}✓ No infinite loop patterns detected!${COLORS.reset}\n`
    );
    return;
  }

  // Group by severity
  const critical = issues.filter((i) => i.severity === "CRITICAL");
  const warnings = issues.filter((i) => i.severity === "WARNING");
  const info = issues.filter((i) => i.severity === "INFO");

  // Print critical issues first
  if (critical.length > 0) {
    console.log(
      `${COLORS.bold}${COLORS.red}=== CRITICAL ISSUES (${critical.length}) ===${COLORS.reset}\n`
    );

    for (const issue of critical) {
      console.log(
        `${COLORS.red}●${COLORS.reset} ${COLORS.bold}${issue.file}:${issue.line}${COLORS.reset}`
      );
      console.log(`  ${issue.message}`);
      console.log(
        `  ${COLORS.cyan}Suggestion:${COLORS.reset} ${issue.suggestion}\n`
      );
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log(
      `${COLORS.bold}${COLORS.yellow}=== WARNINGS (${warnings.length}) ===${COLORS.reset}\n`
    );

    for (const issue of warnings) {
      console.log(
        `${COLORS.yellow}●${COLORS.reset} ${issue.file}:${issue.line}`
      );
      console.log(`  ${issue.message}`);
      console.log(
        `  ${COLORS.cyan}Suggestion:${COLORS.reset} ${issue.suggestion}\n`
      );
    }
  }

  // Print info (summary only)
  if (info.length > 0) {
    console.log(
      `${COLORS.bold}${COLORS.cyan}=== INFO (${info.length}) ===${COLORS.reset}`
    );
    console.log("  Run with --verbose to see all info messages\n");
  }

  // Print summary with most common issues
  console.log(`${COLORS.bold}=== SUMMARY ===${COLORS.reset}\n`);

  // Count issue types
  const issueTypes = {};
  for (const issue of issues) {
    issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
  }

  console.log("Issue breakdown:");
  for (const [type, count] of Object.entries(issueTypes).sort(
    (a, b) => b[1] - a[1]
  )) {
    const color =
      type === "INFINITE_LOOP"
        ? COLORS.red
        : type === "STALE_CLOSURE"
          ? COLORS.yellow
          : COLORS.cyan;
    console.log(`  ${color}${type}${COLORS.reset}: ${count}`);
  }

  // Print affected files
  const affectedFiles = [...new Set(issues.map((i) => i.file))];
  console.log(`\nAffected files (${affectedFiles.length}):`);
  for (const file of affectedFiles.slice(0, 10)) {
    console.log(`  - ${file}`);
  }
  if (affectedFiles.length > 10) {
    console.log(`  ... and ${affectedFiles.length - 10} more`);
  }

  // Exit with error code if critical issues found
  if (critical.length > 0) {
    console.log(
      `\n${COLORS.red}${COLORS.bold}✗ Found ${critical.length} critical infinite loop issues!${COLORS.reset}\n`
    );
    process.exit(1);
  } else {
    console.log(
      `\n${COLORS.green}${COLORS.bold}✓ No critical issues, but review warnings${COLORS.reset}\n`
    );
    process.exit(0);
  }
}

// Run diagnostic
diagnose();
