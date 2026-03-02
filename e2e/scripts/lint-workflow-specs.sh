#!/usr/bin/env bash
# lint-workflow-specs.sh
#
# CI lint check: prevents silent-skip anti-patterns in workflow specs.
#
# Expected output when specs are clean:
#   ✅ All workflow specs pass lint checks
#
# Expected output when specs use isVisible().catch(() => false):
#   ERROR: Workflow specs must not use isVisible().catch(() => false) — use hard assertions instead
#   (exit 1)
#
# Expected output when a spec has zero assertions:
#   ERROR: e2e/workflows/foo.workflow.spec.ts has no assertions (expect(), assertVisible, or assertExists)
#   (exit 1)
#
# Usage:
#   bash e2e/scripts/lint-workflow-specs.sh
#   pnpm e2e:lint

set -euo pipefail

SPEC_GLOB="e2e/workflows/*.workflow.spec.ts"

# ── Check 1: Silent-skip anti-pattern ────────────────────────────────────────
# isVisible().catch(() => false) silently swallows element-not-found failures,
# turning hard test failures into silent skips. Use hard assertions instead.
if grep -rn "isVisible.*catch.*false\|isVisible()\.catch" $SPEC_GLOB 2>/dev/null; then
  echo ""
  echo "ERROR: Workflow specs must not use isVisible().catch(() => false) — use hard assertions instead"
  exit 1
fi

# ── Check 2: Zero-assertion specs ────────────────────────────────────────────
# Every workflow spec must contain at least one real assertion call site.
# We exclude import lines and comments to avoid false negatives where a file
# only imports assertVisible but never calls it.
for f in $SPEC_GLOB; do
  # Strip import lines and comment lines, then check for assertion call sites
  if ! grep -vE "^\s*(import |//|\*)" "$f" | grep -qE "expect\(|assertVisible\(|assertExists\("; then
    echo "ERROR: $f has no assertion call sites (expect(), assertVisible(), or assertExists())"
    exit 1
  fi
done

echo "✅ All workflow specs pass lint checks"
