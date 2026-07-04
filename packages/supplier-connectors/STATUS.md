# Supplier connector status (2026-07-04)

**Both connectors are documented stubs (`isStub = true`) — no order is ever transmitted to a
supplier.** This file records the exact external boundary so nobody mistakes the internal flow
for a live integration.

## What works WITHOUT the external integration (complete, verified 2026-07-04)

- Prep-list finalize → deterministic demand engine (net demand vs free stock, per-supplier
  grouping, unit conversion via `core.unit_conversions`, catalog MOQ/orderMultiple pack rounding,
  UNRESOLVED separation) → per-supplier draft `PurchaseRequisition`s with per-line prep-list
  provenance (`sourcePrepListIds`).
- Manager review: `/procurement/weekly-ordering` (week-scoped) and `/procurement/requisitions/[id]`.
- Approval chain → `POST /api/procurement/requisitions/[id]/convert-to-po` materializes a real
  `PurchaseOrder` + items (vendor via the `InventorySupplier.vendorId` bridge).
- Operational order list export: per-supplier CSV from the weekly-ordering page. QuickBooks bill
  export exists for POs.
- Inbound push ingestion of supplier catalogs works today: `POST /api/webhooks/supplier-catalog`
  (HMAC-verified) for `catalog.updated` / `pricing.changed` / availability events.

## The exact external-only blocker

Transmitting a PO to US Foods requires, per `src/connectors/us-foods.ts` (stub header):

1. A US Foods EDI trading-partner agreement (business step, not code).
2. Credentials: `apiBaseUrl`, `apiKey` (trading partner ID), `apiSecret` (AS2/FTP) — there is no
   per-tenant credential storage yet (no `connectorCredentials` field anywhere in the schema;
   current config fields are env-var placeholders).
3. X12 transaction sets implemented: 850 (PO out), 855/856/810 (ack/ship/invoice back),
   832/846 (catalog/availability) — all currently comments, no implementation.

Charlie's Produce (`charlies-produce.ts`) is the same shape.

**Rule:** never report an order as "sent" from a stub. The UI treats export-CSV + the PO record
as the operational hand-off until a real connector lands.
