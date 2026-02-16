---
name: analyze-codebase
description: Codebase analysis using the atomicviz MCP tools. Use when asked to find architectural issues, placeholder or dead code, map function calls/dependencies, trace change impact, detect naming conflicts, or summarize structure across a repo.
---

# Analyze Codebase

## Overview

Use the atomicviz MCP server to analyze a codebase for issues, dependency structure, and function-call flow. This skill focuses on concrete, tool-backed findings and visualizable graphs.

## Example Prompts

- What is not hooked up right in the codebase?
- Is there placeholder code somewhere?
- Analyze the codebase and map out function calls.
- Trace the impact of changing `FooService` in `src/foo.ts`.
- Map all database usage and find naming conflicts.

## Quick Start

1. Ask for scope if unclear (repo root or specific folders/files).
2. Run issue detection and structure scans:
   - `detect_issues` on the target path.
   - `analyze_dependencies` or `show_architecture` for structure.
3. For call flow:
   - `visualize_function_calls` for a file/function.
   - `trace_impact` for change ripple.
4. For deeper audits:
   - `comprehensive_file_map`, `find_naming_conflicts`, `map_database_usage`.

## Tool Selection Guide

**Issues / placeholders / dead code**
- Use `detect_issues` with `issueTypes: ['unused','dead-code','complexity','coupling']`.
- Follow with `comprehensive_file_map` when you need global context.

**Function calls / control flow**
- Use `visualize_function_calls` for a file or function.
- Use `trace_impact` to see all affected call sites.

**Architecture / dependencies**
- Use `analyze_dependencies` for module relationships.
- Use `show_architecture` or `simplify_graph` for a high-level view.

**Data + database usage**
- Use `map_database_usage` to map table/column usage.

**Naming + structure consistency**
- Use `find_naming_conflicts` and `compare_structures` (before/after).

**Large repos**
- Use `analyze_large_project` to chunk analysis.

## Output Expectations

- Provide a short findings list with file paths and why they matter.
- When graphs are produced, summarize the key nodes/edges and risk areas.
- If you used multiple tools, explain how results corroborate each other.

## Notes

- Many tools require absolute paths; normalize inputs.
- Keep scopes narrow for faster, clearer results.
