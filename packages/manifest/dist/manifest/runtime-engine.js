class MemoryStore {
    items = new Map();
    generateId;
    constructor(generateId) {
        this.generateId = generateId || (() => crypto.randomUUID());
    }
    getAll() {
        return Array.from(this.items.values());
    }
    getById(id) {
        return this.items.get(id);
    }
    create(data) {
        const id = data.id || this.generateId();
        const item = { ...data, id };
        this.items.set(id, item);
        return item;
    }
    update(id, data) {
        const existing = this.items.get(id);
        if (!existing) {
            return undefined;
        }
        const updated = { ...existing, ...data, id };
        this.items.set(id, updated);
        return updated;
    }
    delete(id) {
        return this.items.delete(id);
    }
    clear() {
        this.items.clear();
    }
}
class LocalStorageStore {
    key;
    constructor(key) {
        this.key = key;
    }
    load() {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : [];
        }
        catch {
            return [];
        }
    }
    save(items) {
        localStorage.setItem(this.key, JSON.stringify(items));
    }
    getAll() {
        return this.load();
    }
    getById(id) {
        return this.load().find((item) => item.id === id);
    }
    create(data) {
        const items = this.load();
        const id = data.id || crypto.randomUUID();
        const item = { ...data, id };
        items.push(item);
        this.save(items);
        return item;
    }
    update(id, data) {
        const items = this.load();
        const idx = items.findIndex((item) => item.id === id);
        if (idx === -1) {
            return undefined;
        }
        const updated = { ...items[idx], ...data, id };
        items[idx] = updated;
        this.save(items);
        return updated;
    }
    delete(id) {
        const items = this.load();
        const idx = items.findIndex((item) => item.id === id);
        if (idx === -1) {
            return false;
        }
        items.splice(idx, 1);
        this.save(items);
        return true;
    }
    clear() {
        localStorage.removeItem(this.key);
    }
}
export class RuntimeEngine {
    ir;
    context;
    options;
    stores = new Map();
    eventListeners = [];
    eventLog = [];
    constructor(ir, context = {}, options = {}) {
        this.ir = ir;
        this.context = context;
        this.options = options;
        this.initializeStores();
    }
    initializeStores() {
        for (const entity of this.ir.entities) {
            const storeConfig = this.ir.stores.find((s) => s.entity === entity.name);
            let store;
            if (storeConfig) {
                switch (storeConfig.target) {
                    case "localStorage": {
                        const key = storeConfig.config.key?.kind === "string"
                            ? storeConfig.config.key.value
                            : `${entity.name.toLowerCase()}s`;
                        store = new LocalStorageStore(key);
                        break;
                    }
                    default:
                        store = new MemoryStore(this.options.generateId);
                }
            }
            else {
                store = new MemoryStore(this.options.generateId);
            }
            this.stores.set(entity.name, store);
        }
    }
    getNow() {
        return this.options.now ? this.options.now() : Date.now();
    }
    getIR() {
        return this.ir;
    }
    getContext() {
        return this.context;
    }
    setContext(ctx) {
        this.context = { ...this.context, ...ctx };
    }
    replaceContext(ctx) {
        this.context = { ...ctx };
    }
    getEntities() {
        return this.ir.entities;
    }
    getEntity(name) {
        return this.ir.entities.find((e) => e.name === name);
    }
    getCommands() {
        return this.ir.commands;
    }
    getCommand(name, entityName) {
        if (entityName) {
            const entity = this.getEntity(entityName);
            if (!entity?.commands.includes(name)) {
                return undefined;
            }
            return this.ir.commands.find((c) => c.name === name && c.entity === entityName);
        }
        return this.ir.commands.find((c) => c.name === name);
    }
    getPolicies() {
        return this.ir.policies;
    }
    getStore(entityName) {
        return this.stores.get(entityName);
    }
    getAllInstances(entityName) {
        const store = this.stores.get(entityName);
        return store ? store.getAll() : [];
    }
    getInstance(entityName, id) {
        const store = this.stores.get(entityName);
        return store?.getById(id);
    }
    createInstance(entityName, data) {
        const entity = this.getEntity(entityName);
        if (!entity) {
            return undefined;
        }
        const defaults = {};
        for (const prop of entity.properties) {
            if (prop.defaultValue) {
                defaults[prop.name] = this.irValueToJs(prop.defaultValue);
            }
            else {
                defaults[prop.name] = this.getDefaultForType(prop.type);
            }
        }
        const store = this.stores.get(entityName);
        if (!store) {
            return undefined;
        }
        return store.create({ ...defaults, ...data });
    }
    updateInstance(entityName, id, data) {
        const store = this.stores.get(entityName);
        return store?.update(id, data);
    }
    deleteInstance(entityName, id) {
        const store = this.stores.get(entityName);
        return store?.delete(id) ?? false;
    }
    async runCommand(commandName, input, options = {}) {
        const command = this.getCommand(commandName, options.entityName);
        if (!command) {
            return {
                success: false,
                error: `Command '${commandName}' not found`,
                emittedEvents: [],
            };
        }
        const instance = options.instanceId && options.entityName
            ? this.getInstance(options.entityName, options.instanceId)
            : undefined;
        const evalContext = this.buildEvalContext(input, instance);
        const policyResult = this.checkPolicies(command, evalContext);
        if (!policyResult.allowed) {
            return {
                success: false,
                error: policyResult.message,
                deniedBy: policyResult.policyName,
                emittedEvents: [],
            };
        }
        for (let i = 0; i < command.guards.length; i += 1) {
            const guard = command.guards[i];
            const result = this.evaluateExpression(guard, evalContext);
            if (!result) {
                return {
                    success: false,
                    error: `Guard condition failed for command '${commandName}'`,
                    guardFailure: {
                        index: i + 1,
                        expression: guard,
                        formatted: this.formatExpression(guard),
                        resolved: this.resolveExpressionValues(guard, evalContext),
                    },
                    emittedEvents: [],
                };
            }
        }
        const emittedEvents = [];
        let result;
        for (const action of command.actions) {
            const actionResult = this.executeAction(action, evalContext, options);
            if (action.kind === "mutate" &&
                options.instanceId &&
                options.entityName) {
                const currentInstance = this.getInstance(options.entityName, options.instanceId);
                evalContext.self = currentInstance;
                evalContext.this = currentInstance;
            }
            result = actionResult;
        }
        for (const eventName of command.emits) {
            const event = this.ir.events.find((e) => e.name === eventName);
            const emitted = {
                name: eventName,
                channel: event?.channel || eventName,
                payload: { ...input, result },
                timestamp: this.getNow(),
            };
            emittedEvents.push(emitted);
            this.eventLog.push(emitted);
            this.notifyListeners(emitted);
        }
        return {
            success: true,
            result,
            emittedEvents,
        };
    }
    buildEvalContext(input, instance) {
        return {
            ...(instance || {}),
            ...input,
            self: instance ?? null,
            this: instance ?? null,
            user: this.context.user ?? null,
            context: this.context ?? {},
        };
    }
    checkPolicies(command, evalContext) {
        const relevantPolicies = this.ir.policies.filter((p) => {
            if (p.entity && command.entity && p.entity !== command.entity) {
                return false;
            }
            if (p.action !== "all" && p.action !== "execute") {
                return false;
            }
            return true;
        });
        for (const policy of relevantPolicies) {
            const result = this.evaluateExpression(policy.expression, evalContext);
            if (!result) {
                return {
                    allowed: false,
                    policyName: policy.name,
                    message: policy.message || `Denied by policy '${policy.name}'`,
                };
            }
        }
        return { allowed: true };
    }
    formatExpression(expr) {
        switch (expr.kind) {
            case "literal":
                return this.formatValue(expr.value);
            case "identifier":
                return expr.name;
            case "member":
                return `${this.formatExpression(expr.object)}.${expr.property}`;
            case "binary":
                return `${this.formatExpression(expr.left)} ${expr.operator} ${this.formatExpression(expr.right)}`;
            case "unary":
                return expr.operator === "not"
                    ? `not ${this.formatExpression(expr.operand)}`
                    : `${expr.operator}${this.formatExpression(expr.operand)}`;
            case "call":
                return `${this.formatExpression(expr.callee)}(${expr.args.map((arg) => this.formatExpression(arg)).join(", ")})`;
            case "conditional":
                return `${this.formatExpression(expr.condition)} ? ${this.formatExpression(expr.consequent)} : ${this.formatExpression(expr.alternate)}`;
            case "array":
                return `[${expr.elements.map((el) => this.formatExpression(el)).join(", ")}]`;
            case "object":
                return `{ ${expr.properties.map((p) => `${p.key}: ${this.formatExpression(p.value)}`).join(", ")} }`;
            case "lambda":
                return `(${expr.params.join(", ")}) => ${this.formatExpression(expr.body)}`;
            default:
                return "<expr>";
        }
    }
    formatValue(value) {
        switch (value.kind) {
            case "string":
                return JSON.stringify(value.value);
            case "number":
                return String(value.value);
            case "boolean":
                return String(value.value);
            case "null":
                return "null";
            case "array":
                return `[${value.elements.map((el) => this.formatValue(el)).join(", ")}]`;
            case "object":
                return `{ ${Object.entries(value.properties)
                    .map(([k, v]) => `${k}: ${this.formatValue(v)}`)
                    .join(", ")} }`;
            default:
                return "null";
        }
    }
    resolveExpressionValues(expr, evalContext) {
        const entries = [];
        const seen = new Set();
        const addEntry = (node) => {
            const formatted = this.formatExpression(node);
            if (seen.has(formatted)) {
                return;
            }
            seen.add(formatted);
            let value;
            try {
                value = this.evaluateExpression(node, evalContext);
            }
            catch {
                value = undefined;
            }
            entries.push({ expression: formatted, value });
        };
        const walk = (node) => {
            switch (node.kind) {
                case "literal":
                case "identifier":
                case "member":
                    addEntry(node);
                    return;
                case "binary":
                    walk(node.left);
                    walk(node.right);
                    return;
                case "unary":
                    walk(node.operand);
                    return;
                case "call":
                    node.args.forEach(walk);
                    return;
                case "conditional":
                    walk(node.condition);
                    walk(node.consequent);
                    walk(node.alternate);
                    return;
                case "array":
                    node.elements.forEach(walk);
                    return;
                case "object":
                    node.properties.forEach((p) => walk(p.value));
                    return;
                case "lambda":
                    walk(node.body);
                    return;
                default:
                    return;
            }
        };
        walk(expr);
        return entries;
    }
    executeAction(action, evalContext, options) {
        const value = this.evaluateExpression(action.expression, evalContext);
        switch (action.kind) {
            case "mutate":
                if (action.target && options.instanceId && options.entityName) {
                    this.updateInstance(options.entityName, options.instanceId, {
                        [action.target]: value,
                    });
                }
                return value;
            case "emit":
            case "publish": {
                const event = {
                    name: "action_event",
                    channel: "default",
                    payload: value,
                    timestamp: this.getNow(),
                };
                this.eventLog.push(event);
                this.notifyListeners(event);
                return value;
            }
            case "persist":
                return value;
            default:
                return value;
        }
    }
    evaluateExpression(expr, context) {
        switch (expr.kind) {
            case "literal":
                return this.irValueToJs(expr.value);
            case "identifier": {
                const name = expr.name;
                if (name in context) {
                    return context[name];
                }
                if (name === "true") {
                    return true;
                }
                if (name === "false") {
                    return false;
                }
                if (name === "null") {
                    return null;
                }
                return undefined;
            }
            case "member": {
                const obj = this.evaluateExpression(expr.object, context);
                if (obj && typeof obj === "object") {
                    return obj[expr.property];
                }
                return undefined;
            }
            case "binary": {
                const left = this.evaluateExpression(expr.left, context);
                const right = this.evaluateExpression(expr.right, context);
                return this.evaluateBinaryOp(expr.operator, left, right);
            }
            case "unary": {
                const operand = this.evaluateExpression(expr.operand, context);
                return this.evaluateUnaryOp(expr.operator, operand);
            }
            case "call": {
                const callee = this.evaluateExpression(expr.callee, context);
                const args = expr.args.map((a) => this.evaluateExpression(a, context));
                if (typeof callee === "function") {
                    return callee(...args);
                }
                return undefined;
            }
            case "conditional": {
                const condition = this.evaluateExpression(expr.condition, context);
                return condition
                    ? this.evaluateExpression(expr.consequent, context)
                    : this.evaluateExpression(expr.alternate, context);
            }
            case "array":
                return expr.elements.map((e) => this.evaluateExpression(e, context));
            case "object": {
                const result = {};
                for (const prop of expr.properties) {
                    result[prop.key] = this.evaluateExpression(prop.value, context);
                }
                return result;
            }
            case "lambda": {
                return (...args) => {
                    const localContext = { ...context };
                    expr.params.forEach((p, i) => {
                        localContext[p] = args[i];
                    });
                    return this.evaluateExpression(expr.body, localContext);
                };
            }
            default:
                return undefined;
        }
    }
    evaluateBinaryOp(op, left, right) {
        switch (op) {
            case "+":
                if (typeof left === "string" || typeof right === "string") {
                    return String(left) + String(right);
                }
                return left + right;
            case "-":
                return left - right;
            case "*":
                return left * right;
            case "/":
                return left / right;
            case "%":
                return left % right;
            case "==":
            case "is":
                return left === right; // Loose equality: undefined == null is true
            case "!=":
                return left !== right; // Loose inequality: undefined != null is false
            case "<":
                return left < right;
            case ">":
                return left > right;
            case "<=":
                return left <= right;
            case ">=":
                return left >= right;
            case "&&":
            case "and":
                return Boolean(left) && Boolean(right);
            case "||":
            case "or":
                return Boolean(left) || Boolean(right);
            case "in":
                if (Array.isArray(right)) {
                    return right.includes(left);
                }
                if (typeof right === "string") {
                    return right.includes(String(left));
                }
                return false;
            case "contains":
                if (Array.isArray(left)) {
                    return left.includes(right);
                }
                if (typeof left === "string") {
                    return left.includes(String(right));
                }
                return false;
            default:
                return undefined;
        }
    }
    evaluateUnaryOp(op, operand) {
        switch (op) {
            case "!":
            case "not":
                return !operand;
            case "-":
                return -operand;
            default:
                return operand;
        }
    }
    irValueToJs(value) {
        switch (value.kind) {
            case "string":
                return value.value;
            case "number":
                return value.value;
            case "boolean":
                return value.value;
            case "null":
                return null;
            case "array":
                return value.elements.map((e) => this.irValueToJs(e));
            case "object": {
                const result = {};
                for (const [k, v] of Object.entries(value.properties)) {
                    result[k] = this.irValueToJs(v);
                }
                return result;
            }
        }
    }
    getDefaultForType(type) {
        if (type.nullable) {
            return null;
        }
        switch (type.name) {
            case "string":
                return "";
            case "number":
                return 0;
            case "boolean":
                return false;
            case "list":
                return [];
            case "map":
                return {};
            default:
                return null;
        }
    }
    evaluateComputed(entityName, instanceId, propertyName) {
        const entity = this.getEntity(entityName);
        if (!entity) {
            return undefined;
        }
        const computed = entity.computedProperties.find((c) => c.name === propertyName);
        if (!computed) {
            return undefined;
        }
        const instance = this.getInstance(entityName, instanceId);
        if (!instance) {
            return undefined;
        }
        return this.evaluateComputedInternal(entity, instance, propertyName, new Set());
    }
    evaluateComputedInternal(entity, instance, propertyName, visited) {
        if (visited.has(propertyName)) {
            return undefined;
        }
        visited.add(propertyName);
        const computed = entity.computedProperties.find((c) => c.name === propertyName);
        if (!computed) {
            return undefined;
        }
        const computedValues = {};
        if (computed.dependencies) {
            for (const dep of computed.dependencies) {
                const depComputed = entity.computedProperties.find((c) => c.name === dep);
                if (depComputed && !visited.has(dep)) {
                    computedValues[dep] = this.evaluateComputedInternal(entity, instance, dep, new Set(visited));
                }
            }
        }
        const context = {
            self: instance,
            this: instance,
            ...instance,
            ...computedValues,
            user: this.context.user ?? null,
            context: this.context ?? {},
        };
        return this.evaluateExpression(computed.expression, context);
    }
    onEvent(listener) {
        this.eventListeners.push(listener);
        return () => {
            const idx = this.eventListeners.indexOf(listener);
            if (idx !== -1) {
                this.eventListeners.splice(idx, 1);
            }
        };
    }
    notifyListeners(event) {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch { }
        }
    }
    getEventLog() {
        return [...this.eventLog];
    }
    clearEventLog() {
        this.eventLog = [];
    }
    serialize() {
        const storeData = {};
        for (const [name, store] of this.stores) {
            storeData[name] = store.getAll();
        }
        return {
            ir: this.ir,
            context: this.context,
            stores: storeData,
        };
    }
    restore(data) {
        for (const [name, instances] of Object.entries(data.stores)) {
            const store = this.stores.get(name);
            if (store) {
                store.clear();
                for (const instance of instances) {
                    store.create(instance);
                }
            }
        }
    }
}
