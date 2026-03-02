# Command Board Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken command board with a spatial operations layer that IS the app — entity projections on a React Flow canvas with derived connections, AI command interface, and slide-over detail panels.

**Architecture:** Board as default route. `BoardProjection` replaces `CommandBoardCard` — every card is a live view of a real entity (event, client, task, employee, etc.) with no duplicated data. React Flow (`@xyflow/react`) replaces the custom canvas-viewport + react-moveable stack. Connections are derived from real database relationships. Liveblocks provides realtime collaboration. AI operates on the board via command palette and chat panel.

**Tech Stack:** @xyflow/react 12.x, @liveblocks/react 3.x, Next.js 16, React 19, Prisma, Tailwind v4, shadcn/ui, Sonner, Lucide icons

---

## Design Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Realtime | Fix Liveblocks (3.x supports React 19) | Already paid for, stubs just need replacing |
| Default route | Board is home page | Board IS the app, not a module |
| Schema migration | Clean break — new `BoardProjection` table | Old cards are mostly test data, not worth migrating |
| Canvas library | @xyflow/react (React Flow) | Purpose-built: nodes, edges, zoom/pan, grouping, minimap, selection — all built-in |
| Drag library | Remove react-moveable entirely | React Flow handles drag natively, react-moveable fought the viewport |
| AI interface | Command palette + chat panel | Quick commands via Cmd+K, complex conversations via side panel |
| Detail views | Slide-over panel (Sheet component) | Never leave the board — entity details open as right-side panel |
| Auto-population | Smart defaults with user control | Default board shows this week's events + overdue tasks + flagged items |
| Notes | Note as entity (new DB model) | Every card projects an entity — notes are first-class entities |

## What We're Keeping

| Component | Path | Why |
|-----------|------|-----|
| Board CRUD actions | `actions/boards.ts` | Solid, just needs minor updates |
| Group CRUD actions | `actions/groups.ts` | Good logic, rewire to new schema |
| Entity data resolver | `actions/entity-data.ts` | Sound approach, needs batching |
| Suggestions engine | `actions/suggestions.ts` | Rule-based engine works, needs board-aware actions |
| Conflict detection | `actions/conflicts.ts` | Keep the API call pattern |
| Board list page | `components/boards-list-client.tsx` | Works well |
| Board header | `components/board-header.tsx` | Good, needs command palette integration |
| Design system | `@repo/design-system` | All shadcn/ui components, brand colors, fonts |
| Collaboration package | `packages/collaboration/` | Structure is right, replace stubs with real Liveblocks |

## What We're Replacing

| Old | New | Why |
|-----|-----|-----|
| `board-canvas.tsx` (580 lines) | New React Flow canvas | Active canvas doesn't persist, creates ephemeral cards |
| `board-canvas-realtime.tsx` (2703 lines) | Deleted (dead code) | Never used in production, wrong interaction model |
| `canvas-viewport.tsx` (716 lines) | React Flow's built-in viewport | React Flow handles zoom/pan natively |
| `draggable-card.tsx` (305 lines) | React Flow custom nodes | React Flow handles drag natively, no react-moveable |
| `connection-lines.tsx` (244 lines) | React Flow edges + derived connections | Edges are first-class in React Flow |
| `grid-layer.tsx` (47 lines) | React Flow Background component | Built-in grid/dots background |
| `viewport-controls.tsx` (584 lines) | React Flow Controls + MiniMap | Built-in controls |
| `CommandBoardCard` model | `BoardProjection` model | Cards are projections, not data containers |
| `CommandBoardConnection` model | Derived connections + `BoardAnnotation` | Connections come from real data relationships |
| `cards.ts` actions | `projections.ts` actions | CRUD for projections, not cards |
| `command-board-realtime-client.tsx` | Deleted | Transitional file, not used |

---

## Phase 0: Foundation (Database + Dependencies)

### Task 0.1: Install @xyflow/react

**Files:**
- Modify: `apps/app/package.json`

**Step 1: Install React Flow**
```bash
pnpm add @xyflow/react --filter app
```

**Step 2: Verify installation**
```bash
pnpm ls @xyflow/react --filter app
```
Expected: `@xyflow/react 12.x.x`

**Step 3: Remove react-moveable**
```bash
pnpm remove react-moveable --filter app
pnpm remove react-moveable --filter @repo/design-system
```

**Step 4: Verify no react-moveable references remain in new code**
We'll clean up imports in later tasks as we replace components.

**Step 5: Commit**
```bash
git add -A
git commit -m "chore(command-board): add @xyflow/react, remove react-moveable"
```

---

### Task 0.2: Create BoardProjection Schema

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add EntityType enum and BoardProjection model**

Add after the existing `CommandBoardGroup` model:

```prisma
enum EntityType {
  event
  client
  prep_task
  kitchen_task
  employee
  inventory_item
  recipe
  dish
  proposal
  shipment
  note

  @@schema("tenant_events")
}

model BoardProjection {
  tenantId      String     @map("tenant_id") @db.Uuid
  id            String     @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  boardId       String     @map("board_id") @db.Uuid
  entityType    EntityType @map("entity_type")
  entityId      String     @map("entity_id") @db.Uuid
  positionX     Int        @default(0) @map("position_x")
  positionY     Int        @default(0) @map("position_y")
  width         Int        @default(280)
  height        Int        @default(180)
  zIndex        Int        @default(0) @map("z_index")
  colorOverride String?    @map("color_override")
  collapsed     Boolean    @default(false)
  groupId       String?    @map("group_id") @db.Uuid
  pinned        Boolean    @default(false)
  createdAt     DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime   @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime?  @map("deleted_at") @db.Timestamptz(6)

  board CommandBoard      @relation(fields: [tenantId, boardId], references: [tenantId, id], onDelete: Cascade)
  group CommandBoardGroup? @relation("ProjectionGroup", fields: [tenantId, groupId], references: [tenantId, id])

  @@id([tenantId, id])
  @@unique([boardId, entityType, entityId])
  @@index([boardId])
  @@index([entityType, entityId])
  @@map("board_projections")
  @@schema("tenant_events")
}
```

**Step 2: Add Note model**

```prisma
model Note {
  tenantId  String   @map("tenant_id") @db.Uuid
  id        String   @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title     String
  content   String?
  color     String?
  tags      String[]
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  @@id([tenantId, id])
  @@map("notes")
  @@schema("tenant_events")
}
```

**Step 3: Add BoardScope to CommandBoard model**

Update the existing `CommandBoard` model — add these fields:

```prisma
  // Add to CommandBoard model:
  scope        Json?    // { entityTypes: [], dateRange: {}, statuses: [], assignedTo: [] }
  autoPopulate Boolean  @default(false) @map("auto_populate")
```

**Step 4: Update CommandBoard relations**

Add `projections BoardProjection[]` to the CommandBoard model's relations.

**Step 5: Update CommandBoardGroup relations**

Add `projections BoardProjection[] @relation("ProjectionGroup")` to the CommandBoardGroup model.

**Step 6: Add BoardAnnotation model** (for manual connections/labels)

```prisma
model BoardAnnotation {
  tenantId        String   @map("tenant_id") @db.Uuid
  id              String   @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  boardId         String   @map("board_id") @db.Uuid
  annotationType  String   @default("connection") @map("annotation_type") // "connection" | "label" | "region"
  fromProjectionId String? @map("from_projection_id") @db.Uuid
  toProjectionId   String? @map("to_projection_id") @db.Uuid
  label           String?
  color           String?
  style           String?  // "solid" | "dashed" | "dotted"
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz(6)

  board CommandBoard @relation(fields: [tenantId, boardId], references: [tenantId, id], onDelete: Cascade)

  @@id([tenantId, id])
  @@index([boardId])
  @@map("board_annotations")
  @@schema("tenant_events")
}
```

Add `annotations BoardAnnotation[]` to CommandBoard model.

**Step 7: Generate and run migration**
```bash
pnpm --filter @repo/database prisma migrate dev --name add_board_projection_schema
```

**Step 8: Generate Prisma client**
```bash
pnpm --filter @repo/database prisma generate
```

**Step 9: Verify build**
```bash
pnpm --filter @repo/database build
```

**Step 10: Commit**
```bash
git add -A
git commit -m "feat(database): add BoardProjection, Note, BoardAnnotation schema"
```

---

### Task 0.3: Create Core Types

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/types/index.ts`
- Create: `apps/app/app/(authenticated)/command-board/types/entities.ts`
- Create: `apps/app/app/(authenticated)/command-board/types/board.ts`
- Create: `apps/app/app/(authenticated)/command-board/types/flow.ts`

The old `types.ts` (1074 lines) is a monolith. Split into focused modules.

**Step 1: Create entity types** (`types/entities.ts`)

```typescript
// Types for resolved entity data displayed on cards
// These are the shapes returned by the entity resolver — read-only display data

import type { EntityType } from "@repo/database";

export type { EntityType };

export interface ResolvedEvent {
  id: string;
  title: string;
  eventDate: Date | null;
  guestCount: number | null;
  status: string;
  budget: number | null;
  clientName: string | null;
  venueName: string | null;
  assignedTo: string | null;
}

export interface ResolvedClient {
  id: string;
  clientType: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export interface ResolvedPrepTask {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  dueByDate: Date | null;
  eventTitle: string | null;
  eventId: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
}

export interface ResolvedKitchenTask {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: Date | null;
}

export interface ResolvedEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  roleName: string | null;
  isActive: boolean;
}

export interface ResolvedInventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantityOnHand: number;
  parLevel: number | null;
  unit: string | null;
}

export interface ResolvedRecipe {
  id: string;
  name: string;
  category: string | null;
  cuisineType: string | null;
  latestVersion: {
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    yieldQuantity: number | null;
    totalCost: number | null;
  } | null;
}

export interface ResolvedDish {
  id: string;
  name: string;
  category: string | null;
  serviceStyle: string | null;
  pricePerPerson: number | null;
  dietaryTags: string[];
}

export interface ResolvedProposal {
  id: string;
  proposalNumber: string | null;
  title: string;
  status: string;
  total: number | null;
  clientName: string | null;
}

export interface ResolvedShipment {
  id: string;
  shipmentNumber: string | null;
  status: string;
  eventTitle: string | null;
  supplierName: string | null;
  itemCount: number;
}

export interface ResolvedNote {
  id: string;
  title: string;
  content: string | null;
  color: string | null;
  tags: string[];
}

export type ResolvedEntity =
  | { type: "event"; data: ResolvedEvent }
  | { type: "client"; data: ResolvedClient }
  | { type: "prep_task"; data: ResolvedPrepTask }
  | { type: "kitchen_task"; data: ResolvedKitchenTask }
  | { type: "employee"; data: ResolvedEmployee }
  | { type: "inventory_item"; data: ResolvedInventoryItem }
  | { type: "recipe"; data: ResolvedRecipe }
  | { type: "dish"; data: ResolvedDish }
  | { type: "proposal"; data: ResolvedProposal }
  | { type: "shipment"; data: ResolvedShipment }
  | { type: "note"; data: ResolvedNote };

/** Get display title for any resolved entity */
export function getEntityTitle(entity: ResolvedEntity): string {
  switch (entity.type) {
    case "event":
      return entity.data.title;
    case "client":
      return entity.data.companyName ?? `${entity.data.firstName ?? ""} ${entity.data.lastName ?? ""}`.trim();
    case "prep_task":
      return entity.data.name;
    case "kitchen_task":
      return entity.data.title;
    case "employee":
      return `${entity.data.firstName} ${entity.data.lastName}`;
    case "inventory_item":
      return entity.data.name;
    case "recipe":
      return entity.data.name;
    case "dish":
      return entity.data.name;
    case "proposal":
      return entity.data.title;
    case "shipment":
      return entity.data.shipmentNumber ?? `Shipment ${entity.data.id.slice(0, 8)}`;
    case "note":
      return entity.data.title;
  }
}

/** Get status string for any resolved entity (if applicable) */
export function getEntityStatus(entity: ResolvedEntity): string | null {
  switch (entity.type) {
    case "event":
      return entity.data.status;
    case "prep_task":
      return entity.data.status;
    case "kitchen_task":
      return entity.data.status;
    case "proposal":
      return entity.data.status;
    case "shipment":
      return entity.data.status;
    default:
      return null;
  }
}
```

**Step 2: Create board types** (`types/board.ts`)

```typescript
import type { EntityType } from "@repo/database";

export interface BoardProjection {
  id: string;
  tenantId: string;
  boardId: string;
  entityType: EntityType;
  entityId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
  colorOverride: string | null;
  collapsed: boolean;
  groupId: string | null;
  pinned: boolean;
}

export interface BoardScope {
  entityTypes: EntityType[];
  dateRange?: { start: string; end: string };
  statuses?: string[];
  assignedTo?: string[];
  tags?: string[];
}

export interface CommandBoard {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  scope: BoardScope | null;
  autoPopulate: boolean;
  tags: string[];
}

export interface BoardGroup {
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  color: string | null;
  collapsed: boolean;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface BoardAnnotation {
  id: string;
  boardId: string;
  annotationType: "connection" | "label" | "region";
  fromProjectionId: string | null;
  toProjectionId: string | null;
  label: string | null;
  color: string | null;
  style: string | null;
}

export interface DerivedConnection {
  id: string; // deterministic: `${fromProjectionId}-${toProjectionId}-${type}`
  fromProjectionId: string;
  toProjectionId: string;
  relationshipType: string;
  label: string;
  derived: true;
}
```

**Step 3: Create React Flow types** (`types/flow.ts`)

```typescript
import type { Node, Edge } from "@xyflow/react";
import type { ResolvedEntity } from "./entities";
import type { BoardProjection, DerivedConnection, BoardAnnotation } from "./board";

/** Custom node data for entity projection nodes */
export interface ProjectionNodeData {
  projection: BoardProjection;
  entity: ResolvedEntity | null;
  stale: boolean; // Entity was deleted
  selected: boolean;
  onOpenDetail: (entityType: string, entityId: string) => void;
}

/** Custom node data for group nodes */
export interface GroupNodeData {
  groupId: string;
  name: string;
  color: string | null;
  collapsed: boolean;
}

export type ProjectionNode = Node<ProjectionNodeData, "projection">;
export type GroupNode = Node<GroupNodeData, "group">;
export type BoardNode = ProjectionNode | GroupNode;

/** Edge data for derived connections */
export interface DerivedEdgeData {
  derived: true;
  relationshipType: string;
  label: string;
}

/** Edge data for manual annotations */
export interface AnnotationEdgeData {
  derived: false;
  annotationId: string;
  label: string | null;
  style: string | null;
}

export type BoardEdge = Edge<DerivedEdgeData | AnnotationEdgeData>;
```

**Step 4: Create barrel export** (`types/index.ts`)

```typescript
export * from "./entities";
export * from "./board";
export * from "./flow";
```

**Step 5: Commit**
```bash
git add -A
git commit -m "feat(command-board): add redesigned type system"
```

---

## Phase 1: Entity Resolution Layer

### Task 1.1: Build Batched Entity Resolver

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/actions/resolve-entities.ts`

This replaces the old `entity-data.ts` with a proper batched resolver that fetches all entities for a board in minimal queries.

**Step 1: Implement the resolver**

```typescript
"use server";

import { database, requireTenantId } from "@/lib/tenant";
import type { EntityType } from "@repo/database";
import type { ResolvedEntity } from "../types";

interface ProjectionRef {
  entityType: EntityType;
  entityId: string;
}

/**
 * Resolve all entity data for a set of projections in batched queries.
 * One query per entity type instead of one query per card.
 */
export async function resolveEntities(
  refs: ProjectionRef[]
): Promise<Map<string, ResolvedEntity>> {
  const tenantId = await requireTenantId();
  const results = new Map<string, ResolvedEntity>();

  // Group by entity type for batched queries
  const grouped = new Map<EntityType, string[]>();
  for (const ref of refs) {
    const ids = grouped.get(ref.entityType) ?? [];
    ids.push(ref.entityId);
    grouped.set(ref.entityType, ids);
  }

  // Resolve each type in parallel
  const resolvers: Promise<void>[] = [];

  const eventIds = grouped.get("event");
  if (eventIds?.length) {
    resolvers.push(
      resolveEvents(tenantId, eventIds).then((entities) => {
        for (const entity of entities) {
          results.set(`event:${entity.data.id}`, entity);
        }
      })
    );
  }

  const clientIds = grouped.get("client");
  if (clientIds?.length) {
    resolvers.push(
      resolveClients(tenantId, clientIds).then((entities) => {
        for (const entity of entities) {
          results.set(`client:${entity.data.id}`, entity);
        }
      })
    );
  }

  const prepTaskIds = grouped.get("prep_task");
  if (prepTaskIds?.length) {
    resolvers.push(
      resolvePrepTasks(tenantId, prepTaskIds).then((entities) => {
        for (const entity of entities) {
          results.set(`prep_task:${entity.data.id}`, entity);
        }
      })
    );
  }

  const kitchenTaskIds = grouped.get("kitchen_task");
  if (kitchenTaskIds?.length) {
    resolvers.push(
      resolveKitchenTasks(tenantId, kitchenTaskIds).then((entities) => {
        for (const entity of entities) {
          results.set(`kitchen_task:${entity.data.id}`, entity);
        }
      })
    );
  }

  const employeeIds = grouped.get("employee");
  if (employeeIds?.length) {
    resolvers.push(
      resolveEmployees(tenantId, employeeIds).then((entities) => {
        for (const entity of entities) {
          results.set(`employee:${entity.data.id}`, entity);
        }
      })
    );
  }

  const inventoryIds = grouped.get("inventory_item");
  if (inventoryIds?.length) {
    resolvers.push(
      resolveInventoryItems(tenantId, inventoryIds).then((entities) => {
        for (const entity of entities) {
          results.set(`inventory_item:${entity.data.id}`, entity);
        }
      })
    );
  }

  const recipeIds = grouped.get("recipe");
  if (recipeIds?.length) {
    resolvers.push(
      resolveRecipes(tenantId, recipeIds).then((entities) => {
        for (const entity of entities) {
          results.set(`recipe:${entity.data.id}`, entity);
        }
      })
    );
  }

  const noteIds = grouped.get("note");
  if (noteIds?.length) {
    resolvers.push(
      resolveNotes(tenantId, noteIds).then((entities) => {
        for (const entity of entities) {
          results.set(`note:${entity.data.id}`, entity);
        }
      })
    );
  }

  // Add resolvers for dish, proposal, shipment similarly...

  await Promise.all(resolvers);
  return results;
}

async function resolveEvents(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const events = await database.event.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true, title: true, eventDate: true, guestCount: true,
      status: true, budget: true, assignedTo: true,
      client: { select: { company_name: true, first_name: true, last_name: true } },
      location: { select: { name: true } },
    },
  });

  return events.map((e) => ({
    type: "event" as const,
    data: {
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      guestCount: e.guestCount,
      status: e.status,
      budget: e.budget ? Number(e.budget) : null,
      clientName: e.client?.company_name ?? (e.client ? `${e.client.first_name ?? ""} ${e.client.last_name ?? ""}`.trim() : null),
      venueName: e.location?.name ?? null,
      assignedTo: e.assignedTo,
    },
  }));
}

async function resolveClients(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const clients = await database.client.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true, clientType: true, company_name: true,
      first_name: true, last_name: true, email: true, phone: true,
    },
  });

  return clients.map((c) => ({
    type: "client" as const,
    data: {
      id: c.id,
      clientType: c.clientType ?? "individual",
      companyName: c.company_name,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone,
    },
  }));
}

async function resolvePrepTasks(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const tasks = await database.prepTask.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true, name: true, status: true, priority: true, dueByDate: true, eventId: true,
    },
  });

  return tasks.map((t) => ({
    type: "prep_task" as const,
    data: {
      id: t.id,
      name: t.name,
      status: t.status,
      priority: t.priority,
      dueByDate: t.dueByDate,
      eventTitle: null, // Could join but keeping queries fast
      eventId: t.eventId,
      assigneeName: null,
      assigneeId: null,
    },
  }));
}

async function resolveKitchenTasks(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const tasks = await database.kitchenTask.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: { id: true, title: true, status: true, priority: true, dueDate: true },
  });

  return tasks.map((t) => ({
    type: "kitchen_task" as const,
    data: { id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate },
  }));
}

async function resolveEmployees(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const employees = await database.user.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      role: true, userRole: { select: { name: true } }, isActive: true,
    },
  });

  return employees.map((e) => ({
    type: "employee" as const,
    data: {
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      role: e.role,
      roleName: e.userRole?.name ?? null,
      isActive: e.isActive,
    },
  }));
}

async function resolveInventoryItems(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const items = await database.inventoryItem.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true, name: true, category: true,
      quantityOnHand: true, parLevel: true, unit: true,
    },
  });

  return items.map((i) => ({
    type: "inventory_item" as const,
    data: {
      id: i.id,
      name: i.name,
      category: i.category,
      quantityOnHand: Number(i.quantityOnHand),
      parLevel: i.parLevel ? Number(i.parLevel) : null,
      unit: i.unit,
    },
  }));
}

async function resolveRecipes(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const recipes = await database.recipe.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true, name: true, category: true, cuisineType: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { prepTimeMinutes: true, cookTimeMinutes: true, yieldQuantity: true, totalCost: true },
      },
    },
  });

  return recipes.map((r) => ({
    type: "recipe" as const,
    data: {
      id: r.id,
      name: r.name,
      category: r.category,
      cuisineType: r.cuisineType,
      latestVersion: r.versions[0] ? {
        prepTimeMinutes: r.versions[0].prepTimeMinutes,
        cookTimeMinutes: r.versions[0].cookTimeMinutes,
        yieldQuantity: r.versions[0].yieldQuantity ? Number(r.versions[0].yieldQuantity) : null,
        totalCost: r.versions[0].totalCost ? Number(r.versions[0].totalCost) : null,
      } : null,
    },
  }));
}

async function resolveNotes(tenantId: string, ids: string[]): Promise<ResolvedEntity[]> {
  const notes = await database.note.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: { id: true, title: true, content: true, color: true, tags: true },
  });

  return notes.map((n) => ({
    type: "note" as const,
    data: { id: n.id, title: n.title, content: n.content, color: n.color, tags: n.tags },
  }));
}
```

**Step 2: Verify typecheck**
```bash
pnpm --filter app typecheck
```

**Step 3: Commit**
```bash
git add -A
git commit -m "feat(command-board): add batched entity resolver"
```

---

### Task 1.2: Build Derived Connection Engine

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/actions/derive-connections.ts`

This replaces the old auto-connection logic. Instead of matching metadata fields on cards, it queries actual database relationships.

**Step 1: Implement the connection deriver**

```typescript
"use server";

import { database, requireTenantId } from "@/lib/tenant";
import type { EntityType } from "@repo/database";
import type { DerivedConnection } from "../types";

interface ProjectionRef {
  id: string;
  entityType: EntityType;
  entityId: string;
}

/**
 * Derive connections between projections based on real database relationships.
 * Only returns connections where BOTH endpoints are on the board.
 */
export async function deriveConnections(
  projections: ProjectionRef[]
): Promise<DerivedConnection[]> {
  const tenantId = await requireTenantId();
  const connections: DerivedConnection[] = [];

  // Build lookup maps for fast matching
  const byTypeAndEntity = new Map<string, ProjectionRef>();
  for (const p of projections) {
    byTypeAndEntity.set(`${p.entityType}:${p.entityId}`, p);
  }

  const eventProjections = projections.filter((p) => p.entityType === "event");
  const prepTaskProjections = projections.filter((p) => p.entityType === "prep_task");
  const employeeProjections = projections.filter((p) => p.entityType === "employee");

  // 1. Event -> Client (via event.clientId)
  if (eventProjections.length > 0) {
    const eventIds = eventProjections.map((p) => p.entityId);
    const events = await database.event.findMany({
      where: { tenantId, id: { in: eventIds }, deletedAt: null },
      select: { id: true, clientId: true },
    });

    for (const event of events) {
      if (!event.clientId) continue;
      const eventProj = byTypeAndEntity.get(`event:${event.id}`);
      const clientProj = byTypeAndEntity.get(`client:${event.clientId}`);
      if (eventProj && clientProj) {
        connections.push({
          id: `${clientProj.id}-${eventProj.id}-client_to_event`,
          fromProjectionId: clientProj.id,
          toProjectionId: eventProj.id,
          relationshipType: "client_to_event",
          label: "has event",
          derived: true,
        });
      }
    }
  }

  // 2. Event -> PrepTask (via prepTask.eventId)
  if (prepTaskProjections.length > 0 && eventProjections.length > 0) {
    const taskIds = prepTaskProjections.map((p) => p.entityId);
    const tasks = await database.prepTask.findMany({
      where: { tenantId, id: { in: taskIds }, deletedAt: null },
      select: { id: true, eventId: true },
    });

    for (const task of tasks) {
      if (!task.eventId) continue;
      const eventProj = byTypeAndEntity.get(`event:${task.eventId}`);
      const taskProj = byTypeAndEntity.get(`prep_task:${task.id}`);
      if (eventProj && taskProj) {
        connections.push({
          id: `${eventProj.id}-${taskProj.id}-event_to_task`,
          fromProjectionId: eventProj.id,
          toProjectionId: taskProj.id,
          relationshipType: "event_to_task",
          label: "includes task",
          derived: true,
        });
      }
    }
  }

  // 3. Event -> Shipment (via shipment.eventId)
  const shipmentProjections = projections.filter((p) => p.entityType === "shipment");
  if (shipmentProjections.length > 0 && eventProjections.length > 0) {
    const shipmentIds = shipmentProjections.map((p) => p.entityId);
    const shipments = await database.shipment.findMany({
      where: { tenantId, id: { in: shipmentIds }, deletedAt: null },
      select: { id: true, eventId: true },
    });

    for (const shipment of shipments) {
      if (!shipment.eventId) continue;
      const eventProj = byTypeAndEntity.get(`event:${shipment.eventId}`);
      const shipmentProj = byTypeAndEntity.get(`shipment:${shipment.id}`);
      if (eventProj && shipmentProj) {
        connections.push({
          id: `${eventProj.id}-${shipmentProj.id}-event_to_shipment`,
          fromProjectionId: eventProj.id,
          toProjectionId: shipmentProj.id,
          relationshipType: "event_to_shipment",
          label: "delivery",
          derived: true,
        });
      }
    }
  }

  // 4. Client -> Proposal (via proposal.clientId)
  const proposalProjections = projections.filter((p) => p.entityType === "proposal");
  if (proposalProjections.length > 0) {
    const proposalIds = proposalProjections.map((p) => p.entityId);
    const proposals = await database.proposal.findMany({
      where: { tenantId, id: { in: proposalIds }, deletedAt: null },
      select: { id: true, clientId: true, eventId: true },
    });

    for (const proposal of proposals) {
      if (proposal.clientId) {
        const clientProj = byTypeAndEntity.get(`client:${proposal.clientId}`);
        const proposalProj = byTypeAndEntity.get(`proposal:${proposal.id}`);
        if (clientProj && proposalProj) {
          connections.push({
            id: `${clientProj.id}-${proposalProj.id}-client_to_proposal`,
            fromProjectionId: clientProj.id,
            toProjectionId: proposalProj.id,
            relationshipType: "client_to_proposal",
            label: "proposal",
            derived: true,
          });
        }
      }
    }
  }

  // 5. EventStaffAssignment: Event -> Employee
  if (eventProjections.length > 0 && employeeProjections.length > 0) {
    const eventIds = eventProjections.map((p) => p.entityId);
    const assignments = await database.eventStaffAssignment.findMany({
      where: { tenantId, eventId: { in: eventIds } },
      select: { eventId: true, employeeId: true, role: true },
    });

    for (const assignment of assignments) {
      const eventProj = byTypeAndEntity.get(`event:${assignment.eventId}`);
      const employeeProj = byTypeAndEntity.get(`employee:${assignment.employeeId}`);
      if (eventProj && employeeProj) {
        const connId = `${eventProj.id}-${employeeProj.id}-event_to_employee`;
        // Avoid duplicates (employee may have multiple roles on same event)
        if (!connections.some((c) => c.id === connId)) {
          connections.push({
            id: connId,
            fromProjectionId: eventProj.id,
            toProjectionId: employeeProj.id,
            relationshipType: "event_to_employee",
            label: assignment.role ?? "assigned",
            derived: true,
          });
        }
      }
    }
  }

  return connections;
}
```

**Step 2: Verify typecheck**
```bash
pnpm --filter app typecheck
```

**Step 3: Commit**
```bash
git add -A
git commit -m "feat(command-board): add derived connection engine"
```

---

### Task 1.3: Build Projection CRUD Actions

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/actions/projections.ts`

**Step 1: Implement projection CRUD**

```typescript
"use server";

import { database, requireTenantId } from "@/lib/tenant";
import type { EntityType } from "@repo/database";
import { revalidatePath } from "next/cache";
import type { BoardProjection } from "../types";

export async function getProjectionsForBoard(boardId: string): Promise<BoardProjection[]> {
  const tenantId = await requireTenantId();

  const projections = await database.boardProjection.findMany({
    where: { tenantId, boardId, deletedAt: null },
    orderBy: { zIndex: "asc" },
  });

  return projections.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    boardId: p.boardId,
    entityType: p.entityType as EntityType,
    entityId: p.entityId,
    positionX: p.positionX,
    positionY: p.positionY,
    width: p.width,
    height: p.height,
    zIndex: p.zIndex,
    colorOverride: p.colorOverride,
    collapsed: p.collapsed,
    groupId: p.groupId,
    pinned: p.pinned,
  }));
}

export async function addProjection(
  boardId: string,
  input: {
    entityType: EntityType;
    entityId: string;
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
  }
): Promise<{ success: boolean; projection?: BoardProjection; error?: string }> {
  const tenantId = await requireTenantId();

  try {
    // Check for duplicate
    const existing = await database.boardProjection.findFirst({
      where: {
        tenantId,
        boardId,
        entityType: input.entityType,
        entityId: input.entityId,
        deletedAt: null,
      },
    });

    if (existing) {
      return { success: false, error: "Entity is already on this board" };
    }

    // Get max zIndex
    const maxZ = await database.boardProjection.aggregate({
      where: { tenantId, boardId, deletedAt: null },
      _max: { zIndex: true },
    });

    const projection = await database.boardProjection.create({
      data: {
        tenantId,
        boardId,
        entityType: input.entityType,
        entityId: input.entityId,
        positionX: input.positionX ?? 100,
        positionY: input.positionY ?? 100,
        width: input.width ?? 280,
        height: input.height ?? 180,
        zIndex: (maxZ._max.zIndex ?? 0) + 1,
      },
    });

    revalidatePath(`/command-board/${boardId}`);

    return {
      success: true,
      projection: {
        id: projection.id,
        tenantId: projection.tenantId,
        boardId: projection.boardId,
        entityType: projection.entityType as EntityType,
        entityId: projection.entityId,
        positionX: projection.positionX,
        positionY: projection.positionY,
        width: projection.width,
        height: projection.height,
        zIndex: projection.zIndex,
        colorOverride: projection.colorOverride,
        collapsed: projection.collapsed,
        groupId: projection.groupId,
        pinned: projection.pinned,
      },
    };
  } catch (error) {
    console.error("Failed to add projection:", error);
    return { success: false, error: "Failed to add entity to board" };
  }
}

export async function updateProjectionPosition(
  projectionId: string,
  position: { x: number; y: number }
): Promise<void> {
  const tenantId = await requireTenantId();

  await database.boardProjection.update({
    where: { tenantId_id: { tenantId, id: projectionId } },
    data: { positionX: Math.round(position.x), positionY: Math.round(position.y) },
  });
}

export async function batchUpdatePositions(
  updates: Array<{ id: string; x: number; y: number }>
): Promise<void> {
  const tenantId = await requireTenantId();

  // Use a transaction for atomicity
  await database.$transaction(
    updates.map((u) =>
      database.boardProjection.update({
        where: { tenantId_id: { tenantId, id: u.id } },
        data: { positionX: Math.round(u.x), positionY: Math.round(u.y) },
      })
    )
  );
}

export async function removeProjection(projectionId: string): Promise<void> {
  const tenantId = await requireTenantId();

  await database.boardProjection.update({
    where: { tenantId_id: { tenantId, id: projectionId } },
    data: { deletedAt: new Date() },
  });
}

export async function batchRemoveProjections(projectionIds: string[]): Promise<void> {
  const tenantId = await requireTenantId();

  await database.boardProjection.updateMany({
    where: { tenantId, id: { in: projectionIds }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
```

**Step 2: Verify typecheck**
```bash
pnpm --filter app typecheck
```

**Step 3: Commit**
```bash
git add -A
git commit -m "feat(command-board): add projection CRUD actions"
```

---

## Phase 2: React Flow Canvas

### Task 2.1: Build Entity Card Nodes

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/nodes/projection-node.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/cards/event-card.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/cards/client-card.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/cards/task-card.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/cards/employee-card.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/cards/inventory-card.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/cards/note-card.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/cards/generic-card.tsx`
- Create: `apps/app/app/(authenticated)/command-board/nodes/index.ts`

These are React Flow custom nodes. Each card type gets its own component with proper visual design using the brand color system.

**Implementation notes:**
- Each card uses `Handle` from `@xyflow/react` for connection points (top, bottom, left, right)
- Cards use the brand color palette: Events=Spiced Orange, Clients=Avocado, Tasks=Leafy Green, Employees=Golden Zest, Inventory=info blue, Notes=muted
- Status indicators use semantic colors from the design system (destructive for overdue, warning for due-soon, success for completed)
- Cards call `onOpenDetail` from node data when clicked (opens slide-over panel)
- Cards show entity title, key metrics (2-3 data points), and status badge
- Stale entities (deleted from source) show a warning state

**The projection-node.tsx routes to the correct card component based on `entity.type`, similar to the old board-card.tsx but cleaner.**

**Step 1: Build all card components** (detailed code for each — this is the largest single task)

**Step 2: Register node types**
```typescript
// nodes/index.ts
import { ProjectionNode } from "./projection-node";

export const nodeTypes = {
  projection: ProjectionNode,
} as const;
```

**Step 3: Verify typecheck and commit**
```bash
git add -A
git commit -m "feat(command-board): add React Flow entity card nodes"
```

---

### Task 2.2: Build the React Flow Canvas

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/components/board-flow.tsx`

This is the new primary canvas component. It replaces both `board-canvas.tsx` and `board-canvas-realtime.tsx`.

**Implementation notes:**
- Uses `ReactFlow` from `@xyflow/react` with custom node types
- Converts `BoardProjection[]` + `ResolvedEntity[]` into React Flow `Node[]`
- Converts `DerivedConnection[]` + `BoardAnnotation[]` into React Flow `Edge[]`
- Uses `onNodesChange` for drag/position updates → debounced `batchUpdatePositions`
- Uses `Background` component for grid (replaces custom grid-layer)
- Uses `Controls` component for zoom buttons (replaces custom viewport-controls)
- Uses `MiniMap` component for overview
- Multi-select via shift+click or selection box (built into React Flow)
- Delete key removes projections
- Right-click context menu for card actions
- `onNodeClick` opens slide-over detail panel
- Edge styles: derived connections are color-coded by type, annotations are user-styled

```typescript
"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Connection,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo } from "react";
import { nodeTypes } from "../nodes";
import type {
  BoardProjection,
  ResolvedEntity,
  DerivedConnection,
  BoardAnnotation,
  ProjectionNodeData,
  BoardNode,
  BoardEdge,
} from "../types";

// ... (full implementation in the actual task)
```

**Step 1: Build the canvas component**
**Step 2: Verify it renders with mock data**
**Step 3: Commit**
```bash
git add -A
git commit -m "feat(command-board): add React Flow canvas component"
```

---

### Task 2.3: Build Board Data Loader (Server Component)

**Files:**
- Modify: `apps/app/app/(authenticated)/command-board/[boardId]/page.tsx`
- Create: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx`

The server component loads all data (projections, entities, connections) and passes it to the client canvas.

```typescript
// [boardId]/page.tsx — Server Component
export default async function CommandBoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  // ... auth, board fetch, projection fetch, entity resolution, connection derivation
  // Pass everything to <BoardShell /> client component
}
```

```typescript
// board-shell.tsx — Client Component
// Wraps BoardFlow + BoardHeader + EntityDetailPanel + CommandPalette + ChatPanel
// Manages which detail panel is open, command palette state, etc.
```

**Step 1: Build the server data loader**
**Step 2: Build the client shell**
**Step 3: Wire up and verify**
**Step 4: Commit**
```bash
git add -A
git commit -m "feat(command-board): add board data loader and shell"
```

---

### Task 2.4: Build Entity Search + Add to Board

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/components/entity-search.tsx`
- Create: `apps/app/app/(authenticated)/command-board/actions/search-entities.ts`

A command-style search dialog (using shadcn Command component) that lets users search across all entity types and add them to the board.

**Implementation:**
- Uses `@repo/design-system/components/ui/command` (shadcn Command/CMDK)
- Searches events, clients, tasks, employees, inventory, recipes by name/title
- Groups results by entity type
- Selecting a result calls `addProjection()` and places the card at a smart position (near viewport center, avoiding overlaps)
- Accessible via toolbar button or keyboard shortcut

**Step 1: Build search action**
**Step 2: Build search dialog component**
**Step 3: Integrate into board shell**
**Step 4: Commit**
```bash
git add -A
git commit -m "feat(command-board): add entity search and add-to-board"
```

---

## Phase 3: Detail Panel + Board as Home

### Task 3.1: Build Entity Detail Slide-Over Panel

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/components/entity-detail-panel.tsx`
- Create: `apps/app/app/(authenticated)/command-board/components/detail-views/event-detail.tsx`
- Create: `apps/app/app/(authenticated)/command-board/components/detail-views/client-detail.tsx`
- Create: `apps/app/app/(authenticated)/command-board/components/detail-views/task-detail.tsx`
- Create: `apps/app/app/(authenticated)/command-board/components/detail-views/employee-detail.tsx`
- Create: `apps/app/app/(authenticated)/command-board/components/detail-views/generic-detail.tsx`

Uses shadcn `Sheet` component. Opens from the right side when a card is clicked. Shows full entity details with edit capabilities. Never navigates away from the board.

**Step 1: Build the panel shell with routing by entity type**
**Step 2: Build event detail view (most complex — date, guests, budget, tasks, staff)**
**Step 3: Build client detail view**
**Step 4: Build remaining detail views**
**Step 5: Wire into board shell**
**Step 6: Commit**
```bash
git add -A
git commit -m "feat(command-board): add entity detail slide-over panel"
```

---

### Task 3.2: Make Board the Default Route

**Files:**
- Modify: `apps/app/app/(authenticated)/page.tsx`
- Modify: `apps/app/app/(authenticated)/components/module-nav.ts`
- Modify: `apps/app/app/(authenticated)/components/module-header.tsx`

**Step 1: Update root page to redirect to /command-board**

```typescript
// apps/app/app/(authenticated)/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/command-board");
}
```

**Step 2: Move Command Board to first position in module nav**

In `module-nav.ts`, move the command-board module definition to the first position in the modules array.

**Step 3: Update default module detection**

In `getModuleKeyFromPathname()`, change the default fallback from `"events"` to `"command-board"`.

**Step 4: Verify navigation works**
**Step 5: Commit**
```bash
git add -A
git commit -m "feat(command-board): make board the default home route"
```

---

### Task 3.3: Build Auto-Population Engine

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/actions/auto-populate.ts`

When a board has `autoPopulate: true` and a `scope`, this action queries matching entities and creates projections for any that aren't already on the board.

**Implementation:**
- Queries entities matching the scope filters (entity types, date range, statuses, assigned-to)
- Compares against existing projections
- Creates new projections for missing entities with auto-layout (grid arrangement)
- Returns the new projections so the client can add them to the canvas

**Default board scope:**
```json
{
  "entityTypes": ["event", "prep_task"],
  "dateRange": { "start": "now", "end": "+7d" },
  "statuses": ["pending", "in_progress", "confirmed", "overdue"]
}
```

**Step 1: Build the auto-populate action**
**Step 2: Integrate into board page server component (run on load)**
**Step 3: Commit**
```bash
git add -A
git commit -m "feat(command-board): add auto-population engine"
```

---

## Phase 4: AI Command Interface

### Task 4.1: Build Command Palette

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/components/command-palette.tsx`
- Create: `apps/app/app/(authenticated)/command-board/actions/execute-command.ts`

Cmd+K opens a command palette (shadcn Command component). Supports:
- **Entity search**: "Johnson wedding" → finds and highlights/adds the event
- **Board commands**: "fit to screen", "clear board", "save layout"
- **Quick actions**: "show this week", "show overdue", "show client X's events"
- **AI commands** (Phase 4.2): "what's at risk", "assign Maria to Friday prep"

**Step 1: Build the command palette UI**
**Step 2: Build the command execution action**
**Step 3: Wire Cmd+K shortcut into board shell**
**Step 4: Commit**
```bash
git add -A
git commit -m "feat(command-board): add command palette"
```

---

### Task 4.2: Build AI Chat Panel

**Files:**
- Create: `apps/app/app/(authenticated)/command-board/components/ai-chat-panel.tsx`
- Modify: `apps/app/app/(authenticated)/command-board/actions/suggestions.ts`

Persistent side panel for complex AI conversations. AI responses include board actions (add cards, highlight conflicts, bulk operations) that execute when approved.

**Implementation:**
- Uses shadcn Sheet from the right side (below detail panel priority)
- Conversational interface with message history
- AI responses can include structured actions: `{ type: "add_entities", entities: [...] }`, `{ type: "highlight", projectionIds: [...] }`, `{ type: "bulk_status_change", ... }`
- User approves/rejects each action
- Integrates with existing suggestions engine + extends it

**Step 1: Build the chat panel UI**
**Step 2: Extend suggestions engine with board-aware actions**
**Step 3: Wire into board shell**
**Step 4: Commit**
```bash
git add -A
git commit -m "feat(command-board): add AI chat panel"
```

---

## Phase 5: Realtime Collaboration

### Task 5.1: Fix Liveblocks Integration

**Files:**
- Modify: `packages/collaboration/hooks.ts` (replace stubs)
- Modify: `packages/collaboration/use-command-board-presence.ts` (replace stubs)
- Modify: `packages/collaboration/room.tsx` (verify React 19 compat)

**Step 1: Update @liveblocks/react to latest 3.x**
```bash
pnpm update @liveblocks/client @liveblocks/node @liveblocks/react --filter @repo/collaboration
```

**Step 2: Replace stub hooks with real implementations**
**Step 3: Test in dev with two browser windows**
**Step 4: Commit**
```bash
git add -A
git commit -m "fix(collaboration): restore Liveblocks hooks for React 19"
```

---

### Task 5.2: Add Realtime Sync to Board Canvas

**Files:**
- Modify: `apps/app/app/(authenticated)/command-board/components/board-flow.tsx`
- Modify: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx`

**Implementation:**
- Wrap board in Liveblocks Room
- Broadcast `PROJECTION_MOVED`, `PROJECTION_ADDED`, `PROJECTION_REMOVED` events
- Show live cursors on the canvas
- Show presence indicators (who's viewing this board)
- Debounce position broadcasts during drag

**Step 1: Add Liveblocks Room wrapper to board shell**
**Step 2: Add event broadcasting to canvas**
**Step 3: Add cursor display**
**Step 4: Test with two windows**
**Step 5: Commit**
```bash
git add -A
git commit -m "feat(command-board): add realtime sync to React Flow canvas"
```

---

## Phase 6: Cleanup

### Task 6.1: Remove Old Canvas Code

**Files to delete:**
- `apps/app/app/(authenticated)/command-board/components/board-canvas.tsx`
- `apps/app/app/(authenticated)/command-board/components/board-canvas-realtime.tsx`
- `apps/app/app/(authenticated)/command-board/components/canvas-viewport.tsx`
- `apps/app/app/(authenticated)/command-board/components/draggable-card.tsx`
- `apps/app/app/(authenticated)/command-board/components/grid-layer.tsx`
- `apps/app/app/(authenticated)/command-board/components/viewport-controls.tsx`
- `apps/app/app/(authenticated)/command-board/components/connection-lines.tsx`
- `apps/app/app/(authenticated)/command-board/components/board-card.tsx`
- `apps/app/app/(authenticated)/command-board/components/cards/` (entire old cards directory)
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx`
- `apps/app/app/(authenticated)/command-board/actions/cards.ts`
- `apps/app/app/(authenticated)/command-board/actions/entity-cards.ts`
- `apps/app/app/(authenticated)/command-board/actions/entity-data.ts`
- `apps/app/app/(authenticated)/command-board/types.ts` (old monolith)

**Files to update:**
- `apps/app/app/(authenticated)/command-board/command-board-wrapper.tsx` — rewrite to use new board-shell
- Any remaining imports of old components

**Step 1: Delete old files**
**Step 2: Fix all broken imports**
**Step 3: Verify typecheck passes**
```bash
pnpm --filter app typecheck
```
**Step 4: Verify build passes**
```bash
pnpm --filter app build
```
**Step 5: Commit**
```bash
git add -A
git commit -m "refactor(command-board): remove old canvas implementation"
```

---

### Task 6.2: Update Module Integrations

**Files:**
- Modify: `apps/app/app/(authenticated)/events/[eventId]/event-details-client/event-overview-card.tsx`
- Modify: `apps/app/app/(authenticated)/crm/clients/[id]/components/client-detail-client.tsx`
- Modify: `apps/app/app/(authenticated)/kitchen/tasks/components/add-task-to-board-button.tsx`
- Modify: `apps/app/app/(authenticated)/staff/team/components/add-employee-to-board-button.tsx`
- Modify: `apps/app/app/(authenticated)/command-board/components/add-to-board-dialog.tsx`

Update the "Add to Board" integrations to use `addProjection()` instead of `createEntityCard()`.

**Step 1: Update add-to-board-dialog to use new projection action**
**Step 2: Verify all integration points still work**
**Step 3: Commit**
```bash
git add -A
git commit -m "refactor(command-board): update module integrations for projection model"
```

---

## Dependency Graph

```
Phase 0: Foundation
  0.1 Install @xyflow/react ──────────────────────┐
  0.2 Create BoardProjection schema ───────────────┤
  0.3 Create core types ───────────────────────────┤
                                                    │
Phase 1: Entity Resolution                         │
  1.1 Batched entity resolver ─── depends on 0.2, 0.3
  1.2 Derived connection engine ── depends on 0.2, 0.3
  1.3 Projection CRUD actions ─── depends on 0.2, 0.3
                                                    │
Phase 2: React Flow Canvas                         │
  2.1 Entity card nodes ────────── depends on 0.1, 0.3
  2.2 React Flow canvas ───────── depends on 0.1, 2.1
  2.3 Board data loader ───────── depends on 1.1, 1.2, 1.3, 2.2
  2.4 Entity search + add ─────── depends on 1.3, 2.3
                                                    │
Phase 3: Detail Panel + Home                       │
  3.1 Entity detail panel ─────── depends on 2.3
  3.2 Board as default route ──── depends on 2.3 (independent)
  3.3 Auto-population engine ──── depends on 1.3, 2.3
                                                    │
Phase 4: AI Command Interface                      │
  4.1 Command palette ─────────── depends on 2.4, 3.1
  4.2 AI chat panel ───────────── depends on 2.3, 3.1
                                                    │
Phase 5: Realtime                                  │
  5.1 Fix Liveblocks ─────────── independent
  5.2 Realtime sync on canvas ─── depends on 2.2, 5.1
                                                    │
Phase 6: Cleanup                                   │
  6.1 Remove old code ─────────── depends on all above
  6.2 Update integrations ─────── depends on 6.1
```

## Parallel Execution Opportunities

| Batch | Tasks | Notes |
|-------|-------|-------|
| Batch 1 | 0.1, 0.2, 0.3 | All independent foundation work |
| Batch 2 | 1.1, 1.2, 1.3, 2.1 | All depend on Phase 0 only |
| Batch 3 | 2.2 | Needs 2.1 (node types) |
| Batch 4 | 2.3, 5.1 | 2.3 needs 2.2 + Phase 1; 5.1 is independent |
| Batch 5 | 2.4, 3.1, 3.2, 3.3 | All depend on 2.3 |
| Batch 6 | 4.1, 4.2, 5.2 | Depend on Phase 3 + 5.1 |
| Batch 7 | 6.1, 6.2 | Final cleanup |

## Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 0: Foundation | 3 tasks | 4-6 hours |
| Phase 1: Entity Resolution | 3 tasks | 6-8 hours |
| Phase 2: React Flow Canvas | 4 tasks | 12-16 hours |
| Phase 3: Detail Panel + Home | 3 tasks | 8-12 hours |
| Phase 4: AI Command Interface | 2 tasks | 8-12 hours |
| Phase 5: Realtime | 2 tasks | 4-6 hours |
| Phase 6: Cleanup | 2 tasks | 3-4 hours |
| **Total** | **19 tasks** | **45-64 hours** |
