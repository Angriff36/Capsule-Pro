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
  approvedById: string | null;
  completedAt: Date | null;
  countedItems: number;
  countType: CycleCountSessionType;
  createdAt: Date;
  createdById: string;
  deletedAt: Date | null;
  finalizedAt: Date | null;
  id: string;
  locationId: string;
  notes: string | null;
  scheduledDate: Date | null;
  sessionId: string;
  sessionName: string;
  startedAt: Date | null;
  status: CycleCountSessionStatus;
  tenantId: string;
  totalItems: number;
  totalVariance: number;
  updatedAt: Date;
  variancePercentage: number;
}

export interface CycleCountRecord {
  barcode: string | null;
  countDate: Date;
  countedById: string;
  countedQuantity: number;
  createdAt: Date;
  deletedAt: Date | null;
  expectedQuantity: number;
  id: string;
  isVerified: boolean;
  itemId: string;
  itemName: string;
  itemNumber: string;
  notes: string | null;
  offlineId: string | null;
  sessionId: string;
  storageLocationId: string;
  syncStatus: SyncStatus;
  tenantId: string;
  updatedAt: Date;
  variance: number;
  variancePct: number;
  verifiedAt: Date | null;
  verifiedById: string | null;
}

export interface VarianceReport {
  accuracyScore: number;
  adjustmentAmount: number | null;
  adjustmentDate: Date | null;
  adjustmentType: string | null;
  countedQuantity: number;
  createdAt: Date;
  deletedAt: Date | null;
  expectedQuantity: number;
  generatedAt: Date;
  id: string;
  itemId: string;
  itemName: string;
  itemNumber: string;
  notes: string | null;
  reportType: string;
  sessionId: string;
  status: VarianceReportStatus;
  tenantId: string;
  updatedAt: Date;
  variance: number;
  variancePct: number;
}

export interface CycleCountAuditLog {
  action: string;
  createdAt: Date;
  entityId: string;
  entityType: string;
  id: string;
  ipAddress: string | null;
  newValue: Record<string, unknown> | null;
  oldValue: Record<string, unknown> | null;
  performedById: string;
  recordId: string | null;
  sessionId: string;
  tenantId: string;
  userAgent: string | null;
}

export interface CreateSessionInput {
  countType: CycleCountSessionType;
  locationId: string;
  notes?: string;
  scheduledDate?: Date;
  sessionName: string;
}

export interface UpdateSessionInput {
  approvedById?: string;
  id: string;
  notes?: string;
  sessionName?: string;
  status?: CycleCountSessionStatus;
}

export interface CreateRecordInput {
  barcode?: string;
  countedQuantity: number;
  expectedQuantity: number;
  itemId: string;
  itemName: string;
  itemNumber: string;
  notes?: string;
  offlineId?: string;
  sessionId: string;
  storageLocationId: string;
  syncStatus?: SyncStatus;
}

export interface UpdateRecordInput {
  countedQuantity?: number;
  id: string;
  isVerified?: boolean;
  notes?: string;
  syncStatus?: SyncStatus;
}

export interface FinalizeSessionInput {
  approvedById: string;
  notes?: string;
  sessionId: string;
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
  error?: string;
  session?: CycleCountSession;
  success: boolean;
}

export interface RecordResult {
  error?: string;
  record?: CycleCountRecord;
  success: boolean;
}

export interface FinalizeResult {
  error?: string;
  sessionId?: string;
  success: boolean;
}
