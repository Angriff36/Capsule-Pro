/**
 * Friendly error mapper for Manifest runtime command failures.
 *
 * Converts the technical IR-level failure shape (guard expressions, policy
 * denials, constraint outcomes) into plain-language explanations a
 * non-engineer can act on, including a suggested fix and a direct link to the
 * blocking entity when one is detectable.
 *
 * This module is PURE — no DB, no network. Its only I/O is one lazy, cached
 * read of the generated `manifest/generated/guard-messages.json` artifact
 * (tolerated missing). It accepts a structural view of the failure
 * (`FriendlyFailureInput`) so it stays unit-testable without the Manifest
 * runtime. Wired into the HTTP failure path by `execute-command.ts`.
 *
 * @packageDocumentation
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FriendlyErrorCategory =
  /** A status/state transition guard halted the command. */
  | "wrong_status"
  /** A field-level or invariant constraint blocked the command. */
  | "validation"
  /** The acting user's role/policy denied the command. */
  | "permission"
  /** The command or target instance does not exist. */
  | "not_found"
  /** Optimistic-concurrency or duplicate-key style conflict. */
  | "conflict"
  /** Unhandled runtime/bootstrap error. */
  | "system";

export interface FriendlyBlockingEntity {
  /** Instance id, when known. */
  id?: string;
  /** Human label, e.g. "Invoice INV-0001" or "this event". */
  label: string;
  /** Frontend detail-page URL, when resolvable. */
  link?: string;
  /** Short clause explaining why this entity is the blocker. */
  reason?: string;
  /** Manifest entity name, e.g. "Invoice", "Event". */
  type: string;
}

export interface FriendlyError {
  /** The entity that blocks the action (with a deep link when available). */
  blockingEntity?: FriendlyBlockingEntity;
  /** High-level category for UI styling / telemetry. */
  category: FriendlyErrorCategory;
  /** Plain-language explanation of WHY the command failed. */
  message: string;
  /** Toast / alert severity. */
  severity: "info" | "warning" | "error";
  /** Actionable next step the user can take. */
  suggestedFix?: string;
  /** Short headline, e.g. "This invoice can't be sent". */
  title: string;
}

// ---------------------------------------------------------------------------
// Structural failure input (mirrors RunManifestCommandCoreFailure without
// importing the runtime package, so this module stays dependency-free).
// ---------------------------------------------------------------------------

export interface FriendlyFailureInput {
  command: string;
  /**
   * Constraint outcomes from the runtime. Typed as `unknown` because the
   * runtime core types this field as `unknown`; narrowed internally via
   * {@link asConstraintOutcomes}.
   */
  constraintOutcomes?: unknown;
  entity: string;
  error?: unknown;
  /**
   * Guard failure payload from the runtime. Typed as `unknown` because the
   * runtime core types this field as `unknown`; narrowed internally via
   * {@link asGuardFailure}.
   */
  guardFailure?: unknown;
  kind:
    | "unknown_command"
    | "bootstrap_failed"
    | "policy_denied"
    | "guard_failed"
    | "constraint_blocked"
    | "command_failed"
    | "invalid_params"
    | "runtime_error";
  message: string;
  /**
   * Policy denial payload from the runtime. Typed as `unknown` because the
   * runtime core types this field as `unknown`; narrowed internally via
   * {@link asPolicyDenial}.
   */
  policyDenial?: unknown;
}

export interface FriendlyGuardFailureLike {
  expression: string;
  formatted?: string;
  index: number;
  resolved?: ReadonlyArray<{ expression: string; value: unknown }>;
}

export interface FriendlyPolicyDenialLike {
  expression?: string;
  formatted?: string;
  message?: string;
  policyName: string;
  resolved?: ReadonlyArray<{ expression: string; value: unknown }>;
}

export interface FriendlyConstraintOutcomeLike {
  code: string;
  constraintName?: string;
  formatted?: string;
  message?: string;
  overridden?: boolean;
  passed: boolean;
  severity: "ok" | "warn" | "block";
}

export interface FriendlyErrorParams {
  /** Request body — used to resolve FK ids for blocking-entity links. */
  body?: Readonly<Record<string, unknown>>;
  /** Explicit instance id (URL path / dispatcher override). */
  instanceId?: string;
}

// ---------------------------------------------------------------------------
// Runtime narrowing helpers
//
// The runtime core types guardFailure/policyDenial/constraintOutcomes as
// `unknown`. These helpers defensively narrow to the expected shapes so the
// mapper never crashes on a malformed payload.
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asGuardFailure(value: unknown): FriendlyGuardFailureLike | undefined {
  const rec = asRecord(value);
  if (!rec) {
    return;
  }
  return rec as unknown as FriendlyGuardFailureLike;
}

function asPolicyDenial(value: unknown): FriendlyPolicyDenialLike | undefined {
  const rec = asRecord(value);
  if (!rec) {
    return;
  }
  return rec as unknown as FriendlyPolicyDenialLike;
}

function asConstraintOutcomes(
  value: unknown
): readonly FriendlyConstraintOutcomeLike[] | undefined {
  if (!Array.isArray(value)) {
    return;
  }
  return value as readonly FriendlyConstraintOutcomeLike[];
}

// ---------------------------------------------------------------------------
// Authored guard messages (generated artifact)
//
// The Manifest compiler currently DROPS the trailing message strings authored
// on `guard` lines (upstream gap — the IR guard nodes have no message slot).
// `manifest/scripts/generate-guard-messages.mjs` extracts them from the DSL
// sources into `manifest/generated/guard-messages.json`, keyed
// "Entity.command" with arrays index-aligned to the IR guard order. DELETE
// this section when upstream adds native guard messages.
// ---------------------------------------------------------------------------

type GuardMessageTable = Readonly<Record<string, ReadonlyArray<string | null>>>;

/** Cache: `null` = load attempted and failed (missing/malformed artifact). */
let guardMessageTable: GuardMessageTable | null | undefined;

function loadGuardMessageTable(): GuardMessageTable | undefined {
  if (guardMessageTable !== undefined) {
    return guardMessageTable ?? undefined;
  }
  guardMessageTable = null;
  // Walk up from cwd so the artifact resolves from both the repo root and
  // apps/api (dev server, vitest).
  let dir = process.cwd();
  for (let hops = 0; hops < 6; hops += 1) {
    try {
      const parsed: unknown = JSON.parse(
        readFileSync(
          join(dir, "manifest", "generated", "guard-messages.json"),
          "utf8"
        )
      );
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        guardMessageTable = parsed as GuardMessageTable;
        break;
      }
    } catch {
      // Missing or malformed at this level — keep walking up.
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return guardMessageTable ?? undefined;
}

/**
 * Authored DSL message for the guard that failed, or undefined when the
 * artifact is missing or the guard has no authored message.
 *
 * `index` is the runtime's `guardFailure.index`, which is 1-based; the
 * generated arrays are 0-based.
 */
export function guardMessageFor(
  entity: string,
  command: string,
  index: number
): string | undefined {
  if (!(Number.isInteger(index) && index >= 1)) {
    return;
  }
  const messages = loadGuardMessageTable()?.[`${entity}.${command}`];
  const authored = messages?.[index - 1];
  return typeof authored === "string" && authored.length > 0
    ? authored
    : undefined;
}

// ---------------------------------------------------------------------------
// Entity metadata registry
// ---------------------------------------------------------------------------

interface EntityMeta {
  /** Optional display field used to build a richer label, e.g. "invoiceNumber". */
  displayField?: string;
  /**
   * FK aliases this entity uses when referenced from child bodies, ordered by
   * preference. e.g. Event accepts `eventId` (and legacy `event_id`).
   */
  foreignKeys?: string[];
  /** Lowercase singular noun for prose, e.g. "invoice". */
  noun: string;
  /** Detail-page route builder. Omit when no dedicated page exists. */
  route?: (id: string) => string;
}

/**
 * Known entity → page route + label metadata. Extend as new entities gain
 * detail pages. Unknown entities fall back to a generic noun and no link.
 *
 * Routes mirror the authenticated page tree under `apps/app/app/(authenticated)`.
 */
const ENTITY_META: Record<string, EntityMeta> = {
  Event: {
    noun: "event",
    displayField: "title",
    route: (id) => `/events/${id}`,
    foreignKeys: ["eventId", "event_id"],
  },
  Invoice: {
    noun: "invoice",
    displayField: "invoiceNumber",
    route: (id) => `/accounting/invoices/${id}`,
    foreignKeys: ["invoiceId"],
  },
  Payment: {
    noun: "payment",
    route: (id) => `/accounting/payments/${id}`,
    foreignKeys: ["paymentId"],
  },
  BattleBoard: {
    noun: "battle board",
    route: (id) => `/events/battle-boards/${id}`,
    foreignKeys: ["boardId", "battleBoardId"],
  },
  EventBudget: {
    noun: "event budget",
    route: (id) => `/events/budgets/${id}`,
    foreignKeys: ["budgetId"],
  },
  EventContract: {
    noun: "event contract",
    route: (id) => `/events/contracts/${id}`,
    foreignKeys: ["contractId"],
  },
  Client: {
    noun: "client",
    displayField: "name",
    route: (id) => `/crm/clients/${id}`,
    foreignKeys: ["clientId"],
  },
  Proposal: {
    noun: "proposal",
    route: (id) => `/crm/proposals/${id}`,
    foreignKeys: ["proposalId"],
  },
  Lead: {
    noun: "lead",
    route: (id) => `/marketing/leads/${id}`,
    foreignKeys: ["leadId"],
  },
  PurchaseOrder: {
    noun: "purchase order",
    route: (id) => `/procurement/purchase-orders/${id}`,
    foreignKeys: ["purchaseOrderId", "poId"],
  },
  PurchaseRequisition: {
    noun: "requisition",
    route: (id) => `/procurement/requisitions/${id}`,
    foreignKeys: ["requisitionId"],
  },
  Vendor: {
    noun: "vendor",
    route: (id) => `/procurement/vendors/${id}`,
    foreignKeys: ["vendorId"],
  },
  VendorContract: {
    noun: "vendor contract",
    route: (id) => `/procurement/vendor-contracts/${id}`,
    foreignKeys: ["vendorContractId"],
  },
  Recipe: {
    noun: "recipe",
    route: (id) => `/kitchen/recipes/${id}`,
    foreignKeys: ["recipeId"],
  },
  Dish: {
    noun: "dish",
    route: (id) => `/kitchen/recipes/dishes/${id}`,
    foreignKeys: ["dishId"],
  },
  Menu: {
    noun: "menu",
    route: (id) => `/kitchen/recipes/menus/${id}`,
    foreignKeys: ["menuId"],
  },
  InventoryItem: {
    noun: "inventory item",
    route: (id) => `/inventory/items/${id}`,
    foreignKeys: ["inventoryItemId", "itemId"],
  },
  AdminTask: {
    noun: "task",
    route: (id) => `/command-board/${id}`,
    foreignKeys: ["adminTaskId", "taskId"],
  },
};

function entityMeta(entityName: string): EntityMeta {
  return (
    ENTITY_META[entityName] ?? {
      noun: entityName.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase(),
    }
  );
}

const STARTS_WITH_VOWEL = /^[aeiou]/i;

function articleFor(noun: string): string {
  return STARTS_WITH_VOWEL.test(noun) ? "an" : "a";
}

function capitalise(text: string): string {
  return text.length === 0
    ? text
    : text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Guard expression parsing
// ---------------------------------------------------------------------------

interface ParsedStatusGuard {
  /** The status property path that was tested, e.g. "status" or "linkedEvent.status". */
  field: string;
  /** Operator detected in the guard expression. */
  operator: "==" | "!=" | "in" | "other";
  /** Required value(s) extracted from the expression RHS. */
  required: string[];
}

/** self.<path>.status == "X"  /  self.<path>.status != "X" */
const SELF_STATUS_EQUALITY =
  /^self\.([\w.]+)\s*(==|!=)\s*(?:"([^"]*)"|'([^']*)')$/;
/** self.status in ["A", "B", "C"] */
const SELF_STATUS_IN = /^self\.([\w.]+)\s+in\s+\[([^\]]*)\]$/;

/**
 * Parse a guard expression of the form:
 *   self.status == "DRAFT"
 *   self.status != "VOID"
 *   self.status in ["SENT", "VIEWED"]
 *   self.linkedEvent.status == "confirmed"
 *
 * Returns undefined when the expression is not a recognizable status check.
 */
function parseStatusGuard(expression: unknown): ParsedStatusGuard | undefined {
  if (typeof expression !== "string") {
    return;
  }
  const cleaned = expression.replace(/\s+/g, " ").trim();

  const equality = cleaned.match(SELF_STATUS_EQUALITY);
  if (equality) {
    const field = equality[1] ?? "";
    if (!field.endsWith("status") && field !== "status") {
      return;
    }
    const value = equality[3] ?? equality[4] ?? "";
    return {
      field,
      operator: equality[2] as "==" | "!=",
      required: [value],
    };
  }

  const inMatch = cleaned.match(SELF_STATUS_IN);
  if (inMatch) {
    const field = inMatch[1] ?? "";
    if (!field.endsWith("status") && field !== "status") {
      return;
    }
    const values = ((inMatch[2] ?? "").match(/"([^"]*)"|'([^']*)'/g) ?? []).map(
      (v) => v.replace(/^["']|["']$/g, "")
    );
    return { field, operator: "in", required: values };
  }

  return;
}

/** Resolve the *current* value for a guard field from the resolved array. */
function resolvedValueFor(
  resolved: ReadonlyArray<{ expression: string; value: unknown }> | undefined,
  field: string
): unknown {
  if (!resolved) {
    return;
  }
  // Match either the full "self.status" form or a trailing alias.
  const direct = resolved.find((r) => r.expression === `self.${field}`);
  if (direct) {
    return direct.value;
  }
  const trailing = resolved.find(
    (r) => r.expression === field || r.expression.endsWith(`.${field}`)
  );
  return trailing?.value;
}

/**
 * Convert a raw status value to a human phrase. Handles:
 *   "PARTIALLY_PAID" -> "partially paid"   (SCREAMING_SNAKE)
 *   "DRAFT"          -> "draft"            (single all-caps word)
 *   "draft"          -> "draft"            (already lowercase)
 *   "Draft"          -> "Draft"            (already Title Case)
 */
const HAS_UPPERCASE = /[A-Z]/;

function humaniseStatus(value: unknown): string {
  if (value === undefined || value === null) {
    return "unset";
  }
  const raw = String(value);
  // SCREAMING_SNAKE_CASE or a single SCREAMING word → lowercase.
  if (raw === raw.toUpperCase() && HAS_UPPERCASE.test(raw)) {
    return raw.toLowerCase().replace(/_/g, " ");
  }
  return raw;
}

/** Build a prose list: ["SENT", "VIEWED"] → "sent or viewed". */
function listToProse(values: string[]): string {
  const humanised = values.map(humaniseStatus);
  if (humanised.length === 0) {
    return "";
  }
  if (humanised.length === 1) {
    return humanised[0] ?? "";
  }
  if (humanised.length === 2) {
    return `${humanised[0]} or ${humanised[1]}`;
  }
  return `${humanised.slice(0, -1).join(", ")}, or ${humanised.at(-1)}`;
}

const ENDS_WITH_E = /e$/;
const TRAILING_DOT = /\.$/;

/** Build a verb from the command name for prose, e.g. "send" → "sent". */
function commandVerb(command: string): { action: string; past: string } {
  const irregulars: Record<string, { action: string; past: string }> = {
    send: { action: "send", past: "sent" },
    void: { action: "void", past: "voided" },
    voidInvoice: { action: "void", past: "voided" },
    write: { action: "write off", past: "written off" },
    writeOff: { action: "write off", past: "written off" },
    pay: { action: "pay", past: "paid" },
    markAsPaid: { action: "mark as paid", past: "marked as paid" },
    markPaid: { action: "mark as paid", past: "marked as paid" },
    markOverdue: { action: "mark overdue", past: "marked overdue" },
    markViewed: { action: "mark viewed", past: "marked viewed" },
    applyPayment: {
      action: "apply a payment to",
      past: "had a payment applied",
    },
    recordRefund: {
      action: "record a refund on",
      past: "had a refund recorded",
    },
    cancel: { action: "cancel", past: "cancelled" },
    confirm: { action: "confirm", past: "confirmed" },
    publish: { action: "publish", past: "published" },
    approve: { action: "approve", past: "approved" },
    finalize: { action: "finalize", past: "finalized" },
    finalise: { action: "finalize", past: "finalized" },
    assign: { action: "assign", past: "assigned" },
    assignStaff: { action: "assign staff to", past: "had staff assigned" },
    deactivate: { action: "deactivate", past: "deactivated" },
    ship: { action: "ship", past: "shipped" },
    deliver: { action: "deliver", past: "delivered" },
    acknowledge: { action: "acknowledge", past: "acknowledged" },
  };
  const known = irregulars[command];
  if (known) {
    return known;
  }
  // Heuristic: regular -ed past tense on a slugified form.
  const lower = command
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
  const past = ENDS_WITH_E.test(lower) ? `${lower}d` : `${lower}ed`;
  return { action: lower, past };
}

// ---------------------------------------------------------------------------
// Blocking entity resolution
// ---------------------------------------------------------------------------

/** Manifest relationship alias → entity name. */
const RELATIONSHIP_TO_ENTITY: Record<string, string> = {
  event: "Event",
  linkedEvent: "Event",
  invoice: "Invoice",
  client: "Client",
  vendor: "Vendor",
  proposal: "Proposal",
  contract: "EventContract",
  battleBoard: "BattleBoard",
  budget: "EventBudget",
};

/**
 * When a guard references a related entity's status (e.g.
 * `self.linkedEvent.status`), resolve the related entity type + id from the
 * request body so we can deep-link to it.
 */
function resolveCrossEntityReference(
  field: string,
  body: Readonly<Record<string, unknown>> | undefined
): FriendlyBlockingEntity | undefined {
  // field is e.g. "linkedEvent.status" or "event.status"
  const relName = field.split(".")[0];
  if (!relName || relName === "status") {
    return;
  }

  const candidateEntity = RELATIONSHIP_TO_ENTITY[relName];
  if (!candidateEntity) {
    return;
  }

  const meta = entityMeta(candidateEntity);
  const id = meta.foreignKeys
    ?.map((key) => body?.[key])
    .find((v): v is string => typeof v === "string" && v.length > 0);

  return {
    type: candidateEntity,
    ...(id ? { id } : {}),
    label: `the linked ${meta.noun}`,
    ...(id && meta.route ? { link: meta.route(id) } : {}),
    reason: "its status is blocking this action",
  };
}

/**
 * Build a blocking-entity descriptor for the entity being acted on. Used as
 * the default blocker for self-status guards and policy denials.
 */
function resolveSelfBlockingEntity(
  entityName: string,
  params: FriendlyErrorParams
): FriendlyBlockingEntity | undefined {
  const meta = entityMeta(entityName);
  const bodyId = params.body?.id;
  const id =
    (typeof bodyId === "string" && bodyId.length > 0 ? bodyId : undefined) ??
    (typeof params.instanceId === "string" && params.instanceId.length > 0
      ? params.instanceId
      : undefined);

  // When there is no id and no known route, we cannot produce a useful link.
  if (!(id || meta.route)) {
    return;
  }

  const displayValue = meta.displayField
    ? params.body?.[meta.displayField]
    : undefined;
  const label =
    typeof displayValue === "string" && displayValue.length > 0
      ? `${capitalise(meta.noun)} ${displayValue}`
      : `this ${meta.noun}`;

  return {
    type: entityName,
    ...(id ? { id } : {}),
    label,
    ...(id && meta.route ? { link: meta.route(id) } : {}),
  };
}

function buildStatusSuggestedFix(
  noun: string,
  action: string,
  required: string[],
  isNotEqual: boolean
): string {
  if (required.length === 0) {
    return `Check the current status of this ${noun} and adjust it to meet the requirement.`;
  }
  const phrase = listToProse(required);
  if (isNotEqual) {
    return `Change this ${noun}'s status away from ${phrase}, then try again.`;
  }
  return `Move this ${noun} to ${phrase} status first, then ${action} it again.`;
}

// ---------------------------------------------------------------------------
// Per-kind mappers
// ---------------------------------------------------------------------------

function mapGuardFailure(
  failure: FriendlyFailureInput,
  params: FriendlyErrorParams
): FriendlyError {
  const entityName = failure.entity;
  const meta = entityMeta(entityName);
  const { action, past } = commandVerb(failure.command);
  const guard = asGuardFailure(failure.guardFailure);
  const fallbackMessage =
    guard?.formatted ?? guard?.expression ?? failure.message;

  const parsed = parseStatusGuard(guard?.expression);
  const currentValue = parsed
    ? resolvedValueFor(guard?.resolved, parsed.field)
    : undefined;

  // ---- Cross-entity guard: e.g. self.linkedEvent.status == "confirmed" ----
  if (parsed?.field.includes(".")) {
    const cross = resolveCrossEntityReference(parsed.field, params.body);
    if (cross) {
      const requiredPhrase = listToProse(parsed.required);
      const message =
        parsed.operator === "!="
          ? `This ${meta.noun} can't be ${past} while the linked ${entityMeta(cross.type).noun} is ${requiredPhrase}.`
          : `This ${meta.noun} can't be ${past} until the linked ${entityMeta(cross.type).noun} is ${requiredPhrase}.`;
      return {
        title: `This ${meta.noun} can't be ${past} yet`,
        message,
        suggestedFix: `Open the ${entityMeta(cross.type).noun} and update its status first.`,
        blockingEntity: cross,
        category: "wrong_status",
        severity: "warning",
      };
    }
  }

  // ---- Self-status guard: self.status == "DRAFT" ----
  if (parsed && currentValue !== undefined) {
    const currentPhrase = humaniseStatus(currentValue);
    const requiredPhrase = listToProse(parsed.required);
    const isNotEqual = parsed.operator === "!=";

    const message = isNotEqual
      ? `This ${meta.noun} is currently "${currentPhrase}", which blocks ${action}. The status must not be ${requiredPhrase}.`
      : `This ${meta.noun} can't be ${past} because its status is "${currentPhrase}". It needs to be ${requiredPhrase} first.`;

    return {
      title: `This ${meta.noun} can't be ${past}`,
      message,
      suggestedFix: buildStatusSuggestedFix(
        meta.noun,
        action,
        parsed.required,
        isNotEqual
      ),
      blockingEntity: resolveSelfBlockingEntity(entityName, params),
      category: "wrong_status",
      severity: "warning",
    };
  }

  // ---- Generic guard (no status detected) — surface the authored message ----
  // Prefer the DSL-authored guard message (extracted into
  // guard-messages.json) over the runtime's formatted expression; never show
  // a raw expression when an authored message exists.
  const authored = guard
    ? guardMessageFor(entityName, failure.command, guard.index)
    : undefined;
  const detail = (authored ?? fallbackMessage).replace(TRAILING_DOT, "");
  return {
    title: `This ${meta.noun} can't be ${past}`,
    message: `This ${meta.noun} can't be ${past} right now. ${detail}.`,
    suggestedFix: `Review the requirement above and adjust the ${meta.noun} before trying again.`,
    blockingEntity: resolveSelfBlockingEntity(entityName, params),
    category: "validation",
    severity: "warning",
  };
}

function mapPolicyDenial(
  failure: FriendlyFailureInput,
  params: FriendlyErrorParams
): FriendlyError {
  const meta = entityMeta(failure.entity);
  const denial = asPolicyDenial(failure.policyDenial);
  const policyName = denial?.policyName ?? "your role";
  // Prefer the authored message; always name the policy so the user/admin has
  // a concrete reference to grant or adjust.
  const authored =
    denial?.message ?? denial?.formatted ?? `denied by policy "${policyName}"`;
  const denialDetail = authored.includes(policyName)
    ? authored
    : `${authored} (policy: ${policyName})`;

  return {
    title: "You don't have permission to do this",
    message: `Your account isn't allowed to ${commandVerb(failure.command).action} this ${meta.noun}. ${denialDetail.replace(TRAILING_DOT, "")}.`,
    suggestedFix:
      "Ask a manager or administrator to grant access, or switch to an account with the right role.",
    blockingEntity: resolveSelfBlockingEntity(failure.entity, params),
    category: "permission",
    severity: "warning",
  };
}

function mapConstraintBlocked(
  failure: FriendlyFailureInput,
  params: FriendlyErrorParams
): FriendlyError {
  const meta = entityMeta(failure.entity);
  const outcomes = asConstraintOutcomes(failure.constraintOutcomes);
  const blocked = outcomes?.find(
    (o) => !(o.passed || o.overridden) && o.severity === "block"
  );
  const detail =
    blocked?.message ??
    blocked?.formatted ??
    failure.message ??
    "a validation rule blocked this action";

  return {
    title: `This ${meta.noun} can't be saved as entered`,
    message: `${capitalise(detail.replace(TRAILING_DOT, ""))}.`,
    suggestedFix: `Update the highlighted fields on this ${meta.noun} and try again. If the rule shouldn't apply, an authorized user can override it.`,
    blockingEntity: resolveSelfBlockingEntity(failure.entity, params),
    category: "validation",
    severity: "warning",
  };
}

function mapUnknownCommand(failure: FriendlyFailureInput): FriendlyError {
  const meta = entityMeta(failure.entity);
  return {
    title: "This action isn't available",
    message: `The "${failure.command}" action doesn't exist for ${articleFor(meta.noun)} ${meta.noun}. It may have been renamed or removed.`,
    suggestedFix:
      "Go back, refresh the page, and try again. If the problem persists, contact support.",
    category: "not_found",
    severity: "info",
  };
}

function mapCommandFailed(
  failure: FriendlyFailureInput,
  params: FriendlyErrorParams
): FriendlyError {
  const meta = entityMeta(failure.entity);
  return {
    title: "We couldn't complete that",
    message: `${failure.message.replace(TRAILING_DOT, "")}.`,
    suggestedFix: `Check the details on this ${meta.noun} and try again. If it keeps failing, contact support.`,
    blockingEntity: resolveSelfBlockingEntity(failure.entity, params),
    category: "validation",
    severity: "warning",
  };
}

function mapRuntimeError(failure: FriendlyFailureInput): FriendlyError {
  return {
    title: "Something went wrong on our end",
    message:
      "We hit an unexpected error while running this action. Your changes were not saved.",
    suggestedFix: `Try again in a moment. If the problem continues, contact support and mention "${failure.entity}.${failure.command}".`,
    category: "system",
    severity: "error",
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Map a runtime command failure into a plain-language explanation with a
 * suggested fix and (when detectable) a direct link to the blocking entity.
 *
 * Always returns a non-empty FriendlyError; never throws.
 */
export function mapFailureToExplanation(
  failure: FriendlyFailureInput,
  params: FriendlyErrorParams = {}
): FriendlyError {
  try {
    switch (failure.kind) {
      case "guard_failed":
        return mapGuardFailure(failure, params);
      case "policy_denied":
        return mapPolicyDenial(failure, params);
      case "constraint_blocked":
        return mapConstraintBlocked(failure, params);
      case "unknown_command":
      case "bootstrap_failed":
        return mapUnknownCommand(failure);
      case "runtime_error":
        return mapRuntimeError(failure);
      default:
        return mapCommandFailed(failure, params);
    }
  } catch {
    // Defensive: never let mapper logic surface as a new failure. Fall back to
    // a generic system error so the caller always gets a usable explanation.
    return {
      title: "We couldn't complete that",
      message: failure.message || "The action could not be completed.",
      category: "system",
      severity: "error",
    };
  }
}
