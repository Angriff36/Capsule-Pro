# Claude Code Generation Instructions

## Automatic Linting & Formatting (MANDATORY)

**Every single file I create or edit MUST pass linting before delivery.**

### Process for EVERY file change:

1. **Create or edit the file** as needed
2. **Run linting check:**
   ```bash
   pnpm dlx ultracite check [filename]
   ```
3. **If errors found,** auto-fix them:
   ```bash
   pnpm dlx ultracite fix [filename]
   ```
4. **Verify the fix** by running check again:
   ```bash
   pnpm dlx ultracite check [filename]
   ```
5. **Only deliver** the code once `pnpm dlx ultracite check` returns with zero errors.

### Apply to ALL file types:
- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx)
- JSON (.json)
- Tests (.spec.ts, .test.ts)
- Any code file

### Examples:

**Creating a new test file:**
```bash
# 1. Create file content
# 2. Run check
pnpm dlx ultracite check e2e/new-test.spec.ts
# 3. If it fails, auto-fix
pnpm dlx ultracite fix e2e/new-test.spec.ts
# 4. Verify it passes
pnpm dlx ultracite check e2e/new-test.spec.ts
# 5. Deliver code
```

**Editing existing code:**
```bash
# After making changes to src/file.ts:
pnpm dlx ultracite check src/file.ts
# If errors, fix them:
pnpm dlx ultracite fix src/file.ts
# Verify:
pnpm dlx ultracite check src/file.ts
```

### Never skip this step. This is non-negotiable.

The goal is to gradually eliminate all code quality issues in the codebase by consistently enforcing standards on every interaction.
