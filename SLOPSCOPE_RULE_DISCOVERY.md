# SlopScope rule discovery (continued)

---
## [2026-05-08 03:45] Rule Discovery — feature_claim_mismatch.followup_generator_ignores_event_type

### Finding
The automated followup generator claims to produce follow-up tasks "based on event type and timeline" (JSDoc line 10), but `eventType` is fetched from the database (line 40) and never referenced in the generation logic. Every event — regardless of whether it's a corporate gala, a wedding, a birthday, or a simple drop-off — receives the identical hardcoded 5-step timeline: thank-you (1d), feedback (3d), invoice check (7d), cleanup (14d), re-engagement (30d). A 50-person wedding and a 10-person office lunch get the exact same follow-up cadence.

### Evidence
- File: `apps/api/app/api/events/automated-followups/commands/generate/route.ts`
- Snippet (line 10): `* Auto-generate follow-up tasks for an event based on event type and timeline`
- Snippet (line 40): `eventType: string | null;` — fetched from DB, never consumed
- Snippet (lines 75-119): Hardcoded follow-up array with fixed offsets (1d, 3d, 7d, 14d, 30d) and static descriptions

### Why this matters
Users configure automated follow-ups expecting event-type-aware scheduling. A high-end corporate event might need different post-event touchpoints than a casual birthday party. Because `eventType` is silently ignored, every client receives identical follow-up tasks regardless of event nature, making the "based on event type" claim deceptive. Users trust the automation is intelligent, but it's a static template with a dynamic label.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.followup_generator_ignores_event_type",
  "title": "Function claims event-type-aware behavior but queries eventType without consuming it",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.85,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "pattern": "event[_-]?type\\s*[:\\?]?\\s*string",
  "negative_patterns": [
    "switch\\s*\\(.*event[_-]?type",
    "if\\s*\\(.*event[_-]?type",
    "event[_-]?type\\s*===",
    "event[_-]?type\\s*!==",
    "\\.includes\\(.*event[_-]?type",
    "event[_-]?type\\s*&&",
    "event[_-]?type\\s*\\?\\?",
    "map\\[.*event[_-]?type"
  ],
  "evidence_required": {
    "file_must_match": ["(generate|create|build|auto).*(route|service|handler|controller)\\.(t|j)sx?$"],
    "companion_pattern": "(follow.?up|timeline|schedule|task).*generat|auto.?generat"
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_exclude": ["node_modules/", ".next/", "dist/", "e2e/"]
  },
  "user_impact": "Users believe the system adapts follow-up tasks to event type, but every event type receives the same static timeline. This reduces automation trust and may cause inappropriate follow-up actions (e.g., sending a re-engagement email to a one-time client).",
  "repair_guidance": "Implement event-type-specific follow-up templates (e.g., wedding vs. corporate vs. social), or at minimum use eventType to vary task descriptions, timing, or task count. If type-awareness is not planned, update the JSDoc to accurately say 'generates a standard follow-up timeline' and remove the 'based on event type' claim.",
  "example_source": {
    "file": "apps/api/app/api/events/automated-followups/commands/generate/route.ts",
    "line_or_snippet": "eventType: string | null;\n```\n...\n// Standard event follow-up timeline\n// 1. Post-event thank you (1 day after)\nconst thankYou = new Date(eventDate);\nthankYou.setDate(thankYou.getDate() + 1);"
  }
}
```

### Implementation note
Detector should identify functions/handlers that (1) query an `eventType` field from a database or request body, (2) have a JSDoc or comment claiming type-aware behavior, but (3) never branch on or reference `eventType` in any conditional logic (no switch, if-comparison, includes, map lookup, etc.). The `companion_pattern` anchors the search to generator/builder files. The `negative_patterns` list the common ways eventType would actually be consumed — if none appear, the field is fetched but dead. Official docs not required: generic implementation-evidence rule.

---
## [2026-05-08 04:31] Rule Discovery — feature_claim_mismatch.ai_assistant_chat_to_nonexistent_endpoint

### Finding
The "Capsule AI" floating chat panel is mounted in the authenticated layout and visible to every logged-in user via a sparkles button. It uses `useChat` from `@ai-sdk/react` (Vercel AI SDK) wired to `api: "/api/command-board/chat"`. That API route does not exist anywhere in the codebase — there is no `chat/route.ts` under `apps/api/app/api/command-board/` or any other path that would satisfy this URL. Every message a user types will produce a 404 from Next.js. The panel renders quick prompts, shows a typing indicator, and presents a fully functional-looking chat UX — but the backend endpoint is absent. The route path is also semantically wrong: the AI assistant is a general-purpose tool (not command-board-specific), yet it's hardcoded to a command-board subpath.

### Evidence
- File: `apps/app/app/(authenticated)/components/ai-assistant/ai-assistant-panel.tsx`
- Snippet (line 26-28): `transport: new DefaultChatTransport({ api: "/api/command-board/chat" })`
- File: `apps/app/app/(authenticated)/layout.tsx`
- Snippet (line 52): `<AiAssistantPanel />` — mounted unconditionally in authenticated layout
- File: `apps/api/app/api/command-board/` — directory listing shows no `chat/route.ts`

### Why this matters
Every authenticated user sees a prominent floating "Capsule AI" button with a sparkles icon. Clicking it opens a polished chat panel with quick prompts, a textarea, and streaming-style UI. Sending any message silently fails with a 404 — no error toast, no retry, no fallback. The user gets no feedback that the feature is non-functional. This is implementation theater at the UI layer: a fully interactive chat interface that talks to a void.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ai_assistant_chat_to_nonexistent_endpoint",
  "title": "AI chat component uses useChat wired to API route that does not exist",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["tsx", "typescript"],
  "pattern": "new\\s+DefaultChatTransport\\(\\{\\s*api\\s*:\\s*['\"]([^'\"]+)['\"]",
  "negative_patterns": [],
  "evidence_required": {
    "file_must_match": ["\\.(tsx|ts)$"],
    "companion_pattern": "useChat\\("
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": false,
    "path_match": ["app/.*components/", "components/", "src/.*components/"]
  },
  "user_impact": "Users see a fully functional-looking AI chat panel (sparkles button, quick prompts, streaming indicator) but every message they send silently fails because the API endpoint does not exist. No error feedback is shown. Users believe the AI feature works but it is entirely non-functional.",
  "repair_guidance": "Create the missing `/api/command-board/chat` route (or move it to a semantically correct path like `/api/ai/chat`), implement a streaming chat handler using Vercel AI SDK's `streamText`, and update the panel's api path to match. Alternatively, if the feature is not ready, hide the panel behind a feature flag or remove it from the authenticated layout.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/components/ai-assistant/ai-assistant-panel.tsx",
    "line_or_snippet": "const { messages, sendMessage, status } = useChat({\n    transport: new DefaultChatTransport({\n      api: \"/api/command-board/chat\",\n    }),\n  });"
  }
}
```

### Implementation note
Detector should extract the API path from `DefaultChatTransport` constructors in component files, then verify the corresponding route file exists in the API directory structure. The cross-file check needs to resolve Next.js App Router path conventions (e.g., `/api/command-board/chat` maps to `app/api/command-board/chat/route.ts`). Flag when the component is mounted in a layout (indicating broad user exposure) and the target route is absent. Official docs reference: Vercel AI SDK `useChat` expects a POST endpoint at the specified `api` path — https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat

---
## [2026-05-08 04:46] Rule Discovery — dashboard_illusion.attendance_rate_always_100_tautological_sql

### Finding
The employee performance dashboard displays an `attendanceRate` metric for each employee, with conditional color coding (green >= 95%, yellow >= 90%, etc.) suggesting it reflects real attendance behavior. However, the SQL query that computes this metric defines `total_shifts` and `attended_shifts` as identical `COUNT(*)` expressions on the same table (`tenant_staff.time_entries`). Since time_entries are only created when an employee clocks in, every row represents an attended shift — there is no comparison against scheduled shifts. The `attendanceRate` calculation is `(attendedShifts / totalShifts) * 100`, which is always `COUNT(*) / COUNT(*) * 100 = 100%` by construction. The same tautological pattern is duplicated in three separate SQL queries within the file (lines 140-141, 371-372, and 708-709). The `schedule_shifts` table is already LEFT JOINed in each query but only used for punctuality, not for counting scheduled shifts.

### Evidence
- File: `apps/app/app/(authenticated)/analytics/staff/actions/get-employee-performance.ts`
- Snippet (lines 140-141): `COUNT(*) as total_shifts,\n      COUNT(*) as attended_shifts,`
- Snippet (lines 371-372): `COUNT(*) as total_shifts,\n        COUNT(*) as attended_shifts,`
- Snippet (lines 708-709): `COUNT(*) as total_shifts,\n        COUNT(*) as attended_shifts,`
- Snippet (line 239-240): `const attendanceRate = totalShifts > 0 ? (attendedShifts / totalShifts) * 100 : 100;`
- UI consumer: `apps/app/app/(authenticated)/analytics/staff/components/employee-performance-dashboard.tsx` lines 191, 312, 318-324 display `attendanceRate` with conditional coloring

### Why this matters
Every employee in the performance dashboard shows 100% attendance. A manager looking at this metric would believe all employees show up for all their scheduled shifts — a meaningless signal. This is particularly deceptive because the metric has a polished UI with color-coded thresholds suggesting real variance exists. An employee who was scheduled for 20 shifts but only clocked in for 12 would still show 100% attendance. The metric creates a false sense of workforce reliability and makes the entire performance dashboard less trustworthy.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.attendance_rate_always_100_tautological_sql",
  "title": "Attendance rate metric computed from identical COUNT(*) expressions on same table, always 100%",
  "category": "dashboard_illusion",
  "severity": "medium",
  "confidence": 0.92,
  "detector_type": "regex",
  "language_targets": ["typescript", "javascript"],
  "pattern": "COUNT\\(\\*\\)\\s+as\\s+(total|scheduled)_(shifts|days)[,\\s]+COUNT\\(\\*\\)\\s+as\\s+(attended|actual)_(shifts|days)",
  "negative_patterns": [
    "schedule_shifts.*COUNT",
    "scheduled_shifts.*COUNT"
  ],
  "evidence_required": {
    "file_must_match": ["(performance|attendance|staff|employee|analytics|hr).*(action|service|data|query|metrics)"],
    "companion_pattern": "attendance(Rate|Pct|Percent|_rate)\\s*=\\s*.*attended.*\\/\\s*.*total"
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_exclude": ["node_modules/", ".next/", "dist/"]
  },
  "user_impact": "Every employee in the performance dashboard displays 100% attendance regardless of actual no-shows. Managers cannot identify attendance problems. The metric's color-coded UI (green/yellow/red thresholds) implies real variance, making it actively misleading rather than simply absent.",
  "repair_guidance": "Compute total_shifts from the schedule_shifts table (counting scheduled shifts for the period), and attended_shifts from time_entries (counting shifts where the employee clocked in). A proper query would LEFT JOIN schedule_shifts and count scheduled rows for the denominator while counting time_entry rows for the numerator.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/analytics/staff/actions/get-employee-performance.ts",
    "line_or_snippet": "COUNT(*) as total_shifts,\n      COUNT(*) as attended_shifts,"
  }
}
```

### Implementation note
Detector should flag SQL queries (in raw query strings or tagged templates) where two alias columns are defined with identical `COUNT(*)` expressions and the aliases suggest a total-vs-attended or scheduled-vs-actual comparison. The companion_pattern ensures the file actually consumes these aliases in a ratio calculation. The negative_patterns check whether the query also counts from a schedule/roster table, which would indicate a legitimate total-shifts source. The rule should be extended to also detect `SUM(CASE ... THEN 1 ELSE 0 END)` patterns that are structurally identical. Official docs not required: generic implementation-evidence rule.
---
## [2026-05-08 22:07] Rule Discovery — automation_theater.food_safety_alert_without_notification_delivery

### Finding
The IoT alert creation endpoint (`POST /api/kitchen/iot/alerts`) persists temperature excursion alerts to the database but contains a BLOCKER comment explicitly admitting the notification service is not implemented. When a food safety alert is triggered (e.g., walk-in cooler temperature exceeds safe threshold), the alert is written to the database and a 200 is returned, but no human is ever notified — no push notification, no in-app alert, no email, no SMS. In a catering operation where food safety violations can cause illness, regulatory fines, and reputational damage, an alert system that only writes to a database is automation theater: it looks like a safety system but provides zero real-time protection.

### Evidence
- File: `apps/api/app/api/kitchen/iot/alerts/route.ts`
- Lines: 97-99
- Snippet:
```typescript
    // BLOCKER: Notification service not yet implemented. Need to determine notification
    // channel (in-app, push, email) and staff assignment routing.
    // Tracked as capsule-pro/TODO:iot-notification-service
```

### Why this matters
A catering company handling food for events has regulatory obligations around food safety (HACCP, local health codes). Temperature monitoring without real-time alerting is a compliance gap. Kitchen staff relying on the IoT dashboard assume that when a probe goes out of range, someone will be notified. In reality, the alert silently enters the database and may go unnoticed until someone manually checks the alerts page — potentially hours after a critical temperature excursion. This is a food safety risk disguised as a working feature.

### Proposed detector rule
```json
{
  "id": "automation_theater.food_safety_alert_without_notification_delivery",
  "title": "Alert/event creation endpoint persists records but never dispatches notifications",
  "category": "automation_theater",
  "severity": "critical",
  "confidence": 0.85,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "pattern": "//\\s*BLOCKER:\\s*(?:Notification|notification)\\s+(?:service|delivery|dispatch)\\s+(?:not\\s+)?(?:yet\\s+)?(?:implemented|wired|connected|integrated)",
  "negative_patterns": [
    "await\\s+\\w+\\.send\\(",
    "await\\s+\\w+\\.notify\\(",
    "await\\s+\\w+\\.push\\(",
    "publish\\(",
    "emit\\("
  ],
  "evidence_required": {
    "companion_pattern": "await\\s+database\\.\\w+\\.create\\(",
    "min_pattern_count": 1
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": false,
    "path_exclude": ["node_modules/", ".next/", "dist/"]
  },
  "user_impact": "Safety-critical alerts (temperature excursions, equipment failures) are stored in the database but no kitchen staff member is ever notified in real time, creating a food safety compliance gap.",
  "repair_guidance": "Wire the alert creation path to an actual notification channel. At minimum, publish an outbox event so the realtime layer can push to connected dashboards. Ideally also send push notifications to on-duty kitchen staff and escalate unacknowledged alerts after a timeout.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/iot/alerts/route.ts",
    "line_or_snippet": "// BLOCKER: Notification service not yet implemented. Need to determine notification\n    // channel (in-app, push, email) and staff assignment routing."
  }
}
```

### Implementation note
The detector should match BLOCKER comments that explicitly admit notification delivery is not implemented, while requiring evidence that the same file creates a database record (the `companion_pattern` for `database.*.create`). The `negative_patterns` check for common notification dispatch calls — if the file also contains a send/notify/push/publish call, it's likely a partially-implemented system rather than pure theater. The rule should be extended to also detect TODO/FIXME/HACK comments with the same notification-gap semantics, not just BLOCKER comments. Consider a cross_file variant that checks whether any sibling file in the same route directory contains notification dispatch logic. Official docs not required: generic implementation-evidence rule.
---
## [2026-05-07 22:22] Rule Discovery — error_handling_theater.silent_json_parse_failure_empty_object

### Finding
Three POST API routes use `request.json().catch(() => ({}))` to parse the request body. When `request.json()` fails (malformed JSON, empty body, non-JSON content-type), the `.catch(() => ({}))` silently replaces the error with an empty object. All destructured body fields become `undefined`, and the route proceeds with no indication to the caller that the input was invalid. The correct behavior is to let the parse error propagate (resulting in a 400) or catch it and return an explicit error response.

### Evidence
- File: `apps/api/app/api/events/[eventId]/shipments/generate/route.ts`
- Snippet: `const body: GenerateShipmentRequest = await request.json().catch(() => ({}));`
- File: `apps/api/app/api/command-board/simulations/[id]/apply/route.ts`
- Snippet: `const body = await request.json().catch(() => ({}));`
- File: `apps/api/app/api/integrations/webhooks/dlq/[id]/retry/route.ts`
- Snippet: `const body: RetryRequest = await request.json().catch(() => ({}));`

### Why this matters
In the shipments/generate route, `locationId`, `scheduledDate`, `notes`, and `validateStock` all become `undefined` when JSON parsing fails. The route then proceeds to query inventory requirements and potentially create shipment records with missing critical fields. In the simulation apply route, the `force` flag silently defaults to `false` even if the client intended to force-apply. In the DLQ retry route, any typed `RetryRequest` fields become `undefined`. Users receive a success response (or a downstream error from missing fields) with no indication that their request body was never actually read.

### Proposed detector rule
```json
{
  "id": "error_handling_theater.silent_json_parse_failure_empty_object",
  "title": "request.json() catch returns empty object instead of erroring",
  "category": "error_handling_theater",
  "severity": "high",
  "confidence": 0.85,
  "detector_type": "regex",
  "language_targets": ["typescript", "javascript", "tsx"],
  "pattern": "request\\.json\\(\\)\\.catch\\(\\s*\\(\\s*\\)\\s*=>\\s*\\(\\s*\\{\\s*\\}\\s*\\)\\s*\\)",
  "negative_patterns": ["return\\s+NextResponse\\.json\\(\\s*\\{[^}]*error", "return\\s+Response\\.json\\(\\s*\\{[^}]*error"],
  "evidence_required": {
    "file_must_match": ["route\\.(t|j)sx?$"],
    "companion_pattern": "export\\s+(async\\s+)?function\\s+(POST|PUT|PATCH)"
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_exclude": ["node_modules/", "\\.next/", "dist/", "__mocks__/"]
  },
  "user_impact": "Malformed request bodies are silently ignored. The route proceeds with all body fields as undefined, potentially creating records with missing data or performing mutations with incorrect parameters. The caller receives no indication their input was invalid.",
  "repair_guidance": "Replace `request.json().catch(() => ({}))` with either a try/catch that returns a 400 error response, or let the unhandled parse error propagate to the framework's default error handler. If the body is truly optional, use a validated schema (e.g., zod) with a `.optional()` default instead of silently swallowing parse failures.",
  "example_source": {
    "file": "apps/api/app/api/events/[eventId]/shipments/generate/route.ts",
    "line_or_snippet": "const body: GenerateShipmentRequest = await request.json().catch(() => ({}));"
  }
}
```

### Implementation note
The detector targets the exact `request.json().catch(() => ({}))` pattern in API route files that handle POST/PUT/PATCH methods. The `companion_pattern` ensures the file is a mutation route (not a GET), and `file_must_match` limits to route files. The `negative_patterns` check for cases where the developer at least returns an error response in the same line (unlikely but defensive). This should be a high-priority rule since it silently corrupts request handling. Official docs not required: generic implementation-evidence rule.
---
## [2026-05-08 06:05] Rule Discovery — dashboard_illusion.predictive_ltv_is_arithmetic_with_fake_confidence

### Finding
The client analytics "Predictive LTV" dashboard claims to show ML/AI-driven lifetime value predictions with a "Model confidence" percentage. The actual implementation is a trivial arithmetic formula — `avgLTV * (1 + max(0, avgOrderCount - 1) * 0.15)` — with a hardcoded 0.15 growth multiplier. The "confidence" score is a step function based solely on sample count (85/70/50/30), not on any statistical model validation. No ML model, no regression, no cross-validation, no feature engineering. The UI labels ("Predictive LTV", "Model confidence") create the impression of AI-powered analytics when the underlying computation is basic arithmetic.

### Evidence
- File: `apps/app/app/(authenticated)/analytics/clients/actions/get-client-ltv.ts`
- Snippet (line 384): `const predictedLTV = avgLTV * (1 + Math.max(0, avgOrderCount - 1) * 0.15);`
- Snippet (lines 395-404): Confidence hardcoded as step function: `if (clientData.length >= 20) confidence = 85; else if (>= 10) 70; else if (>= 5) 50; else 30;`
- UI label (predictive-ltv.tsx line 72): `Model confidence: {data.confidence}%`
- UI label (predictive-ltv.tsx line 70): `Predictive LTV`

### Why this matters
Business users see "Predictive LTV" and "Model confidence: 85%" and make strategic decisions (client retention budgets, marketing spend allocation) based on what they believe is a trained ML model. In reality, every prediction is just historical LTV multiplied by 1.15 (assuming avgOrderCount >= 2), which provides no predictive value beyond "the future will be 15% better than the past." The fabricated confidence score compounds the deception — it has no statistical basis and is determined entirely by how many clients are in the database, not by model performance metrics like R², RMSE, or backtesting accuracy.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.predictive_ltv_is_arithmetic_with_fake_confidence",
  "title": "Predictive/analytics UI labels backed by trivial arithmetic instead of ML models",
  "category": "dashboard_illusion",
  "severity": "medium",
  "confidence": 0.75,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "tsx", "javascript"],
  "pattern": "\\bconfidence\\s*[:=]\\s*\\d{2,3}\\s*;|confidence.*step|confidence.*hardcoded|avgPredicted|predictedLTV.*\\*.*0\\.\\d+",
  "negative_patterns": ["import.*tensorflow", "import.*@tensorflow", "import.*brain\\.js", "import.*ml5", "model\\.predict\\(", "model\\.fit\\("],
  "evidence_required": {
    "file_must_not_match": ["\\.test\\.|\\.spec\\.", "node_modules/"],
    "companion_pattern": "(predictive|prediction|model.*confidence|ml|machine.?learning)"
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_exclude": ["node_modules/", "\\.next/", "dist/"]
  },
  "user_impact": "Users see 'Model confidence: 85%' and 'Predictive LTV' labels, leading them to trust numbers that are simple arithmetic projections with no statistical validation. Strategic decisions about client retention spend, marketing budgets, and growth forecasting are based on fabricated AI credibility.",
  "repair_guidance": "Either (1) replace the arithmetic formula with an actual predictive model (linear regression at minimum, with proper train/test splits and real confidence intervals), or (2) rename the UI labels to honestly reflect what the computation does — e.g., 'Projected LTV (linear estimate)' instead of 'Predictive LTV', and remove the fake 'Model confidence' percentage entirely.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/analytics/clients/actions/get-client-ltv.ts",
    "line_or_snippet": "const predictedLTV = avgLTV * (1 + Math.max(0, avgOrderCount - 1) * 0.15);\n// ...\nif (clientData.length >= 20) { confidence = 85; }"
  }
}
```

### Implementation note
The detector targets files that combine predictive/ML-flavored labels with trivial arithmetic formulas or hardcoded confidence scores. The `negative_patterns` check for actual ML library imports (TensorFlow, brain.js, ml5) or model.fit/predict calls to reduce false positives on files that genuinely use ML. The `companion_pattern` ensures the file has some predictive/ML language before flagging the hardcoded confidence. This is a medium-severity rule because the user impact is real (misleading analytics driving business decisions) but the pattern is somewhat niche. Official docs not required: generic implementation-evidence rule.
---
