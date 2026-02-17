// ============================================================================
// Command Board Types — Barrel Export
// ============================================================================

// Board, projection, and annotation types
export type {
  BoardAnnotation,
  BoardGroup,
  BoardProjection,
  BoardScope,
  CommandBoard,
  DerivedConnection,
} from "./board";
export { RELATIONSHIP_STYLES } from "./board";
// Entity types and resolved data shapes
export type {
  EntityType,
  ResolvedClient,
  ResolvedDish,
  ResolvedEmployee,
  ResolvedEntity,
  ResolvedEvent,
  ResolvedInventoryItem,
  ResolvedKitchenTask,
  ResolvedNote,
  ResolvedPrepTask,
  ResolvedProposal,
  ResolvedRecipe,
  ResolvedShipment,
} from "./entities";
export {
  ENTITY_TYPE_COLORS,
  ENTITY_TYPE_LABELS,
  getEntityStatus,
  getEntityTitle,
} from "./entities";

// React Flow integration types and converters
export type {
  AnnotationEdgeData,
  BoardEdge,
  BoardNode,
  DerivedEdgeData,
  GroupNode,
  GroupNodeData,
  ProjectionNode,
  ProjectionNodeData,
} from "./flow";
export { annotationToEdge, connectionToEdge, projectionToNode } from "./flow";
