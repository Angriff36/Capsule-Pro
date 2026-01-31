# Using @repo/manifest in capsule-pro

## Setup Complete ✅

The Manifest language runtime and compiler are now available as `@repo/manifest`.

## Basic Usage

```typescript
import { RuntimeEngine, compileToIR } from '@repo/manifest';
import type { IR, CommandResult, EmittedEvent } from '@repo/manifest';

// Compile Manifest source code to IR
const manifestSource = `
  module EventImport {
    entity DocumentImport {
      property required id: string
      property status: string = "pending"
      
      command process() {
        mutate status = "processing"
        emit DocumentProcessed
      }
    }
    
    event DocumentProcessed: "import.document.processed" {
      importId: string
    }
  }
`;

const { ir, diagnostics } = compileToIR(manifestSource);

if (!ir) {
  console.error('Compilation failed:', diagnostics);
  return;
}

// Create runtime engine with context
const engine = new RuntimeEngine(ir, {
  tenantId: 'tenant-123',
  userId: 'user-456'
});

// Listen to events
engine.onEvent((event: EmittedEvent) => {
  console.log('Event emitted:', event.name, event.payload);
  // Update battleboard, write to database, etc.
});

// Create an instance
const importId = engine.createInstance('DocumentImport', {
  id: 'import-1'
});

// Execute a command
const result = await engine.runCommand('process', {}, {
  entityName: 'DocumentImport',
  instanceId: importId?.id
});

if (result.success) {
  console.log('Command succeeded:', result.result);
} else {
  console.error('Command failed:', result.error);
  if (result.guardFailure) {
    console.error('Guard failed:', result.guardFailure.formatted);
  }
}
```

## Integration with Your API Route

```typescript
// In apps/app/app/api/events/documents/parse/route.ts
import { RuntimeEngine, compileToIR } from '@repo/manifest';

// Load your Manifest module (could be from a file or inline)
const manifestSource = await loadManifestModule('event-import.manifest');

const { ir } = compileToIR(manifestSource);
const engine = new RuntimeEngine(ir, { tenantId, userId });

// Process documents
for (const doc of parseResult.documents) {
  const importId = engine.createInstance('DocumentImport', {
    id: generateId(),
    fileName: doc.fileName,
    fileType: doc.fileType
  });
  
  await engine.runCommand('process', {}, {
    entityName: 'DocumentImport',
    instanceId: importId?.id
  });
}

// Listen to events for database writes
engine.onEvent((event) => {
  if (event.name === 'DocumentProcessed') {
    // Write to Prisma
    await database.eventImport.update({
      where: { id: event.payload.importId },
      data: { status: 'processed' }
    });
  }
});
```

## Next Steps

1. **Create your Manifest module** - Define entities, commands, and events for event import
2. **Wire into API route** - Replace/adjust the current parsing logic
3. **Use events** - Listen to Manifest events to trigger database writes and UI updates

See `SETUP.md` for more details on the package structure.
