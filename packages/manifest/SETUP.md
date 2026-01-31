# Setting Up @repo/manifest

## Quick Setup (Copy Source Files)

Run this from `capsule-pro` root:

```bash
# Copy Manifest source files
mkdir -p packages/manifest/src/manifest
cp -r ../Manifest/src/manifest/* packages/manifest/src/manifest/

# Install dependencies
pnpm install

# Build the package
cd packages/manifest
pnpm build
```

Then update `packages/manifest/src/index.ts` to export from local files:

```typescript
export * from './manifest/runtime-engine';
export * from './manifest/ir-compiler';
export type * from './manifest/ir';
```

## Proper Setup (Workspace Link)

### Step 1: Update Manifest's package.json

In `C:\Projects\Manifest\package.json`, add:

```json
{
  "name": "@repo/manifest",
  "version": "0.0.1",
  "main": "./src/manifest/index.ts",
  "types": "./src/manifest/index.ts",
  "exports": {
    "./runtime": "./src/manifest/runtime-engine.ts",
    "./compiler": "./src/manifest/ir-compiler.ts",
    "./types": "./src/manifest/ir.ts"
  }
}
```

### Step 2: Create Manifest index file

Create `C:\Projects\Manifest\src\manifest\index.ts`:

```typescript
export * from './runtime-engine';
export * from './ir-compiler';
export type * from './ir';
```

### Step 3: Link in capsule-pro

In `C:\projects\capsule-pro\package.json`, add:

```json
{
  "dependencies": {
    "@repo/manifest": "file:../Manifest"
  }
}
```

Then run `pnpm install`.

### Step 4: Update this package

Update `packages/manifest/src/index.ts`:

```typescript
export * from '@repo/manifest/runtime';
export * from '@repo/manifest/compiler';
export type * from '@repo/manifest/types';
```

## Usage in Your Code

```typescript
import { RuntimeEngine, compileToIR } from '@repo/manifest';
import type { IR, CommandResult } from '@repo/manifest';

// In your API route
const manifestSource = `
  module EventImport {
    entity DocumentImport {
      property required id: string
      command process() {
        emit DocumentProcessed
      }
    }
  }
`;

const { ir } = compileToIR(manifestSource);
const engine = new RuntimeEngine(ir, { tenantId, userId });
```
