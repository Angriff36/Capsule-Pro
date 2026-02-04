import type { IR, IRCommand, IREntity, IRExpression, IRPolicy } from "./ir";
export interface RuntimeContext {
    user?: {
        id: string;
        role?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
export interface RuntimeOptions {
    generateId?: () => string;
    now?: () => number;
}
export interface EntityInstance {
    id: string;
    [key: string]: unknown;
}
export interface CommandResult {
    success: boolean;
    result?: unknown;
    error?: string;
    deniedBy?: string;
    guardFailure?: GuardFailure;
    emittedEvents: EmittedEvent[];
}
export interface GuardFailure {
    index: number;
    expression: IRExpression;
    formatted: string;
    resolved?: GuardResolvedValue[];
}
export interface GuardResolvedValue {
    expression: string;
    value: unknown;
}
export interface EmittedEvent {
    name: string;
    channel: string;
    payload: unknown;
    timestamp: number;
}
export interface Store<T extends EntityInstance = EntityInstance> {
    getAll(): T[];
    getById(id: string): T | undefined;
    create(data: Partial<T>): T;
    update(id: string, data: Partial<T>): T | undefined;
    delete(id: string): boolean;
    clear(): void;
}
type EventListener = (event: EmittedEvent) => void;
export declare class RuntimeEngine {
    private readonly ir;
    private context;
    private readonly options;
    private readonly stores;
    private readonly eventListeners;
    private eventLog;
    constructor(ir: IR, context?: RuntimeContext, options?: RuntimeOptions);
    private initializeStores;
    private getNow;
    getIR(): IR;
    getContext(): RuntimeContext;
    setContext(ctx: Partial<RuntimeContext>): void;
    replaceContext(ctx: RuntimeContext): void;
    getEntities(): IREntity[];
    getEntity(name: string): IREntity | undefined;
    getCommands(): IRCommand[];
    getCommand(name: string, entityName?: string): IRCommand | undefined;
    getPolicies(): IRPolicy[];
    getStore(entityName: string): Store | undefined;
    getAllInstances(entityName: string): EntityInstance[];
    getInstance(entityName: string, id: string): EntityInstance | undefined;
    createInstance(entityName: string, data: Partial<EntityInstance>): EntityInstance | undefined;
    updateInstance(entityName: string, id: string, data: Partial<EntityInstance>): EntityInstance | undefined;
    deleteInstance(entityName: string, id: string): boolean;
    runCommand(commandName: string, input: Record<string, unknown>, options?: {
        entityName?: string;
        instanceId?: string;
    }): Promise<CommandResult>;
    private buildEvalContext;
    private checkPolicies;
    private formatExpression;
    private formatValue;
    private resolveExpressionValues;
    private executeAction;
    evaluateExpression(expr: IRExpression, context: Record<string, unknown>): unknown;
    private evaluateBinaryOp;
    private evaluateUnaryOp;
    private irValueToJs;
    private getDefaultForType;
    evaluateComputed(entityName: string, instanceId: string, propertyName: string): unknown;
    private evaluateComputedInternal;
    onEvent(listener: EventListener): () => void;
    private notifyListeners;
    getEventLog(): EmittedEvent[];
    clearEventLog(): void;
    serialize(): {
        ir: IR;
        context: RuntimeContext;
        stores: Record<string, EntityInstance[]>;
    };
    restore(data: {
        stores: Record<string, EntityInstance[]>;
    }): void;
}
export {};
//# sourceMappingURL=runtime-engine.d.ts.map