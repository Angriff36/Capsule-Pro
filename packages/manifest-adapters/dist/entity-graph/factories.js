/**
 * Entity Graph Factory Functions
 *
 * Helper functions for creating graph nodes, edges, and paths.
 * Separated to avoid circular dependencies.
 */
/**
 * Create a type node for an entity schema.
 */
export function createTypeNode(entityName, label) {
    return {
        id: `type:${entityName}`,
        entityName,
        kind: "type",
        label: label ?? entityName,
    };
}
/**
 * Create an instance node for a specific entity instance.
 */
export function createInstanceNode(entityName, instanceId, label) {
    return {
        id: `${entityName}:${instanceId}`,
        entityName,
        kind: "instance",
        label: label ?? `${entityName}:${instanceId}`,
    };
}
/**
 * Create an edge ID from source and target.
 */
export function edgeId(sourceId, targetId, name) {
    return `${sourceId}:${name}:${targetId}`;
}
/**
 * Create a graph edge.
 */
export function createEdge(sourceId, targetId, type, name, options = {}) {
    return {
        id: edgeId(sourceId, targetId, name),
        sourceId,
        targetId,
        type,
        name,
        required: options.required ?? false,
        cardinality: options.cardinality ?? "1:N",
        metadata: options.metadata,
    };
}
/**
 * Create an empty path starting at a node.
 */
export function createPath(startNode) {
    return {
        nodes: [startNode],
        edges: [],
        weight: 0,
    };
}
/**
 * Extend a path with a new node and edge.
 */
export function extendPath(path, node, edge) {
    return {
        nodes: [...path.nodes, node],
        edges: [...path.edges, edge],
        weight: path.weight + 1,
    };
}
