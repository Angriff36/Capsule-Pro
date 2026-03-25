/**
 * Entity Relationship Graph Types
 *
 * Core type definitions for the entity graph.
 * Separated to avoid circular dependencies.
 */
// ---------------------------------------------------------------------------
// Relationship Types
// ---------------------------------------------------------------------------
/**
 * Types of relationships between entities in the graph.
 *
 * - **composition**: Child entity cannot exist without parent (e.g., Event → EventBudget)
 * - **aggregation**: Child entity can exist independently but belongs to parent (e.g., Menu → MenuDish)
 * - **reference**: Entity references another without ownership (e.g., Event → Client)
 * - **dependency**: Entity depends on another for behavior (e.g., PrepTask → Recipe)
 * - **junction**: Many-to-many relationship via junction table (e.g., Event ↔ Dish)
 * - **hierarchy**: Hierarchical relationship (e.g., CommandBoard → CommandBoardCard)
 * - **version**: Versioned relationship (e.g., Recipe → RecipeVersion)
 * - **workflow**: Entity participates in a workflow (e.g., PrepTask → PrepList)
 */
export var RelationshipType;
(function (RelationshipType) {
    RelationshipType["Composition"] = "composition";
    RelationshipType["Aggregation"] = "aggregation";
    RelationshipType["Reference"] = "reference";
    RelationshipType["Dependency"] = "dependency";
    RelationshipType["Junction"] = "junction";
    RelationshipType["Hierarchy"] = "hierarchy";
    RelationshipType["Version"] = "version";
    RelationshipType["Workflow"] = "workflow";
})(RelationshipType || (RelationshipType = {}));
/**
 * Direction for relationship definitions and traversals.
 */
export var Direction;
(function (Direction) {
    /** Relationship flows from source to target */
    Direction["Outgoing"] = "outgoing";
    /** Relationship flows from target to source */
    Direction["Incoming"] = "incoming";
    /** Bidirectional relationship */
    Direction["Both"] = "both";
})(Direction || (Direction = {}));
/**
 * Direction for graph traversal queries.
 */
export var TraversalDirection;
(function (TraversalDirection) {
    /** Traverse from source to target (following outgoing edges) */
    TraversalDirection["Downstream"] = "downstream";
    /** Traverse from target to source (following incoming edges) */
    TraversalDirection["Upstream"] = "upstream";
    /** Traverse both directions */
    TraversalDirection["Both"] = "both";
})(TraversalDirection || (TraversalDirection = {}));
