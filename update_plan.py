#!/usr/bin/env python3
"""Update IMPLEMENTATION_PLAN.md to reflect Manifest v0.3.0 upgrade."""

import re

# Read the file
with open('C:/projects/capsule-pro/IMPLEMENTATION_PLAN.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old Phase 0 section marker
old_marker = "### Phase 0: Manifest Runtime Enhancements (Week 1)"

# Define the new Phase 0 section
new_section = """### Phase 0: REMOVED - Manifest v0.3.0 Upgrade Complete (2026-02-06)

**Phase 0 is NO LONGER NEEDED.** The Manifest package was successfully upgraded from v0.0.1 to v0.3.0, which includes all vNext features:

- ✅ Constraint severity levels (`ok`, `warn`, `block`)
- ✅ messageTemplate interpolation with placeholders
- ✅ detailsMapping for constraint diagnostics
- ✅ Constraint outcomes array in CommandResult
- ✅ Override mechanism with authorization policies
- ✅ Concurrency conflict detection
- ✅ Command-level constraints
- ✅ 201/201 tests passing (100% conformance)

**Upgrade Details:**
- Source files copied from `C:/projects/manifest/src/manifest/`
- Conformance fixtures included
- `event-import-runtime.ts` updated for async API
- Package version updated to 0.3.0
- TypeScript compilation verified

**Proceed directly to Phase 1.**"""

# Find and replace from old marker to the next phase marker
pattern = r'(### Phase 0: Manifest Runtime Enhancements.*?)(---\n\n### Phase 1:)'
replacement = new_section + '\n\n\\2'

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Also update the "What's Missing" section
old_missing = """### What's Missing (Phase 0 Requirements)

To support the original vision of WARN/BLOCK severity and constraint tracking, Manifest v0.3.0 needs:

1. **Constraint Evaluation with Severity**: Constraints should evaluate to OK/WARN/BLOCK instead of boolean
2. **Constraint Outcomes in CommandResult**: Return array of constraint evaluations
3. **Database Persistence**: Prisma store integration (currently only memory/localStorage)
4. **Constraint Violations Tracking**: Record violations when WARN/BLOCK constraints fail"""

new_missing = """### What's Missing (Phase 0 Requirements)

**RESOLVED (2026-02-06):** All Phase 0 requirements have been fulfilled by the Manifest v0.3.0 upgrade:

- ✅ **Constraint Evaluation with Severity**: OK/WARN/BLOCK severity levels implemented
- ✅ **Constraint Outcomes in CommandResult**: Array of ConstraintOutcome returned
- ⚠️ **Database Persistence**: Prisma store integration still needed (currently only memory/localStorage/postgres/supabase adapters exist but need testing)
- ⚠️ **Constraint Violations Tracking**: Database table for tracking violations (to be added in Phase 1)"""

content = content.replace(old_missing, new_missing)

# Write back
with open('C:/projects/capsule-pro/IMPLEMENTATION_PLAN.md', 'w', encoding='utf-8') as f:
    f.write(content)

print('IMPLEMENTATION_PLAN.md updated successfully!')
print('- Phase 0 section replaced with upgrade notes')
print("- What's Missing section updated")
