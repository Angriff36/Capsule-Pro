# SlopScope Rule Implementation Plan

## Backlog

- [ ] `dashboard_illusion.fake_predictive_analytics` — Fake predictive analytics: hardcoded arithmetic presented as ML prediction
  - Category: dashboard_illusion
  - Severity: high
  - Detector type: hybrid
  - Source evidence: `app/(authenticated)/analytics/clients/actions/get-client-ltv.ts`
  - Future implementation: Cross-file detector that finds "predictive" functions returning "confidence" fields with hardcoded stepped values, then verifies no ML library exists in the dependency tree.

- [ ] `automation_theater.toast_only_dead_buttons` — All interactive buttons are toast.info stubs: page presents management UI but every action is dead
  - Category: automation_theater
  - Severity: high
  - Detector type: hybrid
  - Source evidence: `app/(authenticated)/kitchen/iot/iot-page-client.tsx`
  - Future implementation: Scan component files for ≥3 `onClick` handlers that only call `toast.info("...coming soon")` with no real API calls, then cross-check for missing mutation endpoints.

- [ ] `feature_claim_mismatch.rule_discovery_dsl_prose_arrays_in_structured_fields` — Rule proposal uses prose arrays where the DSL requires structured objects
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: regex
  - Source evidence: `SLOPSCOPE_RULE_DISCOVERY.md`
  - Future implementation: Flag any rule document that writes `evidence_required` or `false_positive_controls` as arrays instead of DSL objects.

- [ ] `automation_theater.interactive_drilldown_toast_only` — Interactive drill-down handlers only log and toast instead of navigating
  - Category: automation_theater
  - Severity: medium
  - Detector type: regex
  - Source evidence: `app/(authenticated)/analytics/components/activity-feed-client.tsx`
  - Future implementation: Flag feed/timeline client components whose click handlers only log and show `toast.info("Viewing ...")` text without any router navigation in the same file.
