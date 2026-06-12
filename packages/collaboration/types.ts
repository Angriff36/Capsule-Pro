/**
 * Shared types for Liveblocks integration
 */

/**
 * Represents which entity a user is currently interacting with.
 * Includes the entity type, entity ID, and projection ID.
 */
export interface EntityFocus {
  entityId: string;
  entityType: string;
  projectionId: string;
}
