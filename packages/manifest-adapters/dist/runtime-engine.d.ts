import type { CommandResult } from "@angriff36/manifest";
import { RuntimeEngine } from "@angriff36/manifest";
import type { IRCommand, OverrideRequest } from "@angriff36/manifest/ir";
interface RunCommandOptions {
    entityName?: string;
    instanceId?: string;
    overrideRequests?: OverrideRequest[];
    correlationId?: string;
    causationId?: string;
    idempotencyKey?: string;
}
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
export declare class ManifestRuntimeEngine extends RuntimeEngine {
    getCommand(name: string, entityName?: string): IRCommand | undefined;
    runCommand(commandName: string, input: Record<string, unknown>, options?: RunCommandOptions): Promise<CommandResult>;
}
export {};
//# sourceMappingURL=runtime-engine.d.ts.map