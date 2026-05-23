<?xml version="1.0" encoding="UTF-8"?>
<project_specification>
  <project_name>Convoy</project_name>

  <overview>
    Convoy is a multi-tenant catering operations platform designed to replace traditional CRM/TPP list views with a full-screen &quot;Strategic Command Board&quot; - a drag-and-drop, real-time dashboard that visually maps relationships across the entire business. The platform manages clients, events, tasks, employees, schedules, inventory, and profitability from a single high-agency board with clear ownership, status, and next actions.

The platform leverages AI to reduce administrative burden through automation of heavy UI work including bulk combining/grouping, bulk edits, task generation, conflict detection, summaries, and suggested next steps—while keeping humans in control through direct manipulation of the command board.

Key architectural principles include:
- **Shared Canonical Entities**: The same task/employee/event/client appears consistently across all modules (CRM, Events, Kitchen Ops, Scheduling, Payroll, Inventory, Reporting)
- **Loose Module Coupling**: Modules remain independently usable (e.g., CRM-only without Kitchen, Scheduling-only without Inventory) while interoperating cleanly when enabled together
- **Strict Multi-tenancy**: Tenant isolation enforced end-to-end via tenant_id patterns, RLS alignment, role-based access, auditing, and soft-delete recovery
- **Real-time Collaboration**: Operational boards powered by kanban workflows, task claiming, progress states, and leadership/war-room views
- **Background Processing**: Reliable outbox/event publishing pattern for asynchronous operations

The PRIMARY upcoming feature is the Strategic Command Board - a full-screen drag-and-drop interface that is NOT yet implemented but represents the core vision for the platform.
  </overview>

  <technology_stack>
    <technology>Next.js 16 (App Router)</technology>
    <technology>React 19</technology>
    <technology>TypeScript 5.9+</technology>
    <technology>Turborepo (monorepo build orchestration)</technology>
    <technology>pnpm 10.24+ (package manager)</technology>
    <technology>Neon Postgres (serverless database)</technology>
    <technology>Prisma ORM (database client with generated types)</technology>
    <technology>Clerk (authentication and organization management)</technology>
    <technology>Tailwind CSS v4</technology>
    <technology>Biome (linting via ultracite)</technology>
    <technology>Vitest (testing framework)</technology>
    <technology>React Testing Library</technology>
    <technology>Ably (real-time pub/sub via outbox pattern)</technology>
    <technology>Liveblocks (collaborative features and cursors)</technology>
    <technology>Stripe (payments)</technology>
    <technology>Resend (transactional email with React Email templates)</technology>
    <technology>Knock (notifications)</technology>
    <technology>Sentry (error tracking)</technology>
    <technology>BetterStack/Logtail (logging and uptime)</technology>
    <technology>Arcjet (rate limiting and security)</technology>
    <technology>Posthog + Google Analytics (analytics)</technology>
    <technology>Mintlify/Fumadocs (documentation)</technology>
    <technology>shadcn/ui (design system components)</technology>
    <technology>Radix UI (accessible primitives)</technology>
    <technology>Lucide React (icons)</technology>
    <technology>date-fns (date utilities)</technology>
    <technology>Zod (schema validation)</technology>
    <technology>react-hook-form (form management)</technology>
    <technology>recharts (charting)</technology>
    <technology>react-moveable (drag interactions)</technology>
    <technology>react-resizable-panels (resizable layouts)</technology>
    <technology>Fuse.js (fuzzy search)</technology>
  </technology_stack>

  <core_capabilities>
    <capability>Multi-tenant SaaS architecture with shared database and tenant_id isolation</capability>
    <capability>Real-time collaboration with cursor presence and live updates</capability>
    <capability>Modular navigation system with 8 distinct operational modules</capability>
    <capability>Kitchen Production Board with kanban-style task management</capability>
    <capability>Event management with import capabilities (CSV/PDF/TPP parsing)</capability>
    <capability>CRM for client relationships, venues, and communications</capability>
    <capability>Inventory tracking with recipes, items, and stock levels</capability>
    <capability>Staff scheduling with shifts, availability, and time-off requests</capability>
    <capability>Payroll management with timecards and payouts</capability>
    <capability>Warehouse operations (receiving, shipments, audits)</capability>
    <capability>Analytics dashboards for kitchen, events, and finance</capability>
    <capability>AI-assisted automation for bulk operations and task generation</capability>
    <capability>Battle Board exports for print-ready event briefs</capability>
    <capability>Webhook integration for external systems</capability>
    <capability>Mobile-responsive design with dedicated mobile kitchen views</capability>
    <capability>Multi-organization support via Clerk</capability>
    <capability>Soft-delete and audit trail on all entities</capability>
    <capability>Outbox pattern for reliable event publishing</capability>
  </core_capabilities>

  <implemented_features>
    <feature>
      <name>Multi-tenant Database Schema</name>
      <description>Comprehensive Prisma schema with 40+ models organized across PostgreSQL schemas (platform, tenant, tenant_staff, tenant_kitchen, tenant_events, tenant_inventory, tenant_crm, tenant_admin). All tenant tables include tenant_id composite keys, audit timestamps, and soft-delete support.</description>
      <file_locations>
        <location>packages/database/prisma/schema.prisma</location>
      </file_locations>
    </feature>
    <feature>
      <name>Kitchen Production Board</name>
      <description>Real-time kanban-style task board for kitchen operations with station filtering (Hot Line, Cold Prep, Bakery), task claiming, progress tracking, date navigation, and stats sidebar showing completion rates and team activity.</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/kitchen/page.tsx</location>
        <location>apps/app/app/(authenticated)/kitchen/production-board-client.tsx</location>
        <location>apps/app/app/(authenticated)/kitchen/production-board-realtime.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Events Management</name>
      <description>Full event lifecycle management with listing, creation, import, and detail views. Includes statistics cards for total events, guest counts, confirmed/tentative status tracking.</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/events/page.tsx</location>
        <location>apps/app/app/(authenticated)/events/new/page.tsx</location>
        <location>apps/app/app/(authenticated)/events/import/page.tsx</location>
        <location>apps/app/app/(authenticated)/events/[eventId]/page.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Module Navigation System</name>
      <description>Unified sidebar navigation supporting 8 distinct modules (Events, Kitchen, Warehouse, Scheduling, Payroll, Administrative, CRM, Analytics) with dynamic routing and contextual menu items.</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/components/module-nav.ts</location>
        <location>apps/app/app/(authenticated)/components/sidebar.tsx</location>
        <location>apps/app/app/(authenticated)/components/module-header.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Authentication &amp; Organization Switching</name>
      <description>Clerk-powered authentication with organization management, user profiles, and tenant ID resolution from Clerk organization IDs.</description>
      <file_locations>
        <location>packages/auth/client.ts</location>
        <location>packages/auth/server.ts</location>
        <location>packages/auth/provider.tsx</location>
        <location>apps/app/app/lib/tenant.ts</location>
      </file_locations>
    </feature>
    <feature>
      <name>Real-time Collaboration</name>
      <description>Liveblocks integration for collaborative cursors, avatar stacks, and live presence indicators across operational boards.</description>
      <file_locations>
        <location>packages/collaboration/room.tsx</location>
        <location>packages/collaboration/hooks.ts</location>
        <location>apps/app/app/(authenticated)/components/collaboration-provider.tsx</location>
        <location>apps/app/app/(authenticated)/components/cursors.tsx</location>
        <location>apps/app/app/(authenticated)/components/avatar-stack.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Design System</name>
      <description>Comprehensive UI component library built on shadcn/ui with Radix primitives, including forms, cards, badges, avatars, progress bars, sidebars, and more.</description>
      <file_locations>
        <location>packages/design-system/</location>
      </file_locations>
    </feature>
    <feature>
      <name>Notification System</name>
      <description>Knock-powered notification infrastructure with trigger components for in-app notifications.</description>
      <file_locations>
        <location>packages/notifications/</location>
      </file_locations>
    </feature>
    <feature>
      <name>Payment Processing</name>
      <description>Stripe integration for payment processing with agent toolkit support.</description>
      <file_locations>
        <location>packages/payments/</location>
      </file_locations>
    </feature>
    <feature>
      <name>Observability Stack</name>
      <description>Sentry error tracking and BetterStack/Logtail logging integration for production monitoring.</description>
      <file_locations>
        <location>packages/observability/</location>
      </file_locations>
    </feature>
    <feature>
      <name>Recipe Management</name>
      <description>Recipe catalog with versioning, ingredients, dishes, and prep methods. Includes cleanup utilities.</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/kitchen/recipes/page.tsx</location>
        <location>apps/app/app/(authenticated)/kitchen/recipes/new/page.tsx</location>
        <location>apps/app/app/(authenticated)/kitchen/recipes/dishes/new/page.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>CRM Module Shell</name>
      <description>CRM module structure with client management, venues, and communications pages (landing pages implemented, awaiting full functionality).</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/crm/page.tsx</location>
        <location>apps/app/app/(authenticated)/crm/clients/page.tsx</location>
        <location>apps/app/app/(authenticated)/crm/venues/page.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Inventory Module Shell</name>
      <description>Inventory module with items, recipes, and levels tracking pages (landing pages implemented, awaiting full functionality).</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/inventory/page.tsx</location>
        <location>apps/app/app/(authenticated)/inventory/items/page.tsx</location>
        <location>apps/app/app/(authenticated)/inventory/levels/page.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Scheduling Module Shell</name>
      <description>Scheduling module with shifts, availability, and requests pages (landing pages implemented, awaiting full functionality).</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/scheduling/page.tsx</location>
        <location>apps/app/app/(authenticated)/scheduling/shifts/page.tsx</location>
        <location>apps/app/app/(authenticated)/scheduling/availability/page.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Administrative Tools</name>
      <description>Administrative module with kanban board, chat interface, and overview boards pages.</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/administrative/page.tsx</location>
        <location>apps/app/app/(authenticated)/administrative/kanban/page.tsx</location>
        <location>apps/app/app/(authenticated)/administrative/chat/page.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Analytics Dashboards</name>
      <description>Analytics module with kitchen, events, and finance analysis pages (landing pages implemented).</description>
      <file_locations>
        <location>apps/app/app/(authenticated)/analytics/page.tsx</location>
        <location>apps/app/app/(authenticated)/analytics/kitchen/page.tsx</location>
        <location>apps/app/app/(authenticated)/analytics/events/page.tsx</location>
      </file_locations>
    </feature>
    <feature>
      <name>Kitchen State Transitions</name>
      <description>Dedicated package for managing kitchen task state machine logic.</description>
      <file_locations>
        <location>packages/kitchen-state-transitions/</location>
      </file_locations>
    </feature>
  </implemented_features>

  <additional_requirements>
    <requirement>Node.js 22.12.0 required (specified in engines)</requirement>
    <requirement>pnpm 10.24.0+ required</requirement>
    <requirement>Clerk account for authentication</requirement>
    <requirement>Neon Postgres database</requirement>
    <requirement>Ably account for real-time features</requirement>
    <requirement>Liveblocks account for collaboration features</requirement>
    <requirement>Stripe account for payments</requirement>
    <requirement>Knock account for notifications</requirement>
    <requirement>Sentry account for error tracking</requirement>
    <requirement>BetterStack account for logging/uptime</requirement>
    <requirement>Environment variables must be configured in .env.local files (gitignored)</requirement>
  </additional_requirements>

  <development_guidelines>
    <guideline>Use pnpm exclusively (never npm or yarn) - this is a pnpm workspace</guideline>
    <guideline>Run &apos;pnpm check&apos; for linting and &apos;pnpm fix&apos; for auto-fixes (Biome via ultracite)</guideline>
    <guideline>Run &apos;pnpm migrate&apos; for database changes (formats, generates client, pushes schema)</guideline>
    <guideline>All tenant-scoped tables must include tenantId with indexes</guideline>
    <guideline>Use soft deletes (deletedAt timestamp) with WHERE deletedAt IS NULL in queries</guideline>
    <guideline>Maintain audit trail with createdAt and updatedAt timestamps (auto-managed by Prisma)</guideline>
    <guideline>Real-time events use OutboxEvent model published to Ably (not direct database subscriptions)</guideline>
    <guideline>Prefer @repo/* workspace imports over relative paths for shared packages</guideline>
    <guideline>Keep files under ~500 LOC; split/refactor as needed</guideline>
    <guideline>Follow Conventional Commits format (feat|fix|refactor|build|ci|chore|docs|style|perf|test)</guideline>
    <guideline>Use multi-agent orchestration: main thread orchestrates, specialist agents implement</guideline>
    <guideline>Documentation is a product feature - update docs when behavior/API changes</guideline>
    <guideline>Realtime priority order: Kitchen task claims/progress &gt; Events board &gt; Scheduling changes</guideline>
    <guideline>Database: Prisma + Neon (NOT Supabase with RLS)</guideline>
    <guideline>Multi-tenant: Shared DB with tenant_id column (NOT per-tenant databases)</guideline>
    <guideline>Realtime: Ably via outbox pipeline (NOT Supabase Realtime)</guideline>
    <guideline>Auth: Clerk (already integrated)</guideline>
  </development_guidelines>

  <implementation_roadmap>
    <phase>
      <name>Phase 0: Foundation &amp; Alignment</name>
      <status>completed</status>
      <description>Established Prisma/Neon + Clerk stack with multi-tenant schema, authentication, and basic module structure. Identified gaps between legacy capabilities and current codebase.</description>
    </phase>
    <phase>
      <name>Phase 1: Domain Model Embodiment</name>
      <status>completed</status>
      <description>Prisma schema reflects tenant tables with 40+ models across domain schemas (tenant_staff, tenant_kitchen, tenant_events, tenant_inventory, tenant_crm, tenant_admin). Includes audit columns, soft deletes, and outbox patterns.</description>
    </phase>
    <phase>
      <name>Phase 2: Shared Packages &amp; Parsing</name>
      <status>in_progress</status>
      <description>Creating shared domain types under packages/. Kitchen state transitions package exists. Still need to extract parsing/policy logic from legacy Battle-Boards, Kitchen-Manager-Module, and Mikes Module into reusable packages.</description>
    </phase>
    <phase>
      <name>Phase 3: Web/Admin Refinement</name>
      <status>in_progress</status>
      <description>Events and Kitchen Production Board functional. Module landing pages established. Need to expand Battle Boards, complete CRM/Inventory/Scheduling functionality, and implement print-ready exports.</description>
    </phase>
    <phase>
      <name>Phase 4: Strategic Command Board</name>
      <status>pending</status>
      <description>PRIMARY FEATURE - Build the full-screen drag-and-drop Strategic Command Board that visually maps work relationships across clients, events, tasks, employees, schedules, inventory, and profitability. This is the core vision for replacing traditional CRM/TPP list views.</description>
    </phase>
    <phase>
      <name>Phase 5: Mobile Kitchen Companion</name>
      <status>pending</status>
      <description>Add Android/iOS mobile app for kitchen prep and scheduling flows (recipes, prep lists, task claims, time clock). Will connect to same Prisma/Neon database via apps/api using Clerk for auth.</description>
    </phase>
    <phase>
      <name>Phase 6: Integrations &amp; Reliability</name>
      <status>pending</status>
      <description>Layer in GoodShuffle/Nowsta integrations when scheduling/prep data stabilize. Improve observability, alerting, audit review dashboards, and export-ready reports.</description>
    </phase>
  </implementation_roadmap>
</project_specification>