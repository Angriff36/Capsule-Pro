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
export type VectorClockComparison = "happens-before" | "happens-after" | "concurrent" | "equal";
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
export declare class VectorClock {
    #private;
    /**
     * Creates a new vector clock.
     *
     * @param options - Optional configuration for initial state
     */
    constructor(options?: VectorClockOptions);
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
    static fromJSON(json: unknown): VectorClock;
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
    increment(nodeId: string): this;
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
    get(nodeId: string): number;
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
    compare(other: VectorClock): VectorClockComparison;
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
    merge(other: VectorClock): VectorClock;
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
    clone(): VectorClock;
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
    toJSON(): VectorClockJSON;
    /**
     * Returns the number of nodes tracked in this clock.
     *
     * @returns The count of unique node IDs
     */
    get size(): number;
    /**
     * Returns an iterator over the node IDs in this clock.
     *
     * @returns An iterator of node ID strings
     */
    nodes(): IterableIterator<string>;
    /**
     * Returns an iterator over all [nodeId, counter] pairs in this clock.
     *
     * @returns An iterator of [nodeId, counter] tuples
     */
    entries(): IterableIterator<[string, number]>;
    /**
     * Checks if this clock is empty (contains no nodes).
     *
     * @returns true if the clock has no entries, false otherwise
     */
    isEmpty(): boolean;
    /**
     * Clears all entries from the clock.
     *
     * After calling this method, the clock will be in its initial state.
     */
    clear(): void;
}
//# sourceMappingURL=vector-clock.d.ts.map