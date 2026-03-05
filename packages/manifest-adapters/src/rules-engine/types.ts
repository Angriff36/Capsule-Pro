/**
 * Kitchen Operations Rules Engine Types
 *
 * Defines the types and interfaces for the configurable business rules engine
 * for kitchen operations including prep task dependencies, equipment requirements,
 * allergen constraints, and workflow validation.
 */

// ---------------------------------------------------------------------------
// Rule Severity and Outcomes
// ---------------------------------------------------------------------------

/**
 * The severity level of a rule constraint.
 */
export enum RuleSeverity {
  /** Information only - does not block operations */
  Info = "info",
  /** Warning - allows operation with notification */
  Warning = "warning",
  /** Error - blocks operation */
  Error = "error",
  /** Critical - blocks operation and requires escalation */
  Critical = "critical",
}

/**
 * The outcome type of a rule evaluation.
 */
export enum RuleOutcomeType {
  /** Rule passed - operation can proceed */
  Allowed = "allowed",
  /** Rule failed but operation can continue with acknowledgment */
  AllowedWithWarning = "allowed_with_warning",
  /** Rule failed - operation is blocked */
  Blocked = "blocked",
}

/**
 * Represents the result of evaluating a single rule.
 */
export interface RuleEvaluationResult {
  /** Unique identifier for the rule */
  ruleId: string;
  /** Name of the rule */
  ruleName: string;
  /** Whether the rule passed */
  passed: boolean;
  /** The outcome type */
  outcome: RuleOutcomeType;
  /** Severity level if the rule failed */
  severity: RuleSeverity;
  /** Human-readable message */
  message: string;
  /** Additional context about the failure */
  details?: Record<string, unknown>;
  /** Whether the result can be overridden */
  overridable: boolean;
  /** Suggested fixes for the failure */
  suggestions?: string[];
}

/**
 * Represents the result of evaluating a rule set.
 */
export interface RuleSetEvaluationResult {
  /** Whether all rules passed (or only warnings were issued) */
  allowed: boolean;
  /** Whether there were any warnings */
  hasWarnings: boolean;
  /** Whether there were any blocking errors */
  hasErrors: boolean;
  /** Individual rule results */
  results: RuleEvaluationResult[];
  /** Aggregated message */
  message?: string;
}

// ---------------------------------------------------------------------------
// Rule Definitions
// ---------------------------------------------------------------------------

/**
 * Types of rules supported by the engine.
 */
export enum RuleType {
  /** Validates dependencies between entities */
  Dependency = "dependency",
  /** Validates equipment requirements */
  Equipment = "equipment",
  /** Validates allergen constraints */
  Allergen = "allergen",
  /** Validates workflow transitions */
  Workflow = "workflow",
  /** Validates capacity constraints */
  Capacity = "capacity",
  /** Validates timing constraints */
  Timing = "timing",
  /** Custom validation rule */
  Custom = "custom",
}

/**
 * Base interface for all rules.
 */
export interface RuleDefinition {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description: string;
  /** Rule type */
  type: RuleType;
  /** Severity level when rule fails */
  severity: RuleSeverity;
  /** Whether the rule can be overridden */
  overridable: boolean;
  /** Whether the rule is currently enabled */
  enabled: boolean;
  /** Entities this rule applies to */
  appliesTo: string[];
  /** Tags for categorization */
  tags?: string[];
}

/**
 * A rule with a validation function.
 */
export interface ValidatedRule extends RuleDefinition {
  /** Function to validate the rule */
  validate: (context: RuleContext) => RuleEvaluationResult;
}

/**
 * A rule with a predicate condition.
 */
export interface ConditionalRule extends RuleDefinition {
  /** Expression that determines if the rule applies */
  condition: string;
  /** Validation expression */
  validation: string;
  /** Message template for failures */
  messageTemplate: string;
}

// ---------------------------------------------------------------------------
// Rule Context
// ---------------------------------------------------------------------------

/**
 * Context provided to rule validators.
 */
export interface RuleContext {
  /** The tenant ID */
  tenantId: string;
  /** The entity being validated */
  entity: {
    /** Entity type name */
    type: string;
    /** Entity ID */
    id: string;
    /** Current state */
    state: Record<string, unknown>;
  };
  /** The operation being performed */
  operation: {
    /** Operation type (create, update, delete, transition) */
    type: string;
    /** Command name */
    command: string;
    /** Parameters being passed */
    params: Record<string, unknown>;
  };
  /** Related entities for cross-validation */
  related?: {
    /** Related entity type */
    type: string;
    /** Related entity data */
    data: Record<string, unknown>[];
  };
  /** User context for policy checks */
  user?: {
    /** User ID */
    id: string;
    /** User roles */
    roles: string[];
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Rule Sets
// ---------------------------------------------------------------------------

/**
 * A collection of rules for a specific domain.
 */
export interface RuleSet {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the rule set */
  description: string;
  /** Domain this rule set applies to */
  domain: "kitchen" | "prep" | "cooking" | "inventory" | "all";
  /** Rules in this set */
  rules: Map<string, ValidatedRule>;
  /** Priority when multiple rule sets apply */
  priority: number;
}

// ---------------------------------------------------------------------------
// Dependency Rules
// ---------------------------------------------------------------------------

/**
 * Configuration for a dependency rule.
 */
export interface DependencyRuleConfig {
  /** The source entity type */
  sourceEntityType: string;
  /** The target entity type that must exist */
  targetEntityType: string;
  /** The relationship property to check */
  relationshipProperty: string;
  /** Whether the dependency is required */
  required: boolean;
  /** Validation mode */
  mode: "exists" | "completed" | "valid" | "custom";
  /** Custom validation expression */
  customValidation?: string;
}

/**
 * Result of a dependency validation.
 */
export interface DependencyValidationResult {
  /** Whether the dependency is satisfied */
  satisfied: boolean;
  /** The target entity ID */
  targetId?: string;
  /** The current state of the target */
  targetState?: string;
  /** Why the dependency failed */
  failureReason?: string;
}

// ---------------------------------------------------------------------------
// Equipment Rules
// ---------------------------------------------------------------------------

/**
 * Configuration for an equipment requirement.
 */
export interface EquipmentRequirement {
  /** Equipment identifier or name */
  equipmentId: string;
  /** Whether this equipment is required */
  required: boolean;
  /** Quantity needed */
  quantity: number;
  /** Alternative equipment that can be used */
  alternatives: string[];
}

/**
 * Result of an equipment validation.
 */
export interface EquipmentValidationResult {
  /** Whether all requirements are met */
  satisfied: boolean;
  /** Missing required equipment */
  missingRequired: string[];
  /** Equipment available but insufficient quantity */
  insufficient: Array<{ equipment: string; needed: number; available: number }>;
  /** Available alternatives */
  alternatives: Array<{ equipment: string; alternatives: string[] }>;
}

// ---------------------------------------------------------------------------
// Allergen Rules
// ---------------------------------------------------------------------------

/**
 * Configuration for allergen constraint validation.
 */
export interface AllergenRuleConfig {
  /** Allergens to check for */
  allergens: string[];
  /** Severity level */
  severity: RuleSeverity;
  /** Whether cross-contamination is a concern */
  crossContamination: boolean;
  /** Required actions when allergen is detected */
  requiredActions: string[];
}

/**
 * Result of an allergen validation.
 */
export interface AllergenValidationResult {
  /** Whether allergen constraints are satisfied */
  satisfied: boolean;
  /** Detected allergens */
  detectedAllergens: string[];
  /** Source ingredients with allergens */
  sources: Array<{ ingredient: string; allergens: string[] }>;
  /** Required actions */
  requiredActions: string[];
  /** Whether warning was acknowledged */
  acknowledged: boolean;
}

// ---------------------------------------------------------------------------
// Workflow Rules
// ---------------------------------------------------------------------------

/**
 * Configuration for a workflow transition rule.
 */
export interface WorkflowTransitionRule {
  /** Source state */
  from: string | string[];
  /** Target state */
  to: string;
  /** Conditions that must be met */
  conditions: string[];
  /** Guards that must pass */
  guards: string[];
  /** Whether this transition requires acknowledgment */
  requiresAcknowledgment: boolean;
}

/**
 * Result of a workflow validation.
 */
export interface WorkflowValidationResult {
  /** Whether the transition is allowed */
  allowed: boolean;
  /** Current state */
  currentState: string;
  /** Target state */
  targetState: string;
  /** Failed conditions */
  failedConditions: string[];
  /** Failed guards */
  failedGuards: string[];
}

// ---------------------------------------------------------------------------
// Rule Engine Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration options for the rules engine.
 */
export interface RulesEngineConfig {
  /** Whether the engine is enabled */
  enabled: boolean;
  /** Default severity level for unconfigured rules */
  defaultSeverity: RuleSeverity;
  /** Whether to allow rule overrides */
  allowOverrides: boolean;
  /** Whether to cache rule evaluations */
  enableCache: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl: number;
  /** Whether to log rule evaluations */
  enableLogging: boolean;
}

// ---------------------------------------------------------------------------
// Rule Evaluation Events
// ---------------------------------------------------------------------------

/**
 * Event emitted when a rule is evaluated.
 */
export interface RuleEvaluationEvent {
  /** Event timestamp */
  timestamp: number;
  /** Rule ID */
  ruleId: string;
  /** Rule name */
  ruleName: string;
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Operation */
  operation: string;
  /** Result */
  result: RuleEvaluationResult;
  /** Tenant ID */
  tenantId: string;
}

/**
 * Event emitted when a rule set is evaluated.
 */
export interface RuleSetEvaluationEvent {
  /** Event timestamp */
  timestamp: number;
  /** Rule set ID */
  ruleSetId: string;
  /** Rule set name */
  ruleSetName: string;
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Operation */
  operation: string;
  /** Result */
  result: RuleSetEvaluationResult;
  /** Tenant ID */
  tenantId: string;
}
