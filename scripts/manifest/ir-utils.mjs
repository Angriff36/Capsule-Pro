/**
 * Utilities for normalizing and merging Manifest IR across multiple source files.
 *
 * Compiler output can omit command.entity for multi-entity manifests; we repair
 * ownership using the same heuristics as runtime adapters so projections see a
 * stable command surface.
 */

const KNOWN_COMMAND_OWNERS = {
  "prep-list-rules": {
    update: "PrepList",
    updateBatchMultiplier: "PrepList",
    finalize: "PrepList",
    activate: "PrepList",
    deactivate: "PrepList",
    cancel: "PrepList",
    createFromSeed: "PrepList",
    reopen: "PrepList",
    updateQuantity: "PrepListItem",
    updateStation: "PrepListItem",
    updatePrepNotes: "PrepListItem",
    markCompleted: "PrepListItem",
    markUncompleted: "PrepListItem",
  },
  "prep-task-rules": {
    claim: "PrepTask",
    unclaim: "PrepTask",
    start: "PrepTask",
    complete: "PrepTask",
    release: "PrepTask",
    reassign: "PrepTask",
    updateQuantity: "PrepTask",
    cancel: "PrepTask",
    create: "PrepTask",
  },
  "recipe-rules": {
    update: "Recipe",
    deactivate: "Recipe",
    activate: "Recipe",
    updateAllergens: "Ingredient",
    updateQuantity: "RecipeIngredient",
    updatePricing: "Dish",
    updateLeadTime: "Dish",
  },
  "menu-rules": {
    update: "Menu",
    activate: "Menu",
    deactivate: "Menu",
    updateCourse: "MenuDish",
  },
  "station-rules": {
    assignTask: "Station",
    removeTask: "Station",
    updateCapacity: "Station",
    deactivate: "Station",
    activate: "Station",
    updateEquipment: "Station",
    create: "Station",
  },
  "inventory-rules": {
    reserve: "InventoryItem",
    consume: "InventoryItem",
    waste: "InventoryItem",
    adjust: "InventoryItem",
    restock: "InventoryItem",
    releaseReservation: "InventoryItem",
    create: "InventoryItem",
  },
};

function unique(values) {
  return [...new Set(values)];
}

function inferOwnerEntityName(ir, command, manifestName) {
  if (ir.entities.length === 1) {
    return ir.entities[0]?.name ?? "";
  }

  const commandName = command.name;
  const sameNameCount = ir.commands.filter((c) => c.name === commandName).length;

  if (sameNameCount <= 1) {
    const entitiesReferencingCommand = ir.entities
      .filter((entity) => Array.isArray(entity.commands) && entity.commands.includes(commandName))
      .map((entity) => entity.name);
    if (entitiesReferencingCommand.length === 1) {
      return entitiesReferencingCommand[0] ?? "";
    }
  }

  if (
    sameNameCount <= 1 &&
    manifestName &&
    KNOWN_COMMAND_OWNERS[manifestName]?.[commandName]
  ) {
    return KNOWN_COMMAND_OWNERS[manifestName][commandName];
  }

  const paramNames = (command.parameters ?? []).map((p) => p.name);
  if (paramNames.length > 0) {
    let bestEntity = "";
    let bestScore = 0;
    for (const entity of ir.entities) {
      const propNames = new Set((entity.properties ?? []).map((p) => p.name));
      const overlap = paramNames.filter((name) => propNames.has(name)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestEntity = entity.name;
      }
    }
    if (bestEntity && bestScore > 0) {
      return bestEntity;
    }
  }

  if (Array.isArray(command.emits) && command.emits.length > 0) {
    const sortedEntities = [...ir.entities].sort((a, b) => b.name.length - a.name.length);
    for (const entity of sortedEntities) {
      if (command.emits.some((e) => e.startsWith(entity.name))) {
        return entity.name;
      }
    }
  }

  if (manifestName && KNOWN_COMMAND_OWNERS[manifestName]?.[commandName]) {
    return KNOWN_COMMAND_OWNERS[manifestName][commandName];
  }

  return ir.entities[0]?.name ?? "";
}

export function enforceCommandOwnership(ir, manifestName) {
  const normalizedCommands = (ir.commands ?? []).map((command) => {
    if (command.entity) {
      return command;
    }
    return {
      ...command,
      entity: inferOwnerEntityName(ir, command, manifestName),
    };
  });

  const commandNamesByEntity = new Map();
  for (const command of normalizedCommands) {
    if (!command.entity) {
      continue;
    }
    const names = commandNamesByEntity.get(command.entity) ?? [];
    names.push(command.name);
    commandNamesByEntity.set(command.entity, names);
  }

  const normalizedEntities = (ir.entities ?? []).map((entity) => {
    const inferred = commandNamesByEntity.get(entity.name) ?? [];
    return {
      ...entity,
      commands: unique([...(entity.commands ?? []), ...inferred]),
    };
  });

  return {
    ...ir,
    entities: normalizedEntities,
    commands: normalizedCommands,
  };
}

function normalizeEntries(irsOrEntries) {
  return irsOrEntries.map((entry, index) => {
    if (entry && typeof entry === "object" && entry.ir) {
      return {
        ir: entry.ir,
        source: entry.source ?? `unknown-${index}`,
      };
    }
    return {
      ir: entry,
      source: `unknown-${index}`,
    };
  });
}

function mergeBy(entries, selectItems, keyOf, type) {
  const keptItems = [];
  const seen = new Map();

  for (const entry of entries) {
    for (const item of selectItems(entry.ir)) {
      const key = keyOf(item);
      const seenEntry = seen.get(key);
      if (!seenEntry) {
        seen.set(key, {
          keptFrom: entry.source,
          droppedFrom: [],
        });
        keptItems.push(item);
        continue;
      }
      seenEntry.droppedFrom.push(entry.source);
    }
  }

  const drops = [...seen.entries()]
    .filter(([, info]) => info.droppedFrom.length > 0)
    .map(([key, info]) => {
      const droppedFrom = [...new Set(info.droppedFrom)].sort((a, b) =>
        a.localeCompare(b)
      );
      const sources = [info.keptFrom, ...droppedFrom];
      return {
        type,
        key,
        allowlistKey: `${type}:${key}`,
        keptFrom: info.keptFrom,
        droppedFrom,
        sources,
      };
    })
    .sort((a, b) => {
      const typeCompare = a.type.localeCompare(b.type);
      if (typeCompare !== 0) {
        return typeCompare;
      }
      return a.key.localeCompare(b.key);
    });

  return {
    keptItems,
    drops,
  };
}

export function mergeIrs(irsOrEntries, provenance) {
  const entries = normalizeEntries(irsOrEntries);

  const modulesResult = mergeBy(
    entries,
    (ir) => ir.modules ?? [],
    (module) => module.name ?? JSON.stringify(module),
    "module"
  );
  const entitiesResult = mergeBy(
    entries,
    (ir) => ir.entities ?? [],
    (entity) => entity.name,
    "entity"
  );
  const storesResult = mergeBy(
    entries,
    (ir) => ir.stores ?? [],
    (store) => `${store.entity}:${store.type}`,
    "store"
  );
  const eventsResult = mergeBy(
    entries,
    (ir) => ir.events ?? [],
    (event) => event.channel,
    "event-channel"
  );
  const commandsResult = mergeBy(
    entries,
    (ir) => ir.commands ?? [],
    (command) => `${command.entity}.${command.name}`,
    "command"
  );
  const policiesResult = mergeBy(
    entries,
    (ir) => ir.policies ?? [],
    (policy) => policy.name,
    "policy"
  );

  const droppedDuplicates = [
    ...modulesResult.drops,
    ...entitiesResult.drops,
    ...storesResult.drops,
    ...eventsResult.drops,
    ...commandsResult.drops,
    ...policiesResult.drops,
  ].sort((a, b) => {
    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) {
      return typeCompare;
    }
    return a.key.localeCompare(b.key);
  });

  const duplicateWarnings = droppedDuplicates.map(
    (drop) =>
      `[manifest/merge] Duplicate ${drop.type} "${drop.key}" dropped (kept from ${drop.keptFrom}; dropped from ${drop.droppedFrom.join(", ")})`
  );

  const mergeReport = {
    $schema: "https://manifest.dev/merge-report.schema.json",
    version: "1.0",
    generatedAt: provenance?.compiledAt ?? new Date().toISOString(),
    sources: entries.map((entry) => entry.source),
    totals: {
      modules: modulesResult.keptItems.length,
      entities: entitiesResult.keptItems.length,
      stores: storesResult.keptItems.length,
      events: eventsResult.keptItems.length,
      commands: commandsResult.keptItems.length,
      policies: policiesResult.keptItems.length,
    },
    droppedDuplicates,
  };

  return {
    ir: {
      version: "1.0",
      provenance,
      modules: modulesResult.keptItems,
      entities: entitiesResult.keptItems,
      stores: storesResult.keptItems,
      events: eventsResult.keptItems,
      commands: commandsResult.keptItems,
      policies: policiesResult.keptItems,
    },
    duplicateWarnings,
    mergeReport,
  };
}
