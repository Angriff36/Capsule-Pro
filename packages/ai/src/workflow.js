import { v4 as uuidv4 } from "uuid";
import { ERROR_CODES, SDKError } from "./errors.js";
import { AgentEventEmitter } from "./events.js";
export class AgentWorkflow {
  id;
  name;
  steps;
  parallelExecution;
  timeout;
  eventEmitter;
  context;
  stepExecutionOrder = [];
  executionStartTime;
  constructor(config) {
    this.id = uuidv4();
    this.name = config.name;
    this.steps = config.steps;
    this.parallelExecution = config.parallelExecution ?? false;
    this.timeout = config.timeout ?? 300_000;
    this.eventEmitter = new AgentEventEmitter();
    this.context = {
      workflowId: this.id,
      stepResults: new Map(),
      sharedState: {},
      startTime: new Date(),
    };
    this.validateAndOrderSteps();
  }
  validateAndOrderSteps() {
    const stepIds = new Set(this.steps.map((s) => s.id));
    const visited = new Set();
    const tempVisited = new Set();
    const topologicalSort = (stepId) => {
      if (tempVisited.has(stepId)) {
        throw new SDKError(`Circular dependency detected: ${stepId}`, {
          code: ERROR_CODES.WORKFLOW_ERROR,
          retryable: false,
        });
      }
      if (visited.has(stepId)) {
        return;
      }
      tempVisited.add(stepId);
      const step = this.steps.find((s) => s.id === stepId);
      if (step) {
        for (const depId of step.dependsOn) {
          if (!stepIds.has(depId)) {
            throw new SDKError(
              `Invalid dependency: ${depId} for step ${stepId}`,
              {
                code: ERROR_CODES.WORKFLOW_ERROR,
                retryable: false,
              }
            );
          }
          topologicalSort(depId);
        }
      }
      tempVisited.delete(stepId);
      visited.add(stepId);
      this.stepExecutionOrder.push(stepId);
    };
    for (const step of this.steps) {
      if (!visited.has(step.id)) {
        topologicalSort(step.id);
      }
    }
  }
  setSharedState(state) {
    this.context.sharedState = { ...state };
  }
  getSharedState() {
    return { ...this.context.sharedState };
  }
  async execute(context) {
    if (context) {
      this.context.sharedState = { ...this.context.sharedState, ...context };
    }
    this.executionStartTime = new Date();
    const startTime = Date.now();
    try {
      this.emitWorkflowStarted();
      if (this.parallelExecution) {
        await this.executeParallel();
      } else {
        await this.executeSequential();
      }
      const duration = Date.now() - startTime;
      this.emitWorkflowCompleted(duration);
      return {
        workflowId: this.id,
        success: true,
        stepResults: this.context.stepResults,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError =
        error instanceof SDKError
          ? error
          : new SDKError(String(error), {
              code: ERROR_CODES.WORKFLOW_ERROR,
              retryable: true,
            });
      this.emitWorkflowError(sdkError, duration);
      return {
        workflowId: this.id,
        success: false,
        stepResults: this.context.stepResults,
        duration,
        error: sdkError,
      };
    }
  }
  async executeSequential() {
    for (const stepId of this.stepExecutionOrder) {
      const step = this.steps.find((s) => s.id === stepId);
      if (!step) continue;
      if (step.condition && !step.condition(this.context)) {
        continue;
      }
      await this.executeStep(step);
    }
  }
  async executeParallel() {
    const levels = this.identifyExecutionLevels();
    for (const level of levels) {
      const promises = level.map(async (stepId) => {
        const step = this.steps.find((s) => s.id === stepId);
        if (!step) return;
        if (step.condition && !step.condition(this.context)) {
          return;
        }
        await this.executeStep(step);
      });
      await Promise.all(promises);
    }
  }
  identifyExecutionLevels() {
    const levels = [];
    const remainingSteps = new Set(this.steps.map((s) => s.id));
    while (remainingSteps.size > 0) {
      const currentLevel = [];
      for (const stepId of remainingSteps) {
        const step = this.steps.find((s) => s.id === stepId);
        if (!step) continue;
        const allDepsExecuted = step.dependsOn.every(
          (depId) => !remainingSteps.has(depId)
        );
        if (allDepsExecuted) {
          currentLevel.push(stepId);
        }
      }
      if (currentLevel.length === 0) {
        throw new SDKError(
          "Cannot determine execution order - possible circular dependency",
          {
            code: ERROR_CODES.WORKFLOW_ERROR,
            retryable: false,
          }
        );
      }
      levels.push(currentLevel);
      currentLevel.forEach((id) => remainingSteps.delete(id));
    }
    return levels;
  }
  async executeStep(step) {
    const stepStartTime = Date.now();
    this.emitStepStarted(step);
    try {
      const input = this.prepareStepInput(step);
      const result = await step.agent.execute({
        prompt: input,
      });
      this.context.stepResults.set(step.id, result);
      if (step.outputMapping) {
        for (const [outputKey, contextKey] of Object.entries(
          step.outputMapping
        )) {
          this.context.sharedState[contextKey] = result[outputKey];
        }
      }
      const duration = Date.now() - stepStartTime;
      this.emitStepCompleted(step, duration);
    } catch (error) {
      const duration = Date.now() - stepStartTime;
      const sdkError =
        error instanceof SDKError
          ? error
          : new SDKError(String(error), {
              code: ERROR_CODES.AGENT_EXECUTION_FAILED,
              retryable: false,
            });
      this.emitStepError(step, sdkError, duration);
      throw sdkError;
    }
  }
  prepareStepInput(step) {
    if (!step.inputMapping) {
      return "";
    }
    const parts = [];
    for (const [inputKey, contextKey] of Object.entries(step.inputMapping)) {
      const value =
        this.context.sharedState[contextKey] ??
        this.context.stepResults.get(contextKey);
      if (value !== undefined) {
        parts.push(`${inputKey}: ${JSON.stringify(value)}`);
      }
    }
    return parts.join("\n");
  }
  emitWorkflowStarted() {
    const event = {
      type: "started",
      agentId: this.id,
      timestamp: new Date(),
      data: { workflowName: this.name, stepCount: this.steps.length },
    };
    this.eventEmitter.emit("started", event);
  }
  emitWorkflowCompleted(duration) {
    const event = {
      type: "completed",
      agentId: this.id,
      timestamp: new Date(),
      data: { workflowName: this.name, duration, stepCount: this.steps.length },
    };
    this.eventEmitter.emit("completed", event);
  }
  emitWorkflowError(error, duration) {
    const event = {
      type: "error",
      agentId: this.id,
      timestamp: new Date(),
      data: { workflowName: this.name, duration },
      error,
    };
    this.eventEmitter.emit("error", event);
  }
  emitStepStarted(step) {
    const event = {
      type: "started",
      agentId: step.agent.id,
      timestamp: new Date(),
      data: { stepId: step.id, stepName: step.agent.name },
    };
    this.eventEmitter.emit("started", event);
  }
  emitStepCompleted(step, duration) {
    const event = {
      type: "completed",
      agentId: step.agent.id,
      timestamp: new Date(),
      data: { stepId: step.id, stepName: step.agent.name, duration },
    };
    this.eventEmitter.emit("completed", event);
  }
  emitStepError(step, error, duration) {
    const event = {
      type: "error",
      agentId: step.agent.id,
      timestamp: new Date(),
      data: { stepId: step.id, stepName: step.agent.name, duration },
      error,
    };
    this.eventEmitter.emit("error", event);
  }
  onProgress(callback) {
    this.eventEmitter.on("progress", callback);
    return this;
  }
  onCompleted(callback) {
    this.eventEmitter.on("completed", callback);
    return this;
  }
  onError(callback) {
    this.eventEmitter.on("error", callback);
    return this;
  }
}
export function createWorkflow(config) {
  return new AgentWorkflow(config);
}
