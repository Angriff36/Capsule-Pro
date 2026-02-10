function toUnique(values) {
    return [...new Set(values)];
}
function inferOwnerEntityName(ir, commandName) {
    if (ir.entities.length === 1) {
        return ir.entities[0]?.name ?? "";
    }
    const entitiesReferencingCommand = ir.entities
        .filter((entity) => entity.commands.includes(commandName))
        .map((entity) => entity.name);
    if (entitiesReferencingCommand.length === 1) {
        return entitiesReferencingCommand[0] ?? "";
    }
    throw new Error(`Unable to infer entity owner for command "${commandName}". Add explicit command ownership in compiler output.`);
}
function normalizeCommandOwners(ir) {
    return ir.commands.map((command) => {
        if (command.entity) {
            return command;
        }
        const owner = inferOwnerEntityName(ir, command.name);
        return { ...command, entity: owner };
    });
}
/**
 * Enforces command ownership invariants required by runtime and projection code.
 *
 * Compiler output should eventually satisfy this without repair; until then, this
 * function is the single compatibility boundary for command ownership metadata.
 */
export function enforceCommandOwnership(ir) {
    const normalizedCommands = normalizeCommandOwners(ir);
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
