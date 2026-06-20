/**
 * DSL source-location resolver for Manifest runtime command failures.
 *
 * Maps a runtime failure onto the `.manifest` file + line that authored the
 * rule that fired, using the compile-time source-map sidecar. Lets the error
 * serializer annotate violations so an IR-level failure links straight back to
 * its DSL declaration (one click), instead of the compiled IR / generated TS.
 *
 * Resolution prefers the most specific construct: a blocked constraint by name,
 * then the command, then the entity. PURE — no I/O beyond the statically
 * imported map; never throws.
 *
 * @packageDocumentation
 */

import type { SourceLocation } from "@repo/manifest-runtime/command-source-map";
import { lookupSourceLocation } from "@repo/manifest-runtime/command-source-map";

export type { SourceLocation } from "@repo/manifest-runtime/command-source-map";

/** A resolved source location plus the map key it matched (for debugging). */
export interface ResolvedSourceLocation extends SourceLocation {
  /** The `<kind>:<Entity>[.<name>]` key this location was found under. */
  key: string;
}

/** Minimal structural view of a runtime failure needed to resolve a location. */
export interface SourceLocatableFailure {
  command: string;
  constraintOutcomes?: unknown;
  entity: string;
}

interface ConstraintOutcomeLike {
  code?: string;
  constraintName?: string;
  overridden?: boolean;
  passed?: boolean;
  severity?: string;
}

/** Name of the first blocking, non-passed, non-overridden constraint, if any. */
function blockedConstraintName(outcomes: unknown): string | undefined {
  if (!Array.isArray(outcomes)) {
    return;
  }
  for (const raw of outcomes as ConstraintOutcomeLike[]) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    if (raw.passed || raw.overridden) {
      continue;
    }
    const name = raw.constraintName ?? raw.code;
    if (typeof name === "string" && name.length > 0) {
      return name;
    }
  }
  return;
}

/** Resolve a source location for a `<kind>:<Entity>.<name>` key. */
export function locationForKey(
  key: string
): ResolvedSourceLocation | undefined {
  const loc = lookupSourceLocation(key);
  return loc ? { ...loc, key } : undefined;
}

/**
 * Resolve the best `.manifest` source location for a failure: blocked
 * constraint → command → entity. Returns `undefined` when nothing matches
 * (e.g. an entity that predates the source-map regeneration).
 */
export function resolveFailureSourceLocation(
  failure: SourceLocatableFailure
): ResolvedSourceLocation | undefined {
  const keys: string[] = [];
  const constraintName = blockedConstraintName(failure.constraintOutcomes);
  if (constraintName) {
    keys.push(`constraint:${failure.entity}.${constraintName}`);
  }
  if (failure.command) {
    keys.push(`command:${failure.entity}.${failure.command}`);
  }
  keys.push(`entity:${failure.entity}`);

  for (const key of keys) {
    const resolved = locationForKey(key);
    if (resolved) {
      return resolved;
    }
  }
  return;
}
