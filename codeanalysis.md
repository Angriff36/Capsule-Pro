## Combined Analysis Evidence Contract
To regenerate the analysis for a current snapshot, run npx tsx server/combinedAnalysis.ts C:/projects/capsule-pro > capsuleproanalysis.txt
Codebase Explorer can produce a machine-readable combined analysis of a target repository.

For Capsule-Pro, the current artifact is a `codebase-explorer/combined-analysis` v2 document.

This artifact is NOT merely two reports placed next to each other.

It is one coordinated evidence package produced from the same repository run:

1. Record exact git commit and dirty-worktree fingerprint.
2. Run Codebase Explorer.
3. Run Fallow.
4. Record the worktree fingerprint again.
5. Reject or mark the run unstable if the repository changed during analysis.
6. Normalize both tools' paths.
7. Record the exact Fallow scan universe.
8. Reconcile evidence by canonical file identity.
9. Preserve detailed evidence from both tools.

The current Capsule-Pro artifact proves the repository was stable during the run and contains:

- the complete Explorer file universe
- the complete Fallow scan universe
- Explorer reachability and dependency evidence
- Explorer suspicions and clustered root causes
- Fallow complexity findings
- Fallow file-health data
- Fallow hotspot/churn data
- explicit coverage state for every Explorer file
- normalized cross-tool reconciliation records

### Why this is useful

The artifact answers several different questions that neither tool can answer alone.

Explorer answers:

- Is this file reachable from product, package, operational, or test roots?
- What imports it?
- What does it import?
- Is it dead according to the dependency graph?
- Is it test-only?
- Is generated code unconsumed?
- Is handwritten code live while a generated counterpart is orphaned?
- Is a re-export shim dead?
- Are there disconnected or parallel architecture paths?

Fallow answers:

- Is this file or function complex?
- Which function is complex?
- Where is it?
- What are its cyclomatic and cognitive scores?
- Is the file a hotspot?
- How often has it changed?
- Is churn accelerating, stable, or cooling?
- What is the file's maintainability and health profile?
- Does it contain unresolved imports or other static-analysis findings?

The combined artifact lets us ask materially stronger questions:

- Which files are graph-dead AND complex?
- Which graph-dead files are also frequently changed?
- Which test-only production modules are complex or hot?
- Which generated files are unconsumed but repeatedly regenerated or changed?
- Where is handwritten live code carrying complexity while a generated alternative is orphaned?
- Where do Explorer and Fallow actually disagree?
- Where is comparison impossible because one tool did not scan the file?

These intersections are investigation priorities.

They are not automatic verdicts.

### Coverage truth

Never confuse:

- "Fallow scanned this file and found nothing"
- "Fallow did not scan this file"

The artifact explicitly distinguishes them.

Use these states:

- `SCANNED_BY_BOTH`
  - both tools analyzed the file

- `FALLOW_SCANNED_NO_FINDINGS`
  - Fallow definitely scanned the file but emitted no finding/evidence

- `EXPLORER_OUTSIDE_FALLOW_SCOPE`
  - Explorer analyzed the file, but Fallow did not

Never infer that a file is clean merely because Fallow has no finding.

Never infer that a Fallow finding is absent when the file was outside Fallow's scope.

### Evidence interpretation rules

#### DEAD does not mean safe to delete

Explorer `DEAD` means:

> No production/package/operational/test path known to the current dependency model reaches this file.

Before deletion, verify:

- dynamic imports
- string-based references
- configuration references
- framework filesystem conventions
- package exports
- scripts and CLI invocation
- workers/assets
- registries
- code generation
- Manifest dispatch or registration
- runtime loading invisible to the static graph

A dead file with complexity and hotspot evidence is a HIGH-VALUE INVESTIGATION TARGET.

It is not automatically a deletion target.

#### Fallow finding absence does not mean LIVE

Fallow not reporting a file is not opposite proof of Explorer's result.

Check coverage state first.

#### Test-only does not mean test file

`test_only_module` means production-looking code is reachable from tests but not from a known production path.

It does not mean the target itself is a test.

Investigate whether:

- production wiring is missing
- Explorer missed a framework/config/runtime entry path
- obsolete code is preserved only by tests
- the tests exercise a parallel implementation

#### Handwritten-live + generated-orphaned does not automatically mean Manifest bypass

This is a strong architecture investigation candidate.

A HIGH-confidence `MANIFEST_BYPASS` requires explicit proof that:

1. Manifest defines the same entity/command/rule/computed behavior.
2. A generated or runtime implementation exists for that exact behavior.
3. Production reaches the handwritten alternative.
4. The intended Manifest path is not reached.

Do not use fuzzy filename similarity alone.

Until those relationships are proven, classify it as:

- `HANDWRITTEN_LIVE_GENERATED_ORPHANED`
- `WRONG_FILE_OWNER`
- or another architecture contradiction

not automatically `MANIFEST_BYPASS`.

### Required reasoning model

For every candidate, combine:

GRAPH
- Is it real?
- Is it reachable?
- From what root?
- Through what path?

FALLOW
- Is it complex?
- Is it duplicated?
- Is it a hotspot?
- Is it unhealthy?
- Where exactly is the risky function?

OWNERSHIP
- Does this behavior belong here?
- Is there another generated, handwritten, legacy, or framework-owned implementation?

The combined artifact is valuable because it narrows where source reading is necessary.

Do not re-audit the entire repository manually.

Use the artifact to identify the exact contradiction first, then read only the files needed to prove or disprove it.

### Required workflow

For each candidate:

1. Start from the combined artifact.
2. Identify the exact file and evidence intersection.
3. State what each tool actually proved.
4. State what remains unproven.
5. Find real consumers and runtime/config/registry references.
6. Trace the real production path.
7. Check generated, handwritten, legacy, and alternate implementations.
8. Identify the actual owner/source of truth.
9. Run existing verification.
10. Assign a verdict.

Allowed verdicts:

- COMPLETE
- PARTIAL
- DEAD
- DUPLICATE
- MISWIRED
- UNKNOWN

Allowed proof levels:

- GRAPH-PROVEN
- SOURCE-PROVEN
- RUNTIME-PROVEN

Do not present GRAPH-PROVEN evidence as runtime proof.

### High-value candidate intersections

Prioritize combinations such as:

- `DEAD + COMPLEX + HOTSPOT`
- `TEST_ONLY + COMPLEX + HOTSPOT`
- `GENERATED_UNCONSUMED + HOTSPOT`
- `HANDWRITTEN_LIVE_GENERATED_ORPHANED + COMPLEX`
- `HANDWRITTEN_LIVE_GENERATED_ORPHANED + HOTSPOT`
- explicit Explorer/Fallow disagreements
- unresolved imports affecting high-impact files
- dead compatibility shims
- disconnected feature layers
- parallel production architectures

These combinations mean:

> investigate first

not:

> auto-fix or auto-delete

### Task-generation requirements

When producing a work queue from the combined artifact, every task must contain:

- stable finding ID
- exact target files
- exact Explorer evidence
- exact Fallow evidence
- coverage state
- why the intersection matters
- what is proven
- what is still unknown
- required source verification
- expected verdict or decision
- permitted agent autonomy
- exact verification commands
- confidence

Preferred task shape:

```yaml
finding_id:
tier:
title:
targets:

evidence:
  explorer:
  fallow:
  reconciliation:
  coverage:

why_this_matters:

proven:

not_yet_proven:

required_investigation:

allowed_actions:

forbidden_shortcuts:

verification:

expected_output:

confidence: