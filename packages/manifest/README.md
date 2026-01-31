# @repo/manifest

Manifest Language Runtime and Compiler for capsule-pro.

## Setup

This package wraps the Manifest language implementation. You have two options:

### Option 1: Link Manifest as Workspace Dependency (Recommended)

1. **Update capsule-pro/package.json** to add Manifest as a dependency:
   ```json
   {
     "dependencies": {
       "@repo/manifest": "file:../Manifest"
     }
   }
   ```

2. **Update Manifest's package.json** to export properly:
   ```json
   {
     "name": "@repo/manifest",
     "main": "./src/manifest/runtime-engine.ts",
     "types": "./src/manifest/runtime-engine.ts",
     "exports": {
       "./runtime": "./src/manifest/runtime-engine.ts",
       "./compiler": "./src/manifest/ir-compiler.ts",
       "./types": "./src/manifest/ir.ts"
     }
   }
   ```

3. **Run**: `pnpm install` in capsule-pro root

4. **Update this package's index.ts** to import from the linked package:
   ```typescript
   export * from '@repo/manifest/runtime';
   export * from '@repo/manifest/compiler';
   export type * from '@repo/manifest/types';
   ```

### Option 2: Copy Source Files (Quick Start)

Copy the Manifest source files into this package:

```bash
# From capsule-pro root
cp -r ../Manifest/src/manifest/* packages/manifest/src/
```

Then update `src/index.ts` to export from local files.

## Usage

```typescript
import { RuntimeEngine, compileToIR } from '@repo/manifest';
import type { IR, CommandResult } from '@repo/manifest';

// Compile Manifest source to IR
const { ir, diagnostics } = compileToIR(manifestSource);

// Create runtime engine
const engine = new RuntimeEngine(ir, { tenantId, userId });

// Execute commands
const result = await engine.runCommand('importDocuments', {
  documents: parsedDocs
});

// Listen to events
engine.onEvent((event) => {
  console.log('Event:', event.name, event.payload);
});
```

## Building

```bash
pnpm build
```

This compiles TypeScript to `dist/` directory.
