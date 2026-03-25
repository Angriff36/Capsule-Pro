import { RuntimeEngine } from "@angriff36/manifest";
/**
 * Extended runtime engine used by `@repo/manifest-adapters`.
 *
 * Two responsibilities beyond the base class:
 *
 * 1. **Command lookup fallback** — when the compiler IR omits the `entity`
 *    field on a command, this class patches it in so that entity-scoped
 *    lookups still resolve.
 *
 * 2. **Telemetry hook invocation** — after every successful `runCommand`
 *    that emits at least one event, the `onCommandExecuted` telemetry hook
 *    (injected via context by `manifest-runtime-factory`) is called.  This
 *    is the bridge that makes the factory's outbox-write logic fire.
 */
export class ManifestRuntimeEngine extends RuntimeEngine {
    // ---- command lookup fallback (unchanged) --------------------------------
    getCommand(name, entityName) {
        const direct = super.getCommand(name, entityName);
        if (direct) {
            return direct;
        }
        if (!entityName) {
            return undefined;
        }
        const command = this.getCommands().find((item) => item.name === name && (item.entity === entityName || !item.entity));
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
    // ---- runCommand override (new) -----------------------------------------
    async runCommand(commandName, input, options = {}) {
        const result = await super.runCommand(commandName, input, options);
        // Fire the telemetry hook only when there is something to report.
        if (result.success &&
            result.emittedEvents &&
            result.emittedEvents.length > 0) {
            const ctx = this.getContext();
            const hook = ctx.telemetry?.onCommandExecuted;
            if (hook) {
                const irCommand = this.getCommand(commandName, options.entityName);
                if (irCommand) {
                    await hook(irCommand, result, options.entityName);
                }
            }
        }
        return result;
    }
}
