# SlopScope rule discovery log

---
## [2026-05-07 17:36] Rule Discovery — dashboard_illusion.fake_predictive_analytics

### Finding
The "Predictive LTV" feature in the client analytics dashboard is presented as machine-learning-driven predictive modeling — the UI shows "Model confidence: X%" and "Predicted LTV" values — but the implementation is pure arithmetic with hardcoded constants. There is no model, no regression, no statistical significance testing, and no ML library anywhere in the codebase. The "prediction" is `avgLTV * (1 + avgOrderCount * 0.15)`, the "confidence" is a stepped lookup on row count (5→30%, 10→50%, 20→85%), and the "growthRate" is `avgOrderValue * 0.15`. The segmentation is simple threshold bucketing on LTV and order count. This is dashboard theater masquerading as predictive analytics.

### Evidence
- File: `app/(authenticated)/analytics/clients/actions/get-client-ltv.ts`
- Snippet (lines 302–419, `calculatePredictiveLTV`):
  ```typescript
  // "prediction" is a trivial linear multiplier
  const predictedLTV = avgLTV * (1 + Math.max(0, avgOrderCount - 1) * 0.15);
  // ...
  // "confidence" is a stepped lookup on client count
  if (clientData.length >= 20) { confidence = 85; }
  else if (clientData.length >= 10) { confidence = 70; }
  else if (clientData.length >= 5) { confidence = 50; }
  else { confidence = 30; }
  // ...
  // "growthRate" is just avgOrderValue * 0.15
  growthRate: avgOrderValue * 0.15,
  ```
- File: `app/(authenticated)/analytics/clients/components/predictive-ltv.tsx`
- Snippet (line 72):
  ```tsx
  Model confidence: {data.confidence}% | Avg Predicted: {formatCurrency(data.averagePredictedLTV)}
  ```
- File: `app/(authenticated)/analytics/clients/page.tsx`
- Snippet (line 16):
  ```tsx
  summary="Analyze client profitability, lifetime value, retention rates, and predictive modeling."
  ```
- No ML/tensorflow/pytorch/sklearn imports exist anywhere in the `app/` directory.

### Why this matters
Users see "Predictive LTV" with a "Model confidence" percentage and make business decisions based on it — which clients to nurture, which are "at risk," what future revenue looks like. The numbers have no statistical basis. The "confidence" score is fabricated from row count. The "predicted" values are just current LTV times 1.15. A catering company could allocate marketing spend, negotiate contracts, or prioritize clients based on these dressed-up arithmetic results.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.fake_predictive_analytics",
  "title": "Fake predictive analytics: hardcoded arithmetic presented as ML prediction",
  "category": "dashboard_illusion",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "tsx", "javascript", "python"],
  "patterns": [
    "function calculatePredictive|calculatePrediction|predictiveModel",
    "confidence.*=.*[0-9]+;.*confidence.*=.*[0-9]+",
    "predictedLTV|predicted_ltv|predictedValue",
    "\"confidence\".*number",
    "hardcoded linear multiplier on avg value presented as prediction",
    "UI text: 'Model confidence' or 'predictive modeling' or 'Predicted LTV'"
  ],
  "negative_patterns": [
    "import.*tensorflow|import.*pytorch|import.*sklearn|import.*@tensorflow",
    "model\\.predict|model\\.fit|model\\.train",
    "regression|ARIMA|prophet|XGBoost|lightgbm",
    "scikit-learn|statsmodels|pymc"
  ],
  "evidence_required": [
    "UI component rendering 'predictive' or 'confidence' values from this data",
    "No ML/statistical library imports in the codebase",
    "The 'prediction' function is pure arithmetic (multiply, add) with hardcoded constants"
  ],
  "false_positive_controls": [
    "Allow if a genuine ML model file (.pkl, .onnx, .pt, .h5) exists in the repo",
    "Allow if sklearn/tensorflow/prophet/statsmodels is in dependencies AND imported",
    "Allow if the function name includes 'mock' or 'stub' or 'placeholder'"
  ],
  "user_impact": "Users trust fabricated prediction numbers to make financial and strategic decisions. The 'Model confidence' percentage is invented from row count, not from any statistical validation. This is deceptive — not just incomplete, but actively misleading.",
  "repair_guidance": "Either (a) integrate a real predictive model (even simple linear regression with cross-validation would be honest), or (b) rename the feature to remove ML language — call it 'Projected LTV' or 'Estimated Future Revenue' and clearly label the calculation methodology so users understand it's a simple projection, not a model prediction. Remove the fabricated 'confidence' score or replace it with a real statistical measure (R², confidence interval, etc.).",
  "example_source": {
    "file": "app/(authenticated)/analytics/clients/actions/get-client-ltv.ts",
    "line_or_snippet": "function calculatePredictiveLTV(clientData: ClientLTVData[]): {\n  averagePredictedLTV: number;\n  confidence: number;\n  ..."
  }
}
```

### Implementation note
The detector should use a cross-file approach: find functions with "predictive" in the name that produce a "confidence" field, then verify no ML library is imported anywhere in the dependency tree. A simpler heuristic: find the pattern of `confidence = <hardcoded number>` inside functions named `*predictive*` or `*predict*`, combined with UI references to "Model confidence" or "predictive modeling." AST-based detection would look for functions returning objects with both a "predicted" field and a "confidence" field where the confidence assignment is a literal number comparison chain (stepped if/else on input size).
---
## [2026-05-08 00:53] Rule Discovery — automation_theater.toast_only_dead_buttons

### Finding
The Kitchen IoT page (`/kitchen/iot`) presents itself as a full monitoring and management dashboard with the headline "Real-time temperature monitoring and probe management." It fetches real data from three API endpoints (`/api/kitchen/iot/probes`, `/api/kitchen/iot/readings`, `/api/kitchen/iot/alerts`) and renders a polished multi-tab UI with probe cards, alert panels, and temperature reading histories. However, every single interactive button on the page — all 5 of them — is a dead `toast.info("... coming soon")` stub. The actions include: Register Probe, Log Reading, Probe Details, Acknowledge Alert, and Resolve Alert. There are zero functional buttons on the entire page. No corresponding mutation API endpoints (`POST /iot/probes`, `POST /iot/readings`, `PATCH /iot/alerts/{id}/acknowledge`, etc.) exist anywhere in the codebase. The page is a read-only observation dashboard disguised as a management tool. For a food safety system where temperature monitoring is a compliance requirement, having "Acknowledge" and "Resolve" buttons that do nothing is particularly dangerous — staff may believe they are documenting their response to temperature alerts when in fact nothing is recorded.

### Evidence
- File: `app/(authenticated)/kitchen/iot/iot-page-client.tsx`
- Snippet (line 199): `onClick={() => toast.info("Probe registration form coming soon")}`
- Snippet (line 417): `onClick={() => toast.info("Log temperature reading coming soon")}`
- Snippet (line 420): `onClick={() => toast.info("Probe details view coming soon")}`
- Snippet (line 508): `onClick={() => toast.info("Alert acknowledgement coming soon")}`
- Snippet (line 511): `onClick={() => toast.info("Alert resolution coming soon")}`
- Page headline (line 195-196): `"Real-time temperature monitoring and probe management"`
- All 5 `<Button>` elements in the file are toast-only — 0% functional interaction ratio
- No mutation endpoints for IoT operations found anywhere in the codebase
- The "Acknowledge" and "Resolve" buttons appear next to food safety alerts with severity levels (critical, high, medium, low) and temperature thresholds — implying compliance documentation capability that does not exist

### Why this matters
In a catering/food service context, temperature monitoring is a health code compliance requirement. When a temperature alert fires (e.g., a walk-in cooler hits 45°F), staff need to acknowledge the alert, document corrective action, and resolve it. This page shows those buttons, positioned prominently next to active alerts with severity badges and temperature readings, but clicking them shows a toast and records nothing. Staff may assume their acknowledgment was logged. During a health inspection or food safety audit, the absence of any documented alert responses could be a compliance failure. This is not just incomplete — it's a compliance risk masked by a polished UI.

### Proposed detector rule
```json
{
  "id": "automation_theater.toast_only_dead_buttons",
  "title": "All interactive buttons are toast.info stubs: page presents management UI but every action is dead",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["tsx", "jsx"],
  "patterns": [
    "Multiple toast.info.*coming soon handlers in a single component",
    "onClick.*toast\\.info\\(.*coming soon",
    "Component imports toast from 'sonner' and uses it exclusively for 'coming soon' messages",
    "Page/component has no apiFetch POST/PUT/PATCH/DELETE calls despite presenting action buttons"
  ],
  "negative_patterns": [
    "At least one onClick handler calls apiFetch or a server action",
    "Component has functional form submissions alongside toast stubs",
    "Toast is used for success/error feedback after real API calls (not as the entire action)"
  ],
  "evidence_required": [
    "Component file exists with multiple Button elements",
    "All or nearly all onClick handlers resolve to toast.info with no side effects",
    "Page headline or description implies management/control capability",
    "No corresponding API mutation endpoints exist for the claimed actions"
  ],
  "false_positive_controls": [
    "Exclude if the page also has functional API calls (mixed live/dead is a softer finding)",
    "Exclude navigation buttons (Link, router.push) — only action buttons",
    "Exclude 'coming soon' text on features clearly marked as planned in README/roadmap docs"
  ],
  "user_impact": "Users see a polished management interface and assume actions work. In food safety contexts, this means staff may believe they are documenting temperature alert responses for compliance when nothing is recorded. During audits, missing documentation leads to compliance violations.",
  "repair_guidance": "Either (a) implement the mutation endpoints and wire the buttons to real API calls with proper error handling, or (b) visibly disable the non-functional buttons with a clear 'Not yet available' state (disabled button with tooltip) instead of presenting them as interactive. For food safety compliance specifically, the Acknowledge and Resolve buttons should be high priority since they represent audit trail documentation.",
  "example_source": {
    "file": "app/(authenticated)/kitchen/iot/iot-page-client.tsx",
    "line_or_snippet": "<Button size=\"sm\" variant=\"outline\" onClick={() => toast.info(\"Alert acknowledgement coming soon\")}>\n  Acknowledge\n</Button>"
  }
}
```

### Implementation note
The detector should scan TSX/JSX component files and calculate the ratio of `onClick` handlers that call `toast.info`/`toast.warning` with static strings vs. those that call `apiFetch`/server actions/`fetch`. Flag components where the dead-button ratio is ≥80% AND the page title/description implies management capability. A simpler regex heuristic: find files with ≥3 occurrences of `toast.info(".*coming soon")` or `toast.info(".*not.*available")` inside `onClick` handlers. Cross-file check: verify no corresponding POST/PUT/PATCH route exists for the claimed action domains.
---
## [2026-05-08 02:23] Rule Discovery — feature_claim_mismatch.rule_discovery_dsl_prose_arrays_in_structured_fields

### Finding
The rule discovery log claims each proposed detector must conform to the DSL contract, but the embedded rule JSON still writes `evidence_required` and `false_positive_controls` as prose arrays instead of structured objects. The downstream scanner silently drops those fields. So the rules look careful on paper and lose their guardrails at runtime.

### Evidence
- File: `SLOPSCOPE_RULE_DISCOVERY.md`
- Snippet:
  ```json
  "evidence_required": [
    "UI component rendering 'predictive' or 'confidence' values from this data",
    "No ML/statistical library imports in the codebase",
    "The 'prediction' function is pure arithmetic (multiply, add) with hardcoded constants"
  ],
  "false_positive_controls": [
    "Allow if a genuine ML model file (.pkl, .onnx, .pt, .h5) exists in the repo",
    "Allow if sklearn/tensorflow/prophet/statsmodels is in dependencies AND imported",
    "Allow if the function name includes 'mock' or 'stub' or 'placeholder'"
  ]
  ```
- Additional corroboration: the same malformed shape appears again in the later `automation_theater.toast_only_dead_buttons` entry.

### Why this matters
These malformed rules do not preserve the path constraints, companion checks, or false-positive filters the author thought they wrote. A downstream scan can overmatch, undermatch, or silently ignore the intended safety logic. In plain English: the rule log says “careful detector,” the scanner gets raw regex with the brakes missing.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.rule_discovery_dsl_prose_arrays_in_structured_fields",
  "title": "Rule proposal uses prose arrays where the DSL requires structured objects",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.99,
  "detector_type": "regex",
  "language_targets": ["markdown", "json"],
  "pattern": "\"(evidence_required|false_positive_controls)\"\\s*:\\s*\\[",
  "negative_patterns": [
    "\"evidence_required\": {",
    "\"false_positive_controls\": {"
  ],
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": false,
    "strip_comments": false,
    "path_match": [
      "(^|/)SLOPSCOPE_RULE_DISCOVERY\\.md$",
      "(^|/)SLOPSCOPE_RULE_IMPLEMENTATION_PLAN\\.md$",
      "(^|/)rules/.*\\.md$"
    ],
    "path_exclude": [
      "SLOPSCOPE_RULE_DISCOVERY_ARCHIVE/"
    ]
  },
  "evidence_required": {
    "min_pattern_count": 1
  },
  "user_impact": "Rule authors think they defined evidence gates and false-positive filters, but the scanner silently drops them. That makes detections noisier, weaker, and less trustworthy.",
  "repair_guidance": "Replace prose arrays under `evidence_required` and `false_positive_controls` with valid DSL objects using only the supported keys. Any intent that cannot be expressed structurally should move into `repair_guidance` or `implementation_note` instead of pretending the scanner will consume it.",
  "example_source": {
    "file": "SLOPSCOPE_RULE_DISCOVERY.md",
    "line_or_snippet": "\"evidence_required\": [\n  \"UI component rendering 'predictive' or 'confidence' values from this data\",\n  \"No ML/statistical library imports in the codebase\""
  }
}
```

### Implementation note
This detector can stay dumb and still be useful: line-scan markdown/json rule documents for `"evidence_required": [` or `"false_positive_controls": [`. The scanner only understands structured objects for those keys, so any array form is dead metadata. If you want fewer false positives, pair this with a second schema validator that verifies `pattern` is present as a string and rejects unsupported keys before rules ever enter the backlog.
---
## [2026-05-08 09:37] Rule Discovery — automation_theater.interactive_drilldown_toast_only

### Finding
The analytics Activity Feed page sells itself as a place to monitor organization-wide events and collaborator actions, but every drill-down click handler is a stub. Clicking an activity, user, or entity only logs to the console and shows a `toast.info("Viewing ...")` message instead of navigating anywhere.

### Evidence
- File: `app/(authenticated)/analytics/components/activity-feed-client.tsx`
- Snippet:
  ```tsx
  const handleActivityClick = (activity: ActivityFeedItem) => {
    console.log("Activity clicked:", activity);
    // Navigate to entity details if applicable
    if (activity.entityType && activity.entityId) {
      // Could navigate to entity detail page
      toast.info(`Viewing ${activity.entityType}: ${activity.title}`);
    }
  };

  const handleUserClick = (userId: string) => {
    console.log("User clicked:", userId);
    // Could navigate to user profile
    toast.info("Viewing user profile");
  };

  const handleEntityClick = (entityType: string, entityId: string) => {
    console.log("Entity clicked:", entityType, entityId);
    toast.info(`Viewing ${entityType}`);
  };
  ```
- Supporting claim file: `app/(authenticated)/analytics/activity-feed/page.tsx`
- Supporting snippet: `Monitor all system events, entity changes, AI plan approvals, and collaborator actions across your organization.`
- No `useRouter`, `router.push`, `router.replace`, or link navigation exists in `app/(authenticated)/analytics/components/activity-feed-client.tsx`.
- Official docs not required: generic implementation-evidence rule.

### Why this matters
An activity feed without working drill-down is audit-theater. Users can see that something happened but cannot inspect the related record, actor, or entity from the feed itself. For ops and compliance workflows, that means slower incident review, worse traceability, and a fake sense that the UI supports investigation when it really just chirps a toast.

### Proposed detector rule
```json
{
  "id": "automation_theater.interactive_drilldown_toast_only",
  "title": "Interactive drill-down handlers only log and toast instead of navigating",
  "category": "automation_theater",
  "severity": "medium",
  "confidence": 0.93,
  "detector_type": "regex",
  "language_targets": ["tsx", "jsx", "typescript", "javascript"],
  "pattern": "(console\\.log\\(\\\"(?:Activity|User|Entity) clicked:|toast\\.info\\((?:`Viewing \\\${(?:activity\\.entityType|entityType)}(?:: \\\${activity\\.title})?`|\\\"Viewing user profile\\\")|Could navigate to (?:entity detail page|user profile)|Navigate to entity details if applicable)",
  "negative_patterns": [
    "useRouter\\(",
    "router\\.(push|replace)\\(",
    "<Link\\b"
  ],
  "evidence_required": {
    "file_must_match": [
      "(activity|timeline|feed).*(client|widget)?\\.(t|j)sx?$"
    ],
    "min_pattern_count": 3,
    "companion_pattern": "on(Activity|User|Entity)Click\\s*=|const handle(Activity|User|Entity)Click\\s*="
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": false,
    "path_exclude": [
      "\\.examples?\\.(t|j)sx?$",
      "__tests__/",
      "tests/",
      "stories/"
    ]
  },
  "user_impact": "Users can see feed entries but cannot actually drill into the related entity or user from the interaction surface that implies they can.",
  "repair_guidance": "Wire click handlers to real navigation or modal/detail views, and stop using `toast.info(\"Viewing ...\")` as a stand-in for drill-down behavior.",
  "example_source": {
    "file": "app/(authenticated)/analytics/components/activity-feed-client.tsx",
    "line_or_snippet": "const handleUserClick = (userId: string) => {\n  console.log(\"User clicked:\", userId);\n  // Could navigate to user profile\n  toast.info(\"Viewing user profile\");\n};"
  }
}
```

### Implementation note
Keep this detector narrow. It should look for feed or timeline client components where click handlers named `handleActivityClick`, `handleUserClick`, or `handleEntityClick` only log and toast “Viewing ...” text, with no router navigation in the same file. That catches fake drill-down affordances without whining about ordinary debug logs.
---
