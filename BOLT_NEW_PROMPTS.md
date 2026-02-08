# Bolt.new Prompts for Capsule-Pro

Based on analysis of the codebase, here are 3 high-value prompts for bolt.new to generate packages that integrate with your manifest-based kitchen ops system.

---

## Prompt 1: Document Parsing Worker Package

```
Create a TypeScript package for parsing catering event documents (TPP, CSV, PDF) into normalized kitchen data structures.

Project structure:
- packages/document-parser/
  - src/
    - parsers/
      - tpp-parser.ts      # Parse TPP (tasting party planning) files
      - csv-parser.ts      # Parse CSV staff schedules and guest lists
      - pdf-parser.ts      # Parse PDF event briefs and orders
    - normalizers/
      - event-normalizer.ts      # Convert parsed data to event entities
      - staffing-normalizer.ts   # Convert to staffing assignments
      - inventory-normalizer.ts  # Convert to inventory needs
    - types/
      - parsed-types.ts    # Common types for parsed documents
      - normalization-types.ts
    - index.ts
  - package.json
  - tsconfig.json

Key requirements:
1. Use @repo/manifest types for entity structures (Recipe, PrepList, InventoryItem)
2. Output normalized data compatible with the kitchen-ops runtime
3. Zod validation for all parsed outputs
4. Error handling with detailed parsing diagnostics
5. Integration with your existing manifest event system

Output types should match the entities defined in:
- packages/kitchen-ops/manifests/recipe-rules.manifest
- packages/kitchen-ops/manifests/prep-list-rules.manifest
- packages/kitchen-ops/manifests/inventory-rules.manifest

Include:
- CLI tool for batch parsing files
- Unit tests with mocked document inputs
- README with usage examples
```

---

## Prompt 2: AI Kitchen Agent Package

```
Create an AI-powered TypeScript package for intelligent kitchen operations using the OpenAI SDK.

Project structure:
- packages/kitchen-ai/
  - src/
    - agents/
      - prep-optimizer.ts       # AI agent for optimizing prep schedules
      - allergen-detector.ts    # AI agent for detecting allergen risks
      - portion-calculator.ts   # AI agent for calculating portions
    - services/
      - openai-client.ts       # Configured OpenAI client
      - prompt-templates.ts     # System prompts for kitchen operations
    - tools/
      - manifest-tools.ts       # Tools that call kitchen-ops runtime
      - inventory-tools.ts     # Tools for inventory operations
    - index.ts
  - package.json
  - tsconfig.json

Requirements:
1. Use @ai-sdk/openai for the LLM client (already in your deps)
2. Define tools compatible with OpenAI function calling
3. Each tool should call the appropriate manifest command
4. Use the manifest specs in packages/kitchen-ops/manifests/ for context
5. Support streaming responses for real-time updates

Example tools to implement:
- generatePrepList(eventId, guestCount, dietaryRestrictions)
- suggestStationAssignments(prepTasks, staffCount, equipment)
- calculateInventoryNeeds(eventMenu, guestCount)
- flagAllergenRisks(menuItems, allergens)

Include:
- System prompts optimized for catering/kitchen operations
- Error handling for AI timeouts and malformed responses
- Tests using mocked OpenAI responses
```

---

## Prompt 3: Realtime Sync Package

```
Create a TypeScript package for realtime synchronization of kitchen operations across web and mobile clients using Ably.

Project structure:
- packages/kitchen-realtime/
  - src/
    - channels/
      - prep-channel.ts       # Channel for prep task updates
      - station-channel.ts    # Channel for station status
      - inventory-channel.ts  # Channel for inventory changes
    - hooks/
      - useRealtimePrep.ts   # React hook for prep subscriptions
      - useRealtimeStation.ts # React hook for station subscriptions
      - useRealtimeInventory.ts
    - sync/
      - optimistic-update.ts  # Optimistic UI update helpers
      - conflict-resolver.ts  # Conflict resolution for concurrent edits
    - index.ts
  - package.json
  - tsconfig.json

Requirements:
1. Integrate with your existing @repo/manifest event system
2. Emit events when manifest commands execute
3. Subscribe to event channels for realtime updates
4. Support both React hooks and vanilla JS usage
5. Handle connection state and reconnection

Event types should match:
- packages/kitchen-ops/manifests/prep-task-rules.manifest events
- packages/kitchen-ops/manifests/station-rules.manifest events
- packages/kitchen-ops/manifests/inventory-rules.manifest events

Include:
- Type-safe channel naming with tenant isolation
- Offline support with queued updates
- Presence indicators for active kitchen staff
- Tests for channel subscriptions and event delivery
```

---

## Why These Prompts?

1. **Document Parser** - Reuses your existing manifest entity specs to normalize external data (TPP/CSV/PDF) into structured data

2. **AI Kitchen Agent** - Leverages your @ai-sdk/openai dependency and builds intelligent agents on top of your constraint rules engine

3. **Realtime Sync** - Connects your manifest event emissions to distributed clients (web + mobile)

All three integrate directly with the manifest system you've built in `packages/kitchen-ops/` and `packages/manifest-specs/`.
