// ============================================================================
// Command Board Types — Barrel Export
// ============================================================================

// Entity types and resolved data shapes
export type {
  EntityType,
  ResolvedEvent,
  ResolvedClient,
  ResolvedPrepTask,
  ResolvedKitchenTask,
  ResolvedEmployee,
  ResolvedInventoryItem,
  ResolvedRecipe,
  ResolvedDish,
  ResolvedProposal,
  ResolvedShipment,
  ResolvedNote,
  ResolvedEntity,
} from "./entities";
export {
  getEntityTitle,
  getEntityStatus,
  ENTITY_TYPE_COLORS,
  ENTITY_TYPE_LABELS,
} from "./entities";

// Board, projection, and annotation types
export type {
  BoardProjection,
  BoardScope,
  CommandBoard,
  BoardGroup,
  BoardAnnotation,
  DerivedConnection,
} from "./board";
export { RELATIONSHIP_STYLES } from "./board";

// React Flow integration types and converters
export type {
  ProjectionNodeData,
  GroupNodeData,
  ProjectionNode,
  GroupNode,
  BoardNode,
  DerivedEdgeData,
  AnnotationEdgeData,
  BoardEdge,
} from "./flow";
export { projectionToNode, connectionToEdge, annotationToEdge } from "./flow";
