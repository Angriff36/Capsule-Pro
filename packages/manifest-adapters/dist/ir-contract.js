function toUnique(values) {
    return [...new Set(values)];
}
/**
 * Known command-to-entity mappings for manifests where the IR compiler
 * doesn't properly populate entity.commands arrays.
 *
 * Derived from manifest file entity declarations.
 */
const KNOWN_COMMAND_OWNERS = {
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
    },
    "recipe-rules": {
        // Recipe commands
        update: "Recipe",
        deactivate: "Recipe",
        activate: "Recipe",
        // RecipeVersion commands
        create: "RecipeVersion",
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
    },
    "inventory-rules": {
        // InventoryItem commands
        reserve: "InventoryItem",
        consume: "InventoryItem",
        waste: "InventoryItem",
        adjust: "InventoryItem",
        restock: "InventoryItem",
        releaseReservation: "InventoryItem",
    },
};
function inferOwnerEntityName(ir, commandName, manifestName) {
    if (ir.entities.length === 1) {
        return ir.entities[0]?.name ?? "";
    }
    // Try the entity.commands array first (if properly populated by compiler)
    const entitiesReferencingCommand = ir.entities
        .filter((entity) => entity.commands.includes(commandName))
        .map((entity) => entity.name);
    if (entitiesReferencingCommand.length === 1) {
        return entitiesReferencingCommand[0] ?? "";
    }
    // Fallback: Use known command owner mappings for specific manifests
    if (manifestName && KNOWN_COMMAND_OWNERS[manifestName]?.[commandName]) {
        return KNOWN_COMMAND_OWNERS[manifestName][commandName];
    }
    // Last resort: throw error with helpful message
    throw new Error(`Unable to infer entity owner for command "${commandName}". Add explicit command ownership in compiler output.`);
}
function normalizeCommandOwners(ir, manifestName) {
    return ir.commands.map((command) => {
        if (command.entity) {
            return command;
        }
        const owner = inferOwnerEntityName(ir, command.name, manifestName);
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
export function enforceCommandOwnership(ir, manifestName) {
    const normalizedCommands = normalizeCommandOwners(ir, manifestName);
    const commandNamesByEntity = new Map();
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
