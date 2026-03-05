/**
 * Graph Builder
 *
 * Builds an entity relationship graph from Manifest IR and Prisma schema.
 * Infers relationships from entity properties and commands.
 */
import type { IR } from "@angriff36/manifest/ir";
import type { EntityGraph } from "./types.js";
import { RelationshipType } from "./types.js";
/**
 * Represents a known relationship between entities.
 */
interface KnownRelationship {
    /** Source entity name */
    from: string;
    /** Target entity name */
    to: string;
    /** Name of the relationship (property name) */
    name: string;
    /** Type of relationship */
    type: RelationshipType;
    /** Cardinality */
    cardinality: string;
    /** Whether required */
    required: boolean;
}
/**
 * Build an entity graph from Manifest IR.
 *
 * @param ir - The compiled IR from Manifest
 * @param graph - The graph to populate (creates new if not provided)
 * @returns The populated graph
 */
export declare function buildGraphFromIR(ir: IR, graph?: EntityGraph): EntityGraph;
/**
 * Build an entity graph from known relationships.
 *
 * Creates type nodes for all entities referenced in KNOWN_RELATIONSHIPS
 * and adds edges between them.
 *
 * @param graph - The graph to populate (creates new if not provided)
 * @returns The populated graph
 */
export declare function buildGraphFromKnownRelationships(graph?: EntityGraph): EntityGraph;
/**
 * Get all known relationships.
 */
export declare function getKnownRelationships(): KnownRelationship[];
/**
 * Get relationships for a specific entity.
 */
export declare function getRelationshipsForEntity(entityName: string): KnownRelationship[];
/**
 * Get outgoing relationships from an entity.
 */
export declare function getOutgoingRelationships(entityName: string): KnownRelationship[];
/**
 * Get incoming relationships to an entity.
 */
export declare function getIncomingRelationships(entityName: string): KnownRelationship[];
export {};
//# sourceMappingURL=graph-builder.d.ts.map