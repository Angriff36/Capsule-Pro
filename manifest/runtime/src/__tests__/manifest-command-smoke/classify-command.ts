import type { CommandBucket, IrCommandLike } from "./types";

/** Verb stems matched against camelCase command names (data-driven, not hand-picked per command). */
const DESTRUCTIVE_STEMS = [
  "remove",
  "delete",
  "purge",
  "destroy",
  "revoke",
  "terminate",
  "writeOff",
  "softDelete",
  "hardDelete",
  "cancel",
  "unassign",
  "deactivate",
  "blacklist",
  "void",
  "refund",
  "reject",
  "fire",
  "wipe",
  "archive",
  "discard",
  "dissolve",
  "expunge",
  "forfeit",
  "rescind",
  "retract",
  "withdraw",
  "markNoShow",
  "writeOff",
] as const;

const READ_QUERY_PREFIX =
  /^(get|list|find|search|check|query|count|fetch|lookup)/i;

function matchesDestructiveStem(commandName: string): string | null {
  for (const stem of DESTRUCTIVE_STEMS) {
    if (commandName === stem) {
      return stem;
    }
    if (
      commandName.startsWith(stem) &&
      commandName.length > stem.length &&
      /[A-Z]/.test(commandName.charAt(stem.length))
    ) {
      return stem;
    }
  }
  return null;
}

export interface CommandClassification {
  bucket: CommandBucket;
  reason: string;
}

export function classifyCommand(cmd: IrCommandLike): CommandClassification {
  const commandId = `${cmd.entity}.${cmd.name}`;

  if (READ_QUERY_PREFIX.test(cmd.name)) {
    return {
      bucket: "scenario_required",
      reason: "read/query command — not a governed mutation smoke target",
    };
  }

  const destructiveStem = matchesDestructiveStem(cmd.name);
  if (destructiveStem) {
    return {
      bucket: "destructive",
      reason: `command name matches destructive stem "${destructiveStem}"`,
    };
  }

  if (cmd.name !== "create") {
    return {
      bucket: "scenario_required",
      reason:
        "non-create command requires a seeded instance + domain state (instanceId)",
    };
  }

  return {
    bucket: "executable",
    reason: "create command — safe to attempt with generated payload in isolated store",
  };
}

export function commandId(cmd: IrCommandLike): string {
  return `${cmd.entity}.${cmd.name}`;
}
