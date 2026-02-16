# Kitchen Production Board - AI Feature Integration Guide

## Quick Reference

**Target Page:** `/kitchen` (Kitchen Production Board)
**Main File:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\kitchen\production-board-client.tsx`

### Three AI Features to Add:

1. **Suggestions Panel** - AI-powered recommendations for task management
2. **Task Generation Triggers** - Auto-create tasks from events/recipes
3. **Event Summary Display** - Show AI-generated event summaries for kitchen context

### Key Files to Modify:

- `production-board-client.tsx` - Main integration point
- Create `/api/ai/suggestions/route.ts` - Missing API endpoint
- Create `/api/kitchen/events/summary/route.ts` - Event summary API
- Create `/api/kitchen/tasks/generate/route.ts` - Task generation API

### Reusable Components:

- `SuggestionsPanel` from command-board
- `EventSummaryDisplay` from events module
- `useSuggestions` hook from command-board

### Critical First Step:

Create `/api/ai/suggestions` endpoint (see Phase 1 in Implementation Priority)

## Overview

This document outlines the file structure and integration points for adding AI-powered features to the kitchen production board at `/kitchen` (the main production board page).

## Target Page: Kitchen Production Board

### Main Files

**Server Component (Entry Point):**
- **File:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\kitchen\page.tsx`
- **Role:** Server component that fetches initial data and renders the client component
- **Key Data:**
  - Fetches all kitchen tasks with claims and users
  - Passes `initialTasks` and `currentUserId` to client component
  - Renders `ProductionBoardRealtime` for real-time updates via Ably

**Client Component (Main UI):**
- **File:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\kitchen\production-board-client.tsx`
- **Current Features:**
  - Date navigator for selecting dates
  - Station filtering (All Stations, Hot Line, Cold Prep, Bakery)
  - Search functionality
  - Kanban board with three columns: Pending, In Progress, Completed
  - "My Tasks" section showing tasks assigned to current user
  - Stats sidebar with task metrics
  - Weather widget (mock data)

**Real-time Updates:**
- **File:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\kitchen\production-board-realtime.tsx`
- **Role:** Subscribes to Ably channel for `kitchen.task.*` events and triggers router refresh

**Layout:**
- **File:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\kitchen\layout.tsx`
- **Role:** Simple passthrough layout (currently minimal)

## Supporting Components

**Task Card Component:**
- **File:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\kitchen\task-card.tsx`
- **Features:**
  - Displays task title, summary, priority, status, due date
  - Shows assigned users with avatars
  - Claim/Release task buttons
  - Status change actions via dropdown menu
  - Compact and full view modes

## AI Integration Points

### 1. Suggestions Panel Integration

**Location:** In `production-board-client.tsx` sidebar area

**Implementation Reference:**
- **Component:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\suggestions-panel.tsx`
- **Hook:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\hooks\use-suggestions.ts`
- **Types:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\suggestions-types.ts`
- **Server Actions:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\suggestions.ts`

**Integration Strategy:**
```typescript
// Add to production-board-client.tsx
import { SuggestionsPanel } from "../../command-board/components/suggestions-panel";
import { useSuggestions } from "../../command-board/hooks/use-suggestions";
import type { SuggestedAction } from "../../command-board/actions/suggestions-types";

// In ProductionBoardClient component:
const [showSuggestions, setShowSuggestions] = useState(false);
const { suggestions, isLoading, fetchSuggestions, dismissSuggestion } = useSuggestions(tenantId);

// Add to sidebar (replacing or adding to "Team Activity" section):
{showSuggestions && (
  <Card>
    <CardHeader>
      <CardTitle>AI Suggestions</CardTitle>
    </CardHeader>
    <CardContent>
      <SuggestionsPanel
        suggestions={suggestions}
        isLoading={isLoading}
        onDismiss={dismissSuggestion}
        onRefresh={fetchSuggestions}
        onAction={(suggestion) => handleSuggestionAction(suggestion)}
      />
    </CardContent>
  </Card>
)}
```

**Toggle Button:** Add to header next to "Add Task" button:
```typescript
<Button
  variant="outline"
  onClick={() => setShowSuggestions(!showSuggestions)}
>
  <Sparkles className="mr-2 h-4 w-4" />
  AI Suggestions
</Button>
```

### 2. Task Generation Triggers

**Location:** Multiple integration points in `production-board-client.tsx`

**Option A: Quick Add Button**
- Add to header next to "Add Task" button
- Opens dialog with AI-powered task generation from events/recipes

**Option B: Context-Aware Suggestions**
- Show suggestions when no tasks exist for selected date/station
- Display in empty state of task columns

**Option C: Batch Generation**
- Add button to generate tasks from upcoming events
- "Generate Tasks from Events" button in header or sidebar

**API Endpoint Needed:**
```
POST /api/kitchen/tasks/generate
Body: {
  date: string,
  station: string,
  eventId?: string,
  count?: number
}
```

### 3. Event Summary Display

**Location:** In `production-board-client.tsx` header or sidebar

**Implementation Reference:**
- **Component:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\events\components\event-summary-display.tsx`
- **Server Actions:** `C:\projects\capsule-pro\apps\app\app\(authenticated)\events\actions\event-summary.ts`
- **AI Model:** Uses OpenAI GPT-4o-mini
- **Database Table:** `tenant_events.event_summaries` (stores generated summaries)

**Integration Strategy:**

**Option A: Selected Date Event Summary**
- Fetch events for selected date
- Display summary card in sidebar showing:
  - Number of events
  - Total guest count
  - Menu highlights
  - Special requirements (allergens, dietary restrictions)

**Option B: Event Detail Drawer**
- Click on event to show full AI summary
- Reuse existing `EventSummaryDisplay` component

**API Endpoint Needed:**
```
GET /api/kitchen/events/summary?date=2024-01-15
Response: {
  date: string,
  eventCount: number,
  totalGuests: number,
  events: [{
    id: string,
    title: string,
    guestCount: number,
    venueName: string,
    summary: GeneratedEventSummary
  }]
}
```

**Component Integration:**
```typescript
// Add to production-board-client.tsx
import { EventSummaryDisplay } from "../../events/components/event-summary-display";

// In sidebar or modal:
{selectedDateEvents.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Today's Events</CardTitle>
    </CardHeader>
    <CardContent>
      {selectedDateEvents.map(event => (
        <EventSummaryDisplay
          key={event.id}
          eventId={event.id}
          eventTitle={event.title}
          initialSummary={event.summary}
          onGenerate={() => generateEventSummary(event.id)}
        />
      ))}
    </CardContent>
  </Card>
)}
```

## Database Models

### KitchenTask (public schema)
```prisma
model KitchenTask {
  tenantId     String
  id           String
  title        String
  summary      String?
  priority     Int
  status       String
  dueDate      DateTime?
  tags         String[]
  claims       KitchenTaskClaim[]
  progress     KitchenTaskProgress[]
  // ... other fields
}
```

### Event (tenant_events schema)
```prisma
model Event {
  tenantId     String
  id           String
  title        String
  eventDate    DateTime
  guestCount   Int
  eventType    String
  venueName    String?
  // ... other fields
}
```

## Existing API Routes

### Kitchen Tasks
- `POST /api/kitchen/tasks` - Create new task
- `GET /api/kitchen/tasks` - List tasks
- `PATCH /api/kitchen/tasks/[id]` - Update task
- `POST /api/kitchen/tasks/[id]/claim` - Claim task
- `POST /api/kitchen/tasks/[id]/release` - Release task
- `GET /api/kitchen/tasks/my-tasks` - Get user's tasks
- `GET /api/kitchen/tasks/available` - Get available tasks

### Prep Lists (with AI generation)
- `POST /api/kitchen/prep-lists/generate` - Generate prep list from event
- `POST /api/kitchen/prep-lists/save` - Save prep list
- `POST /api/kitchen/prep-lists/save-db` - Save to database

### Events
- `GET /api/events/[eventId]` - Get event details
- Event summaries (AI-generated) - endpoint needs verification

## AI Features to Add

### 1. Smart Task Suggestions
- Analyze upcoming events
- Suggest prep tasks based on menu items
- Factor in dietary restrictions and allergens
- Consider station assignments and staff availability

**Existing Suggestion Types (from suggestions-types.ts):**
- `deadline_alert` - Urgent/upcoming deadlines
- `resource_conflict` - Multiple events same day
- `capacity_warning` - High task volume
- `optimization` - Performance improvement
- `follow_up` - Action items (inventory alerts)
- `data_inconsistency` - Data quality issues
- `actionable_insight` - AI-generated insights

**Categories:**
- `events` - Event-related suggestions
- `kitchen` - Kitchen/prep suggestions
- `scheduling` - Staff scheduling
- `crm` - Client management
- `inventory` - Inventory management
- `general` - General suggestions

**Priority Levels:**
- `high` - Urgent, needs immediate attention
- `medium` - Important but not urgent
- `low` - Nice to have

### 2. Automated Task Generation
- Generate tasks from event data
- Break down recipes into prep tasks
- Calculate quantities based on guest count
- Assign priority based on event timing

### 3. Event Summaries for Kitchen
- Show upcoming events for selected date
- Highlight menu items and prep requirements
- Flag special dietary needs
- Show equipment and venue constraints

**Existing Event Summary Sections:**
- `highlights` - Key successes and achievements
- `issues` - Challenges and areas needing attention
- `financialPerformance` - Budget vs actuals analysis
- `clientFeedback` - Client satisfaction and feedback
- `insights` - Actionable recommendations

### 4. Predictive Analytics
- Suggest prep timing based on historical data
- Warn about potential bottlenecks
- Recommend task prioritization

## UI/UX Considerations

### Suggestions Panel Placement
- **Sidebar:** Replace or augment "Team Activity" section
- **Modal:** Trigger from button in header
- **Drawer:** Slide-in panel from right side

### Visual Hierarchy
- Keep existing task board as primary focus
- AI features as secondary/auxiliary tools
- Use consistent styling with existing components
- Maintain mobile responsiveness

### User Feedback
- Show loading states for AI operations
- Provide clear error messages
- Allow users to dismiss/ignore suggestions
- Enable refinement of AI-generated content

## Implementation Priority

### Phase 1: Create AI Suggestions API Endpoint (Required First Step)

**CRITICAL:** The `useSuggestions` hook calls `/api/ai/suggestions` which does not exist yet. You must create this endpoint first.

**Create:** `C:\projects\capsule-pro\apps\app\app\api\ai\suggestions\route.ts`

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { generateSuggestions } from "../../(authenticated)/command-board/actions/suggestions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const boardId = searchParams.get("boardId") || undefined;
    const eventId = searchParams.get("eventId") || undefined;
    const maxSuggestions = parseInt(searchParams.get("maxSuggestions") || "5", 10);

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const result = await generateSuggestions({
      tenantId,
      boardId,
      eventId,
      maxSuggestions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
```

**Note:** The server action needs `tenantId` from session. You may need to modify the hook to pass tenantId from client context, or create a wrapper that gets tenantId from auth.

### Phase 2: Suggestions Panel Integration
1. Create `/api/ai/suggestions` endpoint (see Phase 1)
2. Modify `useSuggestions` hook to pass tenantId from component props
3. Add toggle button to production board header
4. Integrate `SuggestionsPanel` component in sidebar
5. Connect to existing suggestion infrastructure

### Phase 3: Event Summary Display
1. Create API endpoint to fetch events by date: `/api/kitchen/events/summary?date=2024-01-15`
2. Add event card to sidebar showing today's events
3. Integrate `EventSummaryDisplay` for detailed view
4. Add "Generate Summary" functionality using existing server action

### Phase 4: Task Generation
1. Create batch task generation API: `/api/kitchen/tasks/generate`
2. Add "Generate Tasks" button to header
3. Create dialog for configuration
4. Integrate with event and recipe data

### Phase 5: Advanced Features
1. Predictive analytics
2. Smart scheduling recommendations
3. Resource optimization suggestions
4. Historical trend analysis

## Visual Integration Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    KITCHEN PRODUCTION BOARD                      │
│                         (page.tsx)                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌──────────────────────────────────┐
    │ Server Component  │   │  ProductionBoardRealtime         │
    │ (page.tsx)        │   │  (Ably subscriptions)            │
    │ - Fetches tasks   │   │  - Listens for kitchen.task.*    │
    │ - Passes to client│   │  - Triggers router.refresh()     │
    └─────────┬─────────┘   └──────────────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────────────────────────┐
    │           PRODUCTION BOARD CLIENT (MAIN UI)                │
    │          (production-board-client.tsx)                      │
    │                                                              │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
    │  │   Header     │  │  Task Board  │  │   Sidebar    │    │
    │  │              │  │              │  │              │    │
    │  │ Date Nav     │  │ My Tasks     │  │ Stats        │    │
    │  │ Stations     │  │ Kanban:      │  │ Progress     │    │
    │  │ Search       │  │ - Pending    │  │ Quick Stats  │    │
    │  │ Weather      │  │ - In Progress│  │ Team Activity│    │
    │  │ [AI Toggle]  │  │ - Completed  │  │              │    │
    │  │ [Add Task]   │  │              │  │ [AI Panel]   │    │
    │  └──────────────┘  └──────────────┘  │ [Events]     │    │
    │                                      └──────────────┘    │
    └────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌──────────────┐
  │Suggestions│        │Event      │        │Task          │
  │Panel      │        │Summary    │        │Generation    │
  │           │        │Display    │        │Dialog        │
  │(NEW)      │        │(NEW)      │        │(NEW)         │
  └─────┬─────┘        └─────┬─────┘        └──────┬───────┘
        │                   │                     │
        ▼                   ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌──────────────┐
  │API:       │        │API:       │        │API:          │
  │/ai/       │        │/kitchen/  │        │/kitchen/     │
  │suggestions│        │events/    │        │tasks/        │
  │           │        │summary    │        │generate      │
  │(CREATE)   │        │(CREATE)   │        │(CREATE)      │
  └─────┬─────┘        └─────┬─────┘        └──────┬───────┘
        │                   │                     │
        ▼                   ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌──────────────┐
  │Server     │        │Server     │        │Server        │
  │Action:    │        │Action:    │        │Action:       │
  │generate   │        │getEvent   │        │Generate      │
  │Suggestions │        │Summary    │        │KitchenTasks  │
  └─────┬─────┘        └─────┬─────┘        └──────┬───────┘
        │                   │                     │
        ▼                   ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌──────────────┐
  │AI:        │        │AI:        │        │AI:           │
  │OpenAI     │        │OpenAI     │        │OpenAI        │
  │GPT-4o     │        │GPT-4o     │        │GPT-4o        │
  │(via logic)│        │mini       │        │mini          │
  └───────────┘        └───────────┘        └──────────────┘

LEGEND:
  ──── Existing component
  ┌───┐ NEW component to create
  ════ API endpoint to create
  ❱❱❱ Data flow
```

## Component Dependency Graph

```
production-board-client.tsx (MODIFY)
│
├─► task-card.tsx (existing)
│
├─► suggestions-panel.tsx (REUSE from command-board)
│   │
│   └─► use-suggestions.ts (REUSE from command-board)
│       │
│       └─► /api/ai/suggestions (CREATE)
│           │
│           └─► generateSuggestions() (REUSE from command-board)
│
├─► event-summary-display.tsx (REUSE from events)
│   │
│   └─► getEventSummary() (REUSE from events)
│       │
│       └─► OpenAI GPT-4o-mini (existing)
│
└─► task-generation-dialog.tsx (CREATE)
    │
    └─► /api/kitchen/tasks/generate (CREATE)
        │
        └─► generateKitchenTasks() (CREATE)
            │
            └─► OpenAI GPT-4o-mini (existing)
```

## File Structure Summary

```
apps/app/app/(authenticated)/kitchen/
├── page.tsx                          # Server component (entry point)
├── layout.tsx                        # Module layout
├── production-board-client.tsx       # Main client component ⭐ TARGET
├── production-board-realtime.tsx     # Ably real-time subscriptions
├── task-card.tsx                     # Task display component
├── recipes/                          # Recipe management
│   ├── page.tsx
│   ├── recipes-page-client.tsx
│   └── [id]/page.tsx
├── prep-lists/                       # Prep list management
│   ├── page.tsx
│   └── prep-list-client.tsx
├── tasks/                            # Task management
│   ├── page.tsx
│   └── new/page.tsx
└── [other sub-pages]

apps/app/app/(authenticated)/command-board/  # Reference implementations
├── components/
│   └── suggestions-panel.tsx       # ⭐ Reuse for suggestions
├── hooks/
│   └── use-suggestions.ts          # ⭐ Hook for fetching suggestions
└── actions/
    └── suggestions-types.ts        # ⭐ Type definitions

apps/app/app/(authenticated)/events/        # Reference implementations
├── components/
│   ├── event-summary-display.tsx    # ⭐ Reuse for event summaries
│   └── events-suggestions.tsx       # ⭐ Reference integration
└── actions/
    └── event-summary.ts             # ⭐ Type definitions

apps/app/app/api/
├── kitchen/
│   ├── tasks/
│   │   ├── route.ts                # List/create tasks
│   │   ├── [id]/route.ts           # Update/delete task
│   │   ├── [id]/claim/route.ts     # Claim task
│   │   └── [id]/release/route.ts   # Release task
│   └── prep-lists/
│       └── generate/route.ts       # ⭐ Reference AI generation
└── events/
    └── [eventId]/
        └── [endpoints]             # Event-related APIs
```

## Next Steps

1. **Verify Dependencies:**
   - Check if `useSuggestions` hook exists
   - Verify suggestion types are defined
   - Confirm event summary API endpoints

2. **Create API Endpoints:**
   - `POST /api/kitchen/tasks/generate` - AI task generation
   - `GET /api/kitchen/suggestions` - Smart suggestions
   - `GET /api/kitchen/events/summary` - Event summaries

3. **Implement Components:**
   - Add suggestions panel to sidebar
   - Create event summary card component
   - Build task generation dialog

4. **Test Integration:**
   - Verify real-time updates work with AI features
   - Test suggestions dismissal and action handling
   - Ensure mobile responsiveness

5. **Refine UX:**
   - Add loading states
   - Implement error handling
   - Gather user feedback
   - Iterate on suggestions quality

## Notes

- The kitchen production board uses Ably for real-time updates
- All components use `@repo/design-system` UI components
- Database access via Prisma with multi-tenant isolation
- Existing prep-list generation uses AI (good reference)
- Event summary component is feature-complete (can reuse directly)
- Command board has suggestions infrastructure (can adapt)
