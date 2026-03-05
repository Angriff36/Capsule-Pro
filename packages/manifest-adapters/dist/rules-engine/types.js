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
export var RuleSeverity;
(function (RuleSeverity) {
    /** Information only - does not block operations */
    RuleSeverity["Info"] = "info";
    /** Warning - allows operation with notification */
    RuleSeverity["Warning"] = "warning";
    /** Error - blocks operation */
    RuleSeverity["Error"] = "error";
    /** Critical - blocks operation and requires escalation */
    RuleSeverity["Critical"] = "critical";
})(RuleSeverity || (RuleSeverity = {}));
/**
 * The outcome type of a rule evaluation.
 */
export var RuleOutcomeType;
(function (RuleOutcomeType) {
    /** Rule passed - operation can proceed */
    RuleOutcomeType["Allowed"] = "allowed";
    /** Rule failed but operation can continue with acknowledgment */
    RuleOutcomeType["AllowedWithWarning"] = "allowed_with_warning";
    /** Rule failed - operation is blocked */
    RuleOutcomeType["Blocked"] = "blocked";
})(RuleOutcomeType || (RuleOutcomeType = {}));
// ---------------------------------------------------------------------------
// Rule Definitions
// ---------------------------------------------------------------------------
/**
 * Types of rules supported by the engine.
 */
export var RuleType;
(function (RuleType) {
    /** Validates dependencies between entities */
    RuleType["Dependency"] = "dependency";
    /** Validates equipment requirements */
    RuleType["Equipment"] = "equipment";
    /** Validates allergen constraints */
    RuleType["Allergen"] = "allergen";
    /** Validates workflow transitions */
    RuleType["Workflow"] = "workflow";
    /** Validates capacity constraints */
    RuleType["Capacity"] = "capacity";
    /** Validates timing constraints */
    RuleType["Timing"] = "timing";
    /** Custom validation rule */
    RuleType["Custom"] = "custom";
})(RuleType || (RuleType = {}));
