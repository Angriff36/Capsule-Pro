import { getCommandsRegistry } from "../../commands-registry.js";
import { resolveCommand } from "../../command-resolver.js";
import type { IrCommandLike, SmokeRealFailure } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IrBundle = any;

export interface StaticCheckResult {
  failures: SmokeRealFailure[];
  undefinedEvents: Array<{ commandId: string; eventName: string }>;
  duplicateCommandIds: string[];
  duplicateEventNames: string[];
  ambiguousEventChannels: Array<{ channel: string; events: string[] }>;
  resolverMisses: string[];
  irRegistryDrift: string[];
}

export function runStaticSmokeChecks(ir: IrBundle): StaticCheckResult {
  const failures: SmokeRealFailure[] = [];
  const registry = getCommandsRegistry();
  const irCommands: IrCommandLike[] = ir.commands ?? [];
  const eventNames = new Set<string>(
    (ir.events ?? []).map((event: { name: string }) => event.name)
  );

  const registryIds = registry.map((entry) => entry.commandId);
  const duplicateCommandIds = registryIds.filter(
    (id, index) => registryIds.indexOf(id) !== index
  );
  if (duplicateCommandIds.length > 0) {
    failures.push({
      commandId: duplicateCommandIds[0],
      phase: "static",
      message: `Duplicate commandId entries: ${[...new Set(duplicateCommandIds)].slice(0, 5).join(", ")}`,
    });
  }

  const irRegistryDrift: string[] = [];
  const registrySet = new Set(registryIds);
  for (const cmd of irCommands) {
    const id = `${cmd.entity}.${cmd.name}`;
    if (!registrySet.has(id)) {
      irRegistryDrift.push(id);
    }
  }
  for (const entry of registry) {
    const inIr = irCommands.some(
      (cmd) => cmd.entity === entry.entity && cmd.name === entry.command
    );
    if (!inIr) {
      irRegistryDrift.push(entry.commandId);
    }
  }
  if (irRegistryDrift.length > 0) {
    failures.push({
      commandId: irRegistryDrift[0],
      phase: "static",
      message: `Registry/IR drift (${irRegistryDrift.length}): ${irRegistryDrift.slice(0, 8).join(", ")}`,
    });
  }

  const resolverMisses: string[] = [];
  for (const entry of registry) {
    const resolved = resolveCommand(entry.entity, entry.command);
    if (!resolved) {
      resolverMisses.push(entry.commandId);
    } else if (resolved.entry.commandId !== entry.commandId) {
      resolverMisses.push(`${entry.commandId} -> ${resolved.entry.commandId}`);
    }
  }
  if (resolverMisses.length > 0) {
    failures.push({
      commandId: resolverMisses[0],
      phase: "static",
      message: `Resolver mismatch (${resolverMisses.length}): ${resolverMisses.slice(0, 8).join(", ")}`,
    });
  }

  const undefinedEvents: Array<{ commandId: string; eventName: string }> = [];
  for (const cmd of irCommands) {
    const commandId = `${cmd.entity}.${cmd.name}`;
    for (const eventName of cmd.emits ?? []) {
      if (!eventNames.has(eventName)) {
        undefinedEvents.push({ commandId, eventName });
      }
    }
  }
  if (undefinedEvents.length > 0) {
    failures.push({
      commandId: undefinedEvents[0].commandId,
      phase: "static",
      message: `Commands emit undefined events (${undefinedEvents.length}): ${undefinedEvents
        .slice(0, 5)
        .map((row) => `${row.commandId} -> ${row.eventName}`)
        .join("; ")}`,
    });
  }

  const eventNameCounts = new Map<string, string[]>();
  for (const event of ir.events ?? []) {
    const list = eventNameCounts.get(event.name) ?? [];
    list.push(event.channel ?? event.name);
    eventNameCounts.set(event.name, list);
  }
  const duplicateEventNames = [...eventNameCounts.entries()]
    .filter(([, channels]) => channels.length > 1)
    .map(([name]) => name);
  if (duplicateEventNames.length > 0) {
    failures.push({
      commandId: duplicateEventNames[0],
      phase: "static",
      message: `Duplicate event names (${duplicateEventNames.length}): ${duplicateEventNames.slice(0, 8).join(", ")}`,
    });
  }

  const channelMap = new Map<string, string[]>();
  for (const event of ir.events ?? []) {
    const channel = event.channel ?? event.name;
    const list = channelMap.get(channel) ?? [];
    list.push(event.name);
    channelMap.set(channel, list);
  }
  const ambiguousEventChannels = [...channelMap.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([channel, events]) => ({ channel, events }));

  return {
    failures,
    undefinedEvents,
    duplicateCommandIds,
    duplicateEventNames,
    ambiguousEventChannels,
    resolverMisses,
    irRegistryDrift,
  };
}

export function validatePayloadFactory(
  ir: IrBundle,
  buildPayload: (cmd: IrCommandLike) => Record<string, unknown>
): SmokeRealFailure[] {
  const failures: SmokeRealFailure[] = [];
  for (const cmd of ir.commands ?? []) {
    const commandId = `${cmd.entity}.${cmd.name}`;
    try {
      const body = buildPayload(cmd);
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        failures.push({
          commandId,
          phase: "payload",
          message: "Payload factory returned non-object body",
        });
      }
    } catch (error) {
      failures.push({
        commandId,
        phase: "payload",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return failures;
}
