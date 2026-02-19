import type { IR, IRCommand } from "@angriff36/manifest/ir";

function toUnique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Known command-to-entity mappings for manifests where the IR compiler
 * doesn't properly populate entity.commands arrays.
 *
 * Derived from manifest file entity declarations.
 */
const KNOWN_COMMAND_OWNERS: Record<string, Record<string, string>> = {
  "prep-list-rules": {
    // PrepList commands
    update: "PrepList",
    updateBatchMultiplier: "PrepList",
    finalize: "PrepList",
    activate: "PrepList",
    deactivate: "PrepList",
    cancel: "PrepList",

    // PrepListItem commands
    updateQuantity: "PrepListItem",
    updateStation: "PrepListItem",
    updatePrepNotes: "PrepListItem",
    markCompleted: "PrepListItem",
    markUncompleted: "PrepListItem",
  },
  "prep-task-rules": {
    claim: "PrepTask",
    start: "PrepTask",
    complete: "PrepTask",
    release: "PrepTask",
    reassign: "PrepTask",
    "update-quantity": "PrepTask",
    cancel: "PrepTask",
    create: "PrepTask",
  },
  "recipe-rules": {
    // Recipe commands
    update: "Recipe",
    deactivate: "Recipe",
    activate: "Recipe",

    // Ingredient commands
    updateAllergens: "Ingredient",

    // RecipeIngredient commands
    updateQuantity: "RecipeIngredient",

    // Dish commands
    updatePricing: "Dish",
    updateLeadTime: "Dish",
  },
  "menu-rules": {
    // Menu commands
    update: "Menu",
    activate: "Menu",
    deactivate: "Menu",

    // MenuDish commands
    updateCourse: "MenuDish",
  },
  "station-rules": {
    // Station commands
    assignTask: "Station",
    removeTask: "Station",
    updateCapacity: "Station",
    deactivate: "Station",
    activate: "Station",
    updateEquipment: "Station",
    create: "Station",
  },
  "inventory-rules": {
    // InventoryItem commands
    reserve: "InventoryItem",
    consume: "InventoryItem",
    waste: "InventoryItem",
    adjust: "InventoryItem",
    restock: "InventoryItem",
    releaseReservation: "InventoryItem",
    create: "InventoryItem",
  },
};

function inferOwnerEntityName(
  ir: IR,
  command: IRCommand,
  manifestName?: string
): string {
  const commandName = command.name;

  if (ir.entities.length === 1) {
    return ir.entities[0]?.name ?? "";
  }

  // Check if multiple IR commands share this name (e.g., create on multiple entities).
  // When duplicated, the compiler's entity.commands array is unreliable because it
  // only populates the last entity, so skip that check and use parameter matching.
  const sameNameCount = ir.commands.filter(
    (c) => c.name === commandName
  ).length;

  if (sameNameCount <= 1) {
    // Try the entity.commands array (if properly populated by compiler)
    const entitiesReferencingCommand = ir.entities
      .filter((entity) => entity.commands.includes(commandName))
      .map((entity) => entity.name);

    if (entitiesReferencingCommand.length === 1) {
      return entitiesReferencingCommand[0] ?? "";
    }
  }

  // Fallback: Use known command owner mappings (only reliable for unique names)
  if (
    sameNameCount <= 1 &&
    manifestName &&
    KNOWN_COMMAND_OWNERS[manifestName]?.[commandName]
  ) {
    return KNOWN_COMMAND_OWNERS[manifestName][commandName];
  }

  // Parameter-matching heuristic: match command parameters to entity properties.
  // Commands (especially create) set properties of their owning entity, so the
  // entity whose properties best overlap with the command's parameters is the owner.
  const paramNames = command.parameters.map((p) => p.name);
  if (paramNames.length > 0) {
    let bestEntity = "";
    let bestScore = 0;
    for (const entity of ir.entities) {
      const propNames = new Set(entity.properties.map((p) => p.name));
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

  // Emitted-event heuristic: event names often start with the entity name
  // (e.g., RecipeVersionCreated → RecipeVersion, PrepListItemCompleted → PrepListItem).
  // Sort by name length descending so longer names match first (RecipeVersion before Recipe).
  if (command.emits && command.emits.length > 0) {
    const sortedEntities = [...ir.entities].sort(
      (a, b) => b.name.length - a.name.length
    );
    for (const entity of sortedEntities) {
      if (command.emits.some((e) => e.startsWith(entity.name))) {
        return entity.name;
      }
    }
  }

  // For unique command names, try known mappings as final fallback
  if (manifestName && KNOWN_COMMAND_OWNERS[manifestName]?.[commandName]) {
    return KNOWN_COMMAND_OWNERS[manifestName][commandName];
  }

  // Last resort: throw error with helpful message
  throw new Error(
    `Unable to infer entity owner for command "${commandName}". Add explicit command ownership in compiler output.`
  );
}

function normalizeCommandOwners(ir: IR, manifestName?: string): IRCommand[] {
  return ir.commands.map((command) => {
    if (command.entity) {
      return command;
    }

    const owner = inferOwnerEntityName(ir, command, manifestName);
    return { ...command, entity: owner };
  });
}

/**
 * Enforces command ownership invariants required by runtime and projection code.
 *
 * Compiler output should eventually satisfy this without repair; until then, this
 * function is the single compatibility boundary for command ownership metadata.
 *
 * @param ir - The IR to normalize
 * @param manifestName - Optional manifest name for command ownership fallback
 */
export function enforceCommandOwnership(ir: IR, manifestName?: string): IR {
  const normalizedCommands = normalizeCommandOwners(ir, manifestName);
  const commandNamesByEntity = new Map<string, string[]>();

  for (const command of normalizedCommands) {
    if (!command.entity) {
      continue;
    }

    const names = commandNamesByEntity.get(command.entity) ?? [];
    names.push(command.name);
    commandNamesByEntity.set(command.entity, names);
  }

  const normalizedEntities = ir.entities.map((entity) => {
    const inferred = commandNamesByEntity.get(entity.name) ?? [];
    return {
      ...entity,
      commands: toUnique([...entity.commands, ...inferred]),
    };
  });

  return {
    ...ir,
    commands: normalizedCommands,
    entities: normalizedEntities,
  };
}
