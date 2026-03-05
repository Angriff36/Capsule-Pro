import { expect, test } from "@playwright/test";

test.describe("Version Control System", () => {
  test("should register an entity for versioning", async ({ request }) => {
    // First, authenticate to get session
    const authResponse = await request.post("/api/auth/signin", {
      data: {
        email: "test@example.com",
        password: "testpassword",
      },
    });

    // Note: This test assumes authentication is set up
    // In a real scenario, you'd need proper auth credentials

    const response = await request.post(
      "/api/version-control/entities/commands/register",
      {
        data: {
          entityType: "TestEntity",
          entityId: "test-entity-123",
          entityName: "Test Entity for Version Control",
          initialSnapshot: {
            name: "Initial State",
            value: 42,
            metadata: { key: "value" },
          },
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.versionedEntity).toBeDefined();
    expect(data.versionedEntity.entityType).toBe("TestEntity");
    expect(data.versionedEntity.entityId).toBe("test-entity-123");
  });

  test("should create a new version", async ({ request }) => {
    // First register an entity
    const registerResponse = await request.post(
      "/api/version-control/entities/commands/register",
      {
        data: {
          entityType: "VersionTest",
          entityId: "version-test-123",
          entityName: "Version Test Entity",
          initialSnapshot: { version: 1, data: "initial" },
        },
      }
    );

    const registerData = await registerResponse.json();
    const versionedEntityId = registerData.versionedEntity.id;

    // Create a new version
    const versionResponse = await request.post(
      "/api/version-control/versions/commands/create",
      {
        data: {
          versionedEntityId,
          snapshotData: { version: 2, data: "updated", newField: "test" },
          changeReason: "Updated data field",
          changeSummary: "Added new field",
          changeType: "update",
        },
      }
    );

    expect(versionResponse.ok()).toBeTruthy();
    const versionData = await versionResponse.json();
    expect(versionData.version.versionNumber).toBe(2);
    expect(versionData.version.changeReason).toBe("Updated data field");
  });

  test("should list all versions of an entity", async ({ request }) => {
    // Register entity with multiple versions
    const registerResponse = await request.post(
      "/api/version-control/entities/commands/register",
      {
        data: {
          entityType: "ListTest",
          entityId: "list-test-123",
          entityName: "List Test Entity",
          initialSnapshot: { v: 1 },
        },
      }
    );

    const registerData = await registerResponse.json();

    // Create additional versions
    await request.post("/api/version-control/versions/commands/create", {
      data: {
        versionedEntityId: registerData.versionedEntity.id,
        snapshotData: { v: 2 },
        changeReason: "Second version",
      },
    });

    await request.post("/api/version-control/versions/commands/create", {
      data: {
        versionedEntityId: registerData.versionedEntity.id,
        snapshotData: { v: 3 },
        changeReason: "Third version",
      },
    });

    // List versions
    const listResponse = await request.get(
      `/api/version-control/versions/list?versionedEntityId=${registerData.versionedEntity.id}`
    );

    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    expect(listData.versions).toHaveLength(3);
    expect(listData.versions[0].versionNumber).toBe(3); // Should be ordered desc
    expect(listData.versions[2].versionNumber).toBe(1);
  });

  test("should lock and unlock an entity", async ({ request }) => {
    // Register entity
    const registerResponse = await request.post(
      "/api/version-control/entities/commands/register",
      {
        data: {
          entityType: "LockTest",
          entityId: "lock-test-123",
          entityName: "Lock Test Entity",
          initialSnapshot: { locked: false },
        },
      }
    );

    const registerData = await registerResponse.json();
    const entityId = registerData.versionedEntity.id;

    // Lock the entity
    const lockResponse = await request.post(
      "/api/version-control/entities/commands/lock",
      {
        data: {
          id: entityId,
          reason: "Testing lock functionality",
        },
      }
    );

    expect(lockResponse.ok()).toBeTruthy();
    const lockData = await lockResponse.json();
    expect(lockData.entity.isLocked).toBe(true);

    // Unlock the entity
    const unlockResponse = await request.post(
      "/api/version-control/entities/commands/unlock",
      {
        data: { id: entityId },
      }
    );

    expect(unlockResponse.ok()).toBeTruthy();
    const unlockData = await unlockResponse.json();
    expect(unlockData.entity.isLocked).toBe(false);
  });

  test("should prevent version creation when entity is locked", async ({
    request,
  }) => {
    // Register entity
    const registerResponse = await request.post(
      "/api/version-control/entities/commands/register",
      {
        data: {
          entityType: "PreventTest",
          entityId: "prevent-test-123",
          entityName: "Prevent Test Entity",
          initialSnapshot: { v: 1 },
        },
      }
    );

    const registerData = await registerResponse.json();
    const entityId = registerData.versionedEntity.id;

    // Lock the entity
    await request.post("/api/version-control/entities/commands/lock", {
      data: { id: entityId, reason: "Lock for test" },
    });

    // Try to create version while locked
    const versionResponse = await request.post(
      "/api/version-control/versions/commands/create",
      {
        data: {
          versionedEntityId: entityId,
          snapshotData: { v: 2 },
          changeReason: "Should fail",
        },
      }
    );

    expect(versionResponse.ok()).toBeFalsy();
    const errorData = await versionResponse.json();
    expect(errorData.error).toContain("locked");
  });

  test("should restore a previous version", async ({ request }) => {
    // Register entity
    const registerResponse = await request.post(
      "/api/version-control/entities/commands/register",
      {
        data: {
          entityType: "RestoreTest",
          entityId: "restore-test-123",
          entityName: "Restore Test Entity",
          initialSnapshot: { value: "original" },
        },
      }
    );

    const registerData = await registerResponse.json();
    const versionedEntityId = registerData.versionedEntity.id;

    // Create a new version with different data
    await request.post("/api/version-control/versions/commands/create", {
      data: {
        versionedEntityId,
        snapshotData: { value: "modified" },
        changeReason: "Modified the value",
      },
    });

    // Get the first version (original)
    const listResponse = await request.get(
      `/api/version-control/versions/list?versionedEntityId=${versionedEntityId}`
    );
    const listData = await listResponse.json();
    const originalVersion = listData.versions.find(
      (v: { versionNumber: number }) => v.versionNumber === 1
    );

    // Restore the original version
    const restoreResponse = await request.post(
      "/api/version-control/versions/commands/restore",
      {
        data: {
          versionId: originalVersion.id,
          changeReason: "Restoring to original",
        },
      }
    );

    expect(restoreResponse.ok()).toBeTruthy();
    const restoreData = await restoreResponse.json();
    expect(restoreData.version.versionNumber).toBe(3);
    expect(restoreData.version.snapshotData.value).toBe("original");
  });
});
