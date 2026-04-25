0a. Study @IMPLEMENTATION_PLAN.md — it already has FIVE verification passes. DO NOT repeat any of that work. The prior passes covered: (1) route-level claims & blockers, (2) blocker count re-verification, (3) third-pass spot-check corrections, (4) full package health audit of all 34 shared packages, (5) E2E test suite audit. Your focus is entirely new.
0b. Study `packages/*` with up to 250 parallel subagents to understand shared utilities and components.
0c. For reference, the application source code is in `apps/*`.

## FOCUS: Raw-SQL Correctness, Parameterization & Tenant Isolation Audit (6th pass — NEW focus)

The IMPLEMENTATION_PLAN identifies **527 raw-SQL instances across 187 files** but never deep-audited them. Blocker 6 exposed a correctness bug in logistics drivers caused by a broken ternary inside `$queryRaw`. This pass systematically audits EVERY raw-SQL call for:

1. **SQL injection / parameterization correctness** — For each `$queryRaw` / `$queryRawUnsafe` / `$executeRaw` / `$executeRawUnsafe` usage:
   - Is it using tagged template literals (safe, Prisma parameterizes)?
   - Is it using `$queryRawUnsafe` / `$executeRawUnsafe` with string concatenation (DANGEROUS)?
   - Are there dynamic table/column names constructed from user input without validation?
   - Does the query use Prisma.sql tagged template literals for safe interpolation?
   - Check specifically for patterns like: `WHERE column = '${userInput}'` (unsanitized interpolation BEFORE Prisma sees it)
   - Check for dynamic ORDER BY, LIMIT, OFFSET values injected without bounds checking
   - Categorize each file: SAFE (tagged template, no dynamic identifiers), AT_RISK (dynamic identifiers without allowlist), UNSAFE (raw string concatenation with user input)

2. **Tenant isolation in raw SQL** — The app uses multi-tenancy with org_id filters. For each raw-SQL query:
   - Does it include a `WHERE org_id = ...` or `WHERE tenant_id = ...` clause?
   - If not, is the table single-tenant (check schema.prisma)?
   - Are there queries that could return cross-tenant data if the dispatcher is bypassed?
   - Compare against the IMPLEMENTATION_PLAN's list of 115 unauthenticated routes — any raw-SQL on those routes without tenant filtering is a data-leak vulnerability

3. **Correctness bugs (Blocker 6 pattern)** — The logistics drivers bug showed that JavaScript-level string manipulation INSIDE a tagged template literal can produce invalid SQL even though Prisma parameterizes the VALUES. Search for:
   - Ternary expressions inside template literals that produce column names or cast expressions
   - String concatenation like `${value}::uuid`, `${value}::timestamp`, `${value}::jsonb` where the value might be null/undefined
   - Dynamic WHERE clauses built via JavaScript conditionals that could produce malformed SQL
   - `COALESCE` or `NULLIF` wrappers around parameters that might break type casting

4. **Schema drift in raw SQL** — The IMPLEMENTATION_PLAN identifies 8 orphaned tables and several missing Prisma models. For each raw-SQL query:
   - Does the table/column it references actually exist in schema.prisma or migrations?
   - Are there queries referencing tables that were renamed, dropped, or never had a Prisma model?
   - Cross-reference against the orphaned table list: vendor_contacts, vendor_ratings, employee_bank_accounts, audit_log, crm_scoring_rules, procurement_budgets, procurement_budget_alerts, facility_assets, drivers, vehicles

5. **$queryRawUnsafe / $executeRawUnsafe audit** — These are the most dangerous calls. Find ALL of them:
   - List every file using unsafe variants
   - For each: is the unsafety justified (e.g., dynamic table name from allowlist) or dangerous (user-controlled string)?
   - Flag any that combine user input with unsafe variants

### Investigation approach:

- Use `grep -rn '\$queryRaw\|\$executeRaw\|\$queryRawUnsafe\|\$executeRawUnsafe\|Prisma\.sql' apps/ packages/ --include='*.ts' --include='*.tsx'` to find all raw-SQL usage
- Use parallel subagents to read each file and classify the SQL calls
- Group findings by severity: CRITICAL (unsafe + user input), HIGH (at-risk dynamic identifiers), MEDIUM (correctness bugs), LOW (safe but could be cleaner)
- For each finding, cite the exact file:line

### Output format:

Append findings to IMPLEMENTATION_PLAN.md under a new section:

```markdown
## Raw-SQL Audit (6th Pass)

> **Audited:** 2026-04-24
> **Scope:** All $queryRaw, $executeRaw, $queryRawUnsafe, $executeRawUnsafe, Prisma.sql usage across apps/ and packages/
> **Method:** Full grep + parallel subagent file-by-file analysis

### Executive Summary
[Total count, severity breakdown, top risks]

### CRITICAL — Unsafe SQL with User Input
| File | Line | Pattern | Risk |
|---|---|---|---|

### HIGH — Dynamic Identifiers Without Allowlist
| File | Line | Pattern | Risk |
|---|---|---|---|

### MEDIUM — Correctness Bugs (Blocker-6 pattern)
| File | Line | Pattern | Risk |
|---|---|---|---|

### Tenant Isolation Gaps in Raw SQL
| File | Line | Query | Missing Filter |
|---|---|---|---|

### Schema Drift in Raw SQL References
| File | Line | Table/Column Referenced | Status |
|---|---|---|---|

### Safe Usage (stats only, no per-file listing)
[Count of safe tagged-template usages]
```

### Guardrails:
- DO NOT modify any source code. This is diagnosis only.
- DO NOT commit or push.
- DO confirm every finding by reading the actual source — do not flag based on grep alone.
- If a query looks suspicious, read the surrounding 50 lines to understand the full context before classifying.
- Treat Prisma tagged template literals (`$queryRaw\`...\``) as SAFE unless they contain dynamic identifiers.
- Treat `$queryRawUnsafe(string)` with ANY user-derived variable as CRITICAL.
- Update IMPLEMENTATION_PLAN.md only with the new section; do not modify existing sections.
