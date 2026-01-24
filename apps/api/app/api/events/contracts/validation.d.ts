/**
 * Event Contract Validation Helpers
 */
export declare const CONTRACT_STATUSES: readonly [
  "draft",
  "sent",
  "viewed",
  "signed",
  "rejected",
  "expired",
  "canceled",
];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type ContractFilters = {
  search?: string;
  status?: ContractStatus;
  eventId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
};
export type CreateContractRequest = {
  eventId: string;
  clientId: string;
  title?: string;
  notes?: string;
  expiresAt?: string | Date;
  documentUrl?: string;
  documentType?: string;
};
export type UpdateContractRequest = {
  id: string;
  eventId?: string;
  clientId?: string;
  title?: string;
  notes?: string;
  expiresAt?: string | Date;
  documentUrl?: string;
  documentType?: string;
  status?: ContractStatus;
};
export type ContractSignatureData = {
  signerName: string;
  signerEmail: string;
  signerTitle?: string;
  signatureDate: string | Date;
  ipAddress?: string;
  userAgent?: string;
};
export declare function parseContractFilters(
  searchParams: URLSearchParams
): ContractFilters;
export declare function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
};
export declare function validateCreateContractRequest(
  body: unknown
): asserts body is CreateContractRequest;
export declare function validateUpdateContractRequest(
  body: unknown
): asserts body is UpdateContractRequest;
export declare function validateContractStatusTransition(
  currentStatus: ContractStatus,
  newStatus: ContractStatus
): void;
export declare function validateSignatureData(
  data: unknown
): asserts data is ContractSignatureData;
export declare function generateContractNumber(
  tenantId: string
): Promise<string>;
export declare function isContractExpired(
  expiresAt: string | Date | null
): boolean;
export declare function validateContractAccess(
  contract: {
    tenantId: string;
    eventId?: string;
    clientId?: string;
    status: ContractStatus;
  },
  tenantId: string,
  requiredStatus?: ContractStatus[]
): void;
export declare function validateContractBusinessRules(
  contract: {
    status: ContractStatus;
    expiresAt?: string | Date | null;
  },
  operation: "update" | "send" | "cancel" | "expire"
): void;
//# sourceMappingURL=validation.d.ts.map
