# Event Import/Export Specification

## Overview
This specification defines the import and export functionality for events in the Convoy catering management system. Events can be imported from CSV and PDF files, and exported to CSV and PDF formats.

## Scope

### Import Features
- **CSV Import**: Import events from CSV files containing prep lists or dish lists
- **PDF Import**: Create placeholder events from PDF files for manual review

### Export Features
- **CSV Export**: Export event data to CSV format for external use
- **PDF Export**: Generate comprehensive PDF documents for events including:
  - Event summary/details
  - Battle Board (timeline tasks)
  - Menu/dishes
  - Guest list
  - Staff assignments

## Out of Scope
- Importing from calendar formats (ICS, etc.)
- Importing from other event management systems
- Real-time sync with external systems
- Importing/exporting event history/changes

## Data Models

### EventImport (tenant_events.event_imports)
```prisma
model EventImport {
  tenantId   String
  id         String   @default(uuid())
  eventId    String   @map("event_id")
  fileName   String   @map("file_name")
  mimeType   String   @map("mime_type")
  fileSize   Int      @map("file_size")
  content    Bytes
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("event_imports")
  @@index([tenantId, eventId])
}
```

## Import Specifications

### CSV Format 1: Prep Lists
| Column | Required | Description |
|--------|----------|-------------|
| list_id | No | Group identifier for items |
| list_name | No | Name of the prep list |
| item_name | Yes | Name of the item |
| quantity | Yes | Quantity needed |
| unit | Yes | Unit of measurement |
| servings | No | Number of servings |
| notes | No | Special instructions |
| finish_location | No | Where item should finish |

### CSV Format 2: Dish Lists
| Column | Required | Description |
|--------|----------|-------------|
| dish name | Yes | Name of the dish |
| servings/batch | Yes | Servings per batch |
| quantity/unit | Yes | Quantity and unit |
| special instructions | No | Preparation notes |
| finished at | No | Finish location |

## Export Specifications

### CSV Export Format
| Column | Description |
|--------|-------------|
| Event ID | Unique event identifier |
| Title | Event name/title |
| Date | Event date (YYYY-MM-DD) |
| Type | Event type (wedding, corporate, etc.) |
| Status | Event status (draft, confirmed, etc.) |
| Guest Count | Number of guests |
| Venue | Event venue name |
| Address | Venue address |
| Notes | Event notes |

### PDF Export Format
- **Page 1**: Event Summary (title, date, venue, guest count, status)
- **Page 2**: Menu/Dishes (list of dishes with quantities and servings)
- **Page 3**: Battle Board/Timeline (tasks with assignments and due times)
- **Page 4**: Staff Assignments (staff members with their roles and tasks)
- **Page 5**: Guest List (if available)

## Invariants
1. **File Size**: Imported files must be < 10MB
2. **Encoding**: CSV files must be UTF-8 encoded
3. **Required Fields**: CSV rows must have at least an item/dish name and quantity
4. **Tenant Isolation**: All imports/exports are scoped to tenant
5. **Audit Trail**: All imports are recorded with file content and metadata

## Acceptance Criteria

### Import
- [x] CSV files with prep list format can be imported
- [x] CSV files with dish list format can be imported
- [x] PDF files create placeholder events
- [x] Imported items are classified (dish, recipe, ingredient, supply)
- [x] Related entities are auto-created (recipes, dishes, ingredients, inventory items)
- [x] Prep tasks are generated for imported items
- [x] Import history is tracked

### Export
- [ ] Events can be exported to CSV format
- [ ] Event details can be exported to PDF
- [ ] PDF includes event summary, menu, timeline, and staff
- [ ] Export filenames are sanitized and descriptive
- [ ] PDFs include metadata (generated date, generator)

## API Endpoints

### Import
- `POST /api/events/import` - Upload and process import file
- `GET /api/events/imports/[importId]` - Download import file

### Export
- `GET /api/events/[eventId]/export/csv` - Export event as CSV
- `GET /api/events/[eventId]/export/pdf` - Export event as PDF
- `GET /api/events/export/csv` - Export filtered event list as CSV

## UI Components

### Import Page
- File upload form (drag & drop)
- File type selection (CSV/PDF)
- Format instructions
- Import history

### Export Actions
- Export button on event detail page
- Export button on events list page (bulk export)
- Export format selection dropdown
- Export options modal (include/exclude sections)

## Testing
- Unit tests for CSV parsing
- Integration tests for import/export API routes
- E2E tests for upload and download flows
- Tests for file size and type validation
- Tests for classification logic

## Implementation Notes
1. CSV parsing uses custom parser (not external libraries)
2. PDF generation uses @react-pdf/renderer
3. Files are stored as BLOB in EventImport table
4. Import creates entities if they don't exist
5. Export uses consistent styling across all PDFs
