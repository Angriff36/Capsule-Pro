---
name: docs-vs-implementation
description: Compare documentation claims to actual code behavior and update docs. Use when asked to verify guardrails, architecture, security/auth docs, or any internal documentation against real implementation; also use when asked to find mismatches or produce a side-by-side comparison with labeled real-world examples.
---

# Docs vs Implementation Comparison

## Workflow

1. Identify the target docs to compare (usually in `guardrails-and-roadmap`).
2. Extract concrete claims from docs (behavior statements, flow descriptions, security notes).
3. Locate the implementation:
   - Prefer file paths referenced in the doc.
   - If paths are missing, use `rg` to find the relevant code.
4. Verify the implementation and record the exact file path(s).
5. Present a comparison with explicit labels:
   - "Docs claim"
   - "Implementation"
6. Provide a real-world example for each entry, and explicitly label it as:
   - "Real-world example (Docs claim)"
   - "Real-world example (Implementation)"
7. Update docs to match implementation if requested:
   - Use full Windows file paths in doc references.
   - Keep wording precise and avoid ambiguous claims.

## Commands (PowerShell)

- Find doc references:
  - `rg -n "File:|Implementation|middleware|tenant|auth" C:\Projects\Capsule\guardrails-and-roadmap`
- Locate implementation:
  - `rg -n "signInWithPassword|createUser|tenant_id|middleware" C:\Projects\Capsule`
- Read files with parentheses in the path:
  - `Get-Content -LiteralPath "C:\Projects\Capsule\apps\web\app\(auth)\login\page.tsx"`

## Output Format (Use This)

For each item:

- **Topic**
  - Docs claim: ...
    - Real-world example (Docs claim): ...
  - Implementation: ...
    - Real-world example (Implementation): ...

## Update Guidance

- When editing markdown docs, use full file paths (Windows-style) for references.
- If docs are less secure or less accurate than implementation, update docs to reflect the safer behavior.
- Do not add new architecture files; update existing docs only.
