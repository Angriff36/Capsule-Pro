/**
 * Collapse the engine's repeated non-blocking-constraint console output.
 *
 * The Manifest engine evaluates entity constraints inside `updateInstance`,
 * which runs once PER mutate statement. A command with many mutates (e.g.
 * `Event.update` has ~41) therefore logs the SAME non-blocking outcome (e.g.
 * `warnLargeGuestCount`) dozens of times for a single command — pure console
 * spam, not distinct signal.
 *
 * The engine hard-codes `console.info('[Manifest Runtime] Non-blocking
 * constraint outcomes:', outcomes)` (runtime-engine `reportConstraintOutcomes`
 * / `updateInstance`) with no injectable logger for that specific line, so the
 * only capsule-side lever is to filter `console.info`. The filter passes every
 * other log through untouched and collapses identical consecutive Manifest
 * constraint-outcome payloads within a short window down to one line (with a
 * trailing suppressed-count summary on the next distinct outcome).
 *
 * This is a WORKAROUND. The real fix is engine-side: evaluate non-blocking
 * constraints once per command state transition rather than once per mutate
 * (tracked for the @angriff36/manifest package). Remove this once that lands.
 *
 * @packageDocumentation
 */

const MARKER = "[Manifest Runtime] Non-blocking constraint outcomes:";
/** Identical repeats within this window collapse to a single logged line. */
const DEDUPE_WINDOW_MS = 1000;

type InfoFn = (...args: unknown[]) => void;

/** Stable key for a constraint-outcome payload (codes/messages, order-stable). */
function outcomeKey(payload: unknown): string {
  try {
    if (Array.isArray(payload)) {
      return payload
        .map((o) => {
          const r = o as { code?: unknown; constraintName?: unknown };
          return String(r?.code ?? r?.constraintName ?? "?");
        })
        .join(",");
    }
    return JSON.stringify(payload);
  } catch {
    return "unserializable";
  }
}

/**
 * Build a `console.info`-shaped filter that forwards everything to `original`
 * except repeated identical Manifest constraint-outcome lines, which collapse
 * to one. Pure (no global state) so it can be unit-tested directly.
 *
 * @param original - the underlying logger to forward to.
 * @param now - injectable clock (defaults to `Date.now`) for deterministic tests.
 */
export function createConstraintInfoFilter(
  original: InfoFn,
  now: () => number = Date.now
): InfoFn {
  let lastKey = "";
  let lastAt = 0;
  let suppressed = 0;

  const flushSuppressed = (): void => {
    if (suppressed > 0) {
      original(`${MARKER} (+${suppressed} identical outcome(s) suppressed)`);
      suppressed = 0;
    }
  };

  return (...args: unknown[]): void => {
    if (args[0] !== MARKER) {
      original(...args);
      return;
    }

    const key = outcomeKey(args[1]);
    const at = now();

    if (key === lastKey && at - lastAt < DEDUPE_WINDOW_MS) {
      // Same constraint outcome again within the window → suppress, count it.
      suppressed += 1;
      lastAt = at;
      return;
    }

    // New/distinct outcome or window elapsed: summarize any prior burst, emit.
    flushSuppressed();
    lastKey = key;
    lastAt = at;
    original(...args);
  };
}

let installed = false;

/**
 * Install the console.info de-duplicator (idempotent — safe to call on every
 * module load). No-op after the first call.
 */
export function installConstraintLogDedup(): void {
  if (installed) {
    return;
  }
  installed = true;
  console.info = createConstraintInfoFilter(console.info.bind(console));
}
