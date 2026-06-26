# Manifest Type Generation

Canonical ID: `manifest.generation.type-generation`

Type: `generator`

Owner decision status: `needs-ryan`

Implementation status: `unknown`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Defines whether Manifest generates TypeScript types, which command generates them, where they are emitted, and what app code is allowed to consume them.
```

Real app impact:

```text
When correct:
- App code, generated clients, forms, commands, and tests use the same Manifest contract.
- Agents stop inventing duplicate local interfaces.
- Stale generated code becomes visible in CI.

When wrong:
- Types drift from Manifest.
- Agents add sloppy null guards and fake isRecord-style checks.
- Forms and command payloads can compile while being wrong at runtime.
- Generated files may exist but not be the actual source used by the app.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Ryan wants Manifest to be the source of truth, but the final generated output path and allowed consumers still need to be finalized.
```

Do not do:

```text
Do not hand-write duplicate Manifest entity, command, or event types in random app folders.
Do not create local fallback types because generated types are inconvenient to import.
Do not guess the generation command without source evidence.
Do not wire app code to stale generated output.
```

---

## 3. Current Status

Current recorded status:

```text
UNKNOWN until verified from repo scripts, Manifest docs, generated output, and current imports.
```

Known gaps:

```text
Need to confirm:
1. Whether Manifest currently generates TypeScript types.
2. Which command generates them.
3. Where they generate today.
4. Whether the app imports them directly.
5. Whether CI verifies generated types are up to date.
6. Whether Ryan wants types emitted inside manifest/, a shared package, or app-local generated output.
```

Confidence: `low`

Evidence:

```text
SOURCE REQUIRED
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/generation/type-generation/README.md
```

Source location:

```text
UNKNOWN
```

Generated output location:

```text
UNKNOWN
```

Runtime location:

```text
UNKNOWN
```

UI location:

```text
NONE
```

Test location:

```text
UNKNOWN
```

Docs location:

```text
UNKNOWN
```

---

## 5. Entry Points

User-facing route:

```text
NONE
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
NONE
```

CLI command:

```text
UNKNOWN
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
UNKNOWN
```

Indirect consumers:

```text
Forms, generated clients, command submitters, API boundaries, route handlers, tests, and agents editing typed app code.
```

Generated consumers:

```text
UNKNOWN
```

Human consumers:

```text
Ryan, coding agents, CI.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
UNKNOWN
```

Manifest commands:

```text
UNKNOWN
```

Manifest events:

```text
UNKNOWN
```

Manifest policies / access rules:

```text
UNKNOWN
```

Database tables / collections:

```text
NONE
```

Generated types:

```text
UNKNOWN
```

Generated client/hooks:

```text
UNKNOWN
```

Forms/pages/components:

```text
UNKNOWN
```

---

## 8. Canonical Behavior

Happy path:

```text
Manifest generates TypeScript types from the same source of truth used for entities, commands, events, policies, and generated clients. App code imports those types only from the approved canonical location.
```

Failure behavior:

```text
If generation fails or generated files are stale, CI should fail instead of allowing agents to keep coding against old contracts.
```

Forbidden behavior:

```text
No duplicate hand-written app types.
No random local interfaces for Manifest command payloads.
No generated output path guessing.
No imports from obsolete generated folders.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Type Generation
```

Allowed aliases:

```text
Manifest types
Generated Manifest types
```

Forbidden aliases:

```text
Random app types
Local Manifest interfaces
Temporary command payload types
```

Casing / slug rules:

```text
Folder: type-generation
Canonical ID: manifest.generation.type-generation
```

---

## 10. Open Questions

| ID   | Question                                                  | Why it matters                                                                     | Evidence found  | Options                                                                                   | Ryan decision |
| ---- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- | ------------- |
| Q001 | Where should Manifest-generated types be emitted?         | Determines stable import path and prevents duplicate hand-written types.           | SOURCE REQUIRED | A: `manifest/generated/types`; B: shared package; C: app-local generated folder           | NEEDS-RYAN    |
| Q002 | What command generates the types?                         | Agents and CI need one repeatable command.                                         | SOURCE REQUIRED | Use only documented Manifest CLI/package script/source-backed command.                    | NEEDS-RYAN    |
| Q003 | What code is allowed to consume generated types directly? | Prevents random feature folders from depending on unstable output.                 | SOURCE REQUIRED | A: generated client only; B: app code may import directly; C: shared package exports only | NEEDS-RYAN    |
| Q004 | Should CI fail when generated types are stale?            | Prevents agents from pushing changes that compile locally but drift from Manifest. | SOURCE REQUIRED | A: required CI check; B: warning only; C: local-only check                                | NEEDS-RYAN    |
