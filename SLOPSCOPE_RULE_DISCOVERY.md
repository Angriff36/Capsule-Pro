# SlopScope Rule Discovery

---
## [2026-05-08 14:25] Rule Discovery — skeleton_crud.success_response_with_not_implemented_body

### Finding
The `GET /api/command-board/templates` route returns `manifestSuccessResponse` (HTTP 200) with an empty `templates` array and a body message stating "Template listing not yet implemented". The file header (line 5) claims the endpoint "returns 501 Not Implemented" — the code directly contradicts its own documentation. A proper 501 would signal unavailability to callers and monitoring; a 200 with empty data silently presents as "no templates exist" to any consuming UI.

### Evidence
- File: `app/api/command-board/templates/route.ts`
- Snippet (lines 4-5, 36-40):
```
 * NOTE: CommandBoard model does not have shareId, isPublic fields.
 * This endpoint returns 501 Not Implemented until the model is updated.
 ...
    return manifestSuccessResponse({
      templates: [],
      message:
        "Template listing not yet implemented - CommandBoard model needs shareId and isPublic fields",
    });
```

### Why this matters
Any UI consuming this endpoint sees HTTP 200 with `templates: []` and renders "no templates" rather than surfacing that the feature is unavailable. Standard monitoring (status-code-based alerting) cannot detect this — the response looks healthy. The user assumes they just haven't created templates yet, when in reality the feature doesn't exist. This is more insidious than a proper 501 because it silently degrades the UX.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.success_response_with_not_implemented_body",
  "title": "API route returns success HTTP status but response body says feature is not implemented",
  "category": "skeleton_crud",
  "severity": "medium",
  "confidence": 0.85,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript", "tsx"],
  "pattern": "not yet implemented",
  "negative_patterns": [],
  "evidence_required": {
    "file_must_match": ["app/api/.*/route\\.(t|j)sx?$"],
    "file_must_not_match": ["\\.(test|spec)\\.(t|j)sx?$|__tests__/|test/"],
    "min_pattern_count": 1,
    "companion_pattern": "manifestSuccessResponse|NextResponse\\.json\\(|return\\s+new\\s+Response\\("
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_exclude": ["node_modules/", "\\.next/", "dist/", "build/", "coverage/", "__tests__/", "test/"]
  },
  "user_impact": "Consuming UI receives HTTP 200 with empty data and silently renders 'no items' instead of alerting the user that the feature is unavailable. Standard HTTP-status monitoring cannot detect this.",
  "repair_guidance": "Either (a) change the response to 501 with a clear error message so callers and monitoring detect unavailability, or (b) implement the actual database query and remove the 'not yet implemented' message. If blocked on a schema migration, return 503 with a meaningful error payload.",
  "example_source": {
    "file": "app/api/command-board/templates/route.ts",
    "line_or_snippet": "return manifestSuccessResponse({\n  templates: [],\n  message:\n    \"Template listing not yet implemented - CommandBoard model needs shareId and isPublic fields\",\n});"
  }
}
```

### Implementation note
This detector should run on API route files and flag any response body containing "not yet implemented" (or "not implemented") paired with a success-status return pattern (`manifestSuccessResponse`, `NextResponse.json`, `new Response`). The scanner must strip comments before matching to avoid flagging header-doc comments that honestly document the 501 intent. The companion pattern distinguishes deceptive 200 responses from honest 501 endpoints (which use `manifestErrorResponse` or pass an explicit error status).
---

---
## [2026-05-09 02:15] Rule Discovery — feature_claim_mismatch.user_color_assigned_by_math_random_not_deterministic

### Finding
The server action `getUsers` in `apps/app/app/actions/users/get.ts` assigns a collaboration color to each user by picking a random index from a colors array via `Math.random()`. This means every call to `getUsers` assigns different colors to the same users — a user shown as "blue" on one page load becomes "green" on the next. The color is part of a Liveblocks user presence payload (`UserMeta["info"]`) displayed in collaborative UIs where consistent color identity helps teammates recognize each other. A proper implementation would hash the userId deterministically to pick a stable color (e.g., `colors[hashCode(userId) % colors.length]`).

### Evidence
- File: `apps/app/app/actions/users/get.ts`
- Snippet (lines 21-39, 65-75):
```typescript
const colors = [
  "var(--color-red-500)",
  "var(--color-orange-500)",
  // ... 17 CSS variable color tokens
];
// ...
.map((user) => ({
  name: getName(user) ?? "Unknown user",
  picture: user.publicUserData?.imageUrl ?? "",
  color: colors[Math.floor(Math.random() * colors.length)],
}));
```
- The `userId` is available in the mapping scope (`user.publicUserData?.userId`) but never used to derive the color.
- The function signature receives `userIds: string[]` as a parameter — user identity is available at the top of the function.

### Why this matters
Collaborative presence features (Liveblocks cursors, avatars, comment threads) rely on consistent color assignment so teammates can quickly identify who is who. When colors change on every render, the visual shorthand breaks — "the blue person" becomes meaningless. This undermines the entire purpose of color-coded collaboration avatars and creates subtle confusion in real-time editing contexts.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.user_color_assigned_by_math_random_not_deterministic",
  "title": "User collaboration color assigned via Math.random instead of deterministic hash",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.82,
  "detector_type": "regex",
  "language_targets": ["typescript", "tsx"],
  "pattern": "\\bcolor(?:s)?\\[.*Math\\.random",
  "negative_patterns": ["hashCode|hash\\(|charCodeAt.*%"],
  "evidence_required": {
    "file_must_match": ["apps/.*\\.(t|j)sx?$"],
    "file_must_not_match": ["\\.test\\.|\\.spec\\.|__tests__/|test/|stories/"],
    "min_pattern_count": 1,
    "companion_pattern": "\\buser|\\bavatar|\\bmember|\\bcollaborat|\\bLiveblocks"
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_exclude": ["node_modules/", "\\.next/", "dist/", "build/", "coverage/", "storybook/", "\\.stories\\."]
  },
  "user_impact": "Users in collaborative features (Liveblocks presence, commenting, real-time editing) see inconsistent color badges for the same colleagues across page loads. A user who was 'blue' in one view becomes 'green' on refresh, undermining the visual identity recognition that consistent color coding is meant to provide.",
  "repair_guidance": "Replace `Math.floor(Math.random() * colors.length)` with a deterministic hash of the userId modulo colors.length. Example: `colors[hashCode(userId) % colors.length]` where `hashCode` is a stable string hash function (e.g., DJB2). This ensures the same user always gets the same color within a given color palette.",
  "example_source": {
    "file": "apps/app/app/actions/users/get.ts",
    "line_or_snippet": "color: colors[Math.floor(Math.random() * colors.length)],"
  }
}
```

### Implementation note
This is a regex-detectable pattern that catches `Math.random()` used as a color array index in user-facing code. The `companion_pattern` constraint (user/avatar/member/collaborat/Liveblocks) distinguishes this from legitimate random color uses (e.g., chart series colors, demo data generators, loading skeleton placeholders). The `negative_patterns` suppress false positives when a deterministic hashing function is already present in the file. Add to Phase 1 regex rules. Official docs not required: generic implementation-quality rule.
---

---
## [2026-05-09 02:00] Rule Discovery — feature_claim_mismatch.duplicate_discovery_entry_in_log_file

### Finding
The discovery log file `capsule-pro/IMPLEMENTATION_PLAN.md` contains two separate entries for the same rule discovery — `placeholder.base64_data_url_persisted_as_file_storage` — both timestamped `[2026-05-06 18:52]`. The first entry (lines 1578–1623) is a full-format entry with complete code snippets from multiple source files and Prisma schema references. The second entry (lines 1627–1641) is a shorter, abbreviated version of the same finding with truncated snippet descriptions (e.g., `toString('base64') followed by data URL template literal` instead of full code blocks). Both entries carry identical timestamp and identical rule ID, separated only by a horizontal rule and whitespace.

The abbreviated entry appears to be either a draft that was never removed when the full version was added, or an accidental duplication during log assembly. The duplication is invisible to casual header scanning (both show same timestamp and rule ID), but inflates the line count and would cause any automated parser that extracts entries by timestamp to process the same rule twice.

### Evidence
- File: `capsule-pro/IMPLEMENTATION_PLAN.md`
- First entry header (line 1578): `## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage`
- Second entry header (line 1627): `## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage`
- First entry Finding (lines 1580–1583): "Multiple API endpoints store file content as base64 data URLs directly in PostgreSQL `String` columns instead of using object storage... The contract document upload is the critical case: every contract document uploaded by a user is persisted as an inline data URL in a database text column."
- Second entry Finding (lines 1629–1632): Identical text to first entry Finding.
- First entry Evidence: Full fenced code blocks with explicit Prisma update calls across four source files.
- Second entry Evidence: Abbreviated prose descriptions instead of code blocks.
- Span: Entries separated by lines 1623–1626 (horizontal rule + 3 whitespace lines).

### Why this matters
A discovery log that claims to be a chronological record of unique rule discoveries loses integrity when the same entry appears twice. Any tool parsing this log to count unique discoveries, extract rule metadata, or build a timeline would process `placeholder.base64_data_url_persisted_as_file_storage` twice — inflating counts and potentially registering the rule twice in downstream systems. The abbreviated second copy creates ambiguity about which version is authoritative. This is documentation theater — the log performs the appearance of unique chronological provenance while containing a silent duplicate.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.duplicate_discovery_entry_in_log_file",
  "title": "Discovery log file contains duplicate entry for the same rule with identical timestamp",
  "category": "feature_claim_mismatch",
  "severity": "low",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["markdown"],
  "pattern": "## \\[\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}\\]\\s+Rule\\s+Discovery\\s+—\\s+placeholder\\.base64_data_url_persisted_as_file_storage",
  "negative_patterns": [],
  "evidence_required": {
    "file_must_match": ["IMPLEMENTATION_PLAN\\.md$", "DISCOVERY.*\\.md$", "SLOPSCOPE_RULE_DISCOVERY.*\\.md$"],
    "min_pattern_count": 2,
    "companion_pattern": "base64 data URLs directly in PostgreSQL"
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": false,
    "strip_comments": false,
    "path_match": ["IMPLEMENTATION_PLAN\\.md$", "DISCOVERY.*\\.md$", "SLOPSCOPE_RULE_DISCOVERY.*\\.md$"],
    "path_exclude": ["node_modules/", "\\.next/", "dist/", "SLOPSCOPE_RULE_DISCOVERY_ARCHIVE/"]
  },
  "user_impact": "The discovery log presents itself as a chronological sequence of unique rule discoveries, but contains a duplicate entry that inflates discovery counts and introduces ambiguity about which version is authoritative. Automated parsers would extract the same rule metadata twice, causing silent overcounting in any 'N rules discovered' reporting.",
  "repair_guidance": "Remove the shorter/abbreviated duplicate entry (lines 1627–1641) from `capsule-pro/IMPLEMENTATION_PLAN.md`, keeping only the full-format entry (lines 1578–1623). As a preventive measure, add a pre-append dedup check to the discovery loop: before writing a new entry, scan the target log for any existing entry with the same rule ID and refuse to write a duplicate.",
  "example_source": {
    "file": "capsule-pro/IMPLEMENTATION_PLAN.md",
    "line_or_snippet": "Line 1578: ## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage\nLine 1627: ## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage"
  }
}
```

### Implementation note
Phase 1 — regex: Use the `pattern` to find discovery log header lines matching the known duplicate rule ID. When `min_pattern_count` ≥ 2, the file contains a duplicate for this specific rule. Phase 2 — generalize: Build a post-processing dedup detector that (a) parses all discovery log headers (matching `## \\[YYYY-MM-DD HH:MM\\] Rule Discovery — <rule_id>`), (b) groups by rule_id, and (c) flags any group with count > 1. The companion pattern `base64 data URLs directly in PostgreSQL` is a content fingerprint confirming both entries describe the same underlying finding rather than coincidental header matches. Official docs not required — generic log-integrity conformance rule.
---

---
## [2026-05-09 04:38] Rule Discovery — error_handling_theater.silent_catch_empty_body_on_side_effect_calls

### Finding
API route handlers in the codebase make fire-and-forget side-effect calls (SMS notifications, webhook dispatches) and discard all errors via `.catch(() => {})` — an empty catch handler with no logging, no Sentry reporting, and no retry. The most impactful example is `triggerShiftAssignedSms(...).catch(() => {})` in the shift creation route, which means SMS delivery failures to employees are completely invisible — the API returns HTTP 200, the manager assumes the employee was notified, but no notification actually went out.

### Evidence
- File: `apps/api/app/api/staff/shifts/commands/create/route.ts`
- Lines 86–103
- Snippet:
```typescript
    // Fire-and-forget SMS trigger for shift assignment
    if (
      body.employeeId &&
      typeof body.shiftStart === "string" &&
      typeof body.shiftEnd === "string"
    ) {
      triggerShiftAssignedSms({
        tenantId,
        shiftId: ((result.result as Record<string, unknown>)?.id as string) ?? body.id,
        shiftDate: body.shiftStart.slice(0, 10),
        shiftStart: body.shiftStart,
        shiftEnd: body.shiftEnd,
        employeeId: body.employeeId as string,
        employeeName: (body.employeeName as string) ?? "",
        stationName: body.roleDuringShift as string | undefined,
      }).catch(() => {});   // <-- silent error swallowing
    }
```
- The call chain: `triggerShiftAssignedSms` → `evaluateAndExecuteRules` → `database.sms_automation_rules.findMany(...)` + `sendSmsNotification(...)`. Database failures on `findMany` (line 79 of sms-automation-engine.ts) are not caught internally and will propagate as promise rejections straight into the empty catch.

### Why this matters
When a shift manager creates a shift assignment, the API returns HTTP 200. The frontend shows a success toast. The manager believes the employee received an SMS notification about their new shift. But if the SMS service is down, the database is unreachable, or the automation engine throws for any reason — the error disappears into `.catch(() => {})`. No Sentry alert, no structured log, no retry, no compensating action. The employee misses their shift and nobody knows why.

### Proposed detector rule
```json
{
  "id": "error_handling_theater.silent_catch_empty_body_on_side_effect_calls",
  "title": "Silent error swallowing via empty .catch(() => {}) on async side-effect calls in API routes",
  "category": "error_handling_theater",
  "severity": "medium",
  "confidence": 0.75,
  "detector_type": "regex",
  "language_targets": ["typescript", "tsx"],
  "pattern": "\\.catch\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{\\s*\\}\\s*\\)",
  "negative_patterns": [],
  "evidence_required": {
    "file_must_match": ["app/api/"],
    "min_pattern_count": 1
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": false,
    "path_match": ["app/api/.*\\.(ts|tsx)$"],
    "path_exclude": ["node_modules/", "\\.next/", "dist/", "archive/"]
  },
  "user_impact": "SMS notification and webhook delivery failures are silently discarded. The API returns HTTP 200 success, making operators believe side effects (notifications, webhooks) completed when they didn't. No logging, no Sentry alert, no retry — failures are completely invisible.",
  "repair_guidance": "Every .catch(() => {}) on a side-effect call should at minimum log the error via the structured logger and report to Sentry. Better: introduce a non-blocking fire-and-forget utility that always logs failures. Best: use a durable outbox pattern (job queue) for notifications and webhooks so transient failures can be retried.",
  "example_source": {
    "file": "apps/api/app/api/staff/shifts/commands/create/route.ts",
    "line_or_snippet": "triggerShiftAssignedSms({...}).catch(() => {});"
  }
}
```

### Implementation note
This pattern also appears in the bulk-assignment route (`apps/api/app/api/staff/shifts/bulk-assignment/route.ts` line 139) and the central command handler (`apps/api/lib/manifest-command-handler.ts` line 202 for `dispatchWebhooks`). A single utility — e.g. `fireAndForget(promise, ctx)` that always catches and logs — could replace all instances at once. The pattern is also baked into the auto-generated route templates, so the code generator should be updated to emit proper error-handling fire-and-forget calls. Official docs not required: generic implementation-evidence rule.
---
