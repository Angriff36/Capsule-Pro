/**
 * Event Contract Validation Helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTRACT_STATUSES = void 0;
exports.parseContractFilters = parseContractFilters;
exports.parsePaginationParams = parsePaginationParams;
exports.validateCreateContractRequest = validateCreateContractRequest;
exports.validateUpdateContractRequest = validateUpdateContractRequest;
exports.validateContractStatusTransition = validateContractStatusTransition;
exports.validateSignatureData = validateSignatureData;
exports.generateContractNumber = generateContractNumber;
exports.isContractExpired = isContractExpired;
exports.validateContractAccess = validateContractAccess;
exports.validateContractBusinessRules = validateContractBusinessRules;
const invariant_1 = require("@/app/lib/invariant");
exports.CONTRACT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "rejected",
  "expired",
  "canceled",
];
function parseContractFilters(searchParams) {
  const filters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status"),
    eventId: searchParams.get("eventId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  };
  // Validate status if provided
  if (filters.status) {
    const validStatuses = [
      "draft",
      "sent",
      "viewed",
      "signed",
      "rejected",
      "expired",
      "canceled",
    ];
    (0, invariant_1.invariant)(
      validStatuses.includes(filters.status),
      `Invalid status: ${filters.status}. Must be one of: ${validStatuses.join(", ")}`
    );
  }
  return filters;
}
function parsePaginationParams(searchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || "50"))
  );
  return { page, limit };
}
function validateCreateContractRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  // Event ID is required
  (0, invariant_1.invariant)(
    typeof data.eventId === "string" && data.eventId.trim().length > 0,
    "eventId is required and must be a non-empty string"
  );
  // Client ID is required
  (0, invariant_1.invariant)(
    typeof data.clientId === "string" && data.clientId.trim().length > 0,
    "clientId is required and must be a non-empty string"
  );
  // Validate title if provided
  if (data.title !== undefined && data.title !== null) {
    (0, invariant_1.invariant)(
      typeof data.title === "string" && data.title.trim().length > 0,
      "title must be a non-empty string if provided"
    );
  }
  // Validate notes if provided
  if (data.notes !== undefined && data.notes !== null) {
    (0, invariant_1.invariant)(
      typeof data.notes === "string",
      "notes must be a string if provided"
    );
  }
  // Validate expiresAt if provided
  if (data.expiresAt !== undefined && data.expiresAt !== null) {
    const date =
      data.expiresAt instanceof Date
        ? data.expiresAt
        : new Date(data.expiresAt);
    (0, invariant_1.invariant)(
      date instanceof Date && !Number.isNaN(date.getTime()),
      "expiresAt must be a valid date"
    );
    // Ensure the date is in the future
    (0, invariant_1.invariant)(
      date > new Date(),
      "expiresAt must be in the future"
    );
  }
  // Validate documentUrl if provided
  if (data.documentUrl !== undefined && data.documentUrl !== null) {
    (0, invariant_1.invariant)(
      typeof data.documentUrl === "string" &&
        data.documentUrl.trim().length > 0,
      "documentUrl must be a non-empty string if provided"
    );
    // Validate it's a valid URL
    try {
      new URL(data.documentUrl);
    } catch {
      (0, invariant_1.invariant)(false, "documentUrl must be a valid URL");
    }
  }
  // Validate documentType if provided
  if (data.documentType !== undefined && data.documentType !== null) {
    (0, invariant_1.invariant)(
      typeof data.documentType === "string" &&
        data.documentType.trim().length > 0,
      "documentType must be a non-empty string if provided"
    );
  }
}
function validateUpdateContractRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  // ID is required for updates
  (0, invariant_1.invariant)(
    typeof data.id === "string" && data.id.trim().length > 0,
    "id is required and must be a non-empty string"
  );
  // Reuse create validation for optional fields
  if (data.eventId !== undefined && data.eventId !== null) {
    (0, invariant_1.invariant)(
      typeof data.eventId === "string" && data.eventId.trim().length > 0,
      "eventId must be a non-empty string"
    );
  }
  if (data.clientId !== undefined && data.clientId !== null) {
    (0, invariant_1.invariant)(
      typeof data.clientId === "string" && data.clientId.trim().length > 0,
      "clientId must be a non-empty string"
    );
  }
  // Validate optional fields with create validation
  const optionalData = { ...data };
  delete optionalData.id;
  validateCreateContractRequest(optionalData);
}
function validateContractStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    draft: ["sent", "canceled"],
    sent: ["viewed", "signed", "rejected", "expired", "canceled"],
    viewed: ["signed", "rejected", "expired", "canceled"],
    signed: ["expired", "canceled"],
    rejected: ["expired", "canceled"],
    expired: [],
    canceled: [],
  };
  // Check if the transition is valid
  (0, invariant_1.invariant)(
    validTransitions[currentStatus].includes(newStatus),
    `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions from ${currentStatus} are: ${validTransitions[currentStatus].join(", ")}`
  );
  // Additional business rule checks
  if (newStatus === "expired") {
    (0, invariant_1.invariant)(
      currentStatus !== "expired" && currentStatus !== "canceled",
      "Cannot transition an expired or canceled contract to expired"
    );
  }
  if (newStatus === "canceled") {
    (0, invariant_1.invariant)(
      currentStatus !== "expired",
      "Cannot transition an expired contract to canceled"
    );
  }
}
function validateSignatureData(data) {
  (0, invariant_1.invariant)(
    data && typeof data === "object",
    "Signature data must be a valid object"
  );
  const signatureData = data;
  // Signer name is required
  (0, invariant_1.invariant)(
    typeof signatureData.signerName === "string" &&
      signatureData.signerName.trim().length > 0,
    "signerName is required and must be a non-empty string"
  );
  // Signer email is required
  (0, invariant_1.invariant)(
    typeof signatureData.signerEmail === "string" &&
      signatureData.signerEmail.trim().length > 0,
    "signerEmail is required and must be a non-empty string"
  );
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  (0, invariant_1.invariant)(
    emailRegex.test(signatureData.signerEmail),
    "signerEmail must be a valid email address"
  );
  // Validate signature date
  const signatureDate =
    signatureData.signatureDate instanceof Date
      ? signatureData.signatureDate
      : new Date(signatureData.signatureDate);
  (0, invariant_1.invariant)(
    signatureDate instanceof Date && !Number.isNaN(signatureDate.getTime()),
    "signatureDate must be a valid date"
  );
  // Ensure signature date is not in the future
  (0, invariant_1.invariant)(
    signatureDate <= new Date(),
    "signatureDate cannot be in the future"
  );
  // Validate optional signer title
  if (
    signatureData.signerTitle !== undefined &&
    signatureData.signerTitle !== null
  ) {
    (0, invariant_1.invariant)(
      typeof signatureData.signerTitle === "string",
      "signerTitle must be a string if provided"
    );
  }
  // Validate optional IP address
  if (
    signatureData.ipAddress !== undefined &&
    signatureData.ipAddress !== null
  ) {
    (0, invariant_1.invariant)(
      typeof signatureData.ipAddress === "string",
      "ipAddress must be a string if provided"
    );
  }
  // Validate optional user agent
  if (
    signatureData.userAgent !== undefined &&
    signatureData.userAgent !== null
  ) {
    (0, invariant_1.invariant)(
      typeof signatureData.userAgent === "string",
      "userAgent must be a string if provided"
    );
  }
}
async function generateContractNumber(tenantId) {
  // This would typically call a database function to generate a unique contract number
  // For now, we'll implement a basic generator that could be replaced with a DB function
  // In a real implementation, this would be:
  // return await prisma.$executeRaw`SELECT generate_contract_number(${tenantId})`
  // Generate a contract number in the format: CON-YYYYMMDD-XXXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `CON-${dateStr}-${randomPart}`;
}
function isContractExpired(expiresAt) {
  if (!expiresAt) {
    return false;
  }
  const expiryDate =
    expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiryDate < new Date();
}
// Helper to validate contract existence and ownership
function validateContractAccess(contract, tenantId, requiredStatus) {
  (0, invariant_1.invariant)(
    contract.tenantId === tenantId,
    "Access denied: Contract does not belong to this tenant"
  );
  if (requiredStatus && requiredStatus.length > 0) {
    (0, invariant_1.invariant)(
      requiredStatus.includes(contract.status),
      `Contract must be in one of these statuses: ${requiredStatus.join(", ")}`
    );
  }
}
// Helper to validate business rules for contract operations
function validateContractBusinessRules(contract, operation) {
  switch (operation) {
    case "update":
      (0, invariant_1.invariant)(
        contract.status === "draft",
        "Can only update contracts in draft status"
      );
      break;
    case "send":
      (0, invariant_1.invariant)(
        contract.status === "draft",
        "Can only send contracts in draft status"
      );
      break;
    case "cancel":
      (0, invariant_1.invariant)(
        contract.status !== "expired" && contract.status !== "canceled",
        "Cannot cancel an expired or already canceled contract"
      );
      break;
    case "expire":
      (0, invariant_1.invariant)(
        contract.status !== "expired" && contract.status !== "canceled",
        "Cannot expire an already expired or canceled contract"
      );
      break;
  }
  // Check if contract is already expired
  if (isContractExpired(contract.expiresAt ?? null)) {
    (0, invariant_1.invariant)(
      operation !== "update" && operation !== "send",
      "Contract is expired and cannot be updated or sent"
    );
  }
}
