/**
 * Manifest Runtime Integration for Event Import Workflow
 *
 * This module integrates Manifest language runtime with the document parsing workflow.
 * It orchestrates the flow: Document Import -> Event Creation -> Battle Board/Checklist Generation
 */
import type { EmittedEvent } from "./index";
import { RuntimeEngine } from "./index";
/**
 * Create a runtime engine with tenant context
 */
export declare function createEventImportRuntime(tenantId: string, userId: string): Promise<RuntimeEngine>;
/**
 * Process a document import using Manifest commands
 */
export declare function processDocumentImport(engine: RuntimeEngine, importId: string, _fileName: string, parsedData: any, confidence: number, errors?: string[]): Promise<import("./index").CommandResult>;
/**
 * Create or update an event from parsed data
 */
export declare function createOrUpdateEvent(engine: RuntimeEngine, eventId: string | undefined, tenantId: string, parsedEvent: any): Promise<import("./index").CommandResult | {
    eventId: string | undefined;
    success: boolean;
    result?: unknown;
    error?: string;
    deniedBy?: string;
    guardFailure?: import("./index").GuardFailure;
    policyDenial?: import("./manifest/runtime-engine").PolicyDenial;
    constraintOutcomes?: import("./index").ConstraintOutcome[];
    overrideRequests?: import("./index").OverrideRequest[];
    concurrencyConflict?: import("./manifest/ir").ConcurrencyConflict;
    emittedEvents: EmittedEvent[];
}>;
/**
 * Generate battle board from event data
 */
export declare function generateBattleBoard(engine: RuntimeEngine, battleBoardId: string, _tenantId: string, _eventId: string | undefined, eventData: any): Promise<import("./index").CommandResult>;
/**
 * Generate checklist/report from event data
 */
export declare function generateChecklist(engine: RuntimeEngine, reportId: string, _tenantId: string, _eventId: string, eventData: any, checklistData: any): Promise<import("./index").CommandResult>;
/**
 * Event listener helper to handle Manifest events and persist to database
 */
export declare function setupEventListeners(engine: RuntimeEngine, handlers: {
    onDocumentParsed?: (event: EmittedEvent) => Promise<void>;
    onEventCreated?: (event: EmittedEvent) => Promise<void>;
    onBattleBoardGenerated?: (event: EmittedEvent) => Promise<void>;
    onChecklistGenerated?: (event: EmittedEvent) => Promise<void>;
}): () => void;
//# sourceMappingURL=event-import-runtime.d.ts.map