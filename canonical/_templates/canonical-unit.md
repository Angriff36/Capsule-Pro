# [Canonical Name]

Canonical ID: `[area.subarea.name]`

Type: `feature | manifest-capability | generator | route | page | data-model | integration | ci-check | workflow | unknown`

Owner decision status: `final | tentative | needs-ryan | unknown`

Implementation status: `not-started | partial | working | broken | deprecated | removed | unknown`

Last reviewed: `YYYY-MM-DD`

Last updated by: `[agent/name]`

---

## 1. What This Is

Plain-English purpose:

```text
[What this thing does and why it exists.]
```

Real app impact:

```text
When correct:
- [What improves.]

When wrong:
- [What breaks, duplicates, drifts, or confuses users/agents.]
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
[Why this is the decision, if known.]
```

Do not do:

```text
[Things agents must not reintroduce, rename, route around, duplicate, or silently replace.]
```

Agents may update evidence below, but may not overwrite this section unless Ryan explicitly gives the decision.

---

## 3. Current Status

Current recorded status:

```text
[What exists right now.]
```

Known gaps:

```text
[What is missing, stale, half-wired, duplicated, broken, or unclear.]
```

Confidence: `high | medium | low`

Evidence:

```text
[Repo paths, docs paths, package scripts, command output, CI links, PR links, or source references.]
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/[path]/README.md
```

Source location:

```text
[path or NONE or UNKNOWN]
```

Generated output location:

```text
[path or NONE or UNKNOWN]
```

Runtime location:

```text
[path or NONE or UNKNOWN]
```

UI location:

```text
[path or NONE or UNKNOWN]
```

Test location:

```text
[path or NONE or UNKNOWN]
```

Docs location:

```text
[path or NONE or UNKNOWN]
```

---

## 5. Entry Points

User-facing route:

```text
[/route or NONE or UNKNOWN]
```

Route file:

```text
[path or NONE or UNKNOWN]
```

API route / dispatcher:

```text
[path or NONE or UNKNOWN]
```

CLI command:

```text
[command or NONE or UNKNOWN]
```

Background job / cron / worker:

```text
[path or NONE or UNKNOWN]
```

---

## 6. What Consumes It

Direct consumers:

```text
[Files/packages/features that directly import, call, render, or generate from this.]
```

Indirect consumers:

```text
[Features/pages/workflows affected by this.]
```

Generated consumers:

```text
[Generated clients/hooks/types/routes that depend on this.]
```

Human consumers:

```text
[Ryan, admins, staff, customers, agents, CI, etc.]
```

---

## 7. What It Is Wired To

Manifest entities:

```text
[Entity names or NONE or UNKNOWN]
```

Manifest commands:

```text
[Command names or NONE or UNKNOWN]
```

Manifest events:

```text
[Event names or NONE or UNKNOWN]
```

Manifest policies / access rules:

```text
[Policy names or NONE or UNKNOWN]
```

Database tables / collections:

```text
[Names or NONE or UNKNOWN]
```

Generated types:

```text
[Paths/type names or NONE or UNKNOWN]
```

Generated client/hooks:

```text
[Paths/function names or NONE or UNKNOWN]
```

Forms/pages/components:

```text
[Paths or NONE or UNKNOWN]
```

---

## 8. Canonical Behavior

Happy path:

```text
[What should happen when this works.]
```

Failure behavior:

```text
[What should happen when input is invalid, auth fails, generated code is stale, data is missing, etc.]
```

Forbidden behavior:

```text
[Silent fallback, duplicate custom logic, raw DB bypass, fake guards, route-specific business logic, stale generated files, etc.]
```

---

## 9. Naming Rules

Canonical name:

```text
[Exact name]
```

Allowed aliases:

```text
[Aliases or NONE]
```

Forbidden aliases:

```text
[Names agents must not use]
```

Casing / slug rules:

```text
[Example: BattleBoard entity, battle-board route, battleBoard variable.]
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 |          |                |                |         | NEEDS-RYAN    |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| YYYY-MM-DD |          | Ryan    |        |
