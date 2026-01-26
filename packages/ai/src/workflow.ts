import { v4 as uuidv4 } from "uuid";
import type { Agent, ExecutionResult } from "./agent.js";
import { createSDKError, ERROR_CODES, SDKError } from "./errors.js";
import {
  AgentEventEmitter,
  type GenericListener,
  type LifecycleEvent,
} from "./events.js";

export interface WorkflowStep {
  id: string;
  agent: Agent;
  dependsOn: string[];
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  condition?: (context: WorkflowContext) => boolean;
}

export interface WorkflowConfig {
  name: string;
  steps: WorkflowStep[];
  parallelExecution?: boolean;
  timeout?: number;
}

export interface WorkflowContext {
  workflowId: string;
  stepResults: Map<string, unknown>;
  sharedState: Record<string, unknown>;
  startTime: Date;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  stepResults: Map<string, ExecutionResult>;
  duration: number;
  error?: SDKError;
}

export class AgentWorkflow {
  public readonly id: string;
  public readonly name: string;
  public readonly steps: WorkflowStep[];
  public readonly parallelExecution: boolean;
  public readonly timeout: number;
  private readonly eventEmitter: AgentEventEmitter;
  private context: WorkflowContext;
  private stepExecutionOrder: string[] = [];
  private executionStartTime?: Date;

  constructor(config: WorkflowConfig) {
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

  private validateAndOrderSteps(): void {
    const stepIds = new Set(this.steps.map((s) => s.id));
    const visited = new Set<string>();
    const tempVisited = new Set<string>();

    const topologicalSort = (stepId: string) => {
      if (tempVisited.has(stepId)) {
        throw createSDKError(`Circular dependency detected: ${stepId}`, {
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
            throw createSDKError(
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

  setSharedState(state: Record<string, unknown>): void {
    this.context.sharedState = { ...state };
  }

  getSharedState(): Record<string, unknown> {
    return { ...this.context.sharedState };
  }

  async execute(context?: Record<string, unknown>): Promise<WorkflowResult> {
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
        stepResults: this.context.stepResults as Map<string, ExecutionResult>,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError =
        error instanceof SDKError
          ? error
          : createSDKError(String(error), {
              code: ERROR_CODES.WORKFLOW_ERROR,
              retryable: true,
            });

      this.emitWorkflowError(sdkError, duration);

      return {
        workflowId: this.id,
        success: false,
        stepResults: this.context.stepResults as Map<string, ExecutionResult>,
        duration,
        error: sdkError,
      };
    }
  }

  private async executeSequential(): Promise<void> {
    for (const stepId of this.stepExecutionOrder) {
      const step = this.steps.find((s) => s.id === stepId);
      if (!step) continue;

      if (step.condition && !step.condition(this.context)) {
        continue;
      }

      await this.executeStep(step);
    }
  }

  private async executeParallel(): Promise<void> {
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

  private identifyExecutionLevels(): string[][] {
    const levels: string[][] = [];
    const remainingSteps = new Set(this.steps.map((s) => s.id));

    while (remainingSteps.size > 0) {
      const currentLevel: string[] = [];

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
        throw createSDKError(
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

  private async executeStep(step: WorkflowStep): Promise<void> {
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
          this.context.sharedState[contextKey] = (
            result as unknown as Record<string, unknown>
          )[outputKey];
        }
      }

      const duration = Date.now() - stepStartTime;
      this.emitStepCompleted(step, duration);
    } catch (error) {
      const duration = Date.now() - stepStartTime;
      const sdkError =
        error instanceof SDKError
          ? error
          : createSDKError(String(error), {
              code: ERROR_CODES.AGENT_EXECUTION_FAILED,
              retryable: false,
            });

      this.emitStepError(step, sdkError, duration);
      throw sdkError;
    }
  }

  private prepareStepInput(step: WorkflowStep): string {
    if (!step.inputMapping) {
      return "";
    }

    const parts: string[] = [];
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

  private emitWorkflowStarted(): void {
    const event: LifecycleEvent = {
      type: "started",
      agentId: this.id,
      timestamp: new Date(),
      data: { workflowName: this.name, stepCount: this.steps.length },
    };
    this.eventEmitter.emit("started", event);
  }

  private emitWorkflowCompleted(duration: number): void {
    const event: LifecycleEvent = {
      type: "completed",
      agentId: this.id,
      timestamp: new Date(),
      data: { workflowName: this.name, duration, stepCount: this.steps.length },
    };
    this.eventEmitter.emit("completed", event);
  }

  private emitWorkflowError(error: SDKError, duration: number): void {
    const event: LifecycleEvent = {
      type: "error",
      agentId: this.id,
      timestamp: new Date(),
      data: { workflowName: this.name, duration },
      error,
    };
    this.eventEmitter.emit("error", event);
  }

  private emitStepStarted(step: WorkflowStep): void {
    const event: LifecycleEvent = {
      type: "started",
      agentId: step.agent.id,
      timestamp: new Date(),
      data: { stepId: step.id, stepName: step.agent.name },
    };
    this.eventEmitter.emit("started", event);
  }

  private emitStepCompleted(step: WorkflowStep, duration: number): void {
    const event: LifecycleEvent = {
      type: "completed",
      agentId: step.agent.id,
      timestamp: new Date(),
      data: { stepId: step.id, stepName: step.agent.name, duration },
    };
    this.eventEmitter.emit("completed", event);
  }

  private emitStepError(
    step: WorkflowStep,
    error: SDKError,
    duration: number
  ): void {
    const event: LifecycleEvent = {
      type: "error",
      agentId: step.agent.id,
      timestamp: new Date(),
      data: { stepId: step.id, stepName: step.agent.name, duration },
      error,
    };
    this.eventEmitter.emit("error", event);
  }

  onProgress(
    callback: (event: import("./events.js").AgentEvent) => void
  ): this {
    this.eventEmitter.on("progress", callback);
    return this;
  }

  onCompleted(callback: (event: LifecycleEvent) => void): this {
    this.eventEmitter.on("completed", callback as GenericListener);
    return this;
  }

  onError(callback: (event: LifecycleEvent) => void): this {
    this.eventEmitter.on("error", callback as GenericListener);
    return this;
  }
}

export function createWorkflow(config: WorkflowConfig): AgentWorkflow {
  return new AgentWorkflow(config);
}
