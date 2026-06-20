/**
 * Generic FSM transition read route.
 *
 * GET /api/manifest/{entity}/transitions?status=CURRENT
 *
 * Constitution §10 (Read Path Freedom): this is a READ-ONLY projection of the
 * compiled Manifest IR — it derives, but does not define, the state machine. The
 * IR remains the single authority for transitions (§4: the UI must not encode the
 * state machine). It answers, for an entity instance in `status`, which target
 * states are reachable and which governed command produces each, so an interactive
 * status badge can offer inline transitions without hard-coding the FSM client-side.
 *
 * No guard dry-run exists in the runtime, so guard outcomes are NOT pre-evaluated:
 * a transition whose command needs no required user input is offered inline (the
 * dispatcher enforces guards and returns a friendly error if blocked); a transition
 * whose command requires user input is returned with `requiredParams` so the badge
 * can disable it and explain that the full detail view is needed.
 */

import { loadMergedPrecompiledIR } from "@repo/manifest-runtime/runtime/loadManifests";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Minimal IR shapes we read (the IR is far richer; we touch only these) ──────
interface IRTransition {
  field?: string;
  from?: unknown;
  property?: string;
  to?: unknown;
}
interface IRParam {
  default?: unknown;
  defaultValue?: { value?: unknown };
  name: string;
  required?: boolean;
  type?: { name?: string; nullable?: boolean };
}
interface IRAction {
  expression?: {
    kind?: string;
    value?: { kind?: string; value?: unknown };
  };
  kind?: string;
  target?: string;
}
interface IRCommand {
  actions?: IRAction[];
  entity?: string;
  name: string;
  parameters?: IRParam[];
}
interface IREntity {
  commands?: unknown[];
  name: string;
  transitions?: IRTransition[];
}
interface IRDoc {
  commands?: IRCommand[];
  entities?: IREntity[];
}

/** Literal string an action mutates a target to, else undefined. */
function mutateLiteral(action: IRAction): string | undefined {
  if (action.kind !== "mutate") {
    return;
  }
  const v = action.expression?.value;
  if (action.expression?.kind === "literal" && v?.kind === "string") {
    return typeof v.value === "string" ? v.value : undefined;
  }
  return;
}

/**
 * Manifest compiles a `guard expr "message"` so the human message surfaces as a
 * leading `compute` action carrying a string literal. Collect those as hints —
 * they explain the conditions a transition requires (e.g. "Can only send draft
 * invoices"), which is the best pre-dispatch explanation available without a
 * dry-run engine.
 */
function guardHints(command: IRCommand): string[] {
  const hints: string[] = [];
  for (const action of command.actions ?? []) {
    if (action.kind !== "compute") {
      continue;
    }
    const v = action.expression?.value;
    if (action.expression?.kind === "literal" && v?.kind === "string") {
      const msg = v.value;
      if (typeof msg === "string" && msg.trim()) {
        hints.push(msg);
      }
    }
  }
  return [...new Set(hints)];
}

/** Required params a caller must supply, excluding the implicit instance id. */
function requiredParams(command: IRCommand): { name: string; type: string }[] {
  return (command.parameters ?? [])
    .filter((p) => {
      if (!p.required) {
        return false;
      }
      if (p.name === "id") {
        return false;
      }
      // A param with a default is effectively optional for inline dispatch.
      const hasDefault =
        p.default !== undefined || p.defaultValue?.value !== undefined;
      return !hasDefault;
    })
    .map((p) => ({ name: p.name, type: p.type?.name ?? "unknown" }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  // Auth: transitions are static IR, but keep tenant auth for a uniform surface.
  try {
    await requireCurrentUser();
  } catch {
    return manifestErrorResponse("Authentication required", 401);
  }

  const { entity: entityName } = await params;

  let ir: IRDoc;
  try {
    ir = loadMergedPrecompiledIR().ir as unknown as IRDoc;
  } catch {
    return manifestErrorResponse("Manifest IR unavailable", 500);
  }

  const entity = (ir.entities ?? []).find((e) => e.name === entityName);
  if (!entity) {
    return manifestErrorResponse(`Entity '${entityName}' not found`, 404);
  }

  const transitions = entity.transitions ?? [];
  if (transitions.length === 0) {
    return manifestSuccessResponse({
      entity: entityName,
      statusProperty: null,
      current: null,
      available: [],
    });
  }

  // Status property: prefer a property literally named "status", else the first
  // transition-governed property.
  const statusProperty =
    transitions.find((t) => (t.property ?? t.field) === "status")?.property ??
    transitions.find((t) => (t.property ?? t.field) === "status")?.field ??
    transitions[0]?.property ??
    transitions[0]?.field ??
    "status";

  // Map every reachable target value -> the command that mutates status to it.
  const commands = (ir.commands ?? []).filter((c) => c.entity === entityName);
  const commandForTarget = new Map<string, IRCommand>();
  for (const command of commands) {
    for (const action of command.actions ?? []) {
      if (action.target !== statusProperty) {
        continue;
      }
      const target = mutateLiteral(action);
      // First command wins for a given target (stable, source order).
      if (target && !commandForTarget.has(target)) {
        commandForTarget.set(target, command);
      }
    }
  }

  const current = request.nextUrl.searchParams.get("status") ?? null;

  // Build the available transitions from the current state. When no status is
  // given, expose the full graph so callers can cache it.
  const relevant = current
    ? transitions.filter(
        (t) => (t.property ?? t.field) === statusProperty && t.from === current
      )
    : transitions.filter((t) => (t.property ?? t.field) === statusProperty);

  const seen = new Set<string>();
  const available: Array<{
    to: string;
    from: unknown;
    command: string | null;
    requiredParams: { name: string; type: string }[];
    requires: string[];
  }> = [];

  for (const t of relevant) {
    const toList = Array.isArray(t.to) ? t.to : [t.to];
    for (const raw of toList) {
      const to = String(raw);
      // Skip self-loops (no-op for a user-facing status change) and dupes.
      if (to === current) {
        continue;
      }
      const key = `${String(t.from)}->${to}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const command = commandForTarget.get(to);
      available.push({
        to,
        from: t.from,
        command: command?.name ?? null,
        requiredParams: command ? requiredParams(command) : [],
        requires: command ? guardHints(command) : [],
      });
    }
  }

  return manifestSuccessResponse({
    entity: entityName,
    statusProperty,
    current,
    available,
  });
}
