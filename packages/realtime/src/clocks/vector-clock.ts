/**
 * Vector Clock Implementation
 *
 * A vector clock is a data structure used for capturing causality in distributed systems.
 * Each node maintains its own counter, and the overall state is a map of node IDs to counters.
 *
 * This implementation supports:
 * - Incrementing a counter for a specific node
 * - Comparing two vector clocks to determine causality
 * - Merging two vector clocks by taking the maximum per node
 * - Serialization to/from JSON for database storage
 *
 * @example
 * ```ts
 * import { VectorClock } from "@repo/realtime/clocks";
 *
 * // Create a new vector clock
 * const clock1 = new VectorClock();
 * clock1.increment("node-A");
 * clock1.increment("node-A");
 * clock1.increment("node-B");
 *
 * const clock2 = new VectorClock();
 * clock2.increment("node-A");
 * clock2.increment("node-C");
 *
 * // Compare clocks
 * const relation = clock1.compare(clock2); // "concurrent"
 *
 * // Merge clocks
 * const merged = clock1.merge(clock2);
 * ```
 *
 * @see {@link https://en.wikipedia.org/wiki/Vector_clock | Vector Clock on Wikipedia}
 */

/**
 * Result of comparing two vector clocks.
 *
 * - "happens-before": This clock precedes the other clock (all counters <=, at least one <)
 * - "happens-after": This clock follows the other clock (all counters >=, at least one >)
 * - "concurrent": Clocks are concurrent (neither happens-before nor happens-after)
 * - "equal": Clocks are identical (all counters equal)
 */
export type VectorClockComparison =
  | "happens-before"
  | "happens-after"
  | "concurrent"
  | "equal";

/**
 * Internal representation of a vector clock as a map of node IDs to version numbers.
 */
export type VectorClockData = ReadonlyMap<string, number>;

/**
 * Serialized form of a vector clock for storage/transmission.
 */
export interface VectorClockJSON {
  readonly entries: ReadonlyArray<readonly [string, number]>;
}

/**
 * Options for creating a VectorClock.
 */
export interface VectorClockOptions {
  /**
   * Initial clock state. If provided, the clock will be initialized with these values.
   * The map is cloned to avoid external mutation.
   */
  readonly initialState?: VectorClockData;
}

/**
 * Vector clock implementation for tracking causality in distributed systems.
 *
 * Vector clocks are used to determine the partial ordering of events in distributed
 * systems. Each node maintains its own counter, and the clock state represents the
 * knowledge of all nodes at a given point in time.
 *
 * @example
 * ```ts
 * const clock = new VectorClock();
 * clock.increment("node-1"); // { "node-1": 1 }
 * clock.increment("node-1"); // { "node-1": 2 }
 * clock.increment("node-2"); // { "node-1": 2, "node-2": 1 }
 *
 * const serialized = clock.toJSON();
 * const restored = VectorClock.fromJSON(serialized);
 * ```
 */
export class VectorClock {
  /**
   * Internal map storing node ID -> counter pairs.
   * Uses a Map for O(1) lookup and efficient iteration.
   */
  readonly #clock: Map<string, number>;

  /**
   * Creates a new vector clock.
   *
   * @param options - Optional configuration for initial state
   */
  constructor(options: VectorClockOptions = {}) {
    this.#clock = new Map();
    if (options.initialState) {
      for (const [nodeId, version] of options.initialState.entries()) {
        this.#clock.set(nodeId, version);
      }
    }
  }

  /**
   * Creates a vector clock from a JSON representation.
   *
   * @param json - The serialized vector clock data
   * @returns A new VectorClock instance
   * @throws {TypeError} If JSON structure is invalid
   *
   * @example
   * ```ts
   * const json = { entries: [["node-1", 3], ["node-2", 1]] };
   * const clock = VectorClock.fromJSON(json);
   * ```
   */
  static fromJSON(json: unknown): VectorClock {
    if (typeof json !== "object" || json === null) {
      throw new TypeError("JSON must be an object");
    }

    const data = json as { entries?: unknown };

    if (!Array.isArray(data.entries)) {
      throw new TypeError("JSON must have an entries array");
    }

    const clock = new VectorClock();
    for (const entry of data.entries) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== "string" ||
        typeof entry[1] !== "number"
      ) {
        throw new TypeError("Each entry must be a [string, number] tuple");
      }
      const [nodeId, version] = entry as [string, number];
      if (!Number.isInteger(version) || version < 0) {
        throw new TypeError(
          `Version must be a non-negative integer, got ${version}`
        );
      }
      clock.#clock.set(nodeId, version);
    }

    return clock;
  }

  /**
   * Increments the counter for a specific node.
   *
   * If the node doesn't exist in the clock, it's initialized to 1.
   * If the node exists, its counter is incremented by 1.
   *
   * @param nodeId - The unique identifier of the node
   * @returns This vector clock instance (for method chaining)
   * @throws {TypeError} If nodeId is not a non-empty string
   *
   * @example
   * ```ts
   * const clock = new VectorClock();
   * clock.increment("node-A"); // counter becomes 1
   * clock.increment("node-A"); // counter becomes 2
   * ```
   */
  increment(nodeId: string): this {
    if (typeof nodeId !== "string" || nodeId.length === 0) {
      throw new TypeError("nodeId must be a non-empty string");
    }

    const currentCount = this.#clock.get(nodeId) ?? 0;
    this.#clock.set(nodeId, currentCount + 1);
    return this;
  }

  /**
   * Gets the current counter value for a node.
   *
   * @param nodeId - The unique identifier of the node
   * @returns The counter value, or 0 if the node doesn't exist
   *
   * @example
   * ```ts
   * const clock = new VectorClock();
   * clock.increment("node-A").increment("node-A");
   * clock.get("node-A"); // 2
   * clock.get("node-B"); // 0
   * ```
   */
  get(nodeId: string): number {
    return this.#clock.get(nodeId) ?? 0;
  }

  /**
   * Compares this vector clock with another to determine their causal relationship.
   *
   * The comparison follows these rules:
   * - "happens-before": All counters in this clock <= corresponding counters in other,
   *                     and at least one counter is strictly less
   * - "happens-after": All counters in this clock >= corresponding counters in other,
   *                    and at least one counter is strictly greater
   * - "equal": All counters are identical
   * - "concurrent": Neither happens-before nor happens-after (some counters are greater,
   *                 some are less, or nodes exist only in one clock)
   *
   * @param other - The vector clock to compare against
   * @returns The causal relationship between the two clocks
   *
   * @example
   * ```ts
   * const clock1 = new VectorClock();
   * clock1.increment("node-A");
   *
   * const clock2 = new VectorClock();
   * clock2.increment("node-A");
   * clock2.increment("node-B");
   *
   * clock1.compare(clock2); // "happens-before"
   * clock2.compare(clock1); // "happens-after"
   * ```
   */
  compare(other: VectorClock): VectorClockComparison {
    let thisLessOrEqual = false;
    let thisGreaterOrEqual = false;

    // Get all unique node IDs from both clocks
    const allNodes = new Set<string>();
    for (const nodeId of this.#clock.keys()) {
      allNodes.add(nodeId);
    }
    for (const nodeId of other.#clock.keys()) {
      allNodes.add(nodeId);
    }

    // Compare counters for each node
    for (const nodeId of allNodes) {
      const thisCount = this.#clock.get(nodeId) ?? 0;
      const otherCount = other.#clock.get(nodeId) ?? 0;

      if (thisCount < otherCount) {
        thisLessOrEqual = true;
      } else if (thisCount > otherCount) {
        thisGreaterOrEqual = true;
      }
    }

    // Determine the relationship
    if (thisLessOrEqual && !thisGreaterOrEqual) {
      return "happens-before";
    }
    if (thisGreaterOrEqual && !thisLessOrEqual) {
      return "happens-after";
    }
    if (!(thisLessOrEqual || thisGreaterOrEqual)) {
      return "equal";
    }
    return "concurrent";
  }

  /**
   * Merges this vector clock with another by taking the maximum counter for each node.
   *
   * This operation is commutative and associative, making it safe to use in any order.
   * The original clock is not modified; a new clock is returned.
   *
   * @param other - The vector clock to merge with
   * @returns A new VectorClock instance with merged counters
   *
   * @example
   * ```ts
   * const clock1 = new VectorClock();
   * clock1.increment("node-A");
   * clock1.increment("node-A");
   *
   * const clock2 = new VectorClock();
   * clock2.increment("node-A");
   * clock2.increment("node-B");
   *
   * const merged = clock1.merge(clock2);
   * // merged has: { "node-A": 2, "node-B": 1 }
   * ```
   */
  merge(other: VectorClock): VectorClock {
    const merged = new VectorClock();

    // Copy all entries from this clock
    for (const [nodeId, version] of this.#clock.entries()) {
      merged.#clock.set(nodeId, version);
    }

    // Take max for each entry in other clock
    for (const [nodeId, otherVersion] of other.#clock.entries()) {
      const currentVersion = merged.#clock.get(nodeId) ?? 0;
      merged.#clock.set(nodeId, Math.max(currentVersion, otherVersion));
    }

    return merged;
  }

  /**
   * Creates a deep copy of this vector clock.
   *
   * The returned clock is independent of the original and can be modified
   * without affecting the source clock.
   *
   * @returns A new VectorClock instance with the same state
   *
   * @example
   * ```ts
   * const original = new VectorClock();
   * original.increment("node-A");
   *
   * const clone = original.clone();
   * clone.increment("node-B");
   *
   * original.get("node-B"); // 0 (unchanged)
   * clone.get("node-B"); // 1
   * ```
   */
  clone(): VectorClock {
    const cloned = new VectorClock();
    for (const [nodeId, version] of this.#clock.entries()) {
      cloned.#clock.set(nodeId, version);
    }
    return cloned;
  }

  /**
   * Serializes the vector clock to a JSON-compatible format.
   *
   * The output can be stored in a database or transmitted over the network.
   * Use {@link VectorClock.fromJSON} to restore the clock.
   *
   * @returns A JSON-serializable representation of the clock
   *
   * @example
   * ```ts
   * const clock = new VectorClock();
   * clock.increment("node-A");
   *
   * const json = clock.toJSON();
   * // { entries: [["node-A", 1]] }
   *
   * const restored = VectorClock.fromJSON(json);
   * ```
   */
  toJSON(): VectorClockJSON {
    return {
      entries: Array.from(this.#clock.entries()),
    };
  }

  /**
   * Returns the number of nodes tracked in this clock.
   *
   * @returns The count of unique node IDs
   */
  get size(): number {
    return this.#clock.size;
  }

  /**
   * Returns an iterator over the node IDs in this clock.
   *
   * @returns An iterator of node ID strings
   */
  nodes(): IterableIterator<string> {
    return this.#clock.keys();
  }

  /**
   * Returns an iterator over all [nodeId, counter] pairs in this clock.
   *
   * @returns An iterator of [nodeId, counter] tuples
   */
  entries(): IterableIterator<[string, number]> {
    return this.#clock.entries();
  }

  /**
   * Checks if this clock is empty (contains no nodes).
   *
   * @returns true if the clock has no entries, false otherwise
   */
  isEmpty(): boolean {
    return this.#clock.size === 0;
  }

  /**
   * Clears all entries from the clock.
   *
   * After calling this method, the clock will be in its initial state.
   */
  clear(): void {
    this.#clock.clear();
  }
}
