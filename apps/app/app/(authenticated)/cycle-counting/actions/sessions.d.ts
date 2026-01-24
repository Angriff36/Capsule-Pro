import type {
  CreateSessionInput,
  CycleCountSession,
  SessionResult,
  UpdateSessionInput,
} from "../types";
export declare function listCycleCountSessions(): Promise<CycleCountSession[]>;
export declare function getCycleCountSession(
  sessionId: string
): Promise<CycleCountSession | null>;
export declare function createCycleCountSession(
  input: CreateSessionInput
): Promise<SessionResult>;
export declare function updateCycleCountSession(
  input: UpdateSessionInput
): Promise<SessionResult>;
export declare function deleteCycleCountSession(
  sessionId: string
): Promise<SessionResult>;
//# sourceMappingURL=sessions.d.ts.map
