import type {
  CreateRecordInput,
  CycleCountRecord,
  RecordResult,
  SyncRecordsInput,
  UpdateRecordInput,
} from "../types";
export declare function listCycleCountRecords(
  sessionId: string
): Promise<CycleCountRecord[]>;
export declare function getCycleCountRecord(
  recordId: string
): Promise<CycleCountRecord | null>;
export declare function createCycleCountRecord(
  input: CreateRecordInput
): Promise<RecordResult>;
export declare function updateCycleCountRecord(
  input: UpdateRecordInput
): Promise<RecordResult>;
export declare function syncCycleCountRecords(
  input: SyncRecordsInput
): Promise<RecordResult>;
//# sourceMappingURL=records.d.ts.map
