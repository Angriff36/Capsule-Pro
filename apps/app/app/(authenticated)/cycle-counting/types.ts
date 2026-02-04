export type CycleCountSessionType =
  | "ad_hoc"
  | "scheduled_daily"
  | "scheduled_weekly"
  | "scheduled_monthly";

export type CycleCountSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "finalized"
  | "cancelled";

export type VarianceReportStatus =
  | "pending"
  | "reviewed"
  | "approved"
  | "rejected";

export type SyncStatus = "synced" | "pending" | "failed" | "conflict";

export interface CycleCountSession {
  id: string;
  tenantId: string;
  locationId: string;
  sessionId: string;
  sessionName: string;
  countType: CycleCountSessionType;
  scheduledDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  finalizedAt: Date | null;
  status: CycleCountSessionStatus;
  totalItems: number;
  countedItems: number;
  totalVariance: number;
  variancePercentage: number;
  notes: string | null;
  createdById: string;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CycleCountRecord {
  id: string;
  tenantId: string;
  sessionId: string;
  itemId: string;
  itemNumber: string;
  itemName: string;
  storageLocationId: string;
  expectedQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePct: number;
  countDate: Date;
  countedById: string;
  barcode: string | null;
  notes: string | null;
  isVerified: boolean;
  verifiedById: string | null;
  verifiedAt: Date | null;
  syncStatus: SyncStatus;
  offlineId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface VarianceReport {
  id: string;
  tenantId: string;
  sessionId: string;
  reportType: string;
  itemId: string;
  itemNumber: string;
  itemName: string;
  expectedQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePct: number;
  accuracyScore: number;
  status: VarianceReportStatus;
  adjustmentType: string | null;
  adjustmentAmount: number | null;
  adjustmentDate: Date | null;
  notes: string | null;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CycleCountAuditLog {
  id: string;
  tenantId: string;
  sessionId: string;
  recordId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  performedById: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface CreateSessionInput {
  locationId: string;
  sessionName: string;
  countType: CycleCountSessionType;
  scheduledDate?: Date;
  notes?: string;
}

export interface UpdateSessionInput {
  id: string;
  sessionName?: string;
  status?: CycleCountSessionStatus;
  notes?: string;
  approvedById?: string;
}

export interface CreateRecordInput {
  sessionId: string;
  itemId: string;
  itemNumber: string;
  itemName: string;
  storageLocationId: string;
  expectedQuantity: number;
  countedQuantity: number;
  barcode?: string;
  notes?: string;
  offlineId?: string;
  syncStatus?: SyncStatus;
}

export interface UpdateRecordInput {
  id: string;
  countedQuantity?: number;
  notes?: string;
  isVerified?: boolean;
  syncStatus?: SyncStatus;
}

export interface FinalizeSessionInput {
  sessionId: string;
  approvedById: string;
  notes?: string;
}

export interface SyncRecordsInput {
  records: Array<{
    offlineId: string;
    sessionId: string;
    itemId: string;
    itemNumber: string;
    itemName: string;
    storageLocationId: string;
    expectedQuantity: number;
    countedQuantity: number;
    barcode?: string;
    notes?: string;
    syncStatus?: SyncStatus;
  }>;
}

export interface SessionResult {
  success: boolean;
  session?: CycleCountSession;
  error?: string;
}

export interface RecordResult {
  success: boolean;
  record?: CycleCountRecord;
  error?: string;
}

export interface FinalizeResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}
