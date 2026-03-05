/**
 * Predefined Kitchen Operations Rules
 *
 * Collection of predefined rules for kitchen operations including
 * prep task dependencies, equipment requirements, allergen constraints,
 * and workflow validation.
 */
import type { AllergenRuleConfig, DependencyRuleConfig, ValidatedRule, WorkflowTransitionRule } from "./types.js";
/**
 * Rule: Prep task cannot be claimed if its recipe is not active.
 */
export declare const prepTaskRecipeActiveRule: ValidatedRule;
/**
 * Rule: Prep task cannot be completed if dependencies are not satisfied.
 */
export declare const prepTaskDependencyRule: ValidatedRule;
/**
 * Rule: Prep tasks with high difficulty recipes require certified staff.
 */
export declare const prepTaskCertificationRule: ValidatedRule;
/**
 * Rule: Station must have required equipment for the assigned task.
 */
export declare const stationEquipmentRule: ValidatedRule;
/**
 * Rule: Equipment capacity cannot be exceeded.
 */
export declare const equipmentCapacityRule: ValidatedRule;
/**
 * Rule: Critical allergens must be acknowledged before proceeding.
 */
export declare const allergenAcknowledgmentRule: ValidatedRule;
/**
 * Rule: Cross-contamination prevention for allergens.
 */
export declare const allergenCrossContaminationRule: ValidatedRule;
/**
 * Rule: Status transitions must follow defined workflow.
 */
export declare const workflowTransitionRule: ValidatedRule;
/**
 * Rule: Tasks cannot be claimed if station is at capacity.
 */
export declare const stationCapacityRule: ValidatedRule;
/**
 * Rule: Overdue tasks should be prioritized.
 */
export declare const overdueTaskRule: ValidatedRule;
/**
 * Rule: Tasks with long prep times should be started early.
 */
export declare const longPrepTimeRule: ValidatedRule;
/**
 * All prep task rules.
 */
export declare const prepTaskRules: ValidatedRule[];
/**
 * All equipment rules.
 */
export declare const equipmentRules: ValidatedRule[];
/**
 * All allergen rules.
 */
export declare const allergenRules: ValidatedRule[];
/**
 * All workflow rules.
 */
export declare const workflowRules: ValidatedRule[];
/**
 * All rules.
 */
export declare const allRules: ValidatedRule[];
/**
 * Valid workflow transitions for PrepTask.
 */
export declare const prepTaskTransitions: WorkflowTransitionRule[];
/**
 * Valid workflow transitions for KitchenTask.
 */
export declare const kitchenTaskTransitions: WorkflowTransitionRule[];
/**
 * Common prep task dependencies.
 */
export declare const prepTaskDependencies: DependencyRuleConfig[];
/**
 * Allergen rule configurations by allergen type.
 */
export declare const allergenRuleConfigs: Record<string, AllergenRuleConfig>;
//# sourceMappingURL=rules.d.ts.map