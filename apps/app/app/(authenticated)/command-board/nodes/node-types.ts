import { BoardEdge } from "./board-edge";
import { ProjectionNode } from "./projection-node";

export const nodeTypes = {
  projection: ProjectionNode,
} as const;

export const edgeTypes = {
  default: BoardEdge,
  smoothstep: BoardEdge,
} as const;
