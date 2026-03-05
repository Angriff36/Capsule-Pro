/**
 * Kitchen Operations Rules Engine
 *
 * Configurable business rules engine for kitchen operations including
 * prep task dependencies, equipment requirements, allergen constraints,
 * and workflow validation.
 *
 * @example
 * ```ts
 * import { getRulesEngine, evaluateTaskRules } from '@repo/manifest-adapters/rules-engine';
 *
 * const engine = getRulesEngine();
 * const result = await evaluateTaskRules('PrepTask', taskId, 'claim', params);
 * ```
 */

// Rule definitions
export {
  // Allergen rules
  allergenAcknowledgmentRule,
  allergenCrossContaminationRule,
  allergenRuleConfigs,
  allergenRules,
  allRules,
  equipmentCapacityRule,
  equipmentRules,
  kitchenTaskTransitions,
  longPrepTimeRule,
  // Timing rules
  overdueTaskRule,
  prepTaskCertificationRule,
  prepTaskDependencies,
  prepTaskDependencyRule,
  // Prep task rules
  prepTaskRecipeActiveRule,
  // Rule collections
  prepTaskRules,
  // Configurations
  prepTaskTransitions,
  stationCapacityRule,
  // Equipment rules
  stationEquipmentRule,
  workflowRules,
  // Workflow rules
  workflowTransitionRule,
} from "./rules.js";
// Main exports
export {
  getRulesEngine,
  KitchenOperationsRulesEngine,
  resetRulesEngine,
} from "./rules-engine.js";
export type {
  RuleEvaluationOptions,
  RuleHookResult,
  RulesEngineIntegrationConfig,
} from "./runtime-integration.js";
// Runtime integration
export {
  createRulesEngineMiddleware,
  getRulesEngineIntegration,
  RulesEngineIntegration,
  resetRulesEngineIntegration,
} from "./runtime-integration.js";
export type {
  AllergenRuleConfig,
  AllergenValidationResult,
  ConditionalRule,
  // Configuration types
  DependencyRuleConfig,
  DependencyValidationResult,
  EquipmentRequirement,
  EquipmentValidationResult,
  // Core types
  RuleContext,
  RuleDefinition,
  // Event types
  RuleEvaluationEvent,
  RuleEvaluationResult,
  RuleSet,
  RuleSetEvaluationEvent,
  RuleSetEvaluationResult,
  RulesEngineConfig,
  // Rule variants
  ValidatedRule,
  WorkflowTransitionRule,
  WorkflowValidationResult,
} from "./types.js";
// Re-export enums as values
export { RuleOutcomeType, RuleSeverity, RuleType } from "./types.js";
