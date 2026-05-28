/**
 * Shared command resolver for Manifest dispatchers and server actions.
 *
 * URL path segments may be kebab-case ("soft-delete") while Manifest command
 * names are camelCase ("softDelete").
 */

import { getCommandsRegistry, type RegistryEntry } from "./commands-registry";

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z0-9])/g, (_: string, char: string) =>
    char.toUpperCase()
  );
}

let exactSet: Set<string> | undefined;
let kebabToCamelMap: Map<string, string> | undefined;

function ensureRegistry(): void {
  if (exactSet) {
    return;
  }

  const entries = getCommandsRegistry();
  exactSet = new Set<string>();
  kebabToCamelMap = new Map<string, string>();

  for (const entry of entries) {
    const key = `${entry.entity}.${entry.command}`;
    exactSet.add(key);

    const kebab = `${entry.entity}.${kebabToCamel(entry.command)}`;
    if (kebab !== key) {
      kebabToCamelMap.set(kebab, entry.command);
    }
  }
}

export interface ResolvedCommand {
  command: string;
  entry: RegistryEntry;
}

export function resolveCommand(
  entity: string,
  commandSlug: string
): ResolvedCommand | null {
  ensureRegistry();

  const exactKey = `${entity}.${commandSlug}`;

  if (exactSet!.has(exactKey)) {
    return {
      command: commandSlug,
      entry: { entity, command: commandSlug, commandId: exactKey },
    };
  }

  if (commandSlug.includes("-")) {
    const camelCommand = kebabToCamel(commandSlug);
    const camelKey = `${entity}.${camelCommand}`;
    if (exactSet!.has(camelKey)) {
      return {
        command: camelCommand,
        entry: { entity, command: camelCommand, commandId: camelKey },
      };
    }
  }

  const mappedCommand = kebabToCamelMap!.get(exactKey);
  if (mappedCommand) {
    return {
      command: mappedCommand,
      entry: {
        entity,
        command: mappedCommand,
        commandId: `${entity}.${mappedCommand}`,
      },
    };
  }

  return null;
}

export function isRegisteredCommand(
  entity: string,
  commandSlug: string
): boolean {
  return resolveCommand(entity, commandSlug) !== null;
}
