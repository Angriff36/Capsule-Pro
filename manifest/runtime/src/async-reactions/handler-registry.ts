/**
 * Registry of {@link AsyncReactionHandler} implementations.
 *
 * Each handler is keyed by a stable `reactionName` (the same key the producer
 * passes to `asyncQueue.enqueue({ reactionName, ... })`). The worker looks up
 * the handler by name from the registry at dispatch time.
 *
 * Adding a new async reaction = (a) author the handler, (b) register it here
 * with a stable name. The middleware then enqueues jobs with that name; the
 * worker dispatches them through the handler. No factory changes needed.
 */

import type { AsyncReactionHandler } from "./types";

export interface RegisteredAsyncReaction {
  /** Stable handler key (matches the job's `reactionName`). */
  name: string;
  /** One-line description of what the reaction does. */
  description: string;
  /** The handler function invoked by the worker. */
  handler: AsyncReactionHandler;
}

class AsyncReactionHandlerRegistry {
  private readonly handlers = new Map<string, RegisteredAsyncReaction>();

  /**
   * Register an async reaction handler. Throws if a handler with the same
   * name is already registered (catches typos + duplicate wiring at boot).
   */
  register(reaction: RegisteredAsyncReaction): void {
    if (this.handlers.has(reaction.name)) {
      throw new Error(
        `[async-reactions] duplicate handler registration: ${reaction.name}`
      );
    }
    this.handlers.set(reaction.name, reaction);
  }

  /**
   * Register multiple handlers in one call (convenience for bootstrapping).
   */
  registerAll(reactions: RegisteredAsyncReaction[]): void {
    for (const reaction of reactions) {
      this.register(reaction);
    }
  }

  /**
   * Look up a handler by name. Returns `undefined` when no handler is
   * registered (the worker dead-letters the job with a clear message).
   */
  get(name: string): RegisteredAsyncReaction | undefined {
    return this.handlers.get(name);
  }

  /**
   * Snapshot of registered reaction names — for ops dashboards + smoke tests.
   */
  names(): string[] {
    return [...this.handlers.keys()].sort();
  }
}

/**
 * Singleton registry. The factory populates it at engine creation; the worker
 * reads from it at drain time. Both share the same process.
 */
export const asyncReactionRegistry = new AsyncReactionHandlerRegistry();
