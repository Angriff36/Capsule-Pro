export type CommandBucket =
  | "executable"
  | "guard_expected_fail"
  | "destructive"
  | "scenario_required";

export interface IrCommandLike {
  name: string;
  entity: string;
  parameters?: Array<{
    name: string;
    required?: boolean;
    type?: { name?: string; nullable?: boolean };
  }>;
  emits?: string[];
  guardCount?: number;
}

export interface SmokeCommandRecord {
  commandId: string;
  entity: string;
  command: string;
  bucket: CommandBucket;
  reason: string;
  executed?: boolean;
  outcome?:
    | "success"
    | "guard_failed"
    | "policy_denied"
    | "constraint_blocked"
    | "runtime_error"
    | "command_failed"
    | "skipped";
  detail?: string;
}

export interface SmokeRealFailure {
  commandId: string;
  phase: "static" | "payload" | "execute";
  message: string;
}

export interface SmokeReport {
  totalCommands: number;
  executed: number;
  guardExpectedFail: number;
  scenarioRequired: number;
  destructiveSkipped: number;
  payloadBuilt: number;
  realFailures: SmokeRealFailure[];
  byBucket: Record<CommandBucket, string[]>;
  samples: {
    executed: string[];
    guardExpectedFail: string[];
    scenarioRequired: string[];
    destructiveSkipped: string[];
  };
}

export function emptySmokeReport(totalCommands: number): SmokeReport {
  return {
    totalCommands,
    executed: 0,
    guardExpectedFail: 0,
    scenarioRequired: 0,
    destructiveSkipped: 0,
    payloadBuilt: 0,
    realFailures: [],
    byBucket: {
      executable: [],
      guard_expected_fail: [],
      destructive: [],
      scenario_required: [],
    },
    samples: {
      executed: [],
      guardExpectedFail: [],
      scenarioRequired: [],
      destructiveSkipped: [],
    },
  };
}
