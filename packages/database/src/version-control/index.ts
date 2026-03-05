/**
 * Version Control Service
 *
 * Helper functions for registering and managing versioned entities
 * in the Capsule-Pro system.
 */

import { database } from "../index";

export interface VersionSnapshot {
  [key: string]: unknown;
}

export interface VersionControlOptions {
  entityType: string;
  entityId: string;
  entityName: string;
  initialSnapshot?: VersionSnapshot;
  tenantId: string;
  userId: string;
}

export interface CreateVersionOptions {
  versionedEntityId?: string;
  entityType?: string;
  entityId?: string;
  snapshotData: VersionSnapshot;
  changeReason?: string;
  changeSummary?: string;
  changeType?: "create" | "update" | "restore" | "approve" | "auto";
  tenantId: string;
  userId: string;
}

/**
 * Registers an entity for version control.
 * Creates a VersionedEntity record and optionally an initial version.
 */
export async function registerVersionedEntity({
  entityType,
  entityId,
  entityName,
  initialSnapshot,
  tenantId,
  userId,
}: VersionControlOptions) {
  // Check if already registered
  const existing = await database.versionedEntity.findUnique({
    where: {
      tenantId_entityType_entityId: {
        tenantId,
        entityType,
        entityId,
      },
    },
  });

  if (existing) {
    return { versionedEntity: existing, created: false };
  }

  // Create versioned entity
  const versionedEntity = await database.versionedEntity.create({
    data: {
      tenantId,
      entityType,
      entityId,
      entityName,
    },
  });

  // Create initial version if snapshot provided
  let initialVersion = null;
  if (initialSnapshot) {
    initialVersion = await database.entityVersion.create({
      data: {
        tenantId,
        versionedEntityId: versionedEntity.id,
        versionNumber: 1,
        changeType: "create",
        snapshotData: initialSnapshot,
        changeReason: "Initial version",
        createdBy: userId,
      },
    });

    await database.versionedEntity.update({
      where: { tenantId_id: { tenantId, id: versionedEntity.id } },
      data: { currentVersionId: initialVersion.id },
    });
  }

  return {
    versionedEntity,
    initialVersion,
    created: true,
  };
}

/**
 * Creates a new version of an entity.
 * Automatically determines the next version number.
 */
export async function createEntityVersion({
  versionedEntityId,
  entityType,
  entityId,
  snapshotData,
  changeReason = "",
  changeSummary = "",
  changeType = "update",
  tenantId,
  userId,
}: CreateVersionOptions) {
  let targetVersionedEntityId = versionedEntityId;

  // If not provided, look up by entity type + id
  if (!targetVersionedEntityId && entityType && entityId) {
    const versionedEntity = await database.versionedEntity.findUnique({
      where: {
        tenantId_entityType_entityId: {
          tenantId,
          entityType,
          entityId,
        },
      },
    });

    if (!versionedEntity) {
      throw new Error("Entity not registered for versioning");
    }

    targetVersionedEntityId = versionedEntity.id;
  }

  if (!targetVersionedEntityId) {
    throw new Error("Must provide versionedEntityId or entityType+entityId");
  }

  // Check if entity is locked
  const versionedEntity = await database.versionedEntity.findUnique({
    where: { tenantId_id: { tenantId, id: targetVersionedEntityId } },
  });

  if (!versionedEntity) {
    throw new Error("Versioned entity not found");
  }

  if (versionedEntity.isLocked) {
    throw new Error("Cannot create version - entity is locked");
  }

  // Get next version number
  const latestVersion = await database.entityVersion.findFirst({
    where: {
      tenantId,
      versionedEntityId: targetVersionedEntityId,
      deletedAt: null,
    },
    orderBy: { versionNumber: "desc" },
  });

  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  // Create new version
  const newVersion = await database.entityVersion.create({
    data: {
      tenantId,
      versionedEntityId: targetVersionedEntityId,
      versionNumber: nextVersionNumber,
      changeType,
      snapshotData,
      changeReason,
      changeSummary,
      createdBy: userId,
    },
  });

  // Update current version on parent entity
  await database.versionedEntity.update({
    where: { tenantId_id: { tenantId, id: targetVersionedEntityId } },
    data: { currentVersionId: newVersion.id },
  });

  return { version: newVersion, versionNumber: nextVersionNumber };
}

/**
 * Restores an entity to a previous version.
 * Creates a new version with the snapshot data from the version being restored.
 */
export async function restoreEntityVersion({
  versionId,
  changeReason = "Restored from previous version",
  tenantId,
  userId,
}: {
  versionId: string;
  changeReason?: string;
  tenantId: string;
  userId: string;
}) {
  // Get the version to restore
  const versionToRestore = await database.entityVersion.findUnique({
    where: { tenantId_id: { tenantId, id: versionId } },
    include: {
      versionedEntity: true,
    },
  });

  if (!versionToRestore) {
    throw new Error("Version not found");
  }

  if (versionToRestore.versionedEntity.isLocked) {
    throw new Error("Cannot restore - entity is locked");
  }

  // Get next version number
  const latestVersion = await database.entityVersion.findFirst({
    where: {
      tenantId,
      versionedEntityId: versionToRestore.versionedEntityId,
      deletedAt: null,
    },
    orderBy: { versionNumber: "desc" },
  });

  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  // Create new version with the snapshot data from the version being restored
  const restoredVersion = await database.entityVersion.create({
    data: {
      tenantId,
      versionedEntityId: versionToRestore.versionedEntityId,
      versionNumber: nextVersionNumber,
      changeType: "restore",
      snapshotData: versionToRestore.snapshotData,
      changeReason: `${changeReason} (restored from version ${versionToRestore.versionNumber})`,
      changeSummary: `Restored from version ${versionToRestore.versionNumber}`,
      createdBy: userId,
      metadata: {
        restoredFromVersion: versionToRestore.versionNumber,
        restoredFromVersionId: versionToRestore.id,
      },
    },
  });

  // Update current version on parent entity
  await database.versionedEntity.update({
    where: { tenantId_id: { tenantId, id: versionToRestore.versionedEntityId } },
    data: { currentVersionId: restoredVersion.id },
  });

  return {
    version: restoredVersion,
    fromVersion: versionToRestore.versionNumber,
    toVersion: nextVersionNumber,
  };
}

/**
 * Gets all versions for an entity.
 */
export async function getEntityVersions({
  versionedEntityId,
  entityType,
  entityId,
  tenantId,
}: {
  versionedEntityId?: string;
  entityType?: string;
  entityId?: string;
  tenantId: string;
}) {
  let whereVersionedEntityId = versionedEntityId;

  // If not provided, look up by entity type + id
  if (!whereVersionedEntityId && entityType && entityId) {
    const versionedEntity = await database.versionedEntity.findUnique({
      where: {
        tenantId_entityType_entityId: {
          tenantId,
          entityType,
          entityId,
        },
      },
    });

    if (versionedEntity) {
      whereVersionedEntityId = versionedEntity.id;
    } else {
      return { versions: [], versionedEntity: null };
    }
  }

  if (!whereVersionedEntityId) {
    return { versions: [], versionedEntity: null };
  }

  const versions = await database.entityVersion.findMany({
    where: {
      tenantId,
      versionedEntityId: whereVersionedEntityId,
      deletedAt: null,
    },
    include: {
      versionedEntity: {
        select: {
          entityType: true,
          entityId: true,
          entityName: true,
          isLocked: true,
        },
      },
    },
    orderBy: { versionNumber: "desc" },
  });

  const versionedEntity = await database.versionedEntity.findUnique({
    where: { tenantId_id: { tenantId, id: whereVersionedEntityId } },
  });

  return { versions, versionedEntity };
}

/**
 * Compares two versions and returns the differences.
 */
export function compareVersions(
  versionA: { snapshotData: Record<string, unknown> },
  versionB: { snapshotData: Record<string, unknown> }
) {
  const snapshotA = versionA.snapshotData || {};
  const snapshotB = versionB.snapshotData || {};

  const allKeys = new Set([...Object.keys(snapshotA), ...Object.keys(snapshotB)]);
  const changes: Array<{
    key: string;
    oldValue: unknown;
    newValue: unknown;
    changeType: "added" | "removed" | "modified" | "unchanged";
  }> = [];

  for (const key of allKeys) {
    const oldValue = snapshotA[key];
    const newValue = snapshotB[key];

    if (!(key in snapshotA)) {
      changes.push({ key, oldValue: undefined, newValue, changeType: "added" });
    } else if (!(key in snapshotB)) {
      changes.push({ key, oldValue, newValue: undefined, changeType: "removed" });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ key, oldValue, newValue, changeType: "modified" });
    } else {
      changes.push({ key, oldValue, newValue, changeType: "unchanged" });
    }
  }

  return changes;
}

/**
 * Auto-versions an entity before updating it.
 * Call this before making changes to an entity to ensure version history.
 */
export async function autoVersionBeforeUpdate({
  entityType,
  entityId,
  getCurrentSnapshot,
  tenantId,
  userId,
  changeReason = "Auto-version before update",
}: {
  entityType: string;
  entityId: string;
  getCurrentSnapshot: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  tenantId: string;
  userId: string;
  changeReason?: string;
}) {
  // Check if entity is registered for versioning
  const versionedEntity = await database.versionedEntity.findUnique({
    where: {
      tenantId_entityType_entityId: {
        tenantId,
        entityType,
        entityId,
      },
    },
  });

  if (!versionedEntity) {
    // Not registered, do nothing
    return { versioned: false };
  }

  if (versionedEntity.isLocked) {
    throw new Error("Cannot create version - entity is locked");
  }

  // Get current snapshot
  const snapshotData = await getCurrentSnapshot();

  // Create version
  const result = await createEntityVersion({
    versionedEntityId: versionedEntity.id,
    snapshotData,
    changeReason,
    changeType: "auto",
    tenantId,
    userId,
  });

  return { versioned: true, ...result };
}
