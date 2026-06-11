# Event Tree Command Board — v1 Implementation Plan (Slices 1–2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-event Command Board tab rendering the event as a template-driven tree, with the Staff branch working end-to-end: drag staff → draft card → impact preview (labor cost + double-booking conflicts) → atomic governed commit.

**Architecture:** Drafts are `CommandBoardCard` rows whose envelope lives in the `metadata` JSON field (no manifest source changes). Impact preview is a pure read path. Commit is a new `apps/api` endpoint that threads one Prisma transaction through the Manifest runtime via `prismaOverride` (the proven payroll pattern), executing `EventStaff.assign` per draft + the card flips inside the same transaction. Templates are advisory UI definitions, never Manifest constraints.

**Tech Stack:** Next.js App Router (apps/app UI + server actions, apps/api commit route), `@repo/manifest-runtime` (`runManifestCommandCore`), Prisma reads, `@dnd-kit/core` (already a dependency), TanStack Query (provider already mounted), Tailwind + `@repo/design-system`, Vitest.

**Spec:** `specs/event-tree-command-board.md` (approved). Out of scope for this plan: Menu/Vehicles/Equipment branches as draggable (render read-only), `EventResourceAssignment` entity, AI chat panel, battle board picker integration — follow-up plans.

---

## Verified codebase facts (do not re-derive; re-verify only if a step fails)

- **Command execution from apps/app:** server actions call `runManifestCommand({ entity, command, body, user, ... })` from `apps/app/lib/manifest-command.ts` (HTTP POST to the API dispatcher). **Result shape is `{ ok, message, result }` — NOT `{ success, error }`.** Created instance ids are read as `(result.result as { id?: string })?.id` — see `createBoardAction` in `apps/app/app/(authenticated)/command-board/actions.ts` and copy its imports, auth/user resolution, and result handling verbatim.
- **`CommandBoard.create` params:** `(name, description, eventId, isTemplate, tags, autoPopulate, scope)` — `eventId` is a real param (`manifest/source/events/command-board-rules.manifest:32`).
- **`CommandBoardCard` commands:** `create(boardId, title, content, cardType, status, positionX, positionY, width, height, color, metadata, groupId, entityId, entityType)` (line 134); `update(newTitle, newContent, newCardType, newStatus, newColor, newMetadata, newGroupId)` — **full-field update**: every mutate runs, so callers MUST pass current values for fields they don't change (line 158); `remove(userId)` (line 205).
- **Two enum constraints on cards (both `block` severity):** `status` must be in `["pending","in_progress","done","blocked","cancelled"]` AND `cardType` must be in `["task","note","reference","checklist","entity"]` (line ~125). **Draft cards use `cardType: "entity"` and `status: "pending"`** — draft identity comes ONLY from the metadata envelope.
- **`CommandBoardCard.metadata` is a Prisma `Json` column** (`schema.prisma:1534`: `metadata Json @default("{}")`), while the manifest property/command param is `string`. Reads via Prisma return `Prisma.JsonValue` — sometimes a JSON **string**, sometimes an already-parsed **object**. All envelope parsing must accept `unknown` and normalize both forms.
- **`EventStaff.assign` params (IR):** `(eventId, staffMemberId, role, notes, shiftStart: datetime, shiftEnd: datetime)`; sets `status="assigned"` (`manifest/source/events/event-staff-rules.manifest:44`). Datetime params = ISO strings.
- **⚠ Live-schema drift (fixed by Task 4 of this plan):** `EventStaff.shiftStart`/`shiftEnd` are `Int? @default(0)` in the live schema (`schema.prisma:6510`) while the IR declares them `datetime`. No production path has ever written a real shift time (all callers pass `0`). Task 4 migrates the columns to `Timestamptz` BEFORE any code that reads/writes real shift times.
- **`staffMemberId` semantics:** in production data it holds an **employees (`User` model) id** — the event staff page joins `event_staff."staffMemberId"` to `employees.id` (`apps/app/app/(authenticated)/events/[eventId]/staff/page.tsx:92-101`). The palette must list `database.user` rows and pass `user.id` as `staffMemberId`.
- **Staff fields on `User` (`@@map("employees")`, tenant_staff):** `firstName`, `lastName`, `role`, `hourlyRate Decimal?` (`@db.Decimal(10,2)` — serialize with `.toFixed(2)`), `avatarUrl`, `isActive`, `deletedAt`.
- **Shared-transaction pattern:** `apps/api/lib/payroll/manifest-payroll-data-source.ts:35-39` — `makeCoreDeps(prismaOverride)` returns `{ createRuntime: ({user, entityName}) => createManifestRuntime({user, entityName, prismaOverride}) }`; calls `runManifestCommandCore(deps, { entity, command, body, user, instanceId? })` from `@repo/manifest-runtime/run-manifest-command-core`. Wrap in `database.$transaction(async (tx) => { ... })`, pass `tx` as `prismaOverride`.
- **API route auth:** `requireCurrentUser()` (no arguments) from the same import the manifest dispatcher route uses (`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`).
- **Tabs:** `apps/app/app/(authenticated)/events/[eventId]/event-details-client/event-detail-tabs.tsx` — `PLANNING_TABS` array (line ~23), `TAB_LABELS` map, tab content arrives via props on `EventDetailTabsProps`.
- **Tests:** Vitest. App tests under `apps/app/__tests__/`. Run: `pnpm --filter app exec vitest run <path>`. API tests under `apps/api/__tests__/`: `pnpm --filter api exec vitest run <path>`.
- **Constitution:** draft card writes = governed commands (already are); impact preview = read path (§10, direct Prisma reads fine, must stay advisory); commit = governed commands via core wrapper; never hand-edit generated files; no `.js` extensions in imports; migrations ONLY via `pnpm db:dev --create-only` (never hand-author a migration folder).

## File structure

```
apps/app/app/(authenticated)/events/[eventId]/board/
  templates.ts                 # EventBoardTemplate defs + completeness (pure)
  draft-metadata.ts            # draft envelope parse/serialize/merge (pure)
  impact.ts                    # computeStaffImpact (pure)
  actions.ts                   # server actions (reads + governed draft card writes + commit call)
  board-hooks.ts               # React Query hooks
  components/
    event-board-tab.tsx        # server component (data load)
    board-client.tsx           # three-pane layout (client)
    tree-outline.tsx           # left outline + completeness bars
    palette.tsx                # drag palette (dnd-kit)
    tree-canvas.tsx            # hub + SVG branches + leaf boxes
    staff-token.tsx            # expandable avatar token
    impact-rail.tsx            # right rail impact panel
    commit-dialog.tsx          # review & commit dialog
apps/api/lib/event-board/
  commit-event-board-drafts.ts # transaction orchestrator
apps/api/app/api/command-board/[boardId]/commit/
  route.ts                     # POST route
apps/app/__tests__/board/      # unit tests (metadata, templates, impact)
apps/api/__tests__/event-board/ # commit orchestrator tests
packages/database/prisma/      # Task 4 migration (shift columns Int -> Timestamptz)
```

---

### Task 1: Draft metadata module (pure, TDD)

**Files:**
- Create: `apps/app/app/(authenticated)/events/[eventId]/board/draft-metadata.ts`
- Test: `apps/app/__tests__/board/draft-metadata.test.ts`

The draft envelope lives under a single namespaced key inside the card's `metadata` JSON, merged with (never replacing) other keys. **Input is `unknown`** because Prisma's `Json` column can return either a JSON string or an already-parsed object.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/app/__tests__/board/draft-metadata.test.ts
import { describe, expect, it } from "vitest";
import {
  type DraftEnvelope,
  parseDraftEnvelope,
  writeDraftEnvelope,
} from "@/app/(authenticated)/events/[eventId]/board/draft-metadata";

const staffDraft: DraftEnvelope = {
  draftAction: {
    kind: "assign-staff",
    entityType: "User",
    entityId: "user-1",
    params: {
      role: "server",
      shiftStart: "2026-06-28T16:00:00.000Z",
      shiftEnd: "2026-06-28T23:00:00.000Z",
    },
  },
  draftState: "draft",
  committedRecordId: null,
};

describe("parseDraftEnvelope", () => {
  it("parses the envelope from a JSON string (manifest-written form)", () => {
    const metadata = JSON.stringify({ eventBoardDraft: staffDraft, other: 1 });
    expect(parseDraftEnvelope(metadata)).toEqual(staffDraft);
  });

  it("parses the envelope from an already-parsed object (Prisma Json form)", () => {
    expect(parseDraftEnvelope({ eventBoardDraft: staffDraft })).toEqual(staffDraft);
  });

  it("returns null when no envelope is present", () => {
    expect(parseDraftEnvelope("{}")).toBeNull();
    expect(parseDraftEnvelope({ other: 1 })).toBeNull();
    expect(parseDraftEnvelope(null)).toBeNull();
    expect(parseDraftEnvelope(undefined)).toBeNull();
  });

  it("returns null for malformed JSON or malformed envelope (never throws)", () => {
    expect(parseDraftEnvelope("not json")).toBeNull();
    expect(parseDraftEnvelope({ eventBoardDraft: { nope: true } })).toBeNull();
  });
});

describe("writeDraftEnvelope", () => {
  it("merges into existing string metadata keys instead of overwriting them", () => {
    const existing = JSON.stringify({ pinned: true });
    const out = JSON.parse(writeDraftEnvelope(existing, staffDraft));
    expect(out.pinned).toBe(true);
    expect(out.eventBoardDraft.draftState).toBe("draft");
  });

  it("merges into existing object metadata", () => {
    const out = JSON.parse(writeDraftEnvelope({ pinned: true }, staffDraft));
    expect(out.pinned).toBe(true);
    expect(out.eventBoardDraft.draftAction.entityId).toBe("user-1");
  });

  it("tolerates malformed existing metadata by starting fresh", () => {
    const out = JSON.parse(writeDraftEnvelope("not json", staffDraft));
    expect(out.eventBoardDraft.draftAction.entityId).toBe("user-1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter app exec vitest run __tests__/board/draft-metadata.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/app/app/(authenticated)/events/[eventId]/board/draft-metadata.ts
export const DRAFT_METADATA_KEY = "eventBoardDraft";

export type DraftActionKind = "assign-staff"; // add-dish | assign-vehicle | assign-equipment in later plans

export interface DraftAction {
  kind: DraftActionKind;
  entityType: string;
  entityId: string;
  params: Record<string, string>;
}

export interface DraftEnvelope {
  draftAction: DraftAction;
  draftState: "draft" | "committed" | "failed";
  committedRecordId: string | null;
}

function isDraftEnvelope(value: unknown): value is DraftEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const action = v.draftAction as Record<string, unknown> | undefined;
  return (
    typeof action === "object" &&
    action !== null &&
    typeof action.kind === "string" &&
    typeof action.entityId === "string" &&
    (v.draftState === "draft" || v.draftState === "committed" || v.draftState === "failed")
  );
}

/** Normalizes Prisma Json (string | object | null) to a plain record. */
export function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function parseDraftEnvelope(metadata: unknown): DraftEnvelope | null {
  const candidate = normalizeMetadata(metadata)[DRAFT_METADATA_KEY];
  return isDraftEnvelope(candidate) ? candidate : null;
}

/** Returns a JSON string (the manifest command param type) merging the envelope into existing keys. */
export function writeDraftEnvelope(existingMetadata: unknown, envelope: DraftEnvelope): string {
  return JSON.stringify({ ...normalizeMetadata(existingMetadata), [DRAFT_METADATA_KEY]: envelope });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter app exec vitest run __tests__/board/draft-metadata.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/board/draft-metadata.ts" apps/app/__tests__/board/draft-metadata.test.ts
git commit -m "[feat] event board: draft metadata envelope module"
```

---

### Task 2: Template definitions + completeness (pure, TDD)

**Files:**
- Create: `apps/app/app/(authenticated)/events/[eventId]/board/templates.ts`
- Test: `apps/app/__tests__/board/templates.test.ts`

Advisory only — these never feed Manifest constraints. Branch keys are stable identifiers used by the canvas, outline, and impact panel.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/app/__tests__/board/templates.test.ts
import { describe, expect, it } from "vitest";
import {
  computeBranchStatus,
  resolveTemplate,
} from "@/app/(authenticated)/events/[eventId]/board/templates";

describe("resolveTemplate", () => {
  it("returns the plated_dinner template for its eventType", () => {
    const t = resolveTemplate("plated_dinner");
    expect(t.key).toBe("plated_dinner");
    expect(t.branches.find((b) => b.key === "staff")?.requirement).toBe("required");
  });

  it("falls back to the general template for unknown eventTypes", () => {
    expect(resolveTemplate("zombie_party").key).toBe("general");
  });

  it("drop_off excludes equipment", () => {
    const t = resolveTemplate("drop_off");
    expect(t.branches.find((b) => b.key === "equipment")?.requirement).toBe("excluded");
  });
});

describe("computeBranchStatus", () => {
  it("staff requirement scales with guest count (1 per 20, min 1)", () => {
    const t = resolveTemplate("plated_dinner");
    const s = computeBranchStatus(t, { guestCount: 120, counts: { staff: 4, menu: 0, vehicles: 0, equipment: 0, battleboard: 0 } });
    const staff = s.branches.find((b) => b.key === "staff");
    expect(staff?.needed).toBe(6);
    expect(staff?.have).toBe(4);
    expect(staff?.state).toBe("partial");
  });

  it("excluded branches don't count toward readiness", () => {
    const t = resolveTemplate("drop_off");
    const s = computeBranchStatus(t, { guestCount: 40, counts: { staff: 2, menu: 1, vehicles: 1, equipment: 0, battleboard: 0 } });
    expect(s.branches.find((b) => b.key === "equipment")?.state).toBe("excluded");
    expect(s.readyPercent).toBeGreaterThan(0);
  });

  it("readyPercent is 100 when all required branches are satisfied", () => {
    const t = resolveTemplate("general");
    const s = computeBranchStatus(t, { guestCount: 10, counts: { staff: 1, menu: 1, vehicles: 1, equipment: 1, battleboard: 1 } });
    expect(s.readyPercent).toBe(100);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter app exec vitest run __tests__/board/templates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/app/app/(authenticated)/events/[eventId]/board/templates.ts
export type BranchKey = "staff" | "menu" | "vehicles" | "equipment" | "battleboard";
export type BranchRequirement = "required" | "optional" | "excluded";

export interface BranchDef {
  key: BranchKey;
  label: string;
  color: string; // hex used for branch stroke/leaf outline
  requirement: BranchRequirement;
  /** Minimum count needed; receives guestCount for ratio rules. */
  minNeeded: (guestCount: number) => number;
}

export interface EventBoardTemplate {
  key: string;
  label: string;
  branches: BranchDef[];
}

const zero = () => 0;
const one = () => 1;
const staffPer20 = (guests: number) => Math.max(1, Math.ceil(guests / 20));

const BASE_BRANCHES: Omit<BranchDef, "requirement" | "minNeeded">[] = [
  { key: "staff", label: "Staff", color: "#6366f1" },
  { key: "menu", label: "Menu", color: "#ec4899" },
  { key: "vehicles", label: "Vehicles", color: "#f59e0b" },
  { key: "equipment", label: "Equipment", color: "#14b8a6" },
  { key: "battleboard", label: "Battle Board", color: "#0ea5e9" },
];

function makeTemplate(
  key: string,
  label: string,
  rules: Record<BranchKey, { requirement: BranchRequirement; minNeeded?: (g: number) => number }>
): EventBoardTemplate {
  return {
    key,
    label,
    branches: BASE_BRANCHES.map((b) => ({
      ...b,
      requirement: rules[b.key].requirement,
      minNeeded: rules[b.key].minNeeded ?? (rules[b.key].requirement === "required" ? one : zero),
    })),
  };
}

const TEMPLATES: Record<string, EventBoardTemplate> = {
  general: makeTemplate("general", "General", {
    staff: { requirement: "required", minNeeded: one },
    menu: { requirement: "required" },
    vehicles: { requirement: "optional" },
    equipment: { requirement: "optional" },
    battleboard: { requirement: "optional" },
  }),
  plated_dinner: makeTemplate("plated_dinner", "Plated Dinner", {
    staff: { requirement: "required", minNeeded: staffPer20 },
    menu: { requirement: "required" },
    vehicles: { requirement: "required" },
    equipment: { requirement: "required" },
    battleboard: { requirement: "optional" },
  }),
  drop_off: makeTemplate("drop_off", "Drop-off", {
    staff: { requirement: "required", minNeeded: one },
    menu: { requirement: "required" },
    vehicles: { requirement: "required" },
    equipment: { requirement: "excluded" },
    battleboard: { requirement: "optional" },
  }),
};

export function resolveTemplate(eventType: string): EventBoardTemplate {
  return TEMPLATES[eventType] ?? TEMPLATES.general;
}

export type BranchState = "ready" | "partial" | "missing" | "optional" | "excluded";

export interface BranchStatus {
  key: BranchKey;
  label: string;
  color: string;
  requirement: BranchRequirement;
  needed: number;
  have: number;
  state: BranchState;
}

export interface BoardStatus {
  branches: BranchStatus[];
  readyPercent: number;
}

export function computeBranchStatus(
  template: EventBoardTemplate,
  input: { guestCount: number; counts: Record<BranchKey, number> }
): BoardStatus {
  const branches = template.branches.map((b): BranchStatus => {
    const needed = b.requirement === "excluded" ? 0 : b.minNeeded(input.guestCount);
    const have = input.counts[b.key] ?? 0;
    let state: BranchState;
    if (b.requirement === "excluded") state = "excluded";
    else if (b.requirement === "optional" && needed === 0) state = have > 0 ? "ready" : "optional";
    else if (have >= needed) state = "ready";
    else if (have > 0) state = "partial";
    else state = "missing";
    return { key: b.key, label: b.label, color: b.color, requirement: b.requirement, needed, have, state };
  });
  const required = branches.filter((b) => b.requirement === "required");
  const satisfied = required.filter((b) => b.state === "ready").length;
  const readyPercent = required.length === 0 ? 100 : Math.round((satisfied / required.length) * 100);
  return { branches, readyPercent };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter app exec vitest run __tests__/board/templates.test.ts`

- [ ] **Step 5: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/board/templates.ts" apps/app/__tests__/board/templates.test.ts
git commit -m "[feat] event board: advisory template definitions + completeness"
```

---

### Task 3: Staff impact computation (pure, TDD)

**Files:**
- Create: `apps/app/app/(authenticated)/events/[eventId]/board/impact.ts`
- Test: `apps/app/__tests__/board/impact.test.ts`

Pure function so conflict logic is testable without a database. Money math in cents (integers) to avoid float artifacts; output as fixed-2 strings.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/app/__tests__/board/impact.test.ts
import { describe, expect, it } from "vitest";
import { computeStaffImpact } from "@/app/(authenticated)/events/[eventId]/board/impact";

const drafts = [
  {
    cardId: "c1",
    staffMemberId: "u1",
    shiftStart: "2026-06-28T16:00:00.000Z",
    shiftEnd: "2026-06-28T23:00:00.000Z",
  },
  {
    cardId: "c2",
    staffMemberId: "u2",
    shiftStart: "2026-06-28T16:00:00.000Z",
    shiftEnd: "2026-06-28T22:00:00.000Z",
  },
];

describe("computeStaffImpact", () => {
  it("sums labor cost from hourly rates without float artifacts", () => {
    const r = computeStaffImpact({
      drafts,
      rates: { u1: "28.50", u2: "21.10" }, // 7h*28.50 + 6h*21.10 = 199.50 + 126.60 = 326.10
      busyIntervals: {},
    });
    expect(r.laborCost).toBe("326.10");
    expect(r.totalHours).toBe(13);
  });

  it("treats missing rates as 0 and reports them", () => {
    const r = computeStaffImpact({ drafts, rates: { u1: "28.50" }, busyIntervals: {} });
    expect(r.laborCost).toBe("199.50");
    expect(r.missingRateStaffIds).toEqual(["u2"]);
  });

  it("flags overlapping busy intervals as conflicts", () => {
    const r = computeStaffImpact({
      drafts,
      rates: {},
      busyIntervals: {
        u1: [{ start: "2026-06-28T18:00:00.000Z", end: "2026-06-28T20:00:00.000Z", label: "Henderson wedding" }],
        u2: [{ start: "2026-06-29T18:00:00.000Z", end: "2026-06-29T20:00:00.000Z", label: "next day" }],
      },
    });
    expect(r.conflicts).toEqual([
      { cardId: "c1", staffMemberId: "u1", with: "Henderson wedding" },
    ]);
  });

  it("does not flag back-to-back (touching, non-overlapping) intervals", () => {
    const r = computeStaffImpact({
      drafts: [drafts[0]],
      rates: {},
      busyIntervals: { u1: [{ start: "2026-06-28T23:00:00.000Z", end: "2026-06-29T02:00:00.000Z", label: "late gig" }] },
    });
    expect(r.conflicts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter app exec vitest run __tests__/board/impact.test.ts`

- [ ] **Step 3: Implement**

```ts
// apps/app/app/(authenticated)/events/[eventId]/board/impact.ts
export interface StaffDraftInput {
  cardId: string;
  staffMemberId: string;
  shiftStart: string; // ISO
  shiftEnd: string; // ISO
}

export interface BusyInterval {
  start: string;
  end: string;
  label: string;
}

export interface StaffImpactInput {
  drafts: StaffDraftInput[];
  /** staffMemberId -> hourly rate as fixed-2 string (Decimal.toFixed(2)) */
  rates: Record<string, string>;
  /** staffMemberId -> existing commitments */
  busyIntervals: Record<string, BusyInterval[]>;
}

export interface StaffConflict {
  cardId: string;
  staffMemberId: string;
  with: string;
}

export interface StaffImpact {
  laborCost: string; // fixed-2
  totalHours: number;
  missingRateStaffIds: string[];
  conflicts: StaffConflict[];
}

function hoursBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

function overlaps(aStart: string, aEnd: string, b: BusyInterval): boolean {
  return new Date(aStart) < new Date(b.end) && new Date(b.start) < new Date(aEnd);
}

export function computeStaffImpact(input: StaffImpactInput): StaffImpact {
  let laborCents = 0;
  let totalHours = 0;
  const missingRateStaffIds: string[] = [];
  const conflicts: StaffConflict[] = [];

  for (const draft of input.drafts) {
    const hours = hoursBetween(draft.shiftStart, draft.shiftEnd);
    totalHours += hours;
    const rate = input.rates[draft.staffMemberId];
    if (rate === undefined) {
      missingRateStaffIds.push(draft.staffMemberId);
    } else {
      laborCents += Math.round(Number(rate) * 100 * hours);
    }
    for (const busy of input.busyIntervals[draft.staffMemberId] ?? []) {
      if (overlaps(draft.shiftStart, draft.shiftEnd, busy)) {
        conflicts.push({ cardId: draft.cardId, staffMemberId: draft.staffMemberId, with: busy.label });
        break; // one conflict per draft is enough to surface
      }
    }
  }

  return {
    laborCost: (laborCents / 100).toFixed(2),
    totalHours,
    missingRateStaffIds,
    conflicts,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/board/impact.ts" apps/app/__tests__/board/impact.test.ts
git commit -m "[feat] event board: pure staff impact computation (labor + conflicts)"
```

---

### Task 4: EventStaff shift-time schema reconciliation (Int → Timestamptz)

**Files:**
- Modify: `packages/database/prisma/schema.prisma` (model `EventStaff`, ~line 6503)
- Create: migration via `pnpm db:dev --create-only` (NEVER hand-author the folder)
- Modify: `apps/app/app/(authenticated)/events/actions/setup-event-completely.ts` (~line 278)
- Modify: `apps/app/app/(authenticated)/events/[eventId]/battle-board/actions/tasks.ts` (~line 478)

**Why:** the IR declares `EventStaff.shiftStart/shiftEnd` as `datetime`, but the live columns are `INTEGER DEFAULT 0` — projected-vs-live drift. Per constitution §1, the IR is authoritative: migrate the columns. Reviewer-verified: **no production path has ever written a non-zero value** (all callers pass `0`), so data loss is nil.

- [ ] **Step 1: Pre-check drift + data**

Run: `pnpm db:check` (expect zero drift before starting).
Then verify values really are all 0/NULL (use Prisma Studio or a one-off read script — read-only):
`database.eventStaff.findMany({ where: { OR: [{ shiftStart: { gt: 0 } }, { shiftEnd: { gt: 0 } }] }, take: 5 })` → expect `[]`. If any rows return, STOP and surface to the human (the no-real-data assumption is wrong).

- [ ] **Step 2: Edit schema.prisma**

In `model EventStaff` change:

```prisma
  shiftStart Int? @default(0)
  shiftEnd   Int? @default(0)
```

(Read the model first and match its exact current attribute text — both columns carry `@default(0)` in the live schema.)

to:

```prisma
  shiftStart DateTime? @db.Timestamptz(6)
  shiftEnd   DateTime? @db.Timestamptz(6)
```

(Match the exact existing field/attribute formatting in that model; verify current attribute spellings by reading the model first.)

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:dev -- --create-only --name event_staff_shift_times_to_timestamptz`
Review the generated SQL. If Prisma emits a bare `ALTER COLUMN ... SET DATA TYPE TIMESTAMPTZ` that would fail on integer values, adjust the generated (NOT yet applied) migration during review to null the legacy zeros first:

```sql
UPDATE tenant_events.event_staff SET "shiftStart" = NULL, "shiftEnd" = NULL; -- legacy placeholder zeros, verified meaningless
ALTER TABLE tenant_events.event_staff ALTER COLUMN "shiftStart" DROP DEFAULT;
ALTER TABLE ... -- keep whatever Prisma generated for the type change, with USING NULL if needed
```

(Verify the physical table name + schema via `@@map`/`@@schema` on the model before touching SQL — per CLAUDE.md DB rule 2.)

- [ ] **Step 4: Apply + verify**

Run: `pnpm db:deploy && pnpm db:check`
Expected: applied cleanly, zero drift.

- [ ] **Step 5: Align the two legacy callers**

Both existing `EventStaff.assign` callers pass `shiftStart: 0, shiftEnd: 0` (numbers). Change them to pass ISO strings derived from the event date (or empty-string omission if the command tolerates it — check the assign command's guards; it has no datetime guards). Use the event's `eventDate` with sensible defaults (e.g. full-day placeholder) OR pass `new Date(event.eventDate).toISOString()` for both. Keep the change minimal — these callers' behavior must not otherwise change.

- [ ] **Step 6: Typecheck + test sweep**

Run: `pnpm --filter app typecheck && pnpm --filter api typecheck`
Expected: 0 errors (the two caller files are the only expected fallout).

- [ ] **Step 7: Commit (schema + migration + callers together)**

```bash
git add packages/database/prisma "apps/app/app/(authenticated)/events/actions/setup-event-completely.ts" "apps/app/app/(authenticated)/events/[eventId]/battle-board/actions/tasks.ts"
git commit -m "[fix] EventStaff shift times: Int placeholder columns -> Timestamptz per IR (drift reconciliation)"
```

---

### Task 5: Board server actions — get-or-create, board data, palette, draft cards, impact

**Files:**
- Create: `apps/app/app/(authenticated)/events/[eventId]/board/actions.ts`

Read paths + governed card commands. **Before writing, open `apps/app/app/(authenticated)/command-board/actions.ts` and copy its exact imports for `runManifestCommand` (from `apps/app/lib/manifest-command.ts`), auth/user resolution, and result handling** — the result shape is `{ ok, message, result }` and created ids come from `(result.result as { id?: string })?.id`.

- [ ] **Step 1: Implement `getOrCreateEventBoard`**

```ts
"use server";
// imports: database + runManifestCommand + user resolution copied from command-board/actions.ts

export async function getOrCreateEventBoard(eventId: string) {
  // NOTE: no wrapper helper exists — replicate command-board/actions.ts: requireCurrentUser()
  // then build { id: user.id, tenantId: user.tenantId, role: user.role } inline.
  const user = await getManifestUser();
  // Read path: oldest board wins (spec: duplicates harmless, deterministic resolution)
  const existing = await database.commandBoard.findFirst({
    where: { tenantId: user.tenantId, eventId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return { boardId: existing.id };

  const event = await database.event.findFirst({
    where: { tenantId: user.tenantId, id: eventId, deletedAt: null },
    select: { title: true },
  });
  if (!event) throw new Error("Event not found");

  const result = await runManifestCommand({
    entity: "CommandBoard",
    command: "create",
    body: {
      name: `${event.title} — Event Board`,
      description: "Per-event command board (event tree)",
      eventId,
      isTemplate: false,
      tags: ["event-board"],
      autoPopulate: false,
      scope: "{}",
    },
    user,
  });
  if (!result.ok) throw new Error(result.message ?? "Board creation failed");
  const createdId = (result.result as { id?: string })?.id;
  if (createdId) return { boardId: createdId };
  // Fallback: re-query (matches the deterministic oldest-board rule)
  const created = await database.commandBoard.findFirst({
    where: { tenantId: user.tenantId, eventId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!created) throw new Error("Board creation did not persist");
  return { boardId: created.id };
}
```

- [ ] **Step 2: Implement `getEventBoardData`**

Returns everything the tab needs in one call:

```ts
export interface EventBoardData {
  event: { id: string; title: string; eventType: string; eventDate: string; guestCount: number; venueName: string };
  boardId: string;
  committedCounts: { staff: number; menu: number; vehicles: number; equipment: number; battleboard: number };
  draftCards: Array<{ cardId: string; envelope: DraftEnvelope; title: string }>;
  committedStaff: Array<{ staffMemberId: string; name: string; role: string; avatarUrl: string | null }>;
}
```

Implementation notes:
- Event core: `database.event.findFirst` selecting the fields above (serialize `eventDate` to ISO).
- `committedCounts.staff`: count `database.eventStaff` where `{ tenantId, eventId, status: { in: ["assigned", "confirmed", "checked_in"] }, deletedAt: null }`.
- `committedCounts.menu`: count `database.eventDish` for the event (verify accessor name `eventDish` in schema; if absent set 0 and leave a `// TODO follow-up plan` comment).
- `vehicles`/`equipment`: 0 for v1 (entity doesn't exist yet). `battleboard`: count `database.battleBoard` where `{ tenantId, eventId, deletedAt: null }`.
- `draftCards`: `database.commandBoardCard.findMany({ where: { tenantId, boardId, deletedAt: null } })`, then `parseDraftEnvelope(card.metadata)` (handles Json string/object), keep non-null.
- `committedStaff`: query `database.eventStaff` rows + batch-fetch their `database.user` rows by id for names/avatars (two queries + in-memory join — there is no Prisma relation; see `events/[eventId]/staff/page.tsx`).

- [ ] **Step 3: Implement `getStaffPalette`**

```ts
export interface PaletteStaff {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  hourlyRate: string | null; // Decimal -> .toFixed(2)
}

export async function getStaffPalette(): Promise<PaletteStaff[]> {
  const user = await getCurrentUserForManifest();
  const rows = await database.user.findMany({
    where: { tenantId: user.tenantId, isActive: true, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true, hourlyRate: true },
    orderBy: [{ firstName: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`.trim(),
    role: r.role,
    avatarUrl: r.avatarUrl,
    hourlyRate: r.hourlyRate ? r.hourlyRate.toFixed(2) : null,
  }));
}
```

(Verify the `User` model's tenant field name in schema.prisma — use the Prisma field name, not the column name.)

- [ ] **Step 4: Implement `createStaffDraftCard` and `removeDraftCard`**

```ts
export async function createStaffDraftCard(input: {
  boardId: string;
  staff: { id: string; name: string };
  shiftStart: string; // ISO
  shiftEnd: string; // ISO
  role: string;
}) {
  const user = await getCurrentUserForManifest();
  const envelope: DraftEnvelope = {
    draftAction: {
      kind: "assign-staff",
      entityType: "User",
      entityId: input.staff.id,
      params: { role: input.role, shiftStart: input.shiftStart, shiftEnd: input.shiftEnd },
    },
    draftState: "draft",
    committedRecordId: null,
  };
  const result = await runManifestCommand({
    entity: "CommandBoardCard",
    command: "create",
    body: {
      boardId: input.boardId,
      title: input.staff.name,
      content: "",
      cardType: "entity", // MUST be in the validCardType enum ["task","note","reference","checklist","entity"]
      status: "pending",  // MUST be in the validStatus enum
      positionX: 0, positionY: 0, width: 200, height: 150,
      color: "#6366f1",
      metadata: writeDraftEnvelope("{}", envelope),
      groupId: "",
      entityId: input.staff.id,
      entityType: "User",
    },
    user,
  });
  return result.ok ? { success: true as const } : { success: false as const, error: result.message };
}

export async function removeDraftCard(cardId: string) {
  const user = await getCurrentUserForManifest();
  // Verify instance targeting: open command-board/actions.ts moveCardAction to see exactly how an
  // existing card is addressed (instanceId field vs body) and replicate it here.
  const result = await runManifestCommand({
    entity: "CommandBoardCard",
    command: "remove",
    body: { userId: user.id },
    instanceId: cardId,
    user,
  });
  return { success: result.ok, error: result.ok ? undefined : result.message };
}
```

- [ ] **Step 5: Implement `getDraftImpact`**

```ts
export async function getDraftImpact(eventId: string, boardId: string) {
  const user = await getCurrentUserForManifest();
  const cards = await database.commandBoardCard.findMany({
    where: { tenantId: user.tenantId, boardId, deletedAt: null },
  });
  const drafts = cards
    .map((c) => ({ cardId: c.id, envelope: parseDraftEnvelope(c.metadata) }))
    .filter((c) => c.envelope?.draftState === "draft" && c.envelope.draftAction.kind === "assign-staff")
    .map((c) => ({
      cardId: c.cardId,
      staffMemberId: c.envelope!.draftAction.entityId,
      shiftStart: c.envelope!.draftAction.params.shiftStart,
      shiftEnd: c.envelope!.draftAction.params.shiftEnd,
    }));
  if (drafts.length === 0) return computeStaffImpact({ drafts: [], rates: {}, busyIntervals: {} });

  const staffIds = [...new Set(drafts.map((d) => d.staffMemberId))];
  const users = await database.user.findMany({
    where: { tenantId: user.tenantId, id: { in: staffIds } },
    select: { id: true, hourlyRate: true },
  });
  const rates: Record<string, string> = {};
  for (const u of users) if (u.hourlyRate) rates[u.id] = u.hourlyRate.toFixed(2);

  // Busy intervals: other events' assignments for these staff.
  // shiftStart/shiftEnd are DateTime? after the Task 4 migration.
  const assignments = await database.eventStaff.findMany({
    where: {
      tenantId: user.tenantId,
      staffMemberId: { in: staffIds },
      eventId: { not: eventId },
      status: { in: ["assigned", "confirmed", "checked_in"] },
      deletedAt: null,
      shiftStart: { not: null },
      shiftEnd: { not: null },
    },
    select: { staffMemberId: true, shiftStart: true, shiftEnd: true, eventId: true },
  });
  const otherEventIds = [...new Set(assignments.map((a) => a.eventId))];
  const otherEvents = await database.event.findMany({
    where: { tenantId: user.tenantId, id: { in: otherEventIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map(otherEvents.map((e) => [e.id, e.title]));
  const busyIntervals: Record<string, BusyInterval[]> = {};
  for (const a of assignments) {
    (busyIntervals[a.staffMemberId] ??= []).push({
      start: a.shiftStart!.toISOString(),
      end: a.shiftEnd!.toISOString(),
      label: titleById.get(a.eventId) ?? "another event",
    });
  }
  return computeStaffImpact({ drafts, rates, busyIntervals });
}
```

(`ScheduleShift` conflicts are a follow-up; `EventStaff` overlaps are the v1 conflict source.)

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter app typecheck`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/board/actions.ts"
git commit -m "[feat] event board: server actions (board get-or-create, palette, draft cards, impact)"
```

---

### Task 6: Atomic commit endpoint (apps/api, TDD on the orchestrator)

**Files:**
- Create: `apps/api/lib/event-board/commit-event-board-drafts.ts`
- Create: `apps/api/app/api/command-board/[boardId]/commit/route.ts`
- Test: `apps/api/__tests__/event-board/commit-event-board-drafts.test.ts`

**Pattern source — read first:** `apps/api/lib/payroll/manifest-payroll-data-source.ts` (the `makeCoreDeps(prismaOverride)` + `$transaction` threading) and `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` (auth via `requireCurrentUser()` — no arguments).

The orchestrator is dependency-injected so tests run without a DB: it receives `{ transact, runCommand, loadDraftCards }`.

- [ ] **Step 1: Write the failing orchestrator tests**

```ts
// apps/api/__tests__/event-board/commit-event-board-drafts.test.ts
import { describe, expect, it, vi } from "vitest";
import { commitEventBoardDrafts } from "../../lib/event-board/commit-event-board-drafts";

const USER = { id: "u-admin", tenantId: "t1", role: "admin" };

const draftCard = (id: string, staffId: string) => ({
  id,
  title: `Staff ${staffId}`,
  content: "",
  cardType: "entity",
  status: "pending",
  color: "#6366f1",
  groupId: "",
  // metadata as an OBJECT — the Prisma Json form (orchestrator must normalize)
  metadata: {
    eventBoardDraft: {
      draftAction: {
        kind: "assign-staff",
        entityType: "User",
        entityId: staffId,
        params: { role: "server", shiftStart: "2026-06-28T16:00:00.000Z", shiftEnd: "2026-06-28T23:00:00.000Z" },
      },
      draftState: "draft",
      committedRecordId: null,
    },
  },
});

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
  const calls: Array<{ entity: string; command: string; body: Record<string, unknown>; instanceId?: string }> = [];
  const deps = {
    loadDraftCards: vi.fn(async () => [draftCard("c1", "s1"), draftCard("c2", "s2")]),
    transact: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ fake: "tx" })),
    runCommand: vi.fn(async (_tx: unknown, params: (typeof calls)[number]) => {
      calls.push(params);
      return { success: true as const, instanceId: `created-${params.entity}-${calls.length}` };
    }),
    ...overrides,
  };
  return { deps, calls };
}

describe("commitEventBoardDrafts", () => {
  it("runs EventStaff.assign per draft and flips each card inside the transaction", async () => {
    const { deps, calls } = makeDeps();
    const result = await commitEventBoardDrafts(deps as never, { boardId: "b1", eventId: "e1", user: USER });
    expect(result.success).toBe(true);
    const assigns = calls.filter((c) => c.entity === "EventStaff" && c.command === "assign");
    expect(assigns).toHaveLength(2);
    expect(assigns[0].body).toMatchObject({ eventId: "e1", staffMemberId: "s1", role: "server" });
    const flips = calls.filter((c) => c.entity === "CommandBoardCard" && c.command === "update");
    expect(flips).toHaveLength(2);
    // flip preserves all current fields (full-field update) and rewrites only metadata
    expect(flips[0].body).toMatchObject({ newTitle: "Staff s1", newStatus: "pending", newCardType: "entity" });
    const flippedMeta = JSON.parse(flips[0].body.newMetadata as string);
    expect(flippedMeta.eventBoardDraft.draftState).toBe("committed");
    expect(flippedMeta.eventBoardDraft.committedRecordId).toMatch(/^created-EventStaff/);
  });

  it("throws inside the transaction when any command fails (so everything rolls back)", async () => {
    const { deps } = makeDeps({
      runCommand: vi.fn(async (_tx: unknown, p: { entity: string }) => {
        if (p.entity === "EventStaff") return { success: false as const, error: "policy denied" };
        return { success: true as const, instanceId: "x" };
      }),
    });
    const result = await commitEventBoardDrafts(deps as never, { boardId: "b1", eventId: "e1", user: USER });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("policy denied");
  });

  it("succeeds as a no-op when there are no draft cards", async () => {
    const { deps } = makeDeps({ loadDraftCards: vi.fn(async () => []) });
    const result = await commitEventBoardDrafts(deps as never, { boardId: "b1", eventId: "e1", user: USER });
    expect(result.success).toBe(true);
    if (result.success) expect(result.committedCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter api exec vitest run __tests__/event-board/commit-event-board-drafts.test.ts`

- [ ] **Step 3: Implement the orchestrator**

```ts
// apps/api/lib/event-board/commit-event-board-drafts.ts
// NOTE: re-implement the envelope normalization locally — apps/api must not import from apps/app.
// Keep the envelope JSON contract in sync with
// apps/app/app/(authenticated)/events/[eventId]/board/draft-metadata.ts.

export interface ManifestUser {
  id: string;
  tenantId: string;
  role: string;
}

export interface DraftCardRow {
  id: string;
  title: string;
  content: string;
  cardType: string;
  status: string;
  color: string;
  groupId: string;
  metadata: unknown; // Prisma Json: string | object | null
}

export interface CommandCall {
  entity: string;
  command: string;
  body: Record<string, unknown>;
  instanceId?: string;
}

export interface CommitDeps {
  loadDraftCards: (tx: unknown, boardId: string, tenantId: string) => Promise<DraftCardRow[]>;
  transact: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  runCommand: (
    tx: unknown,
    params: CommandCall & { user: ManifestUser }
  ) => Promise<{ success: true; instanceId?: string } | { success: false; error?: string }>;
}

export type CommitResult =
  | { success: true; committedCount: number }
  | { success: false; error: string; failedCardId?: string };

interface Envelope {
  draftAction: { kind: string; entityId: string; params: Record<string, string> };
  draftState: string;
  committedRecordId: string | null;
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function parseEnvelope(metadata: unknown): { all: Record<string, unknown>; envelope: Envelope | null } {
  const all = normalizeMetadata(metadata);
  const env = all.eventBoardDraft as Envelope | undefined;
  return { all, envelope: env && typeof env === "object" && typeof env.draftState === "string" ? env : null };
}

class CommitError extends Error {
  constructor(message: string, public readonly failedCardId: string) {
    super(message);
  }
}

export async function commitEventBoardDrafts(
  deps: CommitDeps,
  input: { boardId: string; eventId: string; user: ManifestUser }
): Promise<CommitResult> {
  try {
    const committedCount = await deps.transact(async (tx) => {
      const cards = await deps.loadDraftCards(tx, input.boardId, input.user.tenantId);
      const drafts = cards
        .map((card) => ({ card, parsed: parseEnvelope(card.metadata) }))
        .filter(({ parsed }) => parsed.envelope?.draftState === "draft");

      let committed = 0;
      for (const { card, parsed } of drafts) {
        const env = parsed.envelope!;
        if (env.draftAction.kind !== "assign-staff") continue; // later kinds in follow-up plans

        const assign = await deps.runCommand(tx, {
          entity: "EventStaff",
          command: "assign",
          body: {
            eventId: input.eventId,
            staffMemberId: env.draftAction.entityId,
            role: env.draftAction.params.role ?? "",
            notes: "",
            shiftStart: env.draftAction.params.shiftStart,
            shiftEnd: env.draftAction.params.shiftEnd,
          },
          user: input.user,
        });
        if (!assign.success) throw new CommitError(assign.error ?? "EventStaff.assign failed", card.id);

        const newMetadata = JSON.stringify({
          ...parsed.all,
          eventBoardDraft: { ...env, draftState: "committed", committedRecordId: assign.instanceId ?? null },
        });
        // full-field update: pass every current value; only metadata changes
        const flip = await deps.runCommand(tx, {
          entity: "CommandBoardCard",
          command: "update",
          instanceId: card.id,
          body: {
            newTitle: card.title,
            newContent: card.content,
            newCardType: card.cardType,
            newStatus: card.status,
            newColor: card.color,
            newMetadata,
            newGroupId: card.groupId,
          },
          user: input.user,
        });
        if (!flip.success) throw new CommitError(flip.error ?? "card flip failed", card.id);
        committed += 1;
      }
      return committed;
    });
    return { success: true, committedCount };
  } catch (error) {
    if (error instanceof CommitError) {
      return { success: false, error: error.message, failedCardId: error.failedCardId };
    }
    return { success: false, error: error instanceof Error ? error.message : "commit failed" };
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Wire the production deps + route**

```ts
// apps/api/app/api/command-board/[boardId]/commit/route.ts
// Auth: requireCurrentUser() — copy the exact import/usage from the manifest dispatcher route
// (apps/api/app/api/manifest/[entity]/commands/[command]/route.ts). It takes NO arguments.
// Runtime: createManifestRuntime — copy import + call shape (including log/captureException deps)
// from apps/api/lib/payroll/manifest-payroll-data-source.ts.

import { database } from "@repo/database"; // match the dispatcher's import
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { commitEventBoardDrafts, type CommitDeps } from "../../../../../lib/event-board/commit-event-board-drafts";

export async function POST(request: Request, ctx: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await ctx.params;
  const user = await requireCurrentUser(); // no args — per dispatcher route
  const { eventId } = (await request.json()) as { eventId: string };

  const deps: CommitDeps = {
    transact: (fn) => database.$transaction(fn, { timeout: 30_000 }),
    loadDraftCards: async (tx, bId, tenantId) =>
      (tx as typeof database).commandBoardCard.findMany({
        where: { tenantId, boardId: bId, deletedAt: null },
        select: { id: true, title: true, content: true, cardType: true, status: true, color: true, groupId: true, metadata: true },
      }) as never,
    runCommand: async (tx, { entity, command, body, instanceId, user: u }) => {
      const result = await runManifestCommandCore(
        {
          createRuntime: ({ user: cu, entityName }) =>
            createManifestRuntime({ user: cu, entityName, prismaOverride: tx as never }),
        },
        { entity, command, body, user: u, instanceId }
      );
      // normalizeCoreResult: map RunManifestCommandCoreSuccess/Failure to { success, instanceId?, error? }.
      // Read the core's result types in @repo/manifest-runtime/run-manifest-command-core and the
      // payroll data source's result handling to find the created-instance-id field — do not guess.
      return normalizeCoreResult(result);
    },
  };

  const result = await commitEventBoardDrafts(deps, { boardId, eventId, user });
  return Response.json(result, { status: result.success ? 200 : 422 });
}
```

**Executor notes for this step:** (a) confirm `createManifestRuntime`'s exact signature accepts `prismaOverride` (copy the payroll call shape verbatim, including any `log`/`captureException` deps); (b) write `normalizeCoreResult` by reading the core's success/failure types — the payroll code shows how to read the result; (c) the route's user object must match the orchestrator's `ManifestUser` shape (`{ id, tenantId, role }`).

- [ ] **Step 6: Add the app-side server action calling the route**

Append to `apps/app/app/(authenticated)/events/[eventId]/board/actions.ts`:

```ts
export async function commitEventBoard(boardId: string, eventId: string) {
  // Reuse the same server-side API HTTP helper that runManifestCommand uses
  // (see apps/app/lib/manifest-command.ts — reuse its base-URL + auth header logic).
  return apiPostJsonServer(`/api/command-board/${boardId}/commit`, { eventId });
}
```

- [ ] **Step 7: Typecheck both apps**

Run: `pnpm --filter api typecheck && pnpm --filter app typecheck`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/lib/event-board apps/api/app/api/command-board apps/api/__tests__/event-board "apps/app/app/(authenticated)/events/[eventId]/board/actions.ts"
git commit -m "[feat] event board: atomic commit endpoint (shared-tx governed cascade)"
```

---

### Task 7: Runtime conformance test — EventStaff.assign + card flip through real IR

**Files:**
- Create: `manifest/runtime/src/__tests__/event-board-commit-conformance.test.ts`

Proves the two governed commands the commit path relies on behave as expected against the **compiled IR** with in-memory stores (no DB). Pattern source: `manifest/runtime/src/__tests__/event-create-emit-runtime.test.ts` (Mem store class, `makeProvider`, `createCustomBuiltins`, IR loaded from `manifest/ir/kitchen.ir.json`).

- [ ] **Step 1: Write the test**

```ts
// Structure (follow event-create-emit-runtime.test.ts conventions exactly):
// 1. Load IR from ../../../ir/kitchen.ir.json
// 2. Build in-memory store provider + engine with createCustomBuiltins()
// 3. Test A: runManifestCommandCore EventStaff.assign with
//    { eventId, staffMemberId, role, notes:"", shiftStart: ISO, shiftEnd: ISO }
//    → expect success; store row has status "assigned" and the given staffMemberId.
// 4. Test B: CommandBoardCard.create with cardType "entity", status "pending", and the
//    metadata envelope JSON string, then CommandBoardCard.update (instanceId targeting,
//    full field set, newMetadata flipped to committed)
//    → expect success; store row metadata parses with draftState "committed";
//    status remains "pending" and cardType remains "entity" (proves both enum
//    constraints are untouched by the draft mechanism).
```

- [ ] **Step 2: Run**

Run: `pnpm --filter @repo/manifest-runtime exec vitest run src/__tests__/event-board-commit-conformance.test.ts`
Expected: PASS. If `assign` fails on a guard/constraint, read the diagnostics — fix the **caller body** (this is the point of the test), never the IR.

- [ ] **Step 3: Commit**

```bash
git add manifest/runtime/src/__tests__/event-board-commit-conformance.test.ts
git commit -m "[test] event board: conformance for EventStaff.assign + draft card flip"
```

---

### Task 8: Event detail tab wiring

**Files:**
- Modify: `apps/app/app/(authenticated)/events/[eventId]/event-details-client/event-detail-tabs.tsx`
- Create: `apps/app/app/(authenticated)/events/[eventId]/board/components/event-board-tab.tsx`
- Modify: the component that composes `EventDetailTabs` (find the parent passing tab contents — trace `EventDetailTabsProps` usage)

- [ ] **Step 1: Server component for tab content**

```tsx
// event-board-tab.tsx (server component)
import { getEventBoardData, getOrCreateEventBoard, getStaffPalette } from "../actions";
import { BoardClient } from "./board-client";

export async function EventBoardTab({ eventId }: { eventId: string }) {
  const { boardId } = await getOrCreateEventBoard(eventId);
  const [data, palette] = await Promise.all([getEventBoardData(eventId), getStaffPalette()]);
  return <BoardClient eventId={eventId} boardId={boardId} initialData={data} palette={palette} />;
}
```

- [ ] **Step 2: Register the tab**

In `event-detail-tabs.tsx`: add `"board"` to `PLANNING_TABS` (after `"overview"`), add `TAB_LABELS.board = "Command Board"`, add the content prop to `EventDetailTabsProps`, render it in the tab body following the existing per-tab pattern. In the parent, pass `<EventBoardTab eventId={eventId} />`. **Match the existing pattern exactly — look at how the `menu` tab's content flows through props.**

- [ ] **Step 3: Boot check**

Run: `pnpm --filter app typecheck`, then start dev (`pnpm --filter app dev`, port 2221) and load an event detail page → Command Board tab. Expected: tab renders (BoardClient can be a stub `<div>` at this point), a `CommandBoard` row exists for the event afterward (verify: second visit doesn't create a duplicate).

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/"
git commit -m "[feat] event board: Command Board tab on event detail (lazy get-or-create)"
```

---

### Task 9: Board UI — three-pane layout, outline, palette (dnd-kit)

**Files:**
- Create: `board/components/board-client.tsx`, `board/components/tree-outline.tsx`, `board/components/palette.tsx`, `board/board-hooks.ts`

Visual reference: `.superpowers/brainstorm/40974-1781178318/event-tree-combined-v2.html` (approved mockup). Use Tailwind + `@repo/design-system` primitives; follow the conventions in `events/[eventId]/event-hooks.ts` for React Query.

- [ ] **Step 1: `board-hooks.ts`** — query keys + hooks:

```ts
export const boardKeys = {
  data: (eventId: string) => ["event-board", eventId] as const,
  impact: (eventId: string, boardId: string) => ["event-board", eventId, boardId, "impact"] as const,
};
// useEventBoardData(eventId, initialData) → getEventBoardData, staleTime 30s
// useDraftImpact(eventId, boardId, enabled: draftCount > 0) → getDraftImpact
// useCreateStaffDraft() → mutation wrapping createStaffDraftCard; invalidate data+impact on settle
// useRemoveDraftCard() → mutation wrapping removeDraftCard; invalidate data+impact
// useCommitBoard() → mutation wrapping commitEventBoard; invalidate data+impact
```

- [ ] **Step 2: `board-client.tsx`** — client component:
  - Computes `template = resolveTemplate(event.eventType)` and `status = computeBranchStatus(template, { guestCount, counts })` where counts = committedCounts + per-branch draft counts.
  - Layout: CSS grid `grid-cols-[260px_1fr_300px]`, full height. Top bar: event title, template label, `{readyPercent}% ready`, draft count badge, conflict count badge (from impact), `Review & Commit` button (disabled when 0 drafts).
  - Wraps panes in `<DndContext>` from `@dnd-kit/core`; on `dragEnd` over the staff leaf-box droppable, open a small shift dialog (default shift = event date 16:00–23:00 local, role from palette member's role) then call the create-draft mutation.

- [ ] **Step 3: `tree-outline.tsx`** — renders `status.branches`: label, `have/needed`, progress bar (`state` → color: ready=green, partial=amber bar, missing=amber warning, excluded=ghosted "n/a"). Plain list, no interactions in v1 beyond scroll-to-branch anchor.

- [ ] **Step 4: `palette.tsx`** — staff list with `useDraggable` per member (avatar circle with initials fallback, name, role) + a search input filtering client-side. Section headers for later branches (Menus, Vehicles, Equipment) rendered disabled with "next up" hint.

- [ ] **Step 5: Typecheck + visual check** — `pnpm --filter app typecheck`; dev server: drag a staff member, complete the dialog, see the draft appear after invalidation.

- [ ] **Step 6: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/board/"
git commit -m "[feat] event board: three-pane layout, outline, drag palette"
```

---

### Task 10: Tree canvas — hub, opalescent branches, leaf boxes, expandable tokens

**Files:**
- Create: `board/components/tree-canvas.tsx`, `board/components/staff-token.tsx`

- [ ] **Step 1: `tree-canvas.tsx`** — layout model:
  - Hub box bottom-center (event title, date, guest count, venue).
  - Branch layout is computed, not hardcoded: included branches (requirement ≠ excluded) are assigned slots alternating left/right at fixed vertical offsets; battleboard goes top-center. Each slot yields a leaf-box position and an SVG elbow path: horizontal run from trunk x to leaf x minus radius, quarter-arc (`Q`) corner, vertical run to the leaf box edge — mirroring the approved mockup's path shapes.
  - SVG: trunk line bottom-hub → top with the opal gradient (`#a78bfa → #67e8f9 → #f0abfc`); per-branch `<linearGradient>` violet→branch color; each path rendered twice (stroke-width 6 at 18% opacity for the glow + stroke-width 2 at 75%).
  - Leaf box: border in branch color; amber dashed + glow when `state === "missing"` and requirement required ("drag a vehicle here" style hint); ghosted when excluded. Staff leaf box is a `useDroppable` target.
  - Battleboard leaf: link to the existing battle boards screen for this event (verify the actual route under `events/battle-boards` and link accordingly).

- [ ] **Step 2: `staff-token.tsx`** — expandable avatar token:
  - Collapsed: 36px circle (avatarUrl image or initials), amber dashed ring when `draftState === "draft"`, green dot when committed. Conflict badge (red ⚠) when this card id appears in impact conflicts.
  - Expanded (click): mini card (~220px) — name, role, shift times, rate (if available), conflict line, actions: `Remove draft` (draft only → remove mutation), link to staff profile (verify route from staff screens). Only one token expanded at a time (parent state).

- [ ] **Step 3: Visual check** against the approved mockup; typecheck.

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/board/components/"
git commit -m "[feat] event board: tree canvas with opalescent branches + expandable tokens"
```

---

### Task 11: Impact rail + commit dialog + end-to-end verification

**Files:**
- Create: `board/components/impact-rail.tsx`, `board/components/commit-dialog.tsx`

- [ ] **Step 1: `impact-rail.tsx`** — shows when drafts exist: labor cost (`+$X`), total hours, per-staff missing-rate note, conflicts list (red, names the other event). Placeholder panel for the AI assistant ("coming soon" — wired in a later plan). Uses `useDraftImpact`.

- [ ] **Step 2: `commit-dialog.tsx`** — triggered by Review & Commit: lists every draft (name, role, shift) + the impact summary + conflicts (conflicts are warnings, not blockers — user judgment per spec). Confirm → `useCommitBoard` mutation → on success toast + invalidate; on failure show `error` and highlight `failedCardId`'s token.

- [ ] **Step 3: Manual end-to-end verification (dev DB):**
  1. Open event → Command Board tab.
  2. Drag two staff onto Staff branch → 2 amber tokens, outline shows staff drafts counted, impact shows labor $.
  3. Commit → tokens flip green; `eventStaff` rows exist with real `Timestamptz` shift times (check the event's Staff screen shows the same people — the interconnectivity proof).
  4. Create a draft for a staff member already assigned to another event same time → conflict shows in rail + dialog.
  5. Refresh page → drafts/committed state persists (board cards are durable).

- [ ] **Step 4: Full test + typecheck sweep**

Run: `pnpm --filter app exec vitest run __tests__/board && pnpm --filter api exec vitest run __tests__/event-board && pnpm --filter app typecheck && pnpm --filter api typecheck && pnpm --filter @repo/manifest-runtime exec vitest run src/__tests__/event-board-commit-conformance.test.ts`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add "apps/app/app/(authenticated)/events/[eventId]/board/"
git commit -m "[feat] event board: impact rail + review-and-commit dialog (v1 complete)"
```

---

## Follow-up plans (not this plan)

1. **Menu branch** (EventDish drafts + food-cost impact; verify EventDish command contract per §14 first).
2. **Vehicles & Equipment** (`EventResourceAssignment` manifest entity source-first + migration via `pnpm db:dev --create-only`, palette, double-allocation conflicts).
3. **AI panel** (wire `/api/command-board/chat` UI; restrict tool registry to card commands + reads; AI fence test).
4. **Battle board picker integration** (timeline staff list sources from committed `EventStaff`).
