/**
 * Event Contract Validation Helpers
 */

import { invariant } from "@/app/lib/invariant";

export const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "rejected",
  "expired",
  "canceled",
] as const;

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

export function parseContractFilters(
  searchParams: URLSearchParams
): ContractFilters {
  const filters: ContractFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") as ContractStatus | undefined,
    eventId: searchParams.get("eventId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  };

  // Validate status if provided
  if (filters.status) {
    const validStatuses: ContractStatus[] = [
      "draft",
      "sent",
      "viewed",
      "signed",
      "rejected",
      "expired",
      "canceled",
    ];
    invariant(
      validStatuses.includes(filters.status),
      `Invalid status: ${filters.status}. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  return filters;
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || "50"))
  );

  return { page, limit };
}

// Helper to validate string field
function validateOptionalString(
  value: unknown,
  fieldName: string,
  allowEmpty = false
): void {
  if (value !== undefined && value !== null) {
    invariant(
      typeof value === "string" && (allowEmpty || value.trim().length > 0),
      `${fieldName} must be a ${allowEmpty ? "string" : "non-empty string"} if provided`
    );
  }
}

// Helper to validate date field
function validateOptionalDate(value: unknown, fieldName: string): void {
  if (value !== undefined && value !== null) {
    const date = value instanceof Date ? value : new Date(value as string);
    invariant(
      date instanceof Date && !Number.isNaN(date.getTime()),
      `${fieldName} must be a valid date`
    );
  }
}

// Helper to validate URL field
function validateOptionalUrl(value: unknown): void {
  if (value !== undefined && value !== null) {
    invariant(
      typeof value === "string" && value.trim().length > 0,
      "documentUrl must be a non-empty string if provided"
    );
    try {
      new URL(value as string);
    } catch {
      invariant(false, "documentUrl must be a valid URL");
    }
  }
}

export function validateCreateContractRequest(
  body: unknown
): asserts body is CreateContractRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Event ID is required
  invariant(
    typeof data.eventId === "string" && data.eventId.trim().length > 0,
    "eventId is required and must be a non-empty string"
  );

  // Client ID is required
  invariant(
    typeof data.clientId === "string" && data.clientId.trim().length > 0,
    "clientId is required and must be a non-empty string"
  );

  // Validate optional fields
  validateOptionalString(data.title, "title");
  validateOptionalString(data.notes, "notes", true);
  validateOptionalDate(data.expiresAt, "expiresAt");

  // Validate expiresAt is in the future
  if (data.expiresAt !== undefined && data.expiresAt !== null) {
    const date =
      data.expiresAt instanceof Date
        ? data.expiresAt
        : new Date(data.expiresAt as string);
    invariant(date > new Date(), "expiresAt must be in the future");
  }

  validateOptionalUrl(data.documentUrl);
  validateOptionalString(data.documentType, "documentType");
}

export function validateUpdateContractRequest(
  body: unknown
): asserts body is UpdateContractRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // ID is required for updates
  invariant(
    typeof data.id === "string" && data.id.trim().length > 0,
    "id is required and must be a non-empty string"
  );

  // Reuse create validation for optional fields
  if (data.eventId !== undefined && data.eventId !== null) {
    invariant(
      typeof data.eventId === "string" && data.eventId.trim().length > 0,
      "eventId must be a non-empty string"
    );
  }

  if (data.clientId !== undefined && data.clientId !== null) {
    invariant(
      typeof data.clientId === "string" && data.clientId.trim().length > 0,
      "clientId must be a non-empty string"
    );
  }

  // Validate optional fields with create validation
  const optionalData = { ...data };
  optionalData.id = undefined;
  validateCreateContractRequest(optionalData);
}

export function validateContractStatusTransition(
  currentStatus: ContractStatus,
  newStatus: ContractStatus
): void {
  const validTransitions: Record<ContractStatus, ContractStatus[]> = {
    draft: ["sent", "canceled"],
    sent: ["viewed", "signed", "rejected", "expired", "canceled"],
    viewed: ["signed", "rejected", "expired", "canceled"],
    signed: ["expired", "canceled"],
    rejected: ["expired", "canceled"],
    expired: [],
    canceled: [],
  };

  // Check if the transition is valid
  invariant(
    validTransitions[currentStatus].includes(newStatus),
    `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions from ${currentStatus} are: ${validTransitions[currentStatus].join(", ")}`
  );

  // Additional business rule checks
  if (newStatus === "expired") {
    invariant(
      currentStatus !== "expired" && currentStatus !== "canceled",
      "Cannot transition an expired or canceled contract to expired"
    );
  }

  if (newStatus === "canceled") {
    invariant(
      currentStatus !== "expired",
      "Cannot transition an expired contract to canceled"
    );
  }
}

// Top-level email regex for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignatureData(
  data: unknown
): asserts data is ContractSignatureData {
  invariant(
    data && typeof data === "object",
    "Signature data must be a valid object"
  );

  const signatureData = data as Record<string, unknown>;

  // Signer name is required
  invariant(
    typeof signatureData.signerName === "string" &&
      signatureData.signerName.trim().length > 0,
    "signerName is required and must be a non-empty string"
  );

  // Signer email is required
  invariant(
    typeof signatureData.signerEmail === "string" &&
      signatureData.signerEmail.trim().length > 0,
    "signerEmail is required and must be a non-empty string"
  );

  // Validate email format
  invariant(
    EMAIL_REGEX.test(signatureData.signerEmail as string),
    "signerEmail must be a valid email address"
  );

  // Validate signature date
  const signatureDate =
    signatureData.signatureDate instanceof Date
      ? signatureData.signatureDate
      : new Date(signatureData.signatureDate as string);

  invariant(
    signatureDate instanceof Date && !Number.isNaN(signatureDate.getTime()),
    "signatureDate must be a valid date"
  );

  // Ensure signature date is not in the future
  invariant(
    signatureDate <= new Date(),
    "signatureDate cannot be in the future"
  );

  // Validate optional signer title
  if (
    signatureData.signerTitle !== undefined &&
    signatureData.signerTitle !== null
  ) {
    invariant(
      typeof signatureData.signerTitle === "string",
      "signerTitle must be a string if provided"
    );
  }

  // Validate optional IP address
  if (
    signatureData.ipAddress !== undefined &&
    signatureData.ipAddress !== null
  ) {
    invariant(
      typeof signatureData.ipAddress === "string",
      "ipAddress must be a string if provided"
    );
  }

  // Validate optional user agent
  if (
    signatureData.userAgent !== undefined &&
    signatureData.userAgent !== null
  ) {
    invariant(
      typeof signatureData.userAgent === "string",
      "userAgent must be a string if provided"
    );
  }
}

export function generateContractNumber(_tenantId: string): string {
  // This would typically call a database function to generate a unique contract number
  // For now, we'll implement a basic generator that could be replaced with a DB function
  // In a real implementation, this would be:
  // return await prisma.$executeRaw`SELECT generate_contract_number(${tenantId})`

  // Generate a contract number in the format: CON-YYYYMMDD-XXXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `CON-${dateStr}-${randomPart}`;
}

export function isContractExpired(expiresAt: string | Date | null): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiryDate =
    expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiryDate < new Date();
}

// Helper to validate contract existence and ownership
export function validateContractAccess(
  contract: {
    tenantId: string;
    eventId?: string;
    clientId?: string;
    status: ContractStatus;
  },
  tenantId: string,
  requiredStatus?: ContractStatus[]
): void {
  invariant(
    contract.tenantId === tenantId,
    "Access denied: Contract does not belong to this tenant"
  );

  if (requiredStatus && requiredStatus.length > 0) {
    invariant(
      requiredStatus.includes(contract.status),
      `Contract must be in one of these statuses: ${requiredStatus.join(", ")}`
    );
  }
}

// Helper to validate business rules for contract operations
export function validateContractBusinessRules(
  contract: {
    status: ContractStatus;
    expiresAt?: string | Date | null;
  },
  operation: "update" | "send" | "cancel" | "expire"
): void {
  switch (operation) {
    case "update":
      invariant(
        contract.status === "draft",
        "Can only update contracts in draft status"
      );
      break;

    case "send":
      invariant(
        contract.status === "draft",
        "Can only send contracts in draft status"
      );
      break;

    case "cancel":
      invariant(
        contract.status !== "expired" && contract.status !== "canceled",
        "Cannot cancel an expired or already canceled contract"
      );
      break;

    case "expire":
      invariant(
        contract.status !== "expired" && contract.status !== "canceled",
        "Cannot expire an already expired or canceled contract"
      );
      break;

    default:
      invariant(false, `Unknown contract operation: ${operation}`);
      break;
  }

  // Check if contract is already expired
  if (isContractExpired(contract.expiresAt ?? null)) {
    invariant(
      operation !== "update" && operation !== "send",
      "Contract is expired and cannot be updated or sent"
    );
  }
}
