import type { Agent, ExecutionResult } from "./agent.js";
import { SDKError } from "./errors.js";
import { type LifecycleEvent } from "./events.js";
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
export declare class AgentWorkflow {
  readonly id: string;
  readonly name: string;
  readonly steps: WorkflowStep[];
  readonly parallelExecution: boolean;
  readonly timeout: number;
  private readonly eventEmitter;
  private context;
  private stepExecutionOrder;
  private executionStartTime?;
  constructor(config: WorkflowConfig);
  private validateAndOrderSteps;
  setSharedState(state: Record<string, unknown>): void;
  getSharedState(): Record<string, unknown>;
  execute(context?: Record<string, unknown>): Promise<WorkflowResult>;
  private executeSequential;
  private executeParallel;
  private identifyExecutionLevels;
  private executeStep;
  private prepareStepInput;
  private emitWorkflowStarted;
  private emitWorkflowCompleted;
  private emitWorkflowError;
  private emitStepStarted;
  private emitStepCompleted;
  private emitStepError;
  onProgress(callback: (event: import("./events.js").AgentEvent) => void): this;
  onCompleted(callback: (event: LifecycleEvent) => void): this;
  onError(callback: (event: LifecycleEvent) => void): this;
}
export declare function createWorkflow(config: WorkflowConfig): AgentWorkflow;
//# sourceMappingURL=workflow.d.ts.map
