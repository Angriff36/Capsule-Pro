# @capsule-pro/document-parser

Layout-aware menu and event document parser for catering operations.

Parses PDFs, CSVs, and structured exports into normalized domain data for kitchen operations, menus, staffing, and inventory. Prioritizes correctness and diagnostics over false certainty.

## Pipeline Architecture

The system processes documents through five sequential stages. No stage may silently invent data.

```
Document → [1. Extraction] → [2. Segmentation] → [3. Classification] → [4. Normalization] → [5. Review Output]
```

### Stage 1: Layout-Aware Extraction

- PDFs are processed via Docling (Python), which preserves reading order, layout blocks, bounding boxes, font metadata, and table structure
- OCR is applied only for scanned documents
- CSV and structured exports bypass Docling and are parsed directly
- If Docling is unavailable, the adapter falls back to a mock extraction for development/testing

### Stage 2: Deterministic Segmentation

Rule-based segmentation in TypeScript that runs before any AI:

- Groups text blocks into candidate entities using font size, weight, vertical spacing, alignment, and page boundaries
- **Suppresses orphan tokens**: standalone numbers ("2", "3") not followed by food-like patterns are removed
- **Suppresses page numbers**: "Page 1 of 3", "page 2 / 5", etc.
- **Suppresses artifacts**: decorative lines (`---`, `***`, `___`), section counters
- Every suppression is recorded in diagnostics with the reason

This stage dramatically reduces noise before classification.

### Stage 3: AI-Assisted Classification

AI is used only after segmentation, and only for classification — never for data generation.

Given a candidate block, the classifier returns:
- **classification**: `menu_item`, `modifier`, `ingredient_list`, `instruction`, `note`, or `noise`
- **confidence**: 0 to 1
- **rationale**: short explanation
- **belongs_to_previous**: whether the block continues a prior item

The AI must NOT:
- Invent missing fields
- Merge items unless explicitly instructed
- Override deterministic rules

When AI is disabled (default), a rule-based fallback classifier is used.

### Stage 4: Normalization & Validation

Outputs are normalized into typed domain entities:
- `MenuItem` — dish names, descriptions, dietary flags, modifiers
- `Recipe` — ingredients with quantities and units, instructions
- `PrepTask` — preparation instructions
- `InventoryNeed` — supply items with quantities, units, categories, urgency
- `StaffingAssignment` — roles, persons, stations, shifts

All entities are validated with Zod schemas. Any entity failing validation is marked as **unresolved**.

### Stage 5: Confidence & Review Output

Every parse returns:
- `entities` — validated, normalized objects
- `unresolved` — items requiring human review
- `diagnostics` — extraction issues, segmentation suppressions, AI confidence warnings
- `summary` — counts and average confidence

Nothing is silently accepted.

## CLI Usage

```bash
parse-documents <file> [options]

Options:
  --type=pdf|csv|tpp    Document format (auto-detected from extension)
  --threshold <n>       Confidence threshold (default: 0.7)
  --ai                  Enable AI-assisted classification
  --api-key <key>       Anthropic API key (or set ANTHROPIC_API_KEY)
  --output <dir>        Output directory (default: current directory)
  --verbose, -v         Print full entity output
```

Output files:
- `<filename>.entities.json` — validated domain entities
- `<filename>.diagnostics.json` — diagnostics, unresolved items, summary

Exit codes:
- `0` — all entities resolved
- `1` — fatal error
- `2` — parse completed with unresolved items

## Programmatic Usage

```typescript
import { parseDocument } from '@capsule-pro/document-parser';

const result = await parseDocument('./menu.pdf', 'pdf', {
  confidenceThreshold: 0.7,
  enableAI: false,
});

console.log(result.entities);     // validated domain objects
console.log(result.unresolved);   // items needing review
console.log(result.diagnostics);  // full trace
console.log(result.summary);      // counts and confidence
```

## Failure Modes

### Extraction failures
- Docling not installed or crashes: falls back to mock extraction (logged as warning)
- File not found: falls back to mock with warning diagnostic
- Corrupt PDF: Docling error surfaces in diagnostics

### Segmentation over-suppression
- A legitimate item could be suppressed if it looks like an orphan number or artifact
- All suppressions are logged with reasons in diagnostics
- Tune with `suppressOrphanNumbers`, `suppressPageNumbers`, `minContentLength`

### Classification uncertainty
- Low-confidence classifications (below threshold) become `unresolved` items
- Rule-based fallback has lower accuracy than AI for ambiguous blocks
- Staffing and inventory lines may be misclassified if they lack clear keywords

### Normalization failures
- Entities failing Zod validation are moved to `unresolved` with the validation error
- Modifiers without a parent menu item become `unresolved`
- Ingredient lines without parseable quantities are stored with item name only

### AI unavailability
- When `enableAI: false` (default), all classification uses deterministic rules
- AI errors per-block fall back to rule-based classification for that block
- Network failures, rate limits, and malformed responses are all caught and logged

## Configuration

```typescript
interface PipelineConfig {
  confidenceThreshold: number;  // default: 0.7
  enableAI: boolean;            // default: false
  aiModel?: string;             // default: claude-sonnet-4-20250514
  aiApiKey?: string;
  aiBaseUrl?: string;
  doclingCommand?: string;      // default: 'docling'
  ocrEnabled?: boolean;
  maxBlocksForAI?: number;      // default: 100
  suppressOrphanNumbers: boolean; // default: true
  suppressPageNumbers: boolean;   // default: true
  minContentLength: number;       // default: 2
}
```

## Testing

```bash
npm test          # run all tests
npm run test:watch # watch mode
```

Test coverage includes:
- Orphan number suppression (with and without food context)
- Page number and artifact suppression
- Entity grouping by heading, spacing, and page boundaries
- Rule-based classification for all entity types
- Zod schema validation for all domain entities
- Full pipeline integration with mock extraction

## Project Structure

```
packages/document-parser/
├── src/
│   ├── extraction/
│   │   └── docling-adapter.ts    # Docling bridge + CSV parser + mock
│   ├── segmentation/
│   │   └── segmenter.ts          # Rule-based grouping and noise suppression
│   ├── ai/
│   │   └── classifier.ts         # AI + rule-based block classification
│   ├── normalizers/
│   │   ├── menu-normalizer.ts    # Menu items, recipes, prep tasks
│   │   ├── inventory-normalizer.ts
│   │   └── staffing-normalizer.ts
│   ├── validation/
│   │   └── schemas.ts            # Zod schemas for all domain entities
│   ├── diagnostics/
│   │   └── report.ts             # Report builder and formatter
│   ├── types/
│   │   └── domain-types.ts       # All TypeScript types and config
│   └── index.ts                  # Pipeline orchestrator and exports
├── cli.ts                        # CLI entry point
├── package.json
└── tsconfig.json
```

## Design Principles

- AI output is advisory, never authoritative
- Every suppression, classification, and validation failure is traceable
- No data is silently invented or accepted
- Client-facing systems must never consume `unresolved` data automatically
- The system prefers being honest over being impressive
