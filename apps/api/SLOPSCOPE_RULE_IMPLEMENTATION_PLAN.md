# SlopScope Rule Implementation Plan

- [ ] feature_claim_mismatch.rule_index_claims_scanner_ready_rules_that_have_no_detector_json — Rule index lists rules as discovered/scanner-ready but linked docs lack detector JSON
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: hybrid
  - Source evidence: rule-index.md, rules/automation_theater.audit_log_console_only.md
  - Future implementation: Cross-file detector that parses rule-index links and verifies each linked doc contains a canonical detector JSON with a `pattern` field.

- [ ] feature_claim_mismatch.brainstorm_rules_reference_undefined_build_phases — Documentation references structured build phases but no phase definitions or roadmap exists
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: rule-index.md, rules/brainstorm.era_platitudes.md
  - Future implementation: Cross-file detector that scans index/manifest files for phase metadata references and verifies a phase definition document exists in the repo.

- [ ] feature_claim_mismatch.rule_index_severity_breakdown_has_fabricated_statistics — Severity breakdown table contains counts that don't match actual rule entry annotations
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: rule-index.md lines 126-128
  - Future implementation: Hybrid detector that parses severity breakdown tables and cross-references counts against actual rule entry severity annotations, flagging internal and external inconsistencies.

- [ ] feature_claim_mismatch.rule_index_brainstorm_section_count_and_format_inconsistency — Section header count doesn't match actual list entries and list uses inconsistent metadata formats
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: rule-index.md lines 95-120
  - Future implementation: Hybrid detector that parses section headers with parenthesized counts, counts actual list entries between section boundaries, and detects inconsistent metadata formats within a single list section.

- [ ] feature_claim_mismatch.rule_docs_use_non_canonical_detector_json_schema — Rule doc detector JSON uses non-canonical patterns array and prose evidence/false_positive fields instead of DSL-conformant schema
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: regex
  - Source evidence: rules/fake_integration.payment_gateway_always_success_placeholder.md (all 25 full-format rule docs)
  - Future implementation: Regex detector that scans rule doc JSON blocks for `"patterns"` array (without canonical `"pattern"` string) and prose-style `evidence_required`/`false_positive_controls` arrays, flagging non-conformant DSL schema usage.

- [ ] feature_claim_mismatch.rule_doc_patterns_are_prose_descriptions_not_executable_regex — Rule doc detection patterns are English prose descriptions rather than executable regex
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: regex
  - Source evidence: rules/automation_theater.cron_endpoint_never_scheduled.md (12 of 25 full-format rule docs)
  - Future implementation: Regex detector that identifies rule doc pattern strings that are English prose descriptions (>40 chars, common English stopwords, no regex metacharacters) rather than executable regex patterns, flagging rules whose detection logic is content-inert.

- [ ] feature_claim_mismatch.violations_summary_fabricates_severity_counts — Summary section severity counts disagree with actual entry severity annotations
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: violations.md lines 288-304
  - Future implementation: Hybrid detector that parses summary section severity counts and cross-references against actual per-entry severity annotations, flagging discrepancies.

- [ ] feature_claim_mismatch.violations_doc_fabricates_source_attribution — Report claims source files that don't contain the reported data
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: violations.md line 4
  - Future implementation: Cross-file detector that parses Source lines in report files and verifies that the claimed source files actually contain the data being reported.

- [ ] feature_claim_mismatch.rule_index_discovered_section_header_inflates_rule_count — Section header claims N entries but actual list entry count differs
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: rule-index.md line 11
  - Future implementation: Hybrid detector that parses markdown section headers with parenthesized counts and verifies them against actual list entry counts between section boundaries.

- [ ] test_theater.tests_assert_on_mirrored_constants_not_imported_code — Tests assert on mirrored constants and self-created objects instead of imported production code
  - Category: test_theater
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts
  - Future implementation: Hybrid detector that scans test files for expect(true).toBe(true) tautological assertions alongside test names referencing specific production functions, verifying the functions are not actually imported or invoked.

- [ ] feature_claim_mismatch.rule_index_total_count_disagrees_with_section_counts — Rule index total count disagrees with section counts or actual list entries
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: rule-index.md
  - Future implementation: Hybrid detector that parses the headline total, section header counts, and actual bullet entries in index files, then flags when those totals disagree.

- [ ] fake_integration.client_fabricates_gateway_ids_with_date_now — Client fabricates gateway/external IDs with Date.now() instead of calling real service
  - Category: fake_integration
  - Severity: critical
  - Detector type: regex
  - Source evidence: apps/app/app/(authenticated)/accounting/invoices/components/payment-form-client.tsx
  - Future implementation: Regex detector that finds Date.now() inside template literals assigned to gateway identifier keys (transactionId, externalMethodId, etc.) with companion pattern requiring payment/gateway context and negative patterns suppressing files that import real gateway SDKs.

- [ ] feature_claim_mismatch.rule_index_omits_existing_rule_doc_files — Rule index claims completeness but silently drops existing rule doc files from navigation
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: rule-index.md, rules/ (3 orphaned files including 1 critical)
  - Future implementation: Cross-file detector that globs rule doc files, extracts index links, computes set difference, and flags orphaned files.

- [ ] feature_claim_mismatch.violation_report_inflated_by_duplicate_source_file_entries — Violation report lists multiple entries for the same source file describing the same underlying issue
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: semantic
  - Source evidence: violations.md (dashboard_illusion category, lines 224-232)
  - Future implementation: Semantic detector that extracts Files field paths from violation entries, identifies duplicate file paths, and uses keyword overlap on Description text to distinguish true duplicates from different violations in the same file.

- [ ] feature_claim_mismatch.brainstorm_log_fragmented_across_two_files — Brainstorm rule provenance records are split across two log files with inconsistent naming and formatting
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: SLOPSCOPE_RULE_BRAINSTORM.md, capsule-pro/SLOPSCOPE_RULE_BRAINSTORM.md, rules/brainstorm.*.md
  - Future implementation: Cross-file detector that identifies all brainstorm log files, extracts entry IDs, globs rule docs, and flags when no single log contains all entries.

- [ ] feature_claim_mismatch.implementation_plan_file_contains_discovery_log_content — File named IMPLEMENTATION_PLAN contains discovery log entries instead of implementation plan items
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: regex
  - Source evidence: capsule-pro/IMPLEMENTATION_PLAN.md
  - Future implementation: Regex detector that scans IMPLEMENTATION_PLAN.md files for discovery log markers (dated Rule Discovery headers) and flags when no backlog-format items are present, indicating a filename/content mismatch.

- [ ] feature_claim_mismatch.brainstorm_log_chronological_order_violation — Brainstorm log entry appears out of chronological sequence
  - Category: feature_claim_mismatch
  - Severity: low
  - Detector type: cross_file
  - Source evidence: SLOPSCOPE_RULE_BRAINSTORM.md
  - Future implementation: Hybrid detector that parses timestamped log entry headers in *BRAINSTORM*.md and *DISCOVERY*.md files and verifies monotonically increasing chronological ordering, flagging any file where a timestamp is less than its predecessor.

- [ ] feature_claim_mismatch.duplicate_rule_docs_for_same_source_evidence — Duplicate rule doc files describe the same source evidence with overlapping detection scope
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: rules/dashboard_illusion.analytics_reads_from_orphaned_aggregation_table.md, rules/dashboard_illusion.analytics_queries_ghost_aggregation_table.md
  - Future implementation: Cross-file detector that globs rule doc files, extracts source file path references, groups by shared source evidence, and flags groups of 2+ rule docs with high semantic overlap in their descriptions as duplicate coverage.

- [ ] feature_claim_mismatch.rule_index_presents_stub_docs_as_scanner_ready_rules — Rule-index lists stub-format docs (no detector JSON) as scanner-ready discovered rules
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: hybrid
  - Source evidence: rules/skeleton_crud.hardcoded_validation_always_passes.md (25 stub docs in rules/)
  - Future implementation: Hybrid detector that scans rules/*.md for `## Proposed Implementation` (stub marker) instead of `## Proposed Detector Rule`, cross-references against rule-index to verify stub docs aren't falsely presented as scanner-ready.

- [ ] placeholder.brainstorm_rule_doc_missing_frontmatter_metadata — Brainstorm rule doc file missing Category, Severity, Detector sketch, and Source frontmatter
  - Category: placeholder
  - Severity: medium
  - Detector type: regex
  - Source evidence: rules/brainstorm.hedge_sandwich.md (9 files)
  - Future implementation: Regex detector that scans rules/brainstorm.*.md for `## Rule Pitch` Title Case headers and flags files missing canonical frontmatter fields (`**Category:**`, `**Severity:**`, `**Detector sketch:**`, `**Source:**`).

- [ ] feature_claim_mismatch.rule_index_severity_disagrees_with_rule_doc — Rule-index severity annotation disagrees with the severity declared in the rule document itself
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: rule-index.md (line 31) vs rules/dashboard_illusion.simulated_gps_tracking_data.md (line 4)
  - Future implementation: Cross-file detector that parses rule-index link lines, extracts each rule's index-declared severity and linked doc path, opens the rule doc, extracts `**Severity:**` frontmatter, and flags disagreements plus absent severities (stub docs).

- [ ] feature_claim_mismatch.brainstorm_log_entry_header_format_inconsistency — Brainstorm log entry header uses non-standard separator character differing from prevailing entry format
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: regex
  - Source evidence: SLOPSCOPE_RULE_BRAINSTORM.md line 39
  - Future implementation: Regex detector that scans *BRAINSTORM*.md and *DISCOVERY*.md log files for entry headers with non-standard separator characters (e.g., `--` double hyphen where prevailing convention is `—` em dash), using companion pattern to confirm the file's canonical format and flagging entries that deviate.

- [ ] placeholder.detect_platform_always_returns_hardcoded_constant — detectPlatform function always returns hardcoded literal without inspecting input
  - Category: placeholder
  - Severity: medium
  - Detector type: regex
  - Source evidence: openclaw/ClawGuard/src/cli/scan.ts
  - Future implementation: Regex detector that finds functions matching naming pattern `detect(Platform|PlatformFrom|OsType|Os)` whose body contains only `return <string literal>;` with no parameter usage, using negative patterns to suppress real implementations that call `.test()`, `.match()`, `process.platform`, etc.
