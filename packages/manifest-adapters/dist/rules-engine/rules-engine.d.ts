/**
 * Kitchen Operations Rules Engine
 *
 * Core engine for evaluating configurable business rules for kitchen operations.
 * Provides dependency validation, equipment requirements, allergen constraints,
 * and workflow validation.
 */
import type { AllergenRuleConfig, AllergenValidationResult, DependencyRuleConfig, DependencyValidationResult, EquipmentRequirement, EquipmentValidationResult, RuleContext, RuleEvaluationEvent, RuleEvaluationResult, RuleSet, RuleSetEvaluationEvent, RuleSetEvaluationResult, RulesEngineConfig, ValidatedRule, WorkflowTransitionRule, WorkflowValidationResult } from "./types.js";
import { RuleOutcomeType, RuleSeverity, RuleType } from "./types.js";
export declare class KitchenOperationsRulesEngine {
    private config;
    private ruleSets;
    private cache;
    private events;
    constructor(config?: Partial<RulesEngineConfig>);
    /**
     * Update the engine configuration.
     */
    configure(config: Partial<RulesEngineConfig>): void;
    /**
     * Get the current configuration.
     */
    getConfig(): RulesEngineConfig;
    /**
     * Register a new rule set.
     */
    registerRuleSet(ruleSet: RuleSet): void;
    /**
     * Get a rule set by ID.
     */
    getRuleSet(id: string): RuleSet | undefined;
    /**
     * Get all rule sets.
     */
    getAllRuleSets(): RuleSet[];
    /**
     * Get rule sets for a specific domain.
     */
    getRuleSetsForDomain(domain: string): RuleSet[];
    /**
     * Add a rule to a rule set.
     */
    addRule(ruleSetId: string, rule: ValidatedRule): void;
    /**
     * Remove a rule from a rule set.
     */
    removeRule(ruleSetId: string, ruleId: string): void;
    /**
     * Enable or disable a rule.
     */
    setRuleEnabled(ruleSetId: string, ruleId: string, enabled: boolean): void;
    /**
     * Evaluate a single rule.
     */
    evaluateRule(rule: ValidatedRule, context: RuleContext): RuleEvaluationResult;
    /**
     * Evaluate a rule set.
     */
    evaluateRuleSet(ruleSetId: string, context: RuleContext): RuleSetEvaluationResult;
    /**
     * Evaluate all applicable rule sets for a context.
     */
    evaluateAll(context: RuleContext, domain?: string): RuleSetEvaluationResult;
    /**
     * Validate dependencies for an entity.
     */
    validateDependencies(config: DependencyRuleConfig, context: RuleContext): DependencyValidationResult;
    /**
     * Validate equipment requirements.
     */
    validateEquipment(requirements: EquipmentRequirement[], availableEquipment: Array<{
        id: string;
        name: string;
        quantity: number;
    }>, context: RuleContext): EquipmentValidationResult;
    /**
     * Validate allergen constraints.
     */
    validateAllergens(config: AllergenRuleConfig, ingredients: Array<{
        id: string;
        name: string;
        allergens: string[];
    }>, context: RuleContext): AllergenValidationResult;
    /**
     * Validate a workflow transition.
     */
    validateTransition(rule: WorkflowTransitionRule, currentState: string, context: RuleContext): WorkflowValidationResult;
    /**
     * Register an event listener.
     */
    on(event: "ruleEvaluated" | "ruleSetEvaluated", listener: (event: RuleEvaluationEvent | RuleSetEvaluationEvent) => void): void;
    /**
     * Unregister an event listener.
     */
    off(event: "ruleEvaluated" | "ruleSetEvaluated", listener: (event: RuleEvaluationEvent | RuleSetEvaluationEvent) => void): void;
    /**
     * Generate a cache key for a rule evaluation.
     */
    private getCacheKey;
    /**
     * Aggregate rule results into a message.
     */
    private aggregateResults;
    /**
     * Clear the cache.
     */
    clearCache(): void;
    /**
     * Get cache statistics.
     */
    getCacheStats(): {
        size: number;
    };
}
/**
 * Get the global rules engine instance.
 */
export declare function getRulesEngine(): KitchenOperationsRulesEngine;
/**
 * Reset the global rules engine instance.
 */
export declare function resetRulesEngine(): void;
export { RuleSeverity, RuleOutcomeType, RuleType };
//# sourceMappingURL=rules-engine.d.ts.map