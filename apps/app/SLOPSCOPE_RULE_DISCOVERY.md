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
