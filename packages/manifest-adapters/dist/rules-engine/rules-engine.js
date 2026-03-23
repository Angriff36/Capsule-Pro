/**
 * Kitchen Operations Rules Engine
 *
 * Core engine for evaluating configurable business rules for kitchen operations.
 * Provides dependency validation, equipment requirements, allergen constraints,
 * and workflow validation.
 */
import { RuleOutcomeType, RuleSeverity, RuleType } from "./types.js";
// Default configuration
const DEFAULT_CONFIG = {
    enabled: true,
    defaultSeverity: RuleSeverity.Warning,
    allowOverrides: true,
    enableCache: true,
    cacheTtl: 60_000, // 1 minute
    enableLogging: true,
};
// Default rule sets for kitchen operations
const DEFAULT_RULE_SETS = [
    {
        id: "kitchen-prep-tasks",
        name: "Prep Task Rules",
        description: "Rules governing prep task operations",
        domain: "prep",
        priority: 100,
        rules: new Map(),
    },
    {
        id: "kitchen-equipment",
        name: "Equipment Requirements",
        description: "Rules for equipment validation",
        domain: "kitchen",
        priority: 90,
        rules: new Map(),
    },
    {
        id: "kitchen-allergens",
        name: "Allergen Constraints",
        description: "Rules for allergen safety",
        domain: "all",
        priority: 1000, // Highest priority
        rules: new Map(),
    },
    {
        id: "kitchen-workflow",
        name: "Workflow Validation",
        description: "Rules for workflow state transitions",
        domain: "kitchen",
        priority: 95,
        rules: new Map(),
    },
];
class RulesEngineCache {
    cache = new Map();
    ttl;
    constructor(ttl = 60_000) {
        this.ttl = ttl;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        const now = Date.now();
        if (now - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.result;
    }
    set(key, result) {
        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            contextHash: key,
        });
    }
    clear() {
        this.cache.clear();
    }
    invalidate(pattern) {
        if (!pattern) {
            this.cache.clear();
            return;
        }
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}
class EventEmitter {
    listeners = new Map();
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(listener);
    }
    off(event, listener) {
        this.listeners.get(event)?.delete(listener);
    }
    emit(event, data) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            for (const listener of eventListeners) {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            }
        }
    }
}
// ---------------------------------------------------------------------------
// Rules Engine
// ---------------------------------------------------------------------------
export class KitchenOperationsRulesEngine {
    config;
    ruleSets;
    cache;
    events = new EventEmitter();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.ruleSets = new Map();
        // Initialize with default rule sets
        for (const ruleSet of DEFAULT_RULE_SETS) {
            this.ruleSets.set(ruleSet.id, ruleSet);
        }
        this.cache = new RulesEngineCache(this.config.cacheTtl);
    }
    // ---------------------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------------------
    /**
     * Update the engine configuration.
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        // Update cache TTL if changed
        if (config.cacheTtl !== undefined) {
            this.cache = new RulesEngineCache(this.config.cacheTtl);
        }
    }
    /**
     * Get the current configuration.
     */
    getConfig() {
        return { ...this.config };
    }
    // ---------------------------------------------------------------------------
    // Rule Set Management
    // ---------------------------------------------------------------------------
    /**
     * Register a new rule set.
     */
    registerRuleSet(ruleSet) {
        this.ruleSets.set(ruleSet.id, ruleSet);
        this.cache.invalidate(ruleSet.id);
    }
    /**
     * Get a rule set by ID.
     */
    getRuleSet(id) {
        return this.ruleSets.get(id);
    }
    /**
     * Get all rule sets.
     */
    getAllRuleSets() {
        return Array.from(this.ruleSets.values());
    }
    /**
     * Get rule sets for a specific domain.
     */
    getRuleSetsForDomain(domain) {
        return this.getAllRuleSets().filter((rs) => rs.domain === domain || rs.domain === "all");
    }
    /**
     * Add a rule to a rule set.
     */
    addRule(ruleSetId, rule) {
        const ruleSet = this.ruleSets.get(ruleSetId);
        if (!ruleSet) {
            throw new Error(`Rule set not found: ${ruleSetId}`);
        }
        ruleSet.rules.set(rule.id, rule);
        this.cache.invalidate(ruleSetId);
    }
    /**
     * Remove a rule from a rule set.
     */
    removeRule(ruleSetId, ruleId) {
        const ruleSet = this.ruleSets.get(ruleSetId);
        if (!ruleSet) {
            return;
        }
        ruleSet.rules.delete(ruleId);
        this.cache.invalidate(ruleSetId);
    }
    /**
     * Enable or disable a rule.
     */
    setRuleEnabled(ruleSetId, ruleId, enabled) {
        const ruleSet = this.ruleSets.get(ruleSetId);
        if (!ruleSet) {
            return;
        }
        const rule = ruleSet.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
            this.cache.invalidate(ruleSetId);
        }
    }
    // ---------------------------------------------------------------------------
    // Rule Evaluation
    // ---------------------------------------------------------------------------
    /**
     * Evaluate a single rule.
     */
    evaluateRule(rule, context) {
        if (!(this.config.enabled && rule.enabled)) {
            return {
                ruleId: rule.id,
                ruleName: rule.name,
                passed: true,
                outcome: RuleOutcomeType.Allowed,
                severity: RuleSeverity.Info,
                message: "Rule or engine is disabled",
                overridable: false,
            };
        }
        // Check cache
        const cacheKey = this.getCacheKey(rule.id, context);
        if (this.config.enableCache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        // Evaluate the rule
        const result = rule.validate(context);
        // Cache the result
        if (this.config.enableCache) {
            this.cache.set(cacheKey, result);
        }
        // Emit event
        if (this.config.enableLogging) {
            this.events.emit("ruleEvaluated", {
                timestamp: Date.now(),
                ruleId: rule.id,
                ruleName: rule.name,
                entityType: context.entity.type,
                entityId: context.entity.id,
                operation: context.operation.type,
                result,
                tenantId: context.tenantId,
            });
        }
        return result;
    }
    /**
     * Evaluate a rule set.
     */
    evaluateRuleSet(ruleSetId, context) {
        const ruleSet = this.ruleSets.get(ruleSetId);
        if (!ruleSet) {
            return {
                allowed: true,
                hasWarnings: false,
                hasErrors: false,
                results: [],
                message: `Rule set not found: ${ruleSetId}`,
            };
        }
        const results = [];
        let hasWarnings = false;
        let hasErrors = false;
        let allowed = true;
        // Sort rules by priority (if we had priority on rules)
        const rules = Array.from(ruleSet.rules.values());
        for (const rule of rules) {
            const result = this.evaluateRule(rule, context);
            results.push(result);
            if (!result.passed) {
                if (result.severity === RuleSeverity.Error ||
                    result.severity === RuleSeverity.Critical) {
                    hasErrors = true;
                    if (!(result.overridable && this.config.allowOverrides)) {
                        allowed = false;
                    }
                }
                else if (result.severity === RuleSeverity.Warning) {
                    hasWarnings = true;
                }
            }
        }
        const evalResult = {
            allowed,
            hasWarnings,
            hasErrors,
            results,
            message: this.aggregateResults(results),
        };
        // Emit event
        if (this.config.enableLogging) {
            this.events.emit("ruleSetEvaluated", {
                timestamp: Date.now(),
                ruleSetId: ruleSet.id,
                ruleSetName: ruleSet.name,
                entityType: context.entity.type,
                entityId: context.entity.id,
                operation: context.operation.type,
                result: evalResult,
                tenantId: context.tenantId,
            });
        }
        return evalResult;
    }
    /**
     * Evaluate all applicable rule sets for a context.
     */
    evaluateAll(context, domain) {
        let applicableRuleSets;
        if (domain) {
            applicableRuleSets = this.getRuleSetsForDomain(domain);
        }
        else {
            applicableRuleSets = this.getAllRuleSets();
        }
        // Sort by priority (higher priority first)
        applicableRuleSets.sort((a, b) => b.priority - a.priority);
        const allResults = [];
        let hasWarnings = false;
        let hasErrors = false;
        let allowed = true;
        for (const ruleSet of applicableRuleSets) {
            const result = this.evaluateRuleSet(ruleSet.id, context);
            allResults.push(...result.results);
            if (result.hasWarnings)
                hasWarnings = true;
            if (result.hasErrors)
                hasErrors = true;
            if (!result.allowed)
                allowed = false;
        }
        return {
            allowed,
            hasWarnings,
            hasErrors,
            results: allResults,
            message: this.aggregateResults(allResults),
        };
    }
    // ---------------------------------------------------------------------------
    // Dependency Validation
    // ---------------------------------------------------------------------------
    /**
     * Validate dependencies for an entity.
     */
    validateDependencies(config, context) {
        const { relationshipProperty, mode, required } = config;
        // Get the related entity from context
        const relatedId = context.entity.state[relationshipProperty];
        if (!relatedId) {
            return {
                satisfied: !required,
                failureReason: required
                    ? `Required relationship '${relationshipProperty}' is missing`
                    : undefined,
            };
        }
        // Check if we have related data in context
        const relatedData = context.related?.data.find((d) => d.id === relatedId);
        if (!relatedData) {
            return {
                satisfied: !required,
                targetId: relatedId,
                failureReason: required ? "Related entity not found" : undefined,
            };
        }
        // Validate based on mode
        switch (mode) {
            case "exists":
                return {
                    satisfied: true,
                    targetId: relatedId,
                    targetState: relatedData.status,
                };
            case "completed": {
                const isCompleted = relatedData.status === "done" || relatedData.status === "completed";
                return {
                    satisfied: !required || isCompleted,
                    targetId: relatedId,
                    targetState: relatedData.status,
                    failureReason: isCompleted
                        ? undefined
                        : "Dependency is not completed",
                };
            }
            case "valid": {
                const isValid = relatedData.status !== "canceled" && relatedData.status !== "deleted";
                return {
                    satisfied: !required || isValid,
                    targetId: relatedId,
                    targetState: relatedData.status,
                    failureReason: isValid ? undefined : "Dependency is not valid",
                };
            }
            default:
                return { satisfied: true, targetId: relatedId };
        }
    }
    // ---------------------------------------------------------------------------
    // Equipment Validation
    // ---------------------------------------------------------------------------
    /**
     * Validate equipment requirements.
     */
    validateEquipment(requirements, availableEquipment, context) {
        const availableMap = new Map(availableEquipment.map((e) => [e.id || e.name, e]));
        const missingRequired = [];
        const insufficient = [];
        const alternatives = [];
        for (const req of requirements) {
            const available = availableMap.get(req.equipmentId);
            if (!available) {
                // Check for alternatives
                const hasAlternative = req.alternatives.some((alt) => availableMap.has(alt));
                if (req.required && !hasAlternative) {
                    missingRequired.push(req.equipmentId);
                }
                if (req.alternatives.length > 0) {
                    alternatives.push({
                        equipment: req.equipmentId,
                        alternatives: req.alternatives.filter((alt) => availableMap.has(alt)),
                    });
                }
            }
            else if (available.quantity < req.quantity) {
                insufficient.push({
                    equipment: req.equipmentId,
                    needed: req.quantity,
                    available: available.quantity,
                });
            }
        }
        return {
            satisfied: missingRequired.length === 0,
            missingRequired,
            insufficient,
            alternatives,
        };
    }
    // ---------------------------------------------------------------------------
    // Allergen Validation
    // ---------------------------------------------------------------------------
    /**
     * Validate allergen constraints.
     */
    validateAllergens(config, ingredients, context) {
        const detectedAllergens = new Set();
        const sources = [];
        for (const ingredient of ingredients) {
            for (const allergen of ingredient.allergens) {
                if (config.allergens.includes(allergen)) {
                    detectedAllergens.add(allergen);
                    sources.push({
                        ingredient: ingredient.name,
                        allergens: ingredient.allergens.filter((a) => config.allergens.includes(a)),
                    });
                }
            }
        }
        const detected = Array.from(detectedAllergens);
        return {
            satisfied: detected.length === 0 || config.severity !== RuleSeverity.Critical,
            detectedAllergens: detected,
            sources,
            requiredActions: detected.length > 0 ? config.requiredActions : [],
            acknowledged: false,
        };
    }
    // ---------------------------------------------------------------------------
    // Workflow Validation
    // ---------------------------------------------------------------------------
    /**
     * Validate a workflow transition.
     */
    validateTransition(rule, currentState, context) {
        // Check if transition is allowed from current state
        const fromStates = Array.isArray(rule.from) ? rule.from : [rule.from];
        const canTransition = fromStates.includes(currentState) || fromStates.includes("*");
        if (!canTransition) {
            return {
                allowed: false,
                currentState,
                targetState: rule.to,
                failedConditions: [
                    `Cannot transition from '${currentState}' to '${rule.to}'`,
                ],
                failedGuards: [],
            };
        }
        // Check conditions (would need expression evaluator for full implementation)
        const failedConditions = [];
        const failedGuards = [];
        // For now, assume conditions/guards pass if they're not defined
        // In a full implementation, this would evaluate the expressions against context
        return {
            allowed: failedConditions.length === 0 && failedGuards.length === 0,
            currentState,
            targetState: rule.to,
            failedConditions,
            failedGuards,
        };
    }
    // ---------------------------------------------------------------------------
    // Event Management
    // ---------------------------------------------------------------------------
    /**
     * Register an event listener.
     */
    on(event, listener) {
        this.events.on(event, listener);
    }
    /**
     * Unregister an event listener.
     */
    off(event, listener) {
        this.events.off(event, listener);
    }
    // ---------------------------------------------------------------------------
    // Utility Methods
    // ---------------------------------------------------------------------------
    /**
     * Generate a cache key for a rule evaluation.
     */
    getCacheKey(ruleId, context) {
        const parts = [
            ruleId,
            context.entity.type,
            context.entity.id,
            context.operation.type,
            JSON.stringify(context.entity.state),
        ];
        return parts.join(":");
    }
    /**
     * Aggregate rule results into a message.
     */
    aggregateResults(results) {
        if (results.length === 0) {
            return "No rules evaluated";
        }
        const failed = results.filter((r) => !r.passed);
        if (failed.length === 0) {
            return "All rules passed";
        }
        const blocked = failed.filter((r) => r.severity === RuleSeverity.Error ||
            r.severity === RuleSeverity.Critical);
        if (blocked.length > 0) {
            return `${blocked.length} rule(s) blocking operation`;
        }
        return `${failed.length} rule(s) generated warnings`;
    }
    /**
     * Clear the cache.
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache statistics.
     */
    getCacheStats() {
        return { size: this.cache.cache?.size || 0 };
    }
}
// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------
let globalInstance;
/**
 * Get the global rules engine instance.
 */
export function getRulesEngine() {
    if (!globalInstance) {
        globalInstance = new KitchenOperationsRulesEngine();
    }
    return globalInstance;
}
/**
 * Reset the global rules engine instance.
 */
export function resetRulesEngine() {
    globalInstance = undefined;
}
// Re-export enums for convenience
export { RuleSeverity, RuleOutcomeType, RuleType };
