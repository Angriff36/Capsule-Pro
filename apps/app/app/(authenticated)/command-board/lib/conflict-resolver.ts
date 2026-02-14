/**
 * Conflict Resolver for Command Board Cards
 *
 * Provides conflict detection and resolution for collaborative editing of
 * command board cards using vector clocks for causality tracking.
 *
 * Supports:
 * - Position conflict detection (when two users move the same card)
 * - Content conflict detection (when two users edit card content)
 * - Automatic resolution using heuristics (last write wins, etc.)
 * - Manual resolution strategies (accept mine, accept theirs, merge)
 */

import { VectorClock } from "@repo/realtime";
import type { CardMetadata, CardPosition, CommandBoardCard } from "../types";

// =============================================================================
// Conflict Types
// =============================================================================

/**
 * Types of card conflicts that can occur during collaborative editing
 */
export type CardConflict =
  | PositionConflict
  | ContentConflict
  | ConcurrentModificationConflict;

/**
 * Position conflict occurs when two users move the same card to different
 * positions concurrently, resulting in conflicting location data.
 */
export interface PositionConflict {
  readonly type: "position";
  readonly localPosition: CardPosition;
  readonly remotePosition: CardPosition;
}

/**
 * Content conflict occurs when two users edit the same card's content
 * (title, description, metadata, etc.) concurrently.
 */
export interface ContentConflict {
  readonly type: "content";
  readonly conflictingFields: readonly (keyof CommandBoardCardContent)[];
}

/**
 * Concurrent modification conflict occurs when both position and content
 * are modified concurrently, requiring a more complex resolution strategy.
 */
export interface ConcurrentModificationConflict {
  readonly type: "concurrent";
  readonly positionConflict: PositionConflict;
  readonly contentConflict: ContentConflict;
}

// =============================================================================
// Resolution Types
// =============================================================================

/**
 * Resolution strategies for handling card conflicts
 */
export type ConflictResolution =
  | AcceptMineResolution
  | AcceptTheirsResolution
  | MergeResolution;

/**
 * Accept the local (mine) changes and discard remote changes
 */
export interface AcceptMineResolution {
  readonly strategy: "acceptMine";
}

/**
 * Accept the remote (theirs) changes and discard local changes
 */
export interface AcceptTheirsResolution {
  readonly strategy: "acceptTheirs";
}

/**
 * Merge both local and remote changes selectively
 */
export interface MergeResolution {
  readonly strategy: "merge";
  readonly mergeOptions: MergeOptions;
}

/**
 * Options for merging conflicting card changes
 */
export interface MergeOptions {
  /** Which position to accept (local, remote, or latest by timestamp) */
  readonly positionSource: "local" | "remote" | "latest";
  /** Which content fields to accept from local */
  readonly localContentFields: readonly (keyof CommandBoardCardContent)[];
  /** Which content fields to accept from remote */
  readonly remoteContentFields: readonly (keyof CommandBoardCardContent)[];
}

// =============================================================================
// Card Content Types
// =============================================================================

/**
 * Card content fields that can be in conflict
 * Excludes position which is handled separately
 * Includes metadata as it can also be a source of conflict
 */
export type CommandBoardCardContent = Pick<
  CommandBoardCard,
  | "title"
  | "content"
  | "cardType"
  | "status"
  | "color"
  | "entityId"
  | "entityType"
  | "metadata"
>;

/**
 * Position fields of a card
 */
export type CardPositionFields = Pick<
  CardPosition,
  "x" | "y" | "width" | "height" | "zIndex"
>;

// =============================================================================
// Conflict Details Types
// =============================================================================

/**
 * Version information for a card state
 */
export interface CardVersion {
  /** Position of the card */
  readonly position: CardPosition;
  /** Content fields of the card */
  readonly content: CommandBoardCardContent;
  /** Vector clock for causality tracking */
  readonly vectorClock: VectorClock;
  /** Monotonically increasing version number */
  readonly version: number;
  /** Timestamp when this version was created */
  readonly timestamp: Date;
}

/**
 * Detailed information about a detected conflict
 */
export interface ConflictDetails {
  /** Unique identifier for this conflict instance */
  readonly conflictId: string;
  /** Type of conflict detected */
  readonly conflictType: CardConflict;
  /** Local version of the card */
  readonly localVersion: CardVersion;
  /** Remote version of the card */
  readonly remoteVersion: CardVersion;
  /** Resolution strategy to apply (if pre-selected) */
  readonly resolution?: ConflictResolution;
  /** Card ID that has the conflict */
  readonly cardId: string;
  /** Board ID for the conflicted card */
  readonly boardId: string;
}

/**
 * Result of a conflict resolution operation
 */
export interface ConflictResolutionResult {
  /** The resolved card state */
  readonly resolvedCard: CommandBoardCard;
  /** The resolution strategy that was applied */
  readonly appliedResolution: ConflictResolution;
  /** Merged vector clock representing the resolution */
  readonly mergedVectorClock: VectorClock;
}

// =============================================================================
// Card Conflict Resolver Class
// =============================================================================

/**
 * CardConflictResolver handles detection and resolution of conflicts
 * in collaborative command board editing scenarios.
 *
 * Uses vector clocks to determine causality between concurrent edits
 * and provides strategies for automatic and manual conflict resolution.
 *
 * @example
 * ```ts
 * const resolver = new CardConflictResolver();
 *
 * // Detect conflict
 * const conflict = resolver.detectPositionConflict(localCard, remoteCard);
 * if (conflict) {
 *   // Auto-resolve using last-write-wins
 *   const result = resolver.autoResolve(conflict);
 *   // Apply resolved card to state
 * }
 * ```
 */
export class CardConflictResolver {
  /**
   * Detects position conflicts between local and remote card versions.
   *
   * A position conflict occurs when:
   * 1. The vector clocks are concurrent (neither happens-before nor happens-after)
   * 2. The position fields (x, y, width, height, zIndex) differ
   *
   * @param localCard - The local card version
   * @param remoteCard - The remote card version
   * @returns A PositionConflict if detected, null otherwise
   *
   * @example
   * ```ts
   * const conflict = resolver.detectPositionConflict(localCard, remoteCard);
   * if (conflict) {
   *   console.log("Position conflict detected", conflict);
   * }
   * ```
   */
  detectPositionConflict(
    localCard: CommandBoardCard,
    remoteCard: CommandBoardCard
  ): PositionConflict | null {
    const localClock = this.extractVectorClock(localCard);
    const remoteClock = this.extractVectorClock(remoteCard);

    // If clocks are not concurrent, no conflict (one happened after the other)
    const comparison = localClock.compare(remoteClock);
    if (comparison !== "concurrent") {
      return null;
    }

    // Check if positions differ
    const positionsDiffer = this.positionsDiffer(
      localCard.position,
      remoteCard.position
    );

    if (!positionsDiffer) {
      return null;
    }

    return {
      type: "position",
      localPosition: { ...localCard.position },
      remotePosition: { ...remoteCard.position },
    };
  }

  /**
   * Detects content conflicts between local and remote card versions.
   *
   * A content conflict occurs when:
   * 1. The vector clocks are concurrent
   * 2. Any content fields (title, content, cardType, status, color, etc.) differ
   *
   * @param localCard - The local card version
   * @param remoteCard - The remote card version
   * @returns A ContentConflict if detected, null otherwise
   *
   * @example
   * ```ts
   * const conflict = resolver.detectContentConflict(localCard, remoteCard);
   * if (conflict) {
   *   console.log("Content conflict in fields:", conflict.conflictingFields);
   * }
   * ```
   */
  detectContentConflict(
    localCard: CommandBoardCard,
    remoteCard: CommandBoardCard
  ): ContentConflict | null {
    const localClock = this.extractVectorClock(localCard);
    const remoteClock = this.extractVectorClock(remoteCard);

    const comparison = localClock.compare(remoteClock);
    if (comparison !== "concurrent") {
      return null;
    }

    const conflictingFields: (keyof CommandBoardCardContent)[] = [];

    const contentFields: (keyof CommandBoardCardContent)[] = [
      "title",
      "content",
      "cardType",
      "status",
      "color",
      "entityId",
      "entityType",
      "metadata",
    ];

    for (const field of contentFields) {
      if (!this.fieldValuesEqual(localCard[field], remoteCard[field])) {
        conflictingFields.push(field);
      }
    }

    if (conflictingFields.length === 0) {
      return null;
    }

    return {
      type: "content",
      conflictingFields,
    };
  }

  /**
   * Detects any type of conflict between local and remote card versions.
   *
   * Checks for position, content, or concurrent modification conflicts.
   * Returns the most specific conflict type detected.
   *
   * @param localCard - The local card version
   * @param remoteCard - The remote card version
   * @returns ConflictDetails if a conflict is detected, null otherwise
   *
   * @example
   * ```ts
   * const details = resolver.detectConflict(localCard, remoteCard);
   * if (details) {
   *   console.log("Conflict detected:", details.conflictType);
   * }
   * ```
   */
  detectConflict(
    localCard: CommandBoardCard,
    remoteCard: CommandBoardCard
  ): ConflictDetails | null {
    const positionConflict = this.detectPositionConflict(localCard, remoteCard);
    const contentConflict = this.detectContentConflict(localCard, remoteCard);

    if (!(positionConflict || contentConflict)) {
      return null;
    }

    let conflictType: CardConflict;

    if (positionConflict && contentConflict) {
      conflictType = {
        type: "concurrent",
        positionConflict,
        contentConflict,
      };
    } else if (positionConflict) {
      conflictType = positionConflict;
    } else {
      conflictType = contentConflict!;
    }

    return {
      conflictId: this.generateConflictId(localCard.id, Date.now()),
      conflictType,
      localVersion: this.createCardVersion(localCard),
      remoteVersion: this.createCardVersion(remoteCard),
      cardId: localCard.id,
      boardId: localCard.boardId,
    };
  }

  /**
   * Resolves a conflict using the specified resolution strategy.
   *
   * @param conflict - The conflict details
   * @param resolution - The resolution strategy to apply
   * @returns The resolved card state with merged vector clock
   *
   * @example
   * ```ts
   * const result = resolver.resolveConflict(conflict, {
   *   strategy: "acceptTheirs"
   * });
   * // Apply result.resolvedCard to state
   * ```
   */
  resolveConflict(
    conflict: ConflictDetails,
    resolution: ConflictResolution
  ): ConflictResolutionResult {
    const { localVersion, remoteVersion } = conflict;

    let resolvedCard: CommandBoardCard;
    let mergedClock: VectorClock;

    switch (resolution.strategy) {
      case "acceptMine": {
        resolvedCard = this.createCardFromVersion(
          conflict.cardId,
          conflict.boardId,
          localVersion
        );
        mergedClock = localVersion.vectorClock.merge(remoteVersion.vectorClock);
        break;
      }
      case "acceptTheirs": {
        resolvedCard = this.createCardFromVersion(
          conflict.cardId,
          conflict.boardId,
          remoteVersion
        );
        mergedClock = localVersion.vectorClock.merge(remoteVersion.vectorClock);
        break;
      }
      case "merge": {
        resolvedCard = this.createMergedCard(
          conflict.cardId,
          conflict.boardId,
          localVersion,
          remoteVersion,
          resolution.mergeOptions
        );
        mergedClock = localVersion.vectorClock.merge(remoteVersion.vectorClock);
        break;
      }
      default: {
        // Exhaustive check - should never reach here
        const _exhaustive: never = resolution;
        throw new Error(`Unknown resolution strategy: ${_exhaustive}`);
      }
    }

    return {
      resolvedCard,
      appliedResolution: resolution,
      mergedVectorClock: mergedClock,
    };
  }

  /**
   * Automatically resolves a conflict using heuristic-based strategies.
   *
   * Heuristics used:
   * - For position conflicts: Use the latest by timestamp
   * - For content conflicts: Use latest-writer-wins per-field
   * - For concurrent conflicts: Combine the above strategies
   *
   * @param conflict - The conflict to auto-resolve
   * @returns The resolution result with applied strategy
   *
   * @example
   * ```ts
   * const result = resolver.autoResolve(conflict);
   * console.log("Auto-resolved with:", result.appliedResolution);
   * ```
   */
  autoResolve(conflict: ConflictDetails): ConflictResolutionResult {
    const { conflictType, localVersion, remoteVersion } = conflict;

    let resolution: ConflictResolution;

    switch (conflictType.type) {
      case "position": {
        // Use latest position by timestamp
        const positionSource =
          localVersion.timestamp > remoteVersion.timestamp
            ? ("local" as const)
            : ("remote" as const);

        resolution = {
          strategy: "merge",
          mergeOptions: {
            positionSource,
            localContentFields: [],
            remoteContentFields: [],
          },
        };
        break;
      }
      case "content": {
        // For each conflicting field, use the latest by timestamp
        const localFields: (keyof CommandBoardCardContent)[] = [];
        const remoteFields: (keyof CommandBoardCardContent)[] = [];

        const isLocalLatest = localVersion.timestamp > remoteVersion.timestamp;

        for (const field of conflictType.conflictingFields) {
          if (isLocalLatest) {
            localFields.push(field);
          } else {
            remoteFields.push(field);
          }
        }

        resolution = {
          strategy: "merge",
          mergeOptions: {
            positionSource: "latest",
            localContentFields: localFields,
            remoteContentFields: remoteFields,
          },
        };
        break;
      }
      case "concurrent": {
        const isLocalLatest = localVersion.timestamp > remoteVersion.timestamp;

        resolution = {
          strategy: "merge",
          mergeOptions: {
            positionSource: isLocalLatest ? "local" : "remote",
            localContentFields: isLocalLatest
              ? [
                  "title",
                  "content",
                  "cardType",
                  "status",
                  "color",
                  "entityId",
                  "entityType",
                  "metadata",
                ]
              : [],
            remoteContentFields: isLocalLatest
              ? []
              : [
                  "title",
                  "content",
                  "cardType",
                  "status",
                  "color",
                  "entityId",
                  "entityType",
                  "metadata",
                ],
          },
        };
        break;
      }
      default: {
        // Exhaustive check
        const _exhaustive: never = conflictType;
        throw new Error(`Unknown conflict type: ${_exhaustive}`);
      }
    }

    return this.resolveConflict(conflict, resolution);
  }

  /**
   * Creates a merged card from local and remote versions using the
   * specified merge options.
   *
   * @param cardId - The card ID
   * @param boardId - The board ID
   * @param local - The local card version
   * @param remote - The remote card version
   * @param options - Merge options specifying what to take from each version
   * @returns A merged card state
   *
   * @example
   * ```ts
   * const merged = resolver.createMergedCard(
   *   cardId,
   *   boardId,
   *   localVersion,
   *   remoteVersion,
   *   {
   *     positionSource: "local",
   *     localContentFields: ["title"],
   *     remoteContentFields: ["content", "color"]
   *   }
   * );
   * ```
   */
  createMergedCard(
    cardId: string,
    boardId: string,
    local: CardVersion,
    remote: CardVersion,
    options: MergeOptions
  ): CommandBoardCard {
    // Determine position
    let position: CardPosition;

    switch (options.positionSource) {
      case "local":
        position = { ...local.position };
        break;
      case "remote":
        position = { ...remote.position };
        break;
      case "latest":
        position =
          local.timestamp > remote.timestamp
            ? { ...local.position }
            : { ...remote.position };
        break;
    }

    // Merge content fields
    const mergedContent: CommandBoardCardContent = {
      title: remote.content.title,
      content: remote.content.content,
      cardType: remote.content.cardType,
      status: remote.content.status,
      color: remote.content.color,
      entityId: remote.content.entityId,
      entityType: remote.content.entityType,
      metadata: (remote.content.metadata as CardMetadata) ?? {},
    };

    // Apply local content fields
    for (const field of options.localContentFields) {
      (mergedContent[field] as unknown) = local.content[field];
    }

    // Apply remote content fields (override if already set from default)
    for (const field of options.remoteContentFields) {
      (mergedContent[field] as unknown) = remote.content[field];
    }

    // Merge metadata - combine both, remote takes precedence on conflicts
    const mergedMetadata: CardMetadata = {
      ...((local.content.metadata as CardMetadata) ?? {}),
      ...((remote.content.metadata as CardMetadata) ?? {}),
    };

    // Use the later timestamp
    const latestTimestamp =
      local.timestamp > remote.timestamp ? local.timestamp : remote.timestamp;

    // Use the higher version number
    const _higherVersion = Math.max(local.version, remote.version);

    return {
      id: cardId,
      tenantId: "", // Will be filled by caller
      boardId,
      title: mergedContent.title,
      content: mergedContent.content,
      cardType: mergedContent.cardType,
      status: mergedContent.status,
      position,
      color: mergedContent.color,
      metadata: mergedMetadata,
      entityId: mergedContent.entityId,
      entityType: mergedContent.entityType,
      createdAt: latestTimestamp, // Using timestamp as createdAt fallback
      updatedAt: latestTimestamp,
      deletedAt: null,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Extracts or creates a vector clock from a card
   */
  private extractVectorClock(card: CommandBoardCard): VectorClock {
    // Check if metadata contains vector clock data
    const vcData = (card.metadata as { vectorClock?: unknown }).vectorClock;

    if (vcData && typeof vcData === "object" && vcData !== null) {
      try {
        return VectorClock.fromJSON(
          vcData as { entries: readonly (readonly [string, number])[] }
        );
      } catch {
        // If vector clock is invalid, create a new one
      }
    }

    // Create a new vector clock from the card's updatedAt timestamp
    const clock = new VectorClock();
    clock.increment(card.id);
    return clock;
  }

  /**
   * Creates a CardVersion from a CommandBoardCard
   */
  private createCardVersion(card: CommandBoardCard): CardVersion {
    return {
      position: { ...card.position },
      content: {
        title: card.title,
        content: card.content,
        cardType: card.cardType,
        status: card.status,
        color: card.color,
        entityId: card.entityId,
        entityType: card.entityType,
        metadata: card.metadata,
      },
      vectorClock: this.extractVectorClock(card),
      version: this.extractVersionNumber(card),
      timestamp: card.updatedAt,
    };
  }

  /**
   * Extracts a version number from a card
   * Uses updatedAt timestamp as version proxy
   */
  private extractVersionNumber(card: CommandBoardCard): number {
    return card.updatedAt.getTime();
  }

  /**
   * Creates a CommandBoardCard from a CardVersion
   */
  private createCardFromVersion(
    cardId: string,
    boardId: string,
    version: CardVersion
  ): CommandBoardCard {
    return {
      id: cardId,
      tenantId: "", // Will be filled by caller
      boardId,
      title: version.content.title,
      content: version.content.content,
      cardType: version.content.cardType,
      status: version.content.status,
      position: { ...version.position },
      color: version.content.color,
      metadata: (version.content.metadata as CardMetadata | undefined) ?? {},
      entityId: version.content.entityId,
      entityType: version.content.entityType,
      createdAt: version.timestamp,
      updatedAt: version.timestamp,
      deletedAt: null,
    };
  }

  /**
   * Checks if two positions differ
   */
  private positionsDiffer(a: CardPosition, b: CardPosition): boolean {
    return (
      a.x !== b.x ||
      a.y !== b.y ||
      a.width !== b.width ||
      a.height !== b.height ||
      a.zIndex !== b.zIndex
    );
  }

  /**
   * Checks if two field values are equal
   * Handles null/undefined and deep equality for objects
   */
  private fieldValuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }
    if (a == null || b == null) {
      return a === b;
    }
    if (typeof a === "object" && typeof b === "object") {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }

  /**
   * Generates a unique conflict ID
   */
  private generateConflictId(cardId: string, timestamp: number): string {
    return `conflict_${cardId}_${timestamp}_${Math.random().toString(36).slice(2)}`;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a new CardConflictResolver instance
 *
 * @example
 * ```ts
 * const resolver = createConflictResolver();
 * ```
 */
export function createConflictResolver(): CardConflictResolver {
  return new CardConflictResolver();
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Checks if a conflict can be auto-resolved based on its type
 *
 * @param conflict - The conflict to check
 * @returns true if the conflict can be auto-resolved
 *
 * @example
 * ```ts
 * if (canAutoResolve(conflict)) {
 *   const result = resolver.autoResolve(conflict);
 * }
 * ```
 */
export function canAutoResolve(_conflict: ConflictDetails): boolean {
  // All conflict types can be auto-resolved using heuristics
  return true;
}

/**
 * Gets the severity level of a conflict
 *
 * @param conflict - The conflict to assess
 * @returns The severity level: "low", "medium", or "high"
 *
 * @example
 * ```ts
 * const severity = getConflictSeverity(conflict);
 * // "high" for concurrent conflicts, "medium" for single-type conflicts
 * ```
 */
export function getConflictSeverity(
  conflict: ConflictDetails
): "low" | "medium" | "high" {
  switch (conflict.conflictType.type) {
    case "concurrent":
      return "high";
    case "position":
      return "low";
    case "content":
      return "medium";
  }
}

/**
 * Creates a human-readable description of a conflict
 *
 * @param conflict - The conflict to describe
 * @returns A human-readable description string
 *
 * @example
 * ```ts
 * const description = describeConflict(conflict);
 * // "Position conflict: Card was moved to different locations concurrently"
 * ```
 */
export function describeConflict(conflict: ConflictDetails): string {
  switch (conflict.conflictType.type) {
    case "position":
      return `Position conflict: Card "${conflict.cardId}" was moved to different locations concurrently`;
    case "content": {
      const fields = conflict.conflictType.conflictingFields.join(", ");
      return `Content conflict: Card "${conflict.cardId}" has conflicting changes in fields: ${fields}`;
    }
    case "concurrent":
      return `Concurrent modification: Card "${conflict.cardId}" has both position and content conflicts`;
  }
}

/**
 * Creates a default merge options for a conflict type
 *
 * @param conflictType - The type of conflict
 * @param preferLocal - Whether to prefer local changes (default: true)
 * @returns Merge options with reasonable defaults
 *
 * @example
 * ```ts
 * const options = createDefaultMergeOptions(conflict.conflictType, true);
 * const result = resolver.resolveConflict(conflict, { strategy: "merge", mergeOptions: options });
 * ```
 */
export function createDefaultMergeOptions(
  conflictType: CardConflict,
  preferLocal = true
): MergeOptions {
  const allContentFields: (keyof CommandBoardCardContent)[] = [
    "title",
    "content",
    "cardType",
    "status",
    "color",
    "entityId",
    "entityType",
    "metadata",
  ];

  switch (conflictType.type) {
    case "position":
      return {
        positionSource: preferLocal ? "local" : "remote",
        localContentFields: preferLocal ? allContentFields : [],
        remoteContentFields: preferLocal ? [] : allContentFields,
      };
    case "content":
      return {
        positionSource: "latest",
        localContentFields: preferLocal
          ? [...conflictType.conflictingFields]
          : [],
        remoteContentFields: preferLocal
          ? []
          : [...conflictType.conflictingFields],
      };
    case "concurrent":
      return {
        positionSource: preferLocal ? "local" : "remote",
        localContentFields: preferLocal
          ? [...conflictType.contentConflict.conflictingFields]
          : [],
        remoteContentFields: preferLocal
          ? []
          : [...conflictType.contentConflict.conflictingFields],
      };
  }
}
