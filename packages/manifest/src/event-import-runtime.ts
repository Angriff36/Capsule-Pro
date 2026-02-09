/**
 * Manifest Runtime Integration for Event Import Workflow
 *
 * This module integrates Manifest language runtime with the document parsing workflow.
 * It orchestrates the flow: Document Import -> Event Creation -> Battle Board/Checklist Generation
 */

import type { EmittedEvent, IR } from "./index";
import { compileToIR, RuntimeEngine } from "./index";

let cachedIR: IR | null = null;

/**
 * Load and compile the Manifest module
 */
async function loadManifestIR(): Promise<IR> {
  if (cachedIR) {
    return cachedIR;
  }

  // Embed the manifest source directly to avoid file system issues
  const manifestSource = `
module EventImport {
  entity DocumentImport {
    property required id: string
    property tenantId: string
    property eventId: string?
    property fileName: string
    property mimeType: string
    property fileSize: number = 0
    property fileType: string = "pdf"
    property detectedFormat: string?
    property parseStatus: string = "pending"
    property extractedData: any?
    property confidence: number = 0
    property parseErrors: string[] = []
    property reportId: string?
    property battleBoardId: string?
    property parsedAt: string?
    property createdAt: string?
    property updatedAt: string?

    command process() {
      guard self.parseStatus == "pending"
      mutate parseStatus = "parsing"
      emit DocumentProcessingStarted
    }

    command completeParsing(parsedData: any, confidence: number) {
      guard self.parseStatus == "parsing"
      mutate parseStatus = "parsed"
      mutate extractedData = parsedData
      mutate confidence = confidence
      emit DocumentParsed
    }

    command failParsing(errors: string[]) {
      guard self.parseStatus == "parsing"
      mutate parseStatus = "failed"
      mutate parseErrors = errors
      emit DocumentParseFailed
    }
  }

  entity Event {
    property required id: string
    property tenantId: string
    property eventNumber: string?
    property title: string = ""
    property clientId: string?
    property locationId: string?
    property venueId: string?
    property eventType: string
    property eventDate: string
    property guestCount: number = 0
    property status: string = "confirmed"
    property budget: number?
    property assignedTo: string?
    property venueName: string?
    property venueAddress: string?
    property notes: string?
    property tags: string[] = []
    property createdAt: string?
    property updatedAt: string?

    command createFromImport(importData: any) {
      mutate title = importData.client || importData.number || ""
      mutate eventType = importData.serviceStyle || "catering"
      mutate eventDate = importData.date || ""
      mutate guestCount = importData.headcount || 0
      mutate eventNumber = importData.number
      mutate venueName = importData.venue?.name
      mutate venueAddress = importData.venue?.address
      mutate notes = importData.notes || ""
      mutate tags = ["imported"]
      emit EventCreated
    }

    command updateFromImport(importData: any) {
      mutate title = importData.client || self.title
      mutate eventType = importData.serviceStyle || self.eventType
      mutate eventDate = importData.date || self.eventDate
      mutate guestCount = importData.headcount || self.guestCount
      mutate venueName = importData.venue?.name || self.venueName
      mutate venueAddress = importData.venue?.address || self.venueAddress
      emit EventUpdated
    }
  }

  entity BattleBoard {
    property required id: string
    property tenantId: string
    property eventId: string?
    property boardName: string
    property boardType: string = "event-specific"
    property schemaVersion: string = "mangia-battle-board@1"
    property boardData: any = {}
    property status: string = "draft"
    property isTemplate: boolean = false
    property tags: string[] = []
    property createdAt: string?
    property updatedAt: string?

    command generateFromEvent(eventData: any) {
      mutate boardName = eventData.client || eventData.number || ""
      mutate boardData = eventData.battleBoard || {}
      mutate tags = ["imported"]
      emit BattleBoardGenerated
    }
  }

  entity EventReport {
    property required id: string
    property tenantId: string
    property eventId: string
    property version: string = ""
    property status: string = "draft"
    property completion: number = 0
    property checklistData: any = {}
    property parsedEventData: any?
    property autoFillScore: number?
    property reviewNotes: string?
    property reviewedBy: string?
    property reviewedAt: string?
    property completedAt: string?
    property createdAt: string?
    property updatedAt: string?

    command generateFromEvent(eventData: any, checklistData: any) {
      mutate checklistData = checklistData || {}
      mutate parsedEventData = eventData
      mutate autoFillScore = checklistData.autoFilledCount || 0
      mutate completion = checklistData.totalQuestions > 0 
        ? Math.round((checklistData.autoFilledCount / checklistData.totalQuestions) * 100)
        : 0
      emit ChecklistGenerated
    }
  }

  event DocumentProcessingStarted: "import.document.processing.started" {
    importId: string
    fileName: string
  }

  event DocumentParsed: "import.document.parsed" {
    importId: string
    fileName: string
    detectedFormat: string
    confidence: number
    extractedData: any
  }

  event DocumentParseFailed: "import.document.parse.failed" {
    importId: string
    fileName: string
    errors: string[]
  }

  event EventCreated: "import.event.created" {
    eventId: string
    eventNumber: string?
    title: string
    eventDate: string
  }

  event EventUpdated: "import.event.updated" {
    eventId: string
    title: string
  }

  event BattleBoardGenerated: "import.battleboard.generated" {
    battleBoardId: string
    eventId: string?
    boardName: string
  }

  event ChecklistGenerated: "import.checklist.generated" {
    reportId: string
    eventId: string
    autoFillScore: number
    completion: number
  }
}
`;

  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Manifest module: ${diagnostics.map((d) => d.message).join(", ")}`
    );
  }

  cachedIR = ir;
  return ir;
}

/**
 * Create a runtime engine with tenant context
 */
export async function createEventImportRuntime(
  tenantId: string,
  userId: string
) {
  const ir = await loadManifestIR();
  const engine = new RuntimeEngine(ir, {
    tenantId,
    userId,
  });

  return engine;
}

/**
 * Process a document import using Manifest commands
 */
export async function processDocumentImport(
  engine: RuntimeEngine,
  importId: string,
  _fileName: string,
  parsedData: any,
  confidence: number,
  errors?: string[]
) {
  // Start processing
  const processResult = await engine.runCommand(
    "process",
    {},
    {
      entityName: "DocumentImport",
      instanceId: importId,
    }
  );

  if (!processResult.success) {
    throw new Error(
      `Failed to start processing: ${processResult.error || "Unknown error"}`
    );
  }

  // Complete or fail based on results
  if (errors && errors.length > 0) {
    const failResult = await engine.runCommand(
      "failParsing",
      { errors },
      {
        entityName: "DocumentImport",
        instanceId: importId,
      }
    );
    return failResult;
  }
  const completeResult = await engine.runCommand(
    "completeParsing",
    { parsedData, confidence },
    {
      entityName: "DocumentImport",
      instanceId: importId,
    }
  );
  return completeResult;
}

/**
 * Create or update an event from parsed data
 */
export async function createOrUpdateEvent(
  engine: RuntimeEngine,
  eventId: string | undefined,
  tenantId: string,
  parsedEvent: any
) {
  if (eventId) {
    // Update existing event
    const updateResult = await engine.runCommand(
      "updateFromImport",
      { importData: parsedEvent },
      {
        entityName: "Event",
        instanceId: eventId,
      }
    );
    return updateResult;
  }
  // Create new event
  const newEventId = await engine.createInstance("Event", {
    id: crypto.randomUUID(),
    tenantId,
    eventType: parsedEvent.serviceStyle || "catering",
    eventDate: parsedEvent.date || new Date().toISOString(),
  });

  const createResult = await engine.runCommand(
    "createFromImport",
    { importData: parsedEvent },
    {
      entityName: "Event",
      instanceId: newEventId?.id,
    }
  );

  return { ...createResult, eventId: newEventId?.id };
}

/**
 * Generate battle board from event data
 */
export async function generateBattleBoard(
  engine: RuntimeEngine,
  battleBoardId: string,
  _tenantId: string,
  _eventId: string | undefined,
  eventData: any
) {
  const battleBoardData = eventData.battleBoard || {};

  const result = await engine.runCommand(
    "generateFromEvent",
    { eventData: { ...eventData, battleBoard: battleBoardData } },
    {
      entityName: "BattleBoard",
      instanceId: battleBoardId,
    }
  );

  return result;
}

/**
 * Generate checklist/report from event data
 */
export async function generateChecklist(
  engine: RuntimeEngine,
  reportId: string,
  _tenantId: string,
  _eventId: string,
  eventData: any,
  checklistData: any
) {
  const result = await engine.runCommand(
    "generateFromEvent",
    { eventData, checklistData },
    {
      entityName: "EventReport",
      instanceId: reportId,
    }
  );

  return result;
}

/**
 * Event listener helper to handle Manifest events and persist to database
 */
export function setupEventListeners(
  engine: RuntimeEngine,
  handlers: {
    onDocumentParsed?: (event: EmittedEvent) => Promise<void>;
    onEventCreated?: (event: EmittedEvent) => Promise<void>;
    onBattleBoardGenerated?: (event: EmittedEvent) => Promise<void>;
    onChecklistGenerated?: (event: EmittedEvent) => Promise<void>;
  }
) {
  const unsubscribe = engine.onEvent(async (event: EmittedEvent) => {
    switch (event.name) {
      case "DocumentParsed":
        await handlers.onDocumentParsed?.(event);
        break;
      case "EventCreated":
        await handlers.onEventCreated?.(event);
        break;
      case "BattleBoardGenerated":
        await handlers.onBattleBoardGenerated?.(event);
        break;
      case "ChecklistGenerated":
        await handlers.onChecklistGenerated?.(event);
        break;
      default:
        console.warn(`Unexpected event type: ${(event as { name: string }).name}`);
        break;
    }
  });

  return unsubscribe;
}
