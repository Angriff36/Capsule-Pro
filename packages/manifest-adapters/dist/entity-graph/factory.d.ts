/**
 * Entity Graph Factory
 *
 * Factory function for creating new entity graphs.
 * Separated to avoid circular dependencies with the graph builder.
 */
import { InMemoryEntityGraph } from "./entity-graph.js";
/**
 * Create a new empty entity graph.
 */
export declare function createEntityGraph(): InMemoryEntityGraph;
//# sourceMappingURL=factory.d.ts.map