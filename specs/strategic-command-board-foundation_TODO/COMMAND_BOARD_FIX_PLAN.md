# Command Board - Prioritized Fix List

**Last Updated:** February 8, 2026  
**Status:** 🚨 CRITICAL - Blocking User Adoption

---

## Fix Strategy

**Goal:** Make the command board actually useful within 1 week

**Approach:**
1. Fix the most critical UX blocker (entity linking)
2. Add basic board management
3. Polish visual design
4. Integrate AI properly
5. Connect to other modules

---

## Phase 1: Core Functionality (Days 1-3)

### Day 1: Entity Linking Foundation

**Schema Changes:**
```sql
-- Add entity relation columns to command_board_cards
ALTER TABLE tenant_events.command_board_cards
  ADD COLUMN event_id UUID REFERENCES tenant_events.events(id),
  ADD COLUMN client_id UUID REFERENCES tenant_crm.clients(id),
  ADD COLUMN task_id UUID REFERENCES tenant_kitchen.prep_tasks(id),
  ADD COLUMN employee_id UUID REFERENCES tenant_staff.employees(id),
  ADD COLUMN inventory_id UUID REFERENCES tenant_inventory.inventory_items(id),
  ADD COLUMN recipe_id UUID REFERENCES tenant_kitchen.recipes(id);
  
-- Add indexes
CREATE INDEX idx_command_board_cards_event_id 
  ON tenant_events.command_board_cards(tenant_id, event_id);
-- ... (repeat for other entity types)
```

**Files to Update:**
1. `packages/database/prisma/schema.prisma` - Add optional entity relations
2. Run `pnpm migrate` to generate migration
3. Run `pnpm db:deploy` to apply migration

**Validation:**
```bash
pnpm build
pnpm check
pnpm lint
```

**Commit:** `feat(command-board): add entity linking schema`

---

### Day 2: Entity-Aware Card Loading

**Update Card Actions:**

File: `apps/app/app/(authenticated)/command-board/actions/cards.ts`

```typescript
// Add entity loading to createCard
export async function createCard(
  boardId: string,
  input: CreateCardInput & {
    eventId?: string;
    clientId?: string;
    taskId?: string;
    // ... other entity IDs
  }
): Promise<CardResult> {
  // ... existing code ...
  
  const card = await database.commandBoardCard.create({
    data: {
      // ... existing fields ...
      eventId: input.eventId ?? null,
      clientId: input.clientId ?? null,
      taskId: input.taskId ?? null,
      // ... other entity IDs
    },
  });
  
  // Fetch entity data if ID provided
  let entityData = null;
  if (card.eventId) {
    entityData = await database.event.findUnique({
      where: { tenantId_id: { tenantId, id: card.eventId } },
      select: { title: true, eventDate: true, guestCount: true, /* ... */ }
    });
  } else if (card.clientId) {
    // ... fetch client data
  }
  // ... etc
  
  return {
    success: true,
    card: {
      // ... existing fields ...
      entityData, // Add loaded entity data
    },
  };
}
```

**Update Card Types:**

File: `apps/app/app/(authenticated)/command-board/types.ts`

```typescript
export interface CommandBoardCard {
  // ... existing fields ...
  
  // Entity reference IDs
  eventId?: string | null;
  clientId?: string | null;
  taskId?: string | null;
  employeeId?: string | null;
  inventoryId?: string | null;
  recipeId?: string | null;
  
  // Loaded entity data (computed)
  entityData?: {
    event?: { title: string; eventDate: Date; guestCount: number; /* ... */ };
    client?: { name: string; email: string; phone: string; /* ... */ };
    task?: { name: string; dueByDate: Date; status: string; /* ... */ };
    // ... etc
  };
}
```

**Commit:** `feat(command-board): add entity data loading to cards`

---

### Day 3: Update Card Components to Display Entity Data

**Event Card:**

File: `apps/app/app/(authenticated)/command-board/components/cards/event-card.tsx`

```tsx
export function EventCard({ card, ...props }: CardProps) {
  const event = card.entityData?.event;
  
  if (!event) {
    return <GenericCard card={card} {...props} />;
  }
  
  return (
    <div className="h-full flex flex-col bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900 truncate">{event.title}</h3>
      </div>
      
      <div className="space-y-1 text-sm text-blue-700">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {format(new Date(event.eventDate), 'MMM d, yyyy')}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {event.guestCount} guests
        </div>
        {event.venue && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {event.venue.name}
          </div>
        )}
      </div>
      
      <div className="mt-auto pt-2 border-t border-blue-200">
        <Button asChild size="sm" variant="ghost" className="w-full">
          <a href={`/events/${card.eventId}`}>View Details →</a>
        </Button>
      </div>
    </div>
  );
}
```

**Repeat for other card types:**
- `client-card.tsx` - Purple theme, contact info
- `task-card.tsx` - Green theme, due date, status
- `employee-card.tsx` - Orange theme, role, avatar
- `inventory-card.tsx` - Yellow theme, quantity, reorder level
- `recipe-card.tsx` - Pink theme, ingredients, difficulty

**Commit:** `feat(command-board): update card components with entity data display`

---

## Phase 2: Board Management (Days 4-5)

### Day 4: Board List UI

**Create Board List Page:**

File: `apps/app/app/(authenticated)/command-board/page.tsx`

```tsx
import { listCommandBoards } from './actions/boards';
import { BoardList } from './components/board-list';

export default async function CommandBoardsPage() {
  const boards = await listCommandBoards();
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Command Boards</h1>
          <p className="text-muted-foreground">
            Strategic overview boards for your operations
          </p>
        </div>
        <CreateBoardDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </CreateBoardDialog>
      </div>
      
      <BoardList boards={boards} />
    </div>
  );
}
```

**Create Board List Component:**

File: `apps/app/app/(authenticated)/command-board/components/board-list.tsx`

```tsx
export function BoardList({ boards }: { boards: CommandBoard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <Card key={board.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>{board.name}</CardTitle>
            <CardDescription>{board.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <LayoutGrid className="h-4 w-4" />
                {board.cards.length} cards
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDistanceToNow(board.updatedAt)} ago
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/command-board/${board.id}`}>
                Open Board →
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

**Commit:** `feat(command-board): add board list and management UI`

---

### Day 5: Board Selector & Creation

**Board Selector Dropdown:**

File: `apps/app/app/(authenticated)/command-board/components/board-selector.tsx`

```tsx
export function BoardSelector({ currentBoardId }: { currentBoardId: string }) {
  const [boards, setBoards] = useState<CommandBoard[]>([]);
  
  useEffect(() => {
    listCommandBoards().then(setBoards);
  }, []);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutGrid className="mr-2 h-4 w-4" />
          {boards.find(b => b.id === currentBoardId)?.name || 'Select Board'}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Your Boards</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {boards.map((board) => (
          <DropdownMenuItem key={board.id} asChild>
            <Link href={`/command-board/${board.id}`} className="flex items-center justify-between">
              <span className={board.id === currentBoardId ? 'font-semibold' : ''}>
                {board.name}
              </span>
              {board.id === currentBoardId && (
                <Check className="h-4 w-4" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/command-board" className="text-primary">
            <LayoutGrid className="mr-2 h-4 w-4" />
            View All Boards
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Add to Board Canvas Header:**

File: `apps/app/app/(authenticated)/command-board/components/board-canvas-realtime.tsx`

Update the toolbar to include:
```tsx
<div className="flex items-center gap-2">
  <BoardSelector currentBoardId={boardId} />
  {/* ... existing buttons ... */}
</div>
```

**Commit:** `feat(command-board): add board selector dropdown`

---

## Phase 3: Polish & Integration (Days 6-7)

### Day 6: Visual Design Improvements

**Update Card Styling:**

Add to tailwind config or create utility classes:
```css
/* Card type colors */
.card-event { @apply bg-blue-50 border-blue-200; }
.card-task { @apply bg-green-50 border-green-200; }
.card-client { @apply bg-purple-50 border-purple-200; }
.card-employee { @apply bg-orange-50 border-orange-200; }
.card-inventory { @apply bg-yellow-50 border-yellow-200; }
.card-recipe { @apply bg-pink-50 border-pink-200; }
.card-note { @apply bg-gray-50 border-gray-200; }

/* Status indicators */
.status-overdue { @apply border-red-500 border-2 animate-pulse; }
.status-due-soon { @apply border-yellow-500 border-2; }
.status-in-progress { @apply border-blue-500; }
.status-completed { @apply border-green-500; }
```

**Add Status Badges:**
```tsx
function getStatusBadge(card: CommandBoardCard) {
  if (card.entityData?.event) {
    const daysUntil = differenceInDays(card.entityData.event.eventDate, new Date());
    if (daysUntil < 0) return <Badge variant="destructive">Overdue</Badge>;
    if (daysUntil <= 7) return <Badge variant="warning">Due Soon</Badge>;
  }
  // ... similar for tasks, etc.
  return null;
}
```

**Commit:** `style(command-board): improve card visual design`

---

### Day 7: Module Integration

**Add "Add to Board" Buttons:**

File: `apps/app/app/(authenticated)/events/[eventId]/components/event-detail-header.tsx`

```tsx
import { AddToBoardButton } from '../../command-board/components/add-to-board-button';

// In header actions:
<AddToBoardButton
  entityType="event"
  entityId={event.id}
  entityTitle={event.title}
/>
```

**Create AddToBoardButton Component:**

File: `apps/app/app/(authenticated)/command-board/components/add-to-board-button.tsx`

```tsx
export function AddToBoardButton({
  entityType,
  entityId,
  entityTitle,
}: {
  entityType: 'event' | 'client' | 'task' | 'employee' | 'inventory' | 'recipe';
  entityId: string;
  entityTitle: string;
}) {
  const [boards, setBoards] = useState<CommandBoard[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const handleAddToBoard = async (boardId: string) => {
    await createCard(boardId, {
      title: entityTitle,
      cardType: entityType,
      [`${entityType}Id`]: entityId,
      position: { x: 200, y: 200, width: 300, height: 200, zIndex: 1 },
    });
    
    toast.success(`Added to board`);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LayoutGrid className="mr-2 h-4 w-4" />
          Add to Board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Command Board</DialogTitle>
          <DialogDescription>
            Select a board to add this {entityType}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {boards.map((board) => (
            <Button
              key={board.id}
              onClick={() => handleAddToBoard(board.id)}
              variant="outline"
              className="w-full justify-start"
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              {board.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Add to these locations:**
- Event detail pages
- Client detail pages
- Task lists (bulk add)
- Staff directory

**Commit:** `feat(command-board): add "Add to Board" integration buttons`

---

## Validation Checklist

After implementing all phases:

### Functional Tests
- [ ] Create new board from board list page
- [ ] Open board shows empty canvas
- [ ] Click "Add Card" -> opens card type selector
- [ ] Select "Event" -> shows event search/picker
- [ ] Add existing event to board
- [ ] Card displays real event data (name, date, guests)
- [ ] Click card "View Details" -> navigates to event page
- [ ] From event page, click "Add to Board" -> adds to board
- [ ] Switch between boards using board selector
- [ ] Drag event card, position persists
- [ ] Create group with 2+ cards
- [ ] Bulk edit selected cards

### Visual Tests
- [ ] Event cards have blue theme
- [ ] Task cards have green theme
- [ ] Client cards have purple theme
- [ ] Overdue events show red border
- [ ] Cards have proper spacing and typography
- [ ] Board canvas is visually appealing

### AI Tests
- [ ] Click "AI Suggestions" button
- [ ] Suggestions panel slides in
- [ ] Suggestions are contextual to board content
- [ ] Click "Detect Conflicts" -> highlights conflicting cards
- [ ] Conflicts show in panel with descriptions

### Navigation Tests
- [ ] Navigate to /command-board -> shows board list
- [ ] Click board -> opens board canvas
- [ ] Board selector in header shows current board
- [ ] Switch boards using dropdown
- [ ] Breadcrumbs show current location

---

## Repo Commands (Execute After Each Phase)

```bash
# After schema changes
pnpm migrate
pnpm db:deploy

# After code changes (each commit)
pnpm build
pnpm check
pnpm lint
pnpm test

# Stage and commit
git add -A
git commit -m "feat(command-board): <description>"

# Verify no type errors
pnpm tscheck
```

---

## Success Criteria

The command board will be considered "fixed" when:

1. ✅ Users can add real events, clients, tasks to boards
2. ✅ Cards show live entity data, not generic stubs
3. ✅ Users can create and manage multiple boards
4. ✅ Visual design is professional and appealing
5. ✅ AI features are discoverable and useful
6. ✅ Board integrates with rest of application
7. ✅ Navigation is intuitive and contextual
8. ✅ User feedback: "Actually useful for daily operations"

---

**Estimated Total Effort:** 6-7 days (1 developer)  
**Priority:** P0 - Critical  
**Status:** 🚨 Ready to start
