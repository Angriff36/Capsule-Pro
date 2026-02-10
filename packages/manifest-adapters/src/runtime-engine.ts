import { RuntimeEngine } from "@manifest/runtime";
import type { IRCommand } from "@manifest/runtime/ir";

/**
 * Compatibility layer until compiler output always includes command owners.
 * This keeps command lookup authoritative on IR root commands.
 */
export class ManifestRuntimeEngine extends RuntimeEngine {
  override getCommand(name: string, entityName?: string): IRCommand | undefined {
    const direct = super.getCommand(name, entityName);
    if (direct) {
      return direct;
    }

    if (!entityName) {
      return undefined;
    }

    const command = this.getCommands().find(
      (item) => item.name === name && (item.entity === entityName || !item.entity)
    );
    if (!command) {
      return undefined;
    }

    if (command.entity) {
      return command;
    }

    return {
      ...command,
      entity: entityName,
    };
  }
}
