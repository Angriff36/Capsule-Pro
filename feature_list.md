# Convoy Feature Milestones (Architecture-First)

## Milestone 0: Foundation (enable UI to ship safely)
- Multi-tenant org management (accounts, locations, roles)
- Auth + RLS alignment (Supabase policies + service role tooling)
- Auditing and soft-delete recovery
- Background jobs + outbox/event publishing

## Milestone 1: Events Anchor + Early UI
- Events CRUD with status workflows
- Event numbering + templates
- Cross-module references (kitchen, staffing, CRM, battle boards)
- Event timeline checkpoints
- Initial admin UI for Events + basic navigation

## Milestone 2: Kitchen Ops (fastest operational impact)
- Prep lists + tasks (claims, progress, realtime)
- Recipe library + versioning
- Dishes per event + servings planning
- Kitchen run reports + compliance checks

## Milestone 3: Scheduling + Staffing
- Shifts + assignments
- Availability + time off
- Time clock + time entries
- Staffing ratios tied to event size

## Milestone 4: Battle Boards + Ingestion
- Ingestion pipeline (TPP/PDF + CSV)
- Battle board print/export
- Layout templates per event type

## Milestone 5: CRM
- Clients + contacts
- Deals + activities
- Event-linked customer history

## Milestone 6: Inventory
- Items + stock locations
- Inventory transactions + counts
- Event-driven depletion planning

## Milestone 7: Realtime Collaboration
- Comments on events/tasks/dishes
- Presence + activity indicators
- Cross-role notifications (mobile ↔ office)

## Milestone 8: Reporting
- Event profitability
- Labor vs budget
- Prep throughput + bottlenecks

## Milestone 9: Integrations
- GoodShuffle, Nowsta, TPP
- Calendar sync
- Email/SMS notifications
