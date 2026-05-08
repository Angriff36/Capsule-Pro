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
