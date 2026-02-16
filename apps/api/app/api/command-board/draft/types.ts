/**
 * Command Board Draft API Types
 */

import type {
  CommandBoardCard,
  CommandBoardConnection,
  CommandBoardGroup,
  ViewportState,
} from "../types";

/**
 * Save draft request
 */
export interface SaveDraftRequest {
  cards: CommandBoardCard[];
  viewport: ViewportState;
  connections: CommandBoardConnection[];
  groups: CommandBoardGroup[];
  timestamp: string;
}

/**
 * Draft response
 */
export interface DraftResponse {
  id: string;
  updatedAt: string;
}

/**
 * Load draft response
 */
export interface LoadDraftResponse {
  success: boolean;
  draft: {
    cards: CommandBoardCard[];
    viewport: ViewportState;
    connections: CommandBoardConnection[];
    groups: CommandBoardGroup[];
    updatedAt: string;
  } | null;
}
