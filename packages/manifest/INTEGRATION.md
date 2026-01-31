# Manifest Integration for Event Import

## Overview

The Manifest language runtime has been integrated into the event import workflow to orchestrate document processing, event creation, battle board generation, and checklist creation.

## Architecture

### Manifest Module (`event-import.manifest`)

Defines the domain model:
- **DocumentImport**: Tracks document parsing status and results
- **Event**: Manages event creation and updates from imported data
- **BattleBoard**: Generates battle boards from event data
- **EventReport**: Creates checklists/reports from event data

### Runtime Integration (`event-import-runtime.ts`)

Provides TypeScript helpers that:
- Load and compile the Manifest module
- Create runtime engines with tenant context
- Execute Manifest commands (process, create, update, generate)
- Handle event emissions

### API Route Integration (`route.ts`)

The document parse API route now:
1. Creates Manifest runtime instances for each request
2. Processes documents through Manifest commands
3. Uses Manifest events to trigger database writes
4. Maintains consistency between Manifest state and database

## Usage Flow

```
1. Files uploaded → API route
2. Parse documents (existing parser)
3. Create DocumentImport instances in Manifest
4. Execute process/completeParsing commands
5. Create/update Event via Manifest commands
6. Generate BattleBoard/Checklist via Manifest commands
7. Events emitted → Database writes
```

## Events

Manifest emits events that can be listened to:
- `DocumentProcessingStarted`
- `DocumentParsed`
- `DocumentParseFailed`
- `EventCreated`
- `EventUpdated`
- `BattleBoardGenerated`
- `ChecklistGenerated`

## Benefits

1. **Declarative Workflow**: The workflow is defined in Manifest, making it easier to reason about
2. **Event-Driven**: Events provide hooks for database writes, notifications, etc.
3. **Type Safety**: TypeScript integration ensures type safety
4. **Testability**: Manifest commands can be tested independently
5. **Auditability**: Event log provides full audit trail

## Next Steps

- Add event listeners to persist Manifest state to database
- Add validation guards in Manifest commands
- Add policies for access control
- Expand event handlers for notifications, webhooks, etc.
