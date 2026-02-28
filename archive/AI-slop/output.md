./ # Repository root [OVERLAP: duplicate path appears 2x]
├── .automaker/ # AI feature-automation workspace
│   ├── context/ # Shared reasoning/domain context for automations
│   ├── events/ # Automation trigger/state event definitions
│   ├── images/ # Automation diagrams/assets
│   └── memory/ # Persisted automation summaries/state
├── .biome-sweep/ # Outputs/logs from biome lint/format sweeps
├── .claude/ # Claude local skill/workflow workspace
│   └── skills/ # Installed Claude skill packs
│       ├── frontend-design/ # Claude skill pack: frontend-design
│       ├── planning-with-files/ # Claude skill pack: planning-with-files
│       └── spec-prompt-template-generator/ # Claude skill pack: spec-prompt-template-generator
├── .codex/ # Codex local skill/runtime workspace
│   ├── skills/ # Installed Codex skill packs
│   │   ├── .system/ # System/internal Codex skills
│   │   ├── 1password/ # Codex skill pack: 1password
│   │   ├── analyze-codebase/ # Codex skill pack: analyze-codebase
│   │   ├── brave-search/ # Codex skill pack: brave-search
│   │   ├── create-cli/ # Codex skill pack: create-cli
│   │   ├── docs-vs-implementation/ # Codex skill pack: docs-vs-implementation
│   │   ├── domain-dns-ops/ # Codex skill pack: domain-dns-ops
│   │   ├── frontend-design/ # Codex skill pack: frontend-design
│   │   ├── markdown-converter/ # Codex skill pack: markdown-converter
│   │   ├── nano-banana-pro/ # Codex skill pack: nano-banana-pro
│   │   ├── openai-image-gen/ # Codex skill pack: openai-image-gen
│   │   ├── oracle/ # Codex skill pack: oracle
│   │   ├── planning-with-files/ # Codex skill pack: planning-with-files
│   │   ├── spec-prompt-template-generator/ # Codex skill pack: spec-prompt-template-generator
│   │   └── video-transcript-downloader/ # Codex skill pack: video-transcript-downloader
│   └── superpowers/ # Superpowers orchestration/runtime toolkit
│       ├── .claude-plugin/ # Embedded Claude plugin integration for superpowers
│       ├── .codex/ # Codex-specific runtime config for superpowers
│       ├── .github/ # Superpowers repo CI/config files
│       ├── .opencode/ # OpenCode integration/config for superpowers
│       ├── agents/ # Agent definitions used by superpowers
│       ├── commands/ # Command definitions/executors for superpowers
│       ├── docs/ # Superpowers documentation
│       ├── hooks/ # Lifecycle hooks for superpowers workflows
│       ├── lib/ # Superpowers shared library code
│       ├── skills/ # Superpowers-provided skill packs
│       └── tests/ # Superpowers test suite
├── .github/ # GitHub repo automation (workflows/templates)
│   ├── ISSUE_TEMPLATE/ # GitHub issue templates
│   └── workflows/ # GitHub Actions workflow definitions
├── .husky/ # Git hook scripts
│   └── _/ # Husky internal shim scripts
├── .next/ # Root-level Next.js build cache/artifacts (generated)
│   └── cache/ # Next.js compiler/build cache
│       └── swc/ # SWC transpilation cache
├── .playwright-mcp/ # TODO: Verify owner; appears to store Playwright MCP screenshots/artifacts
├── .specify/ # Spec-driven workflow state (memory + specs)
│   ├── memory/ # Specify context snapshots/memory
│   └── specs/ # Specify feature/task specifications
│       ├── 003-events-audit-and-fix/ # Specification workspace: 003-events-audit-and-fix
│       ├── 004-database-docs-integrity/ # Specification workspace: 004-database-docs-integrity
│       ├── 005-recipe-popover-links/ # Specification workspace: 005-recipe-popover-links
│       ├── 006-event-import-fix/ # Specification workspace: 006-event-import-fix
│       ├── 007-fix-linting-errors/ # Specification workspace: 007-fix-linting-errors
│       ├── 008-performance-hardening/ # Specification workspace: 008-performance-hardening
│       ├── realtime-transport/ # Specification workspace: realtime-transport
│       └── recipes-menu-overhaul/ # Specification workspace: recipes-menu-overhaul
├── .turbo/ # Root Turborepo cache/daemon state
│   ├── cache/ # Turbo task output cache
│   ├── cookies/ # Turbo daemon/session cookies
│   └── daemon/ # Turbo daemon runtime state
├── .vercel/ # Vercel local project metadata
├── .vscode/ # Workspace editor settings
├── Microsoft/ # TODO: Unknown ownership; likely accidental Windows artifact folder
│   └── Windows/ # TODO: Unknown purpose; empty Windows-named folder needs ownership/cleanup decision
./ # Apps tree root [OVERLAP: duplicate path appears 2x]
├── api/ # Next.js API application workspace (apps/api)
│   ├── .next/ # Next.js build artifacts (generated)
│   │   ├── cache/ # Build cache data
│   │   │   ├── swc/ # SWC transform cache
│   │   │   └── webpack/ # Webpack cache data
│   │   ├── diagnostics/ # Next.js diagnostics output
│   │   ├── server/ # Server bundle output
│   │   │   ├── app/ # App Router server bundle output
│   │   │   ├── chunks/ # Chunked JS/CSS bundles
│   │   │   └── pages/ # Pages-router bundle output
│   │   ├── static/ # Compiled static asset output
│   │   │   ├── chunks/ # Chunked JS/CSS bundles
│   │   │   └── hkxEJ2QIxl_VDSPfBAQUj/ # Build-id scoped static asset bucket (generated)
│   │   └── types/ # Generated type output
│   │       └── app/ # App Router generated type map
│   ├── .turbo/ # Turborepo cache/artifacts (generated)
│   ├── __tests__/ # Test suite directory
│   │   ├── kitchen/ # TODO: purpose not confirmed from repo evidence for api/__tests__/kitchen
│   │   │   ├── __snapshots__/ # Snapshot fixtures
│   │   │   ├── __tsc__/ # Type-check fixtures
│   │   │   └── recipes/ # TODO: purpose not confirmed from repo evidence for api/__tests__/kitchen/recipes
│   │   └── staff/ # TODO: purpose not confirmed from repo evidence for api/__tests__/staff
│   ├── app/ # App Router root for API service
│   │   ├── ably/ # Ably endpoint namespace (TODO: document auth/event model)
│   │   │   └── auth/ # Ably auth route namespace
│   │   ├── api/ # Primary API route tree (TODO: document route contracts by namespace)
│   │   │   ├── administrative/ # API route namespace: administrative (TODO: document exact contract/owner)
│   │   │   ├── ai/ # API route namespace: ai (TODO: document exact contract/owner)
│   │   │   ├── analytics/ # API route namespace: analytics (TODO: document exact contract/owner)
│   │   │   ├── collaboration/ # API route namespace: collaboration (TODO: document exact contract/owner)
│   │   │   ├── command-board/ # API route namespace: command board (TODO: document exact contract/owner)
│   │   │   ├── conflicts/ # API route namespace: conflicts (TODO: document exact contract/owner)
│   │   │   ├── crm/ # API route namespace: crm (TODO: document exact contract/owner)
│   │   │   ├── events/ # API route namespace: events (TODO: document exact contract/owner)
│   │   │   ├── inventory/ # API route namespace: inventory (TODO: document exact contract/owner)
│   │   │   ├── inventoryitem/ # API route namespace: inventoryitem (TODO: document exact contract/owner)
│   │   │   ├── kitchen/ # API route namespace: kitchen (TODO: document exact contract/owner)
│   │   │   ├── locations/ # API route namespace: locations (TODO: document exact contract/owner)
│   │   │   ├── payroll/ # API route namespace: payroll (TODO: document exact contract/owner)
│   │   │   ├── preptask/ # API route namespace: preptask (TODO: document exact contract/owner)
│   │   │   ├── shipments/ # API route namespace: shipments (TODO: document exact contract/owner)
│   │   │   ├── staff/ # API route namespace: staff (TODO: document exact contract/owner)
│   │   │   └── timecards/ # API route namespace: timecards (TODO: document exact contract/owner)
│   │   ├── conflicts/ # Conflict detection endpoint namespace (TODO: document algorithm/owner)
│   │   │   └── detect/ # Conflict detection route namespace
│   │   ├── cron/ # Scheduled/cron endpoint namespace (TODO: document job inventory)
│   │   │   └── keep-alive/ # Keep-alive cron endpoint namespace
│   │   ├── health/ # Health check endpoint namespace
│   │   ├── lib/ # Service/library helpers (TODO: document intended import boundaries)
│   │   ├── outbox/ # Outbox processing endpoint namespace (TODO: document delivery guarantees)
│   │   │   └── publish/ # Outbox publish route namespace
│   │   └── webhooks/ # Inbound webhook endpoint namespace
│   │       ├── auth/ # Auth provider webhook namespace
│   │       └── payments/ # Payments webhook namespace
│   ├── lib/ # Shared API service library code
│   │   ├── manifest/ # Manifest integration helpers for API service
│   │   └── staff/ # Staff-domain API helpers (TODO: document public API surface)
│   ├── scripts/ # Project scripts
│   ├── test/ # Test helpers/fixtures
│   │   └── mocks/ # Mock implementations for tests
│   │       └── @repo/ # TODO: purpose not confirmed from repo evidence for api/test/mocks/@repo
│   └── test-scripts/ # Ad-hoc API test scripts
├── app/ # Main product web application workspace (apps/app)
│   ├── .netlify/ # Netlify local/build metadata
│   ├── .next/ # Next.js build artifacts (generated)
│   │   ├── cache/ # Build cache data
│   │   │   ├── swc/ # SWC transform cache
│   │   │   └── webpack/ # Webpack cache data
│   │   ├── diagnostics/ # Next.js diagnostics output
│   │   ├── server/ # Server bundle output
│   │   │   ├── app/ # App Router server bundle output
│   │   │   ├── chunks/ # Chunked JS/CSS bundles
│   │   │   ├── pages/ # Pages-router bundle output
│   │   │   └── vendor-chunks/ # Vendor dependency chunk output
│   │   ├── static/ # Compiled static asset output
│   │   │   ├── chunks/ # Chunked JS/CSS bundles
│   │   │   ├── css/ # Built CSS output
│   │   │   ├── development/ # Dev-mode static output
│   │   │   ├── ho2hogaN5gx5ApJrz-HG9/ # Build-id scoped static asset bucket (generated)
│   │   │   ├── media/ # Bundled media output
│   │   │   └── webpack/ # Webpack cache data
│   │   └── types/ # Generated type output
│   │       └── app/ # App Router generated type map
│   ├── .turbo/ # Turborepo cache/artifacts (generated)
│   ├── .vercel/ # Vercel local metadata
│   ├── __tests__/ # Test suite directory
│   │   ├── kitchen/ # TODO: purpose not confirmed from repo evidence for app/__tests__/kitchen
│   │   │   └── recipes/ # TODO: purpose not confirmed from repo evidence for app/__tests__/kitchen/recipes
│   │   ├── menus/ # TODO: purpose not confirmed from repo evidence for app/__tests__/menus
│   │   ├── mocks/ # Mock implementations for tests
│   │   └── recipes/ # TODO: purpose not confirmed from repo evidence for app/__tests__/recipes
│   ├── app/ # App Router root for main web app
│   │   ├── (authenticated)/ # Next.js route group (authenticated)
│   │   │   ├── [module]/ # Authenticated UI module: [module] (TODO: document module scope)
│   │   │   ├── administrative/ # Authenticated UI module: administrative (TODO: document module scope)
│   │   │   ├── analytics/ # Authenticated UI module: analytics (TODO: document module scope)
│   │   │   ├── command-board/ # Authenticated UI module: command board (TODO: document module scope)
│   │   │   ├── components/ # Authenticated UI module: components (TODO: document module scope)
│   │   │   ├── crm/ # Authenticated UI module: crm (TODO: document module scope)
│   │   │   ├── cycle-counting/ # Authenticated UI module: cycle counting (TODO: document module scope)
│   │   │   ├── data/ # Authenticated UI module: data (TODO: document module scope)
│   │   │   ├── events/ # Authenticated UI module: events (TODO: document module scope)
│   │   │   ├── inventory/ # Authenticated UI module: inventory (TODO: document module scope)
│   │   │   ├── kitchen/ # Authenticated UI module: kitchen (TODO: document module scope)
│   │   │   ├── payroll/ # Authenticated UI module: payroll (TODO: document module scope)
│   │   │   ├── scheduling/ # Authenticated UI module: scheduling (TODO: document module scope)
│   │   │   ├── search/ # Authenticated UI module: search (TODO: document module scope)
│   │   │   ├── settings/ # Authenticated UI module: settings (TODO: document module scope)
│   │   │   ├── staff/ # Authenticated UI module: staff (TODO: document module scope)
│   │   │   ├── tools/ # Authenticated UI module: tools (TODO: document module scope)
│   │   │   ├── warehouse/ # Authenticated UI module: warehouse (TODO: document module scope)
│   │   │   └── webhooks/ # Authenticated UI module: webhooks (TODO: document module scope)
│   │   ├── (dev-console)/ # Next.js route group (dev-console)
│   │   │   ├── components/ # Developer-console route module: components (TODO: document enablement rules)
│   │   │   └── dev-console/ # Developer-console route module: dev console (TODO: document enablement rules)
│   │   ├── (unauthenticated)/ # Next.js route group (unauthenticated)
│   │   │   ├── sign-in/ # Public/auth route module: sign in
│   │   │   └── sign-up/ # Public/auth route module: sign up
│   │   ├── .well-known/ # Well-known route namespace
│   │   │   └── vercel/ # Vercel verification route namespace
│   │   ├── ably/ # TODO: purpose not confirmed from repo evidence for app/app/ably
│   │   │   ├── auth/ # TODO: purpose not confirmed from repo evidence for app/app/ably/auth
│   │   │   └── chat/ # TODO: purpose not confirmed from repo evidence for app/app/ably/chat
│   │   ├── actions/ # Server actions/handlers
│   │   │   └── users/ # TODO: purpose not confirmed from repo evidence for app/app/actions/users
│   │   ├── api/ # TODO: purpose not confirmed from repo evidence for app/app/api
│   │   │   ├── analytics/ # App-side API/BFF namespace: analytics (TODO: document why it lives in app)
│   │   │   ├── collaboration/ # App-side API/BFF namespace: collaboration (TODO: document why it lives in app)
│   │   │   ├── events/ # App-side API/BFF namespace: events (TODO: document why it lives in app)
│   │   │   ├── kitchen/ # App-side API/BFF namespace: kitchen (TODO: document why it lives in app)
│   │   │   ├── locations/ # App-side API/BFF namespace: locations (TODO: document why it lives in app)
│   │   │   ├── recipes/ # App-side API/BFF namespace: recipes (TODO: document why it lives in app)
│   │   │   ├── sales-reporting/ # App-side API/BFF namespace: sales reporting (TODO: document why it lives in app)
│   │   │   └── timecards/ # App-side API/BFF namespace: timecards (TODO: document why it lives in app)
│   │   ├── components/ # UI components (TODO: document if shared vs local-only)
│   │   ├── lib/ # Service/library helpers (TODO: document intended import boundaries)
│   │   │   ├── staff/ # TODO: purpose not confirmed from repo evidence for app/app/lib/staff
│   │   │   └── testing/ # TODO: purpose not confirmed from repo evidence for app/app/lib/testing
│   │   └── plasmic/ # TODO: purpose not confirmed from repo evidence for app/app/plasmic
│   │       └── [[...slug]]/ # Optional catch-all dynamic route segment
│   ├── components/ # UI components (TODO: document if shared vs local-only)
│   ├── e2e/ # App-scoped end-to-end tests
│   ├── pages/ # Legacy Pages Router area (if still used)
│   ├── plasmic/ # Plasmic integration assets (TODO: document ownership)
│   ├── prisma/ # App-local Prisma files/config
│   ├── public/ # Public static assets
│   ├── scripts/ # Project scripts
│   ├── test/ # Test helpers/fixtures
│   │   └── mocks/ # Mock implementations for tests
│   │       ├── @clerk/ # TODO: purpose not confirmed from repo evidence for app/test/mocks/@clerk
│   │       └── @repo/ # TODO: purpose not confirmed from repo evidence for app/test/mocks/@repo
│   └── test-results/ # Generated test result artifacts
├── docs/ # Documentation site application workspace (apps/docs) [OVERLAP: duplicate path appears 3x] [CONFLICT: name reused for both apps/docs tree and repo docs tree]
│   ├── .next/ # Next.js build artifacts (generated) [OVERLAP: duplicate path appears 2x]
│   │   ├── cache/ # Build cache data [OVERLAP: duplicate path appears 2x]
│   │   │   ├── swc/ # SWC transform cache [OVERLAP: duplicate path appears 2x]
│   │   │   └── webpack/ # Webpack cache data [OVERLAP: duplicate path appears 2x]
│   │   ├── diagnostics/ # Next.js diagnostics output [OVERLAP: duplicate path appears 2x]
│   │   ├── server/ # Server bundle output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── app/ # App Router server bundle output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
│   │   │   └── pages/ # Pages-router bundle output [OVERLAP: duplicate path appears 2x]
│   │   ├── static/ # Compiled static asset output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── FrRNJtOnh0a_t3MWE5HR_/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│   │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
│   │   │   └── css/ # Built CSS output [OVERLAP: duplicate path appears 2x]
│   │   └── types/ # Generated type output [OVERLAP: duplicate path appears 2x]
│   │       └── app/ # App Router generated type map [OVERLAP: duplicate path appears 2x]
│   ├── .source/ # Generated Fumadocs source module [OVERLAP: duplicate path appears 2x]
│   ├── .turbo/ # Turborepo cache/artifacts (generated) [OVERLAP: duplicate path appears 2x]
│   ├── app/ # TODO: purpose not confirmed from repo evidence for docs/app [OVERLAP: duplicate path appears 2x]
│   │   └── docs/ # TODO: purpose not confirmed from repo evidence for docs/app/docs [OVERLAP: duplicate path appears 2x]
│   │       └── [[...slug]]/ # Optional catch-all dynamic route segment [OVERLAP: duplicate path appears 2x]
│   ├── content/ # MDX docs content source [OVERLAP: duplicate path appears 2x]
│   │   ├── docs/ # Primary docs collections [OVERLAP: duplicate path appears 2x]
│   │   │   ├── api-reference/ # Docs section: api reference [OVERLAP: duplicate path appears 2x]
│   │   │   ├── essentials/ # Docs section: essentials [OVERLAP: duplicate path appears 2x]
│   │   │   ├── events/ # Docs section: events [OVERLAP: duplicate path appears 2x]
│   │   │   └── internal/ # Docs section: internal [OVERLAP: duplicate path appears 2x]
│   │   └── snippets/ # Reusable docs snippets [OVERLAP: duplicate path appears 2x]
│   ├── lib/ # Service/library helpers (TODO: document intended import boundaries) [OVERLAP: duplicate path appears 2x]
│   ├── public/ # Public static assets [OVERLAP: duplicate path appears 2x]
│   │   ├── images/ # TODO: purpose not confirmed from repo evidence for docs/public/images [OVERLAP: duplicate path appears 2x]
│   │   └── logo/ # TODO: purpose not confirmed from repo evidence for docs/public/logo [OVERLAP: duplicate path appears 2x]
│   └── scripts/ # Project scripts [OVERLAP: duplicate path appears 2x]
├── email/ # Email preview/build application workspace (apps/email) [OVERLAP: duplicate path appears 2x]
│   ├── .react-email/ # React Email local build/preview workspace [OVERLAP: duplicate path appears 2x]
│   │   ├── .next/ # Next.js build artifacts (generated) [OVERLAP: duplicate path appears 2x]
│   │   │   ├── cache/ # Build cache data [OVERLAP: duplicate path appears 2x]
│   │   │   ├── diagnostics/ # Next.js diagnostics output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── server/ # Server bundle output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── static/ # Compiled static asset output [OVERLAP: duplicate path appears 2x]
│   │   │   └── types/ # Generated type output [OVERLAP: duplicate path appears 2x]
│   │   ├── emails/ # Email template outputs/sources [OVERLAP: duplicate path appears 2x]
│   │   ├── jsx-runtime/ # React Email runtime support files [OVERLAP: duplicate path appears 2x]
│   │   ├── scripts/ # Project scripts [OVERLAP: duplicate path appears 2x]
│   │   │   └── utils/ # TODO: purpose not confirmed from repo evidence for email/.react-email/scripts/utils [OVERLAP: duplicate path appears 2x]
│   │   └── src/ # Source code root [OVERLAP: duplicate path appears 2x]
│   │       ├── actions/ # Server actions/handlers [OVERLAP: duplicate path appears 2x]
│   │       ├── animated-icons-data/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│   │       ├── app/ # TODO: purpose not confirmed from repo evidence for email/.react-email/src/app [OVERLAP: duplicate path appears 2x]
│   │       ├── components/ # UI components (TODO: document if shared vs local-only) [OVERLAP: duplicate path appears 2x]
│   │       ├── contexts/ # React context providers [OVERLAP: duplicate path appears 2x]
│   │       ├── hooks/ # Reusable hooks [OVERLAP: duplicate path appears 2x]
│   │       └── utils/ # TODO: purpose not confirmed from repo evidence for email/.react-email/src/utils [OVERLAP: duplicate path appears 2x]
│   └── .turbo/ # Turborepo cache/artifacts (generated) [OVERLAP: duplicate path appears 2x]
├── forecasting-service/ # FastAPI forecasting service prototype (apps/forecasting-service) [OVERLAP: duplicate path appears 2x]
├── storybook/ # Storybook component workspace (apps/storybook) [OVERLAP: duplicate path appears 2x]
│   ├── .storybook/ # Storybook configuration files [OVERLAP: duplicate path appears 2x]
│   ├── .turbo/ # Turborepo cache/artifacts (generated) [OVERLAP: duplicate path appears 2x]
│   ├── public/ # Public static assets [OVERLAP: duplicate path appears 2x]
│   ├── scripts/ # Project scripts [OVERLAP: duplicate path appears 2x]
│   ├── stories/ # Storybook story files [OVERLAP: duplicate path appears 2x]
│   └── storybook-static/ # Built static Storybook output (generated) [OVERLAP: duplicate path appears 2x]
│       ├── addon-visual-tests-assets/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│       ├── sb-addons/ # Storybook addon bundles (generated) [OVERLAP: duplicate path appears 2x]
│       │   ├── chromatic-com-storybook-1/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│       │   ├── onboarding-2/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│       │   ├── storybook-core-server-presets-0/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│       │   └── themes-3/ # TODO: purpose not confirmed from repo evidence for storybook/storybook-static/sb-addons/themes-3 [OVERLAP: duplicate path appears 2x]
│       ├── sb-common-assets/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│       ├── sb-manager/ # Storybook manager bundle [OVERLAP: duplicate path appears 2x]
│       └── sb-preview/ # Storybook preview bundle [OVERLAP: duplicate path appears 2x]
├── studio/ # Prisma Studio wrapper app (scripted from workspace) [OVERLAP: duplicate path appears 2x]
└── web/ # Marketing/landing web application workspace (apps/web) [OVERLAP: duplicate path appears 2x]
    ├── .netlify/ # Netlify local/build metadata [OVERLAP: duplicate path appears 2x]
    ├── .next/ # Next.js build artifacts (generated) [OVERLAP: duplicate path appears 2x]
    │   ├── cache/ # Build cache data [OVERLAP: duplicate path appears 2x]
    │   │   ├── swc/ # SWC transform cache [OVERLAP: duplicate path appears 2x]
    │   │   └── webpack/ # Webpack cache data [OVERLAP: duplicate path appears 2x]
    │   ├── diagnostics/ # Next.js diagnostics output [OVERLAP: duplicate path appears 2x]
    │   ├── server/ # Server bundle output [OVERLAP: duplicate path appears 2x]
    │   │   ├── app/ # App Router server bundle output [OVERLAP: duplicate path appears 2x]
    │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
    │   │   └── pages/ # Pages-router bundle output [OVERLAP: duplicate path appears 2x]
    │   ├── static/ # Compiled static asset output [OVERLAP: duplicate path appears 2x]
    │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
    │   │   ├── css/ # Built CSS output [OVERLAP: duplicate path appears 2x]
    │   │   ├── media/ # Bundled media output [OVERLAP: duplicate path appears 2x]
    │   │   └── ze20rpwb3uN-JHqQk_bsw/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
    │   └── types/ # Generated type output [OVERLAP: duplicate path appears 2x]
    │       └── app/ # App Router generated type map [OVERLAP: duplicate path appears 2x]
    ├── .turbo/ # Turborepo cache/artifacts (generated) [OVERLAP: duplicate path appears 2x]
    ├── .vercel/ # Vercel local metadata [OVERLAP: duplicate path appears 2x]
    ├── __tests__/ # Test suite directory [OVERLAP: duplicate path appears 2x]
    ├── app/ # App Router root for marketing site [OVERLAP: duplicate path appears 2x]
    │   ├── .well-known/ # Well-known route namespace [OVERLAP: duplicate path appears 2x]
    │   │   └── vercel/ # Vercel verification route namespace [OVERLAP: duplicate path appears 2x]
    │   └── [locale]/ # Dynamic route segment [locale] [OVERLAP: duplicate path appears 2x]
    │       ├── (home)/ # Localized marketing section: (home) (TODO: document IA/source) [OVERLAP: duplicate path appears 2x]
    │       ├── blog/ # Localized marketing section: blog (TODO: document IA/source) [OVERLAP: duplicate path appears 2x]
    │       ├── components/ # Localized marketing section: components (TODO: document IA/source) [OVERLAP: duplicate path appears 2x]
    │       ├── contact/ # Localized marketing section: contact (TODO: document IA/source) [OVERLAP: duplicate path appears 2x]
    │       ├── legal/ # Localized marketing section: legal (TODO: document IA/source) [OVERLAP: duplicate path appears 2x]
    │       └── pricing/ # Localized marketing section: pricing (TODO: document IA/source) [OVERLAP: duplicate path appears 2x]
    ├── components/ # UI components (TODO: document if shared vs local-only) [OVERLAP: duplicate path appears 2x]
    ├── public/ # Public static assets [OVERLAP: duplicate path appears 2x]
    │   └── marketing/ # Marketing static assets [OVERLAP: duplicate path appears 2x]
    ├── scripts/ # Project scripts [OVERLAP: duplicate path appears 2x]
    └── test/ # Test helpers/fixtures [OVERLAP: duplicate path appears 2x]
        └── mocks/ # Mock implementations for tests [OVERLAP: duplicate path appears 2x]
├── docs/ # Docs site app tree (apps/docs) shown flattened as docs/ [OVERLAP: duplicate path appears 3x] [CONFLICT: name reused for both apps/docs tree and repo docs tree]
│   ├── .next/ # Next.js build artifacts (generated) [OVERLAP: duplicate path appears 2x]
│   │   ├── cache/ # Compiler/build cache data [OVERLAP: duplicate path appears 2x]
│   │   │   ├── swc/ # SWC transpilation cache [OVERLAP: duplicate path appears 2x]
│   │   │   └── webpack/ # Webpack cache artifacts [OVERLAP: duplicate path appears 2x]
│   │   ├── diagnostics/ # Next.js diagnostics output [OVERLAP: duplicate path appears 2x]
│   │   ├── server/ # Server bundle build output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── app/ # Generated App Router server bundle output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
│   │   │   └── pages/ # Pages-router build output [OVERLAP: duplicate path appears 2x]
│   │   ├── static/ # Static client assets output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── FrRNJtOnh0a_t3MWE5HR_/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
│   │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
│   │   │   └── css/ # Built CSS assets [OVERLAP: duplicate path appears 2x]
│   │   └── types/ # Generated type declarations [OVERLAP: duplicate path appears 2x]
│   │       └── app/ # Generated App Router type map [OVERLAP: duplicate path appears 2x]
│   ├── .source/ # Generated Fumadocs source module (.source) [OVERLAP: duplicate path appears 2x]
│   ├── .turbo/ # Turbo cache for this workspace/package (generated) [OVERLAP: duplicate path appears 2x]
│   ├── app/ # Documentation area: app [OVERLAP: duplicate path appears 2x]
│   │   └── docs/ # Documentation area: docs [OVERLAP: duplicate path appears 2x]
│   │       └── [[...slug]]/ # Next.js optional catch-all dynamic route segment [OVERLAP: duplicate path appears 2x]
│   ├── content/ # MDX documentation content for docs site app [OVERLAP: duplicate path appears 2x]
│   │   ├── docs/ # Primary docs collections for docs site app [OVERLAP: duplicate path appears 2x]
│   │   │   ├── api-reference/ # Docs content section: api reference [OVERLAP: duplicate path appears 2x]
│   │   │   ├── essentials/ # Docs content section: essentials [OVERLAP: duplicate path appears 2x]
│   │   │   ├── events/ # Docs content section: events [OVERLAP: duplicate path appears 2x]
│   │   │   └── internal/ # Docs content section: internal [OVERLAP: duplicate path appears 2x]
│   │   └── snippets/ # Reusable docs snippets/partials [OVERLAP: duplicate path appears 2x]
│   ├── lib/ # Shared utility/helper modules [OVERLAP: duplicate path appears 2x]
│   ├── public/ # Public static assets served at root [OVERLAP: duplicate path appears 2x]
│   │   ├── images/ # Docs site image assets [OVERLAP: duplicate path appears 2x]
│   │   └── logo/ # Docs site logo assets [OVERLAP: duplicate path appears 2x]
│   └── scripts/ # Project helper scripts [OVERLAP: duplicate path appears 2x]
├── email/ # Apps workspace email preview/export app (apps/email) [OVERLAP: duplicate path appears 2x]
│   ├── .react-email/ # React Email preview/build workspace (generated) [OVERLAP: duplicate path appears 2x]
│   │   ├── .next/ # Next.js build artifacts (generated) [OVERLAP: duplicate path appears 2x]
│   │   │   ├── cache/ # Compiler/build cache data [OVERLAP: duplicate path appears 2x]
│   │   │   ├── diagnostics/ # Next.js diagnostics output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── server/ # Server bundle build output [OVERLAP: duplicate path appears 2x]
│   │   │   ├── static/ # Static client assets output [OVERLAP: duplicate path appears 2x]
│   │   │   └── types/ # Generated type declarations [OVERLAP: duplicate path appears 2x]
│   │   ├── emails/ # React Email template outputs [OVERLAP: duplicate path appears 2x]
│   │   ├── jsx-runtime/ # React Email JSX runtime bundle files [OVERLAP: duplicate path appears 2x]
│   │   ├── scripts/ # Project helper scripts [OVERLAP: duplicate path appears 2x]
│   │   │   └── utils/ # Utilities for React Email local scripts [OVERLAP: duplicate path appears 2x]
│   │   └── src/ # React Email dev app source tree [OVERLAP: duplicate path appears 2x]
│   │       ├── actions/ # Server actions / action handlers [OVERLAP: duplicate path appears 2x]
│   │       ├── animated-icons-data/ # Animated icon metadata used in email previews [OVERLAP: duplicate path appears 2x]
│   │       ├── app/ # React Email local app routes [OVERLAP: duplicate path appears 2x]
│   │       ├── components/ # UI component implementations [OVERLAP: duplicate path appears 2x]
│   │       ├── contexts/ # React context providers [OVERLAP: duplicate path appears 2x]
│   │       ├── hooks/ # Reusable hooks [OVERLAP: duplicate path appears 2x]
│   │       └── utils/ # React Email local utility modules [OVERLAP: duplicate path appears 2x]
│   └── .turbo/ # Turbo cache for this workspace/package (generated) [OVERLAP: duplicate path appears 2x]
├── forecasting-service/ # FastAPI prototype service for inventory forecasting [OVERLAP: duplicate path appears 2x]
├── storybook/ # Component Storybook app workspace (apps/storybook) [OVERLAP: duplicate path appears 2x]
│   ├── .storybook/ # Storybook configuration [OVERLAP: duplicate path appears 2x]
│   ├── .turbo/ # Turbo cache for this workspace/package (generated) [OVERLAP: duplicate path appears 2x]
│   ├── public/ # Public static assets served at root [OVERLAP: duplicate path appears 2x]
│   ├── scripts/ # Project helper scripts [OVERLAP: duplicate path appears 2x]
│   ├── stories/ # Storybook stories [OVERLAP: duplicate path appears 2x]
│   └── storybook-static/ # Built static Storybook output (generated) [OVERLAP: duplicate path appears 2x]
│       ├── addon-visual-tests-assets/ # Chromatic/visual-test addon static assets [OVERLAP: duplicate path appears 2x]
│       ├── sb-addons/ # Storybook addon bundles [OVERLAP: duplicate path appears 2x]
│       │   ├── chromatic-com-storybook-1/ # Bundled Chromatic addon assets [OVERLAP: duplicate path appears 2x]
│       │   ├── onboarding-2/ # Bundled Storybook onboarding addon assets [OVERLAP: duplicate path appears 2x]
│       │   ├── storybook-core-server-presets-0/ # Bundled Storybook core preset addon assets [OVERLAP: duplicate path appears 2x]
│       │   └── themes-3/ # Bundled Storybook themes addon assets [OVERLAP: duplicate path appears 2x]
│       ├── sb-common-assets/ # Storybook shared static assets [OVERLAP: duplicate path appears 2x]
│       ├── sb-manager/ # Storybook manager UI bundle [OVERLAP: duplicate path appears 2x]
│       └── sb-preview/ # Storybook preview iframe bundle [OVERLAP: duplicate path appears 2x]
├── studio/ # Prisma Studio wrapper app (runs against workspace database config) [OVERLAP: duplicate path appears 2x]
└── web/ # Marketing website app (apps/web) [OVERLAP: duplicate path appears 2x]
    ├── .netlify/ # Netlify local/build metadata [OVERLAP: duplicate path appears 2x]
    ├── .next/ # Next.js build artifacts (generated) [OVERLAP: duplicate path appears 2x]
    │   ├── cache/ # Compiler/build cache data [OVERLAP: duplicate path appears 2x]
    │   │   ├── swc/ # SWC transpilation cache [OVERLAP: duplicate path appears 2x]
    │   │   └── webpack/ # Webpack cache artifacts [OVERLAP: duplicate path appears 2x]
    │   ├── diagnostics/ # Next.js diagnostics output [OVERLAP: duplicate path appears 2x]
    │   ├── server/ # Server bundle build output [OVERLAP: duplicate path appears 2x]
    │   │   ├── app/ # Generated App Router server bundle output [OVERLAP: duplicate path appears 2x]
    │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
    │   │   └── pages/ # Pages-router build output [OVERLAP: duplicate path appears 2x]
    │   ├── static/ # Static client assets output [OVERLAP: duplicate path appears 2x]
    │   │   ├── chunks/ # Chunked JS/CSS bundles [OVERLAP: duplicate path appears 2x]
    │   │   ├── css/ # Built CSS assets [OVERLAP: duplicate path appears 2x]
    │   │   ├── media/ # Bundled media assets [OVERLAP: duplicate path appears 2x]
    │   │   └── ze20rpwb3uN-JHqQk_bsw/ # Build-id scoped static asset bucket (generated) [OVERLAP: duplicate path appears 2x]
    │   └── types/ # Generated type declarations [OVERLAP: duplicate path appears 2x]
    │       └── app/ # Generated App Router type map [OVERLAP: duplicate path appears 2x]
    ├── .turbo/ # Turbo cache for this workspace/package (generated) [OVERLAP: duplicate path appears 2x]
    ├── .vercel/ # Vercel local metadata [OVERLAP: duplicate path appears 2x]
    ├── __tests__/ # Test suite directory [OVERLAP: duplicate path appears 2x]
    ├── app/ # App Router root for marketing site [OVERLAP: duplicate path appears 2x]
    │   ├── .well-known/ # Well-known route namespace for marketing site [OVERLAP: duplicate path appears 2x]
    │   │   └── vercel/ # Vercel domain verification route files [OVERLAP: duplicate path appears 2x]
    │   └── [locale]/ # Next.js dynamic route segment ([locale]) [OVERLAP: duplicate path appears 2x]
    │       ├── (home)/ # Localized marketing route segment for (home) [OVERLAP: duplicate path appears 2x]
    │       ├── blog/ # Localized marketing route segment for blog [OVERLAP: duplicate path appears 2x]
    │       ├── components/ # Localized marketing route segment for components [OVERLAP: duplicate path appears 2x]
    │       ├── contact/ # Localized marketing route segment for contact [OVERLAP: duplicate path appears 2x]
    │       ├── legal/ # Localized marketing route segment for legal [OVERLAP: duplicate path appears 2x]
    │       └── pricing/ # Localized marketing route segment for pricing [OVERLAP: duplicate path appears 2x]
    ├── components/ # UI component implementations [OVERLAP: duplicate path appears 2x]
    ├── public/ # Public static assets served at root [OVERLAP: duplicate path appears 2x]
    │   └── marketing/ # Marketing images/assets [OVERLAP: duplicate path appears 2x]
    ├── scripts/ # Project helper scripts [OVERLAP: duplicate path appears 2x]
    └── test/ # Test utilities and fixtures [OVERLAP: duplicate path appears 2x]
        └── mocks/ # Mock implementations for tests [OVERLAP: duplicate path appears 2x]
├── claude-code-plans/ # Claude planning artifacts
├── codex-plans/ # Codex planning artifacts
│   └── tmp-manifest-init-check/ # Temporary workspace for manifest-init verification checks
├── docs/ # Human-authored repository documentation [OVERLAP: duplicate path appears 3x] [CONFLICT: name reused for both apps/docs tree and repo docs tree]
│   ├── Events/ # Documentation area: Events
│   ├── Recipes/ # Documentation area: Recipes
│   ├── Roadmap/ # Documentation area: Roadmap
│   ├── ai-context/ # Documentation area: ai context
│   ├── battle-boards/ # Documentation area: battle boards
│   ├── current-architecture/ # Documentation area: current architecture
│   ├── database/ # Documentation area: database
│   │   ├── _templates/ # Database documentation section:  templates
│   │   ├── enums/ # Database documentation section: enums
│   │   ├── hooks/ # Database documentation section: hooks
│   │   ├── migrations/ # Database documentation section: migrations
│   │   ├── schemas/ # Database documentation section: schemas
│   │   └── tables/ # Database documentation section: tables
│   ├── directory-structure/ # Docs describing expected repository layout
│   ├── llm/ # Documentation area: llm
│   │   ├── next-forge/ # LLM-oriented docs for next-forge/base template context
│   │   └── random-ai-slopdocs/ # Miscellaneous AI-generated notes pending curation
│   ├── logging/ # Documentation area: logging
│   ├── manifest/ # Documentation area: manifest
│   ├── patterns/ # Documentation area: patterns
│   ├── realtime/ # Documentation area: realtime
│   ├── standards/ # Documentation area: standards
│   ├── task-plans/ # Documentation area: task plans
│   ├── tooling/ # Documentation area: tooling
│   └── workflows/ # Documentation area: workflows
├── e2e/ # End-to-end test project assets
│   └── .auth/ # Persisted Playwright auth state for e2e tests
├── libs/ # Small shared TS libraries not packaged under /packages
│   └── inventory-forecast/ # Shared forecasting helper library (types + API client)
├── other-app/ # Experimental/legacy Next app sandbox
│   └── app/ # Next.js app directory in sandbox app
│       └── api/ # Sandbox API route roots (legacy manifest experiments)
├── packages/ # Shared workspace packages (domain + platform libraries)
│   ├── ai/ # Shared AI helpers and abstractions (@repo/ai)
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   ├── components/ # Package UI component layer
│   │   ├── lib/ # Package shared utility modules
│   │   └── src/ # Package source code
│   ├── analytics/ # Analytics integrations and tracking utilities (@repo/analytics)
│   ├── auth/ # Authentication and auth helper package (@repo/auth)
│   │   └── components/ # Package UI component layer
│   ├── cms/ # CMS integration package (@repo/cms)
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   └── components/ # Package UI component layer
│   ├── collaboration/ # Realtime collaboration domain package (@repo/collaboration)
│   ├── database/ # Prisma/database access package (@repo/database)
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   ├── __tests__/ # Package test suite
│   │   ├── generated/ # Generated package outputs/types
│   │   ├── prisma/ # Prisma schema/migrations/client config for package
│   │   ├── scripts/ # Package maintenance/build scripts
│   │   └── src/ # Package source code
│   ├── design-system/ # Shared UI design system components (@repo/design-system)
│   │   ├── components/ # Package UI component layer
│   │   ├── hooks/ # Package UI component layer
│   │   ├── lib/ # Package shared utility modules
│   │   ├── providers/ # Package UI component layer
│   │   └── styles/ # Package UI component layer
│   ├── email/ # Shared email template package (@repo/email)
│   │   └── templates/ # Email templates
│   ├── event-parser/ # Event parsing domain logic package (@repo/event-parser)
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   └── src/ # Package source code
│   ├── feature-flags/ # Feature flag utilities and UI controls (@repo/feature-flags)
│   │   ├── components/ # Package UI component layer
│   │   └── lib/ # Package shared utility modules
│   ├── internationalization/ # I18n dictionaries and locale utilities (@repo/internationalization)
│   │   └── dictionaries/ # Localization dictionaries
│   ├── kitchen-state-transitions/ # Kitchen workflow/state-transition rules (@repo/kitchen-state-transitions)
│   │   └── lib/ # Package shared utility modules
│   ├── manifest-adapters/ # Manifest runtime adapters and generated surfaces (@repo/manifest-adapters)
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   ├── generated/ # Generated package outputs/types
│   │   ├── manifests/ # Manifest DSL files used by manifest adapter/runtime generation
│   │   └── src/ # Package source code
│   ├── manifest-ir/ # Manifest IR artifact package folder (generated IR + typed accessors)
│   │   ├── ir/ # Generated manifest intermediate representation artifacts
│   │   └── src/ # Typed accessors/helpers for manifest IR artifacts
│   ├── manifest-sources/ # Manifest DSL source definitions (human-authored .manifest files)
│   │   └── kitchen/ # Kitchen-domain manifest source definitions
│   ├── next-config/ # Shared Next.js config presets and wrappers (@repo/next-config)
│   ├── notifications/ # Notification integration package (@repo/notifications)
│   │   └── components/ # Package UI component layer
│   ├── observability/ # Logging/monitoring/telemetry package (@repo/observability)
│   │   └── status/ # Observability status/health exports
│   ├── payments/ # Payments domain integrations (@repo/payments)
│   ├── payroll-engine/ # Payroll calculation/engine package (@repo/payroll-engine)
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   ├── src/ # Package source code
│   │   └── tests/ # Package tests
│   ├── pdf/ # PDF generation/parsing utilities (@repo/pdf)
│   │   └── src/ # Package source code
│   ├── rate-limit/ # Rate limiting utilities (@repo/rate-limit)
│   ├── realtime/ # Realtime transport/pubsub helpers (@repo/realtime)
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   ├── __tests__/ # Package test suite
│   │   └── src/ # Package source code
│   ├── sales-reporting/ # Sales reporting engine package (@capsule-pro/sales-reporting)
│   │   ├── .bolt/ # Bolt-generated project metadata
│   │   ├── .turbo/ # Turbo cache for this package (generated)
│   │   ├── examples/ # Example usage for the package
│   │   └── src/ # Package source code
│   ├── security/ # Security policies/middleware package (@repo/security)
│   ├── seo/ # SEO metadata helpers (@repo/seo)
│   ├── storage/ # Storage abstraction/integration package (@repo/storage)
│   ├── typescript-config/ # Shared TypeScript config presets (@repo/typescript-config)
│   └── webhooks/ # Webhook validation/dispatch helpers (@repo/webhooks)
│       └── lib/ # Package shared utility modules
├── patches/ # Patch files applied via pnpm patchedDependencies
├── playwright-report/ # Playwright HTML report output
├── project-details/ # Project research/spec and design reference assets
│   ├── ai-repro/ # AI reproduction notes/materials
│   └── ui-design-images/ # UI design image references
│       ├── Dashboards/ # Design reference images: Dashboards
│       ├── Events/ # Design reference images: Events
│       ├── Mobile/ # Design reference images: Mobile
│       ├── command-boards/ # Design reference images: command boards
│       ├── dev-console/ # Design reference images: dev console
│       └── kitchen/ # Design reference images: kitchen
├── ralph/ # Ralph loop templates/prompts and working files
│   ├── in-progress/ # Active Ralph loop working set
│   │   ├── UI/ # Active Ralph workstream: UI
│   │   └── events/ # Active Ralph workstream: events
│   └── old-files/ # Archived Ralph loop files
│       └── UI/ # Archived Ralph files: UI
├── scripts/ # Root automation scripts
│   └── manifest/ # Manifest compile/generate/check/build scripts
├── skills/ # Locally vendored skill definitions
│   └── spec-prompt-template-generator/ # Skill for generating spec-specific prompt templates
├── test/ # Top-level test helpers/stubs
│   └── stubs/ # Global test stubs/fixtures
├── test-gen/ # Sandbox code for test generation experiments
├── test-results/ # Top-level test runner outputs
├── tools/ # Standalone tool projects and helper scripts
│   ├── document-parser/ # Standalone document parser tool wrapper
│   │   └── project/ # Document parser tool project source
│   ├── event-and-menu-intake/ # Standalone event/menu intake tool wrapper
│   │   └── project/ # Event/menu intake tool project source
│   ├── sales-reporting-pdf-engine/ # Standalone sales-reporting PDF engine wrapper
│   │   └── project/ # Sales-reporting PDF engine project source
│   └── scripts/ # Tooling helper scripts
└── turbo/ # Turborepo code generators/templates
    └── generators/ # Turbo code-generator definitions
        └── templates/ # Handlebars templates used by turbo generators

