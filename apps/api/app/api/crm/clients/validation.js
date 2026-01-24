/**
 * Client CRUD Validation Helpers
 *
 * Validation functions using invariant() for client operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmail = validateEmail;
exports.validatePhone = validatePhone;
exports.validateCreateClientRequest = validateCreateClientRequest;
exports.validateUpdateClientRequest = validateUpdateClientRequest;
exports.validateCreateClientContactRequest = validateCreateClientContactRequest;
exports.validateCreateClientInteractionRequest =
  validateCreateClientInteractionRequest;
exports.parseClientListFilters = parseClientListFilters;
exports.parsePaginationParams = parsePaginationParams;
exports.validateUpdateClientInteractionRequest =
  validateUpdateClientInteractionRequest;
const invariant_1 = require("@/app/lib/invariant");
/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email) return true; // Email is optional
  return EMAIL_REGEX.test(email);
}
/**
 * Validate phone number format (basic check)
 */
function validatePhone(phone) {
  if (!phone) return true; // Phone is optional
  const cleaned = phone.replace(/[\s\-()+]/g, "");
  return cleaned.length >= 10 && /^\d+$/.test(cleaned);
}
/**
 * Validate create client request
 */
function validateCreateClientRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  // At least company name OR individual name is required
  (0, invariant_1.invariant)(
    data.company_name || (data.first_name && data.last_name),
    "Either company_name or both first_name and last_name are required"
  );
  // Validate email format if provided
  if (data.email && typeof data.email === "string") {
    (0, invariant_1.invariant)(
      validateEmail(data.email),
      "email must be a valid email address"
    );
  }
  // Validate phone format if provided
  if (data.phone && typeof data.phone === "string") {
    (0, invariant_1.invariant)(
      validatePhone(data.phone),
      "phone must be a valid phone number"
    );
  }
  // Validate tags is an array if provided
  if (data.tags !== undefined) {
    (0, invariant_1.invariant)(
      Array.isArray(data.tags),
      "tags must be an array"
    );
  }
  // Validate defaultPaymentTerms is positive if provided
  if (data.defaultPaymentTerms !== undefined) {
    (0, invariant_1.invariant)(
      typeof data.defaultPaymentTerms === "number" &&
        data.defaultPaymentTerms > 0,
      "defaultPaymentTerms must be a positive number"
    );
  }
  // Validate clientType
  if (data.clientType !== undefined) {
    (0, invariant_1.invariant)(
      typeof data.clientType === "string" &&
        ["company", "individual"].includes(data.clientType),
      "clientType must be either 'company' or 'individual'"
    );
  }
}
/**
 * Validate update client request (more lenient)
 */
function validateUpdateClientRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  // Validate email format if provided
  if (data.email && typeof data.email === "string") {
    (0, invariant_1.invariant)(
      validateEmail(data.email),
      "email must be a valid email address"
    );
  }
  // Validate phone format if provided
  if (data.phone && typeof data.phone === "string") {
    (0, invariant_1.invariant)(
      validatePhone(data.phone),
      "phone must be a valid phone number"
    );
  }
  // Validate tags is an array if provided
  if (data.tags !== undefined) {
    (0, invariant_1.invariant)(
      Array.isArray(data.tags),
      "tags must be an array"
    );
  }
  // Validate clientType if provided
  if (data.clientType !== undefined) {
    (0, invariant_1.invariant)(
      typeof data.clientType === "string" &&
        ["company", "individual"].includes(data.clientType),
      "clientType must be either 'company' or 'individual'"
    );
  }
}
/**
 * Validate create client contact request
 */
function validateCreateClientContactRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  (0, invariant_1.invariant)(
    typeof data.first_name === "string" && data.first_name.trim().length > 0,
    "first_name is required and must not be empty"
  );
  (0, invariant_1.invariant)(
    typeof data.last_name === "string" && data.last_name.trim().length > 0,
    "last_name is required and must not be empty"
  );
  // Validate email format if provided
  if (data.email && typeof data.email === "string") {
    (0, invariant_1.invariant)(
      validateEmail(data.email),
      "email must be a valid email address"
    );
  }
  // Validate phone format if provided
  if (data.phone && typeof data.phone === "string") {
    (0, invariant_1.invariant)(
      validatePhone(data.phone),
      "phone must be a valid phone number"
    );
  }
}
/**
 * Validate create client interaction request
 */
function validateCreateClientInteractionRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  (0, invariant_1.invariant)(
    typeof data.interactionType === "string" &&
      data.interactionType.trim().length > 0,
    "interactionType is required and must not be empty"
  );
  // Validate followUpDate format if provided
  if (data.followUpDate && typeof data.followUpDate === "string") {
    const date = new Date(data.followUpDate);
    (0, invariant_1.invariant)(
      !Number.isNaN(date.getTime()),
      "followUpDate must be a valid ISO date string"
    );
  }
}
/**
 * Parse and validate list filters
 */
function parseClientListFilters(searchParams) {
  const filters = {};
  const search = searchParams.get("search");
  if (search) {
    (0, invariant_1.invariant)(
      typeof search === "string" && search.length > 0,
      "search must be a non-empty string"
    );
    filters.search = search;
  }
  const tags = searchParams.get("tags");
  if (tags) {
    try {
      const parsed = JSON.parse(tags);
      (0, invariant_1.invariant)(
        Array.isArray(parsed),
        "tags must be a valid JSON array"
      );
      filters.tags = parsed;
    } catch {
      throw new Error("tags must be a valid JSON array");
    }
  }
  const assignedTo = searchParams.get("assignedTo");
  if (assignedTo) {
    (0, invariant_1.invariant)(
      typeof assignedTo === "string" && assignedTo.length > 0,
      "assignedTo must be a non-empty string"
    );
    filters.assignedTo = assignedTo;
  }
  const clientType = searchParams.get("clientType");
  if (clientType) {
    (0, invariant_1.invariant)(
      ["company", "individual"].includes(clientType),
      "clientType must be either 'company' or 'individual'"
    );
    filters.clientType = clientType;
  }
  const source = searchParams.get("source");
  if (source) {
    (0, invariant_1.invariant)(
      typeof source === "string" && source.length > 0,
      "source must be a non-empty string"
    );
    filters.source = source;
  }
  return filters;
}
/**
 * Parse pagination parameters
 */
function parsePaginationParams(searchParams) {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  (0, invariant_1.invariant)(
    !Number.isNaN(page) && page > 0,
    "page must be a positive integer"
  );
  (0, invariant_1.invariant)(
    !Number.isNaN(limit) && limit > 0 && limit <= 100,
    "limit must be a positive integer (max 100)"
  );
  return { page, limit };
}
/**
 * Validate update client interaction request (more lenient - all optional)
 */
function validateUpdateClientInteractionRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  // If interactionType is provided, validate it
  if (data.interactionType !== undefined) {
    (0, invariant_1.invariant)(
      typeof data.interactionType === "string" &&
        data.interactionType.trim().length > 0,
      "interactionType must be a non-empty string"
    );
  }
  // Validate followUpDate format if provided
  if (data.followUpDate && typeof data.followUpDate === "string") {
    const date = new Date(data.followUpDate);
    (0, invariant_1.invariant)(
      !Number.isNaN(date.getTime()),
      "followUpDate must be a valid ISO date string"
    );
  }
  // Validate followUpCompleted is boolean if provided
  if (data.followUpCompleted !== undefined) {
    (0, invariant_1.invariant)(
      typeof data.followUpCompleted === "boolean",
      "followUpCompleted must be a boolean"
    );
  }
  // At least one field must be provided
  const hasData =
    data.interactionType !== undefined ||
    data.subject !== undefined ||
    data.description !== undefined ||
    data.followUpDate !== undefined ||
    data.followUpCompleted !== undefined;
  (0, invariant_1.invariant)(
    hasData,
    "At least one field must be provided for update"
  );
}
