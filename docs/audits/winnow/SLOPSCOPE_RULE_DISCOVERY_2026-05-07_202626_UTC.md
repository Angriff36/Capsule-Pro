# SlopScope rule discovery (continued)

---
## [2026-05-06 17:47] Rule Discovery — placeholder.pseudo_random_financial_reference_collision

### Finding
Three `generate*Number` functions in the accounting/events validation modules use `Math.floor(Math.random() * 90_000 + 10_000)` to produce financial reference numbers (INV-, PAY-, CON- prefixed). These numbers are stored in Prisma model fields with `@unique` constraints (`invoiceNumber` on Invoice, `contractNumber` on Contract). The random space is only 90,000 values per day — under moderate load, birthday-paradox math says collision probability exceeds 50% at roughly 374 records per day per prefix. A collision triggers a hard `UniqueConstraintViolationError` from Postgres, causing the entire invoice/payment/contract creation request to fail.

Additionally, all three functions accept `_tenantId` as a parameter (underscore-prefixed = intentionally unused), showing the developer knew the numbers should be scoped per-tenant but never implemented it. The contracts file even contains explicit "For now" / "In a real implementation" comments acknowledging this is a placeholder.

The payment number case is worse: the generated random string is stored as `gatewayTransactionId` — a field meant for the real payment processor's transaction ID — rather than a dedicated reference column (which doesn't exist on the Payment model at all).

### Evidence
- File: `apps/api/app/api/accounting/invoices/validation.ts`
- Snippet:
```typescript
export function generateInvoiceNumber(_tenantId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `INV-${dateStr}-${randomPart}`;
}
```
- File: `apps/api/app/api/accounting/payments/validation.ts`
- Snippet:
```typescript
export function generatePaymentNumber(_tenantId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `PAY-${dateStr}-${randomPart}`;
}
```
- File: `apps/api/app/api/events/contracts/validation.ts`
- Snippet:
```typescript
export function generateContractNumber(_tenantId: string): string {
  // This would typically call a database function to generate a unique contract number
  // For now, we'll implement a basic generator that could be replaced with a DB function
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `CON-${dateStr}-${randomPart}`;
}
```
- Prisma schema evidence: `invoiceNumber String @unique` (schema.prisma:4405), `contractNumber String @unique` (schema.prisma:2176)
- Payment model has no `paymentNumber` column; the generated value is stored as `gatewayTransactionId` (payments/route.ts:243)

### Why this matters
Under moderate business volume (hundreds of invoices/payments per day), random collisions will cause hard 500 errors on invoice or contract creation. The error surface is user-facing: a client trying to pay or sign a contract gets an opaque server error. The `_tenantId` parameter being accepted but ignored proves this was recognized as incomplete. The contracts file explicitly labels it a placeholder. For payments, the misuse of `gatewayTransactionId` means reconciliation with actual payment processors will break — the field will contain a random string instead of a real processor transaction ID.

### Proposed detector rule
```json
{
  "id": "placeholder.pseudo_random_financial_reference_collision",
  "title": "Math.random used to generate financial reference numbers with uniqueness constraints",
  "category": "placeholder",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "Math.random() within functions named generate*Number, generate*Reference, or generate*Id",
    "Math.floor(Math.random() adjacent to INV-, PAY-, CON-, ORD- prefixes",
    "_tenantId parameter (underscore-prefixed unused param) in number generator functions",
    "For now / In a real implementation comments near random number generators"
  ],
  "negative_patterns": [
    "Math.random() in test files",
    "Math.random() in demo/fixture/mock contexts",
    "Math.random() with no database persistence downstream",
    "crypto.randomUUID() or nanoid() usage (these are proper)"
  ],
  "evidence_required": [
    "Function generates a string with a business prefix (INV, PAY, CON, ORD, etc.)",
    "Generated value is stored in a Prisma model field with @unique constraint",
    "No database sequence, counter, or ON CONFLICT retry logic exists",
    "No crypto.randomUUID or equivalent CSPRNG is used"
  ],
  "false_positive_controls": [
    "Exclude test fixtures and mock data generators",
    "Exclude cases where Math.random is used for non-persisted values (UI only)",
    "Require evidence of database @unique constraint or uniqueness expectation"
  ],
  "user_impact": "Invoice, payment, or contract creation fails with a database unique constraint error when two records collide on the same day. Probability of collision grows with volume — at ~374 records/day per prefix, collision chance exceeds 50%. This is a silent time bomb that works fine at low volume but breaks under growth.",
  "repair_guidance": "Replace Math.random() with a database-backed sequence (e.g., PostgreSQL SEQUENCE per tenant+prefix), a ULID/UUIDv7 for global uniqueness without coordination, or an atomic incrementing counter stored in the database. Ensure the generator retries on collision if randomness is retained. Remove the unused _tenantId parameter or actually use it for scoping.",
  "example_source": {
    "file": "apps/api/app/api/accounting/invoices/validation.ts",
    "line_or_snippet": "export function generateInvoiceNumber(_tenantId: string): string {\n  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, \"\");\n  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();\n  return `INV-${dateStr}-${randomPart}`;\n}"
  }
}
```

### Implementation note
Build a hybrid detector: (1) regex scan for `Math.random` inside functions matching `generate*Number` or `generate*Reference`, (2) AST check for the function accepting a `_tenantId` or `_orgId` parameter (unused scoped param), (3) cross-file check that the generated value flows into a Prisma create with a field that has `@unique` in the schema. The "For now" / "In a real implementation" comment proximity boosts confidence. Flag as high severity when the @unique constraint is confirmed.
---

## [2026-05-06 18:15] Rule Discovery — feature_claim_mismatch.full_ui_page_no_database_model

### Finding
The kitchen Equipment Maintenance page presents a complete, multi-tab UI with tabs for "Equipment" (list), "Work Orders", and "Predictive Failure Alerts." The alerts tab header explicitly brands itself as "AI-powered alerts based on equipment usage, maintenance history, and condition." The page metadata description advertises "predictive failure alerts." However, the entire backend is absent: no `Equipment` model exists in the Prisma schema, no `EquipmentAlert` model exists, and both API endpoints (`/api/kitchen/equipment/list` and `/api/kitchen/equipment/alerts`) are hardcoded 501 stubs that return "not implemented" errors. The frontend silently swallows these failures — it checks `data.success` which is never true for a 501 response, resulting in an empty equipment list and an empty alerts list with a green checkmark saying "No alerts at this time. Your equipment is in good standing." The user sees a fully built, branded feature page that appears functional but does absolutely nothing.

### Evidence
- File: `apps/api/app/api/kitchen/equipment/alerts/route.ts`
- Snippet:
```typescript
// NOTE: Equipment model is not yet implemented in the database schema.
// This endpoint returns an empty response until the model is added.
...
return NextResponse.json(
  {
    error: "Not implemented",
    message:
      "Equipment alerts feature not yet implemented. Equipment model and predictive failure analysis are pending. Tracked as capsule-pro/TODO:equipment-model-implementation",
  },
  { status: 501 }
);
```
- File: `apps/api/app/api/kitchen/equipment/list/route.ts`
- Snippet:
```typescript
// Equipment routes are disabled - Equipment model does not exist in schema
// This route needs schema migration to add Equipment model
...
return manifestErrorResponse(
  "Equipment feature not implemented - missing model",
  501
);
```
- File: `apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx` (line 440-444)
- Snippet:
```tsx
<CardTitle className="flex items-center gap-2">
  <AlertTriangle className="h-5 w-5" />
  Predictive Failure Alerts
</CardTitle>
<CardDescription>
  AI-powered alerts based on equipment usage, maintenance history,
  and condition
</CardDescription>
```
- File: `apps/app/app/(authenticated)/kitchen/equipment/page.tsx` (line 7-11)
- Snippet:
```tsx
export const metadata = {
  title: "Equipment Maintenance",
  description:
    "Track equipment maintenance, work orders, and predictive failure alerts",
};
```
- Prisma schema: `model Equipment` does not exist (confirmed via grep across all .prisma files)
- Prisma schema: `model EquipmentAlert` does not exist

### Why this matters
Users navigate to the Equipment Maintenance page and see a polished, multi-tab interface with AI branding on the alerts tab. Because the frontend silently swallows the 501 responses, the user sees empty lists with a reassuring "No alerts at this time. Your equipment is in good standing" message — giving a false impression that the system is monitoring their equipment when in fact no equipment data or monitoring exists at all. For a catering/food-service company where equipment failure (walk-in freezers, ovens, refrigeration) can cause thousands of dollars in food waste and event cancellations, this is a critical trust violation. The "AI-powered" branding compounds the deception.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.full_ui_page_no_database_model",
  "title": "Full UI page with tabs and AI branding has no backing database model or functional API",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx", "sql", "any"],
  "patterns": [
    "Frontend page component imports and renders tabs for features (alerts, list, etc.)",
    "API route files return 501 status with 'not implemented' or 'model does not exist' messages",
    "Route file comments state 'model does not exist in schema'",
    "Frontend metadata/description advertises feature capabilities (predictive, AI-powered)",
    "Frontend fetch handler checks data.success without handling error/not-implemented responses"
  ],
  "negative_patterns": [
    "API routes that return actual data from database queries",
    "Prisma schema containing the referenced model",
    "Frontend showing explicit 'coming soon' or 'beta' badges",
    "Error responses that propagate to user-visible error states"
  ],
  "evidence_required": [
    "Frontend page.tsx or client component with feature advertising (metadata, card titles, descriptions)",
    "API route returning 501 with 'not implemented' message",
    "Absence of referenced model in Prisma schema",
    "Frontend silently handling failure as empty success state"
  ],
  "false_positive_controls": [
    "Verify the 501 is returned unconditionally (not gated behind a feature flag that could be enabled)",
    "Check that the frontend does not show an explicit 'coming soon' or 'feature not available' notice",
    "Exclude intentionally stubbed routes in test/dev-only environments"
  ],
  "user_impact": "Users see a complete, branded feature page implying active equipment monitoring and AI-powered predictive alerts, when no equipment model, data, or monitoring exists. The reassuring 'all clear' message creates false confidence in a domain where equipment failure has direct financial and food-safety consequences.",
  "repair_guidance": "Either (a) implement the Equipment and EquipmentAlert Prisma models with lifecycle tracking, maintenance history, and usage metrics, then wire the API endpoints to real data with actual alerting logic, or (b) add a prominent 'Coming Soon' banner to the frontend page, remove the 'AI-powered' branding, and show an explicit message explaining the feature is not yet available instead of a misleading green checkmark.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/equipment/alerts/route.ts",
    "line_or_snippet": "Equipment alerts feature not yet implemented. Equipment model and predictive failure analysis are pending."
  }
}
```

### Implementation note
Build a cross-file detector: (1) identify frontend page components with feature-advertising metadata or card titles (regex for "predictive", "AI-powered", "alerts"), (2) trace API calls from those components to backend route files, (3) check if the route unconditionally returns 501 or contains "model does not exist" comments, (4) verify the referenced model is absent from the Prisma schema, (5) check if the frontend silently renders an empty/success state on failure. Flag as high severity when AI/ML branding is present alongside the missing model. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 21:00] Rule Discovery — error_handling_theater.audit_write_swallowed_success_returned

### Finding
The `POST /api/kitchen/overrides` endpoint handles constraint override authorizations — a compliance-critical action in a food-service system where overrides bypass safety checks (e.g., temperature violations, allergen controls). The route creates an audit record and an outbox event inside a `$transaction`, but wraps the transaction in a try/catch that **only logs a warning on failure and then returns `{ success: true }` with the override details**. This means the caller is told the override was recorded when it was not. The audit trail — the entire compliance record of who overrode what constraint and why — is silently lost. The outbox event (which would notify downstream systems like the activity feed) is also lost.

The comment says "If the audit table doesn't exist yet, log and continue" but the catch block catches ALL errors, not just "table doesn't exist." Connection failures, permission errors, constraint violations, and any other database error are all treated the same way: swallowed with a warning and a fake success response.

### Evidence
- File: `apps/api/app/api/kitchen/overrides/route.ts`
- Snippet (lines 94-148):
```typescript
  // Record the override in the audit table + outbox event atomically
  try {
    await database.$transaction(async (tx) => {
      await tx.overrideAudit.create({ data: { ... } });
      await tx.outboxEvent.create({ data: { ... } });
    });
  } catch (error) {
    // If the audit table doesn't exist yet, log and continue
    logger.warn("Override audit + outbox transaction failed", {
      error: String(error),
    });
  }

  return NextResponse.json({
    success: true,
    override: { constraintCode, reason, authorizedBy, ... },
  });
```
- Same file, GET handler (lines 185-190) has a similar pattern:
```typescript
  } catch (error) {
    captureException(error);
    // If the table doesn't exist yet, return empty array
    logger.warn("Override audit table not available", { error: String(error) });
    return NextResponse.json({ overrides: [] });
  }
```

### Why this matters
In a food-service catering operation, kitchen constraint overrides bypass safety controls — temperature limits, allergen separation, prep time requirements, etc. When a manager authorizes an override, the audit trail is the ONLY compliance record that proves who authorized it and why. If the database write fails (table doesn't exist, connection error, permission issue) and the endpoint returns `success: true`, the frontend shows a green confirmation to the manager, who walks away thinking the override is recorded. But there is no record. If a food safety incident occurs and investigators ask "who overrode the temperature constraint on walk-in cooler 3?", the answer is: nobody knows. The override was silently lost.

Additionally, the outbox event is lost, meaning downstream systems (activity feed, notifications) never learn about the override. This breaks the event-sourced audit chain entirely.

### Proposed detector rule
```json
{
  "id": "error_handling_theater.audit_write_swallowed_success_returned",
  "title": "Audit/compliance database write failure silently swallowed, success returned to caller",
  "category": "error_handling_theater",
  "severity": "critical",
  "confidence": 0.93,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "try/catch wrapping a database write (create/update/$transaction) where the catch block logs but does NOT return an error response",
    "After the catch block, the function returns a success response (status 200, { success: true }, etc.)",
    "The caught database write involves audit, compliance, override, or outbox tables",
    "Comment pattern: 'table may not exist' or 'table doesn't exist yet' used to justify silent error swallowing"
  ],
  "negative_patterns": [
    "Catch block that returns an error response (500, 4xx) after the database write failure",
    "Catch block that re-throws the error",
    "try/catch around request.json() parsing (common input validation pattern)",
    "Catch blocks in test files",
    "Intentional dry-run modes that explicitly document skipping persistence"
  ],
  "evidence_required": [
    "Database write operation (Prisma create/update/$transaction/$executeRaw) inside a try block",
    "Catch block that logs but does not return an error response or re-throw",
    "Success response returned after the try/catch regardless of whether the write succeeded",
    "The written data involves audit, compliance, override, approval, or outbox semantics"
  ],
  "false_positive_controls": [
    "Exclude catch blocks that return an error response or re-throw",
    "Exclude patterns where the database write is intentionally optional (with clear documentation)",
    "Require the database write to involve compliance-significant data (audit, override, approval, outbox)",
    "Check that the success response is returned unconditionally after the try/catch, not conditionally"
  ],
  "user_impact": "Compliance-critical audit records (who overrode what safety constraint and when) are silently lost when database writes fail. The caller receives a success response, creating a false paper trail. In food-safety-regulated environments, this means override authorizations exist in the UI but not in the database — making them useless during audits, incident investigations, or liability proceedings.",
  "repair_guidance": "The catch block must either (a) return an error response to the caller indicating the override was not recorded, or (b) re-throw the error to be caught by the outer error handler. If the table might genuinely not exist in some environments, use a schema migration check at startup or a feature flag, not a silent catch. The override authorization should be atomic with its audit record — if the audit can't be written, the override should not be considered authorized.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/overrides/route.ts",
    "line_or_snippet": "} catch (error) {\n    // If the audit table doesn't exist yet, log and continue\n    logger.warn(\"Override audit + outbox transaction failed\", {\n      error: String(error),\n    });\n  }\n\n  return NextResponse.json({\n    success: true,\n    override: { ... },\n  });"
  }
}
```

### Implementation note
Build a hybrid detector: (1) AST analysis to find try/catch blocks where a database write (Prisma create/update/$transaction) is inside the try, (2) check the catch block for absence of error response return or re-throw, (3) verify the function returns a success response after the try/catch, (4) check if the database tables involved have audit/compliance/override/outbox semantics (by table name patterns). Boost severity to critical when the write involves both an audit table and an outbox event in the same transaction — this pattern means the entire event-sourced audit chain is broken. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-07 12:30] Rule Discovery — fake_integration.client_fabricated_gateway_response

### Finding
The client-side payment form in `payment-form-client.tsx` fabricates a fake payment gateway response using `Date.now()` timestamps and hardcoded success values, then sends it to the server as if a real payment processor returned it. The component also creates fake tokenized payment method records. No actual payment gateway (Stripe, Square, etc.) is ever called.

### Evidence
- File: `apps/app/app/(authenticated)/accounting/invoices/components/payment-form-client.tsx`
- Snippet (lines 128-153):
```typescript
// Process payment (in real implementation, this would call the payment gateway)
await apiFetch(`/api/accounting/payments/${payment.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    gatewayResponse: {
      code: "200",
      message: "Success",
      transactionId: `txn_${Date.now()}`,
    },
  }),
});

// If saving payment method, create tokenized record
if (savePaymentMethod && paymentMethodNickname) {
  await apiFetch("/api/accounting/payment-methods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: "", // Will be derived from invoice
      type: methodType,
      externalMethodId: `pm_${Date.now()}`,
      nickname: paymentMethodNickname,
    }),
  });
}
```
- Additional: Line 104 passes `eventId: ""` with comment "Will be derived from invoice" but no derivation exists.

### Why this matters
This is a **critical** finding. The payment form presents a full checkout UI with credit card, debit card, ACH, wire transfer, check, cash, and digital wallet options. When a user submits a payment, the UI shows "Processing..." but zero money is ever collected. Instead:

1. A fake `gatewayResponse` with hardcoded `code: "200"` and a `txn_` + timestamp ID is sent to the server, which stores it as a completed payment. The server-side `gateway.ts` (already discovered separately) accepts any response without verification.
2. The "Save payment method" feature creates a record with `externalMethodId: pm_${Date.now()}` — a timestamp masquerading as a tokenized card reference that could never be used for real charges.
3. `clientId` and `eventId` are sent as empty strings with "will be derived" comments but no derivation logic exists.
4. The user receives a success confirmation and is redirected back to the invoice page, which now shows the invoice as "paid."

In a real catering business, this means: revenue is not actually collected, financial records contain fabricated transaction IDs, and any downstream accounting or tax reporting based on these records would be incorrect. The explicit comment "in real implementation, this would call the payment gateway" confirms this is a known placeholder left in production.

### Proposed detector rule
```json
{
  "id": "fake_integration.client_fabricated_gateway_response",
  "title": "Client-side component fabricates payment gateway response",
  "category": "fake_integration",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "regex",
  "language_targets": ["typescript", "tsx", "javascript", "jsx"],
  "patterns": [
    "gatewayResponse.*code.*200",
    "transactionId.*Date\\.now\\(\\)",
    "externalMethodId.*Date\\.now\\(\\)",
    "pm_\\$\\{Date",
    "txn_\\$\\{Date",
    "in real implementation.*call.*payment gateway",
    "in real implementation.*would call.*gateway"
  ],
  "negative_patterns": [
    "PaymentIntent",
    "stripe.confirm",
    "@stripe/",
    "confirmPayment",
    "processPayment"
  ],
  "evidence_required": [
    "Client component (tsx/jsx) that sends a fabricated gatewayResponse object to an API endpoint",
    "Transaction ID or payment method ID generated using Date.now() or Math.random()",
    "Absence of any payment SDK import (stripe, square, braintree, etc.)",
    "Comment admitting the implementation is a placeholder"
  ],
  "false_positive_controls": [
    "Exclude files that import a real payment SDK (stripe, @stripe/stripe-js, square, braintree)",
    "Exclude files that call a server-side payment function (not just API fetch with fabricated body)",
    "Require the fabricated response to be sent via apiFetch/fetch to a /api/ endpoint",
    "Only flag when both transactionId fabrication AND gatewayResponse fabrication are present"
  ],
  "user_impact": "Users are shown a 'Processing...' state and then a success confirmation for payments that were never processed. No money is collected. Financial records contain fabricated transaction IDs (txn_1234567890) and fake tokenized payment method records (pm_1234567890) that correspond to no real financial institution. Downstream accounting, tax reporting, and revenue tracking are all based on fictitious payment data.",
  "repair_guidance": "Replace the fabricated gatewayResponse with a real payment processor integration. For card payments, integrate Stripe Elements or similar to collect card details client-side and create a PaymentIntent server-side. For ACH/wire/check/cash, create a separate recording flow that does not pretend to be a real-time gateway authorization. Remove the 'Save payment method' tokenization simulation until real PCI-compliant tokenization via the payment processor is implemented. Ensure the server-side gateway endpoint validates the response against the actual processor before recording payment completion.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/accounting/invoices/components/payment-form-client.tsx",
    "line_or_snippet": "// Process payment (in real implementation, this would call the payment gateway)\nawait apiFetch(`/api/accounting/payments/${payment.id}`, {\n  method: \"PUT\",\n  body: JSON.stringify({\n    gatewayResponse: {\n      code: \"200\",\n      message: \"Success\",\n      transactionId: `txn_${Date.now()}`,\n    },\n  }),\n});"
  }
}
```

### Implementation note
Build a regex-based detector that scans client components (.tsx/.jsx) for the combination of (1) a `gatewayResponse` object with hardcoded success codes, (2) `Date.now()` used to generate transaction or payment method IDs, and (3) absence of any real payment SDK import. The "in real implementation" comment is a strong confirmation signal but not required for the match. Cross-reference with the server-side `fake_integration.payment_gateway_always_success_placeholder` rule — when both the client fabricates the response AND the server accepts it without verification, the combined severity should be escalated to critical. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage

### Finding
Multiple API endpoints store file content as base64 data URLs directly in PostgreSQL `String` columns instead of using object storage (S3, GCS, Azure Blob). The most impactful case is the contract document upload endpoint, which accepts PDF and Word documents up to 10MB, converts them to base64 data URLs (~13.3MB per 10MB file), and stores the entire string in the `documentUrl` field on the `EventContract` model. The same pattern appears in payroll, purchase order, and event QuickBooks export endpoints where base64 data URLs are returned in API responses instead of being stored in object storage with signed download URLs.

The contract document upload is the critical case: every contract document uploaded by a user is persisted as an inline data URL in a database text column. For a catering company handling event contracts (legal documents), this means the database is being used as a file system. A 10MB PDF becomes a ~13.3MB string stored in a `String?` column with no size limit enforcement beyond the 10MB input validation (which doesn't account for the base64 expansion). The comment explicitly acknowledges this is temporary: "Note: In production, you would upload to a storage service (S3, Blob, etc.) and store the URL. For now, we're storing a data URL."

### Evidence
- File: `apps/api/app/api/events/contracts/[id]/document/route.ts`
- Snippet:
```typescript
// Convert file to base64 for storage
const bytes = await file.arrayBuffer();
const buffer = Buffer.from(bytes);
const base64 = buffer.toString("base64");

// Update contract with document URL
// Note: In production, you would upload to a storage service (S3, Blob, etc.)
// and store the URL. For now, we're storing a data URL.
const dataUrl = `data:${file.type};base64,${base64}`;

await database.eventContract.update({
  where: {
    tenantId_id: { tenantId, id: contractId },
  },
  data: {
    documentUrl: dataUrl,
    documentType,
  },
});
```
- File: `apps/api/app/api/payroll/export/quickbooks/route.ts` (line 81-91)
- Snippet:
```typescript
// In a production system, you might:
// 1. Store the file in object storage (S3, GCS, etc.)
// 2. Return a signed URL for download
// For now, we'll return the content as a base64-encoded data URL
const base64Content = Buffer.from(result.content).toString("base64");
const dataUrl = `data:${mimeType};base64,${base64Content}`;
return NextResponse.json({ exportId: result.exportId, fileUrl: dataUrl, ... });
```
- File: `apps/api/app/api/inventory/purchase-orders/export/quickbooks/route.ts` (line 346-352) — same pattern
- File: `apps/api/app/api/events/export/quickbooks/route.ts` (line 331-336) — same pattern
- Prisma schema: `documentUrl String? @map("document_url")` (schema.prisma:4090) — plain String column, not a blob or large-object reference

### Why this matters
For contract documents specifically: event contracts are legal documents in a catering business. Storing them as base64 data URLs in PostgreSQL text columns has several consequences: (1) database bloat — a 10MB PDF becomes ~13.3MB of text stored in-row, consuming disk, memory, and WAL space; (2) no CDN or streaming — the "document URL" is an inline data URL that must be fully loaded into memory before serving, making document downloads slow and resource-intensive; (3) backup/restore impact — every database backup includes all contract documents as base64 strings, inflating backup size and duration; (4) no access control at the storage layer — a proper S3/GCS setup allows signed URLs with expiration, but data URLs are served from the application layer with no download tracking or expiration; (5) the 10MB input limit doesn't account for the base64 expansion, so a 10MB file becomes ~13.3MB in the database with no explicit column size guard. For the export endpoints, returning base64 in API responses means large export files are embedded in JSON responses, which can exceed typical response size limits and make downloads unreliable.

### Proposed detector rule
```json
{
  "id": "placeholder.base64_data_url_persisted_as_file_storage",
  "title": "File content stored as base64 data URL in database or API response instead of object storage",
  "category": "placeholder",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "regex",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "toString('base64') followed by template literal with 'data:' prefix",
    "dataUrl = `data:${...};base64,${...}` pattern",
    "Comment: 'In production, you would upload to a storage service' or 'For now, we are storing a data URL'",
    "Comment: 'In a production system, you might' near base64 file content",
    "Prisma update/create where a field named documentUrl/fileUrl is set to a data: URL"
  ],
  "negative_patterns": [
    "Base64 encoding for email attachments (RFC 2387 multipart/related)",
    "Base64 encoding for JWT tokens or OAuth flows",
    "Base64 in test fixtures or mock data",
    "S3 upload presigned URL generation (actual storage integration)",
    "import from '@aws-sdk/client-s3' or similar cloud storage SDK"
  ],
  "evidence_required": [
    "File content (arrayBuffer, Buffer) converted to base64 via toString('base64')",
    "Result stored in a variable named dataUrl or assigned to a database field named documentUrl/fileUrl",
    "Comment acknowledging this is temporary or should use object storage",
    "Absence of cloud storage SDK import (S3, GCS, Azure Blob, Uploadthing, etc.)"
  ],
  "false_positive_controls": [
    "Exclude files that import a cloud storage SDK (@aws-sdk/client-s3, @google-cloud/storage, azure-storage, uploadthing, etc.)",
    "Exclude base64 encoding used for non-file purposes (JWT, auth, encoding for transport)",
    "Require the data URL to be stored in a database field or returned as a fileUrl in an API response",
    "Exclude test files and fixtures"
  ],
  "user_impact": "Contract documents (legal files for catering events) are stored as base64 strings in PostgreSQL instead of proper object storage. This causes database bloat (~33% size overhead per file), slow document retrieval (no CDN/streaming), inflated backups, and no storage-level access control or signed URL expiration. For a catering business where contracts define event terms, pricing, and liability, document reliability and accessibility are operationally critical.",
  "repair_guidance": "Replace base64 data URL storage with a proper object storage integration (AWS S3, GCS, Azure Blob, or a managed service like Uploadthing). Upload the file to object storage, store the resulting URL or key in the database field, and serve downloads via signed URLs with expiration. For the export endpoints, store the export file in object storage and return a signed download URL instead of embedding base64 in the JSON response. Add a file size limit that accounts for base64 expansion if keeping a string column.",
  "example_source": {
    "file": "apps/api/app/api/events/contracts/[id]/document/route.ts",
    "line_or_snippet": "// Note: In production, you would upload to a storage service (S3, Blob, etc.)\n// and store the URL. For now, we are storing a data URL.\nconst dataUrl = `data:${file.type};base64,${base64}`;\n\nawait database.eventContract.update({\n  where: { tenantId_id: { tenantId, id: contractId } },\n  data: { documentUrl: dataUrl, documentType },\n});"
  }
}
```

### Implementation note
Build a regex-based detector that scans for the combination of (1) `toString('base64')` or `Buffer.from` followed by base64 conversion, (2) the result being assembled into a `data:` URL template literal, and (3) the data URL being stored in a database field (Prisma update/create with a field named documentUrl, fileUrl, etc.) or returned in an API response. Check for the presence of a comment pattern like "In production, you would upload" or "For now, we're storing" as a confidence booster. Cross-reference with cloud storage SDK imports — if `@aws-sdk/client-s3`, `@google-cloud/storage`, `uploadthing`, or similar are imported in the same file, it's likely a false positive. Flag as high severity when the data URL is persisted to a database field, medium severity when only returned in an API response. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage

### Finding
Multiple API endpoints store file content as base64 data URLs directly in PostgreSQL String columns instead of using object storage (S3, GCS, Azure Blob). The most impactful case is the contract document upload endpoint, which accepts PDF and Word documents up to 10MB, converts them to base64 data URLs, and stores the entire string in the documentUrl field on the EventContract model. The same pattern appears in payroll, purchase order, and event QuickBooks export endpoints where base64 data URLs are returned in API responses instead of being stored in object storage with signed download URLs.

The contract document upload is the critical case: every contract document uploaded by a user is persisted as an inline data URL in a database text column. The comment explicitly acknowledges this is temporary: "Note: In production, you would upload to a storage service (S3, Blob, etc.) and store the URL. For now, we're storing a data URL."

### Evidence
- File: apps/api/app/api/events/contracts/[id]/document/route.ts
- Snippet: toString('base64') followed by data URL template literal, stored in documentUrl via Prisma update
- File: apps/api/app/api/payroll/export/quickbooks/route.ts (line 81-91)
- File: apps/api/app/api/inventory/purchase-orders/export/quickbooks/route.ts (line 346-352)
- File: apps/api/app/api/events/export/quickbooks/route.ts (line 331-336)
- Prisma schema: documentUrl String? (schema.prisma:4090) - plain String column

### Why this matters
Event contracts are legal documents. Storing them as base64 data URLs in PostgreSQL causes database bloat, no CDN/streaming, inflated backups, and no storage-level access control or signed URL expiration. The 10MB input limit does not account for base64 expansion.

### Proposed detector rule
See full JSON in source.

### Implementation note
Regex detector for toString('base64') + data: URL template + database field assignment or API response, with negative patterns for cloud storage SDK imports. Official docs not required: generic implementation-evidence rule.
---
---
## [2026-05-06 18:57] Rule Discovery — automation_theater.outbox_events_created_without_automated_consumer

### Finding
The codebase implements a transactional outbox pattern where domain events (kitchen task status changes, waste entries, recipe version updates, kitchen overrides, command board replays) are written to an `OutboxEvent` table during database transactions. A publisher endpoint (`/outbox/publish`) exists to poll pending events and publish them to Ably for real-time delivery. However, the publisher is a manual HTTP POST endpoint with no automated trigger — no Vercel cron, no CI pipeline, no background worker, no setInterval, no Bull queue, no pg-boss, nothing. The Vercel cron configuration defines three scheduled jobs (sentry-fixer, webhook-retry, inventory-audit) but none of them is the outbox publisher. This means outbox events are created on every kitchen task status change, waste entry, recipe version publish, and kitchen override, but they remain in `pending` status indefinitely unless a human manually POSTs to `/outbox/publish`. The real-time updates that the outbox pattern was designed to deliver (task completion notifications, progress updates, override broadcasts) are silently never delivered to users.

### Evidence
- File: `apps/api/app/outbox/publish/route.ts`
- Snippet:
```typescript
// The publisher is a manual POST endpoint — requires explicit invocation
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... polls pending events and publishes to Ably
}
```
- File: `apps/api/vercel.json` (lines 15-28)
- Snippet:
```json
"crons": [
  { "path": "/api/sentry-fixer/process", "schedule": "0 0 * * *" },
  { "path": "/api/cron/webhook-retry", "schedule": "*/5 * * * *" },
  { "path": "/api/cron/inventory-audit", "schedule": "0 6 * * *" }
]
```
No `/outbox/publish` cron entry exists.

- File: `apps/api/app/api/kitchen/tasks/shared-task-helpers.ts` (line 537)
- Snippet:
```typescript
const outboxEvent = await tx.outboxEvent.create({
  data: {
    tenantId,
    aggregateType: "KitchenTask",
    aggregateId: taskId,
    eventType: `kitchen.task.${newStatus === "done" ? "completed" : newStatus}`,
    payload: { taskId, status: newStatus, constraintOutcomes: result.constraintOutcomes },
    status: "pending" as const,
  },
});
```
Events created with status "pending" but never consumed.

- File: `apps/api/app/api/kitchen/prep-lists/autogenerate/process/route.ts` (line 76)
- Snippet:
```typescript
const pendingCount = await database.outboxEvent.count({
  where: { eventType: "event.prep-list.requested", status: "pending" },
});
return NextResponse.json({ pending: pendingCount, timestamp: new Date().toISOString() });
```
An endpoint that counts pending events but never processes them — monitoring theater.

- 10 locations create outbox events (kitchen tasks, waste entries, overrides, recipe versions, command board)
- 0 automated consumers exist (no cron, no worker, no queue, no scheduled trigger)
- The publisher route is in `proxy.ts` public routes but requires Bearer token auth

### Why this matters
The outbox pattern exists specifically to guarantee reliable event delivery for real-time features. Kitchen staff rely on real-time task updates — when a prep task is completed, the next station needs to know immediately. When a kitchen override is issued (e.g., ingredient substitution, allergen flag), staff need instant notification. When a waste entry is logged, inventory counts should update across all connected clients. All of these events are written to the outbox table but never published to Ably, meaning the real-time layer is completely inert. The frontend likely subscribes to Ably channels expecting these events, creating a false expectation of live updates. The database accumulates pending outbox events indefinitely, growing over time. The `/outbox/publish` endpoint works correctly when called manually (it has good tests and proper SKIP LOCKED concurrency handling), but it's never called automatically in production, making the entire outbox infrastructure implementation theater — all the engineering effort (transactional writes, SKIP LOCKED queries, payload size limits, Ably integration, error handling, test coverage) produces zero user value without an automated trigger.

### Proposed detector rule
```json
{
  "id": "automation_theater.outbox_events_created_without_automated_consumer",
  "title": "Transactional outbox events created by domain logic but no automated consumer/worker processes them",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript", "json", "yaml", "yml"],
  "patterns": [
    "Database model named outboxEvent or OutboxEvent with create operations in multiple files",
    "OutboxEvent table in Prisma schema with status field having 'pending' as initial value",
    "A publish/process/consume route or function that reads pending outbox events",
    "Absence of the outbox publish endpoint in any cron configuration (vercel.json crons, cron expressions, scheduled triggers)",
    "Absence of background worker libraries (bull, agenda, pg-boss, node-cron, setInterval) referencing outbox",
    "Absence of CI/CD pipeline step that triggers outbox processing"
  ],
  "negative_patterns": [
    "Outbox publish endpoint referenced in a Vercel cron, AWS EventBridge rule, or equivalent scheduler config",
    "Background job queue (Bull, Agenda, pg-boss) with a recurring job that calls the outbox publisher",
    "A long-running process or worker that polls the outbox table on a timer",
    "Serverless function triggered by a database notify/listen or CDC stream"
  ],
  "evidence_required": [
    "OutboxEvent model/table exists in schema with create operations in domain code (at least 3+ locations)",
    "A publisher/processor route or function exists that can process pending events",
    "No automated trigger (cron job, background worker, CI pipeline, scheduled function) invokes the publisher",
    "Vercel cron config or equivalent scheduler does not include the outbox publish path"
  ],
  "false_positive_controls": [
    "Exclude if a background worker or cron job explicitly references the outbox publish endpoint or function",
    "Exclude if the application uses a CDC (Change Data Capture) tool like Debezium to consume outbox events",
    "Exclude if outbox events are consumed by a separate service with its own deployment pipeline (verify via docker-compose, k8s manifests, or deployment config)",
    "Exclude if the outbox is used for audit/log purposes only (no real-time delivery intended) — check for absence of Ably/push/SSE publish code in the consumer"
  ],
  "user_impact": "Real-time features (kitchen task updates, override notifications, waste entry broadcasts, recipe version change alerts) silently fail to deliver. Kitchen staff see stale data and miss critical updates. The outbox table grows unbounded with pending events, consuming database storage. The engineering investment in the outbox pattern (transactional consistency, concurrency-safe polling, payload validation) produces zero runtime value.",
  "repair_guidance": "Add the outbox publish endpoint to the Vercel cron configuration with a frequent interval (e.g., every 30-60 seconds: '*/1 * * * *'). Alternatively, implement a background worker using pg-boss, Bull, or a similar job queue that polls the outbox table on a timer. The publisher endpoint at /outbox/publish is already well-implemented with proper auth, SKIP LOCKED concurrency, payload size limits, and error handling — it just needs to be triggered automatically.",
  "example_source": {
    "file": "apps/api/vercel.json",
    "line_or_snippet": "\"crons\": [\n  { \"path\": \"/api/sentry-fixer/process\", \"schedule\": \"0 0 * * *\" },\n  { \"path\": \"/api/cron/webhook-retry\", \"schedule\": \"*/5 * * * *\" },\n  { \"path\": \"/api/cron/inventory-audit\", \"schedule\": \"0 6 * * *\" }\n]\n// Missing: { \"path\": \"/outbox/publish\", \"schedule\": \"*/1 * * * *\" }"
  }
}
```

### Implementation note
Build a cross-file detector that (1) identifies an outbox/event table or model with create operations in domain code, (2) identifies a consumer/publisher route or function, and (3) checks all scheduler/cron/worker configurations for an automated trigger to that consumer. If producers exist but no automated consumer trigger is found, flag as automation theater. The detector should check vercel.json crons, any file with cron/schedule patterns, docker-compose for worker services, and search for background job libraries. Confidence is high because the outbox pattern is specifically designed for automated processing — a manual-only publisher is a clear implementation gap. Official docs not required: generic implementation-evidence rule.
---

---
## [2026-05-06 22:30] Rule Discovery — automation_theater.cron_endpoint_never_scheduled

### Finding
Two fully-implemented cron endpoints (`contract-expiration-alerts` and `email-reminders`) contain real business logic — database queries, email workflow triggering via `@repo/notifications`, proper CRON_SECRET auth, error handling with Sentry — but are **never registered in the Vercel cron configuration** (`vercel.json`). Only 3 of 5 cron endpoints are scheduled. The two unregistered endpoints are dead code: they exist, they pass tests, but they never execute in production.

### Evidence
- File: `apps/api/vercel.json`
- Only registered crons:
  - `/api/sentry-fixer/process` (daily)
  - `/api/cron/webhook-retry` (every 5 min)
  - `/api/cron/inventory-audit` (daily 6am)
- File: `apps/api/app/api/cron/contract-expiration-alerts/route.ts` (262 lines)
- Snippet: Full production implementation querying `eventContract`, calling `triggerEmailWorkflows`, with configurable reminder intervals `[30, 14, 7, 3, 1]` days
- File: `apps/api/app/api/cron/email-reminders/route.ts` (387 lines)
- Snippet: Full production implementation querying `kitchenTask`/`kitchenTaskClaim` and `scheduleShift`, calling `triggerEmailWorkflows` for task and shift reminders
- Neither endpoint appears in `vercel.json` crons array

### Why this matters
Contract expiration alerts are supposed to notify clients at 30/14/7/3/1 day intervals before contracts expire. Task and shift reminders are supposed to notify employees about upcoming work. Neither of these notifications are being sent because the cron jobs are never triggered. This means:
1. Contracts may expire silently without client notification
2. Staff may miss task deadlines and shift start times
3. The code quality is high (auth, error handling, Sentry) which makes the omission harder to detect — it looks like it should work
4. Tests exist for auth but there's no test verifying the endpoints are actually scheduled

### Proposed detector rule
```json
{
  "id": "automation_theater.cron_endpoint_never_scheduled",
  "title": "Cron endpoint exists but is not registered in scheduler config",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "json"],
  "patterns": [
    "route.ts files under api/cron/ directories",
    "vercel.json or equivalent scheduler config with crons array",
    "export async function POST/GET in cron route files"
  ],
  "negative_patterns": [
    "endpoints referenced in vercel.json crons array",
    "endpoints with comments explicitly marking them as manual-only or on-demand",
    "test fixtures or mock cron directories"
  ],
  "evidence_required": [
    "cron route file exists with POST/GET handler",
    "scheduler config file exists (vercel.json crons, cron.yaml, etc.)",
    "route path is NOT present in scheduler config"
  ],
  "false_positive_controls": [
    "Exclude endpoints that are called by other internal systems (check for import references)",
    "Exclude endpoints explicitly documented as on-demand/manual triggers",
    "Verify platform-specific config (Vercel, AWS EventBridge, etc.)"
  ],
  "user_impact": "Background jobs that appear to handle critical automated tasks (contract expiration alerts, employee reminders) are silently dead code. Users expect these notifications to fire but they never do, leading to missed deadlines, expired contracts, and staff no-shows.",
  "repair_guidance": "Add missing cron entries to vercel.json with appropriate schedules. contract-expiration-alerts should run daily (matching its documented intent). email-reminders should run every 15 minutes (matching its documented intent). Add a CI/lint check that verifies all api/cron/* route files have a corresponding scheduler entry.",
  "example_source": {
    "file": "apps/api/app/api/cron/contract-expiration-alerts/route.ts",
    "line_or_snippet": "// File exists with 262 lines of production code but is not in vercel.json crons array"
  }
}
```

### Implementation note
Cross-file detector: parse the scheduler config (vercel.json crons array, or platform equivalents) and compare against all route files found under `api/cron/` directories. Flag any cron route whose path does not appear in the scheduler config. Should also check for reverse false positives — scheduler entries pointing to non-existent routes. Could extend to support AWS EventBridge rules, GitHub Actions scheduled workflows, etc.
---

## [2026-05-07 13:00] Rule Discovery — security_theater.credential_field_exists_but_never_read

### Finding
The `InventorySupplier` Prisma model has a `connectorCredentials Json` field explicitly designed to hold per-supplier API credentials (apiBaseUrl, apiKey, apiSecret, webhookSecret). Comments throughout the codebase claim this field is the authoritative source for credentials: "Credentials are stored as encrypted JSON on the InventorySupplier record" and "Secret is stored in the supplier's connectorCredentials.webhookSecret field." However, the actual runtime code in two separate endpoints — the supplier sync trigger (`/api/inventory/supplier-sync/sync`) and the supplier catalog webhook (`/api/webhooks/supplier-catalog`) — never reads from this field. Instead, both endpoints construct credential lookups from global environment variables (`process.env["SUPPLIER_<CONNECTOR>_API_KEY"]` and `process.env["SUPPLIER_<CONNECTOR>_WEBHOOK_SECRET"]`) that fall back to empty strings.

The sync route contains a particularly telling dead-code artifact: it performs a typecast-heavy database lookup for the supplier record (`database as unknown as Record<string, unknown>`), assigns the result to a `supplier` variable, then never uses it. The variable exists solely to make the "encrypted credentials" comment appear credible to a reader skimming the code. The field is plain `Json` (not encrypted) in the schema, and no encryption/decryption logic exists anywhere in the codebase.

The practical impact is two-fold: (1) the `connectorCredentials` field is a lie — it's never used for its stated purpose, so any credentials entered there by users (e.g., through a settings UI) have no effect; (2) the global env var approach means all suppliers of the same type share one set of credentials, which breaks multi-tenant credential isolation — if two tenants use the same supplier connector type, they share the same API key from the environment.

### Evidence
- File: `apps/api/app/api/inventory/supplier-sync/route.ts`
- Snippet:
```typescript
    // Look up the supplier and get their connector credentials
    // Credentials are stored as encrypted JSON on the InventorySupplier record
    const supplier = (await (database as unknown as Record<string, unknown>)
      .inventorySupplier) as
      | {
          findFirst: (args: unknown) => Promise<unknown>;
        }
      | undefined;

    // For now, build config with placeholder credentials
    // In production, credentials would be fetched from the supplier record's
    // encrypted connectorCredentials field
    const config = {
      supplierId,
      tenantId,
      credentials: {
        apiBaseUrl:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_URL`
          ] || "",
        apiKey:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_KEY`
          ] || "",
        apiSecret:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_SECRET`
          ] || "",
      },
```
- File: `apps/api/app/api/webhooks/supplier-catalog/route.ts` (lines 39, 133-136)
- Snippet:
```typescript
// - Secret is stored in the supplier's connectorCredentials.webhookSecret field
...
  const webhookSecret =
    process.env[
      `SUPPLIER_${payload.connectorId.toUpperCase().replace(/-/g, "_")}_WEBHOOK_SECRET`
    ];
```
- File: `packages/database/prisma/schema.prisma` (line 1742)
- Snippet: `connectorCredentials Json @default("{}") @map("connector_credentials") @db.JsonB`
- Cross-reference: `connectorCredentials` is only read/written in manifest-adapter stores (CRUD) and test fixtures — never in any authentication or sync logic.

### Why this matters
In a multi-tenant SaaS platform for catering companies, each tenant should have independent credentials for their supplier integrations (different API keys for different supplier accounts). The codebase claims to support this through the `connectorCredentials` field on each supplier record. But the actual implementation uses global environment variables shared across all tenants — meaning: (1) only one set of credentials per connector type can exist, making multi-tenant supplier integration impossible; (2) any credentials entered by users in the UI (if such a UI exists) are silently ignored; (3) the comment claiming "encrypted" storage is false — the field is plain JSON; (4) the dead-code supplier lookup with double `as unknown` type casts was written to create the appearance of credential reading without actually doing it, which is a form of implementation theater that wastes future developers' time investigating a code path that goes nowhere.

### Proposed detector rule
```json
{
  "id": "security_theater.credential_field_exists_but_never_read",
  "title": "Database credential field documented as source of auth secrets but never read at runtime",
  "category": "security_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript", "prisma"],
  "patterns": [
    "Comment claiming credentials are 'stored as encrypted JSON' or 'stored in the X field' near a database lookup",
    "Database lookup result assigned to a variable that is never referenced again",
    "process.env used to read the same credential type that the comment claims comes from the database",
    "Prisma model field named connectorCredentials, credentials, apiCredentials, or similar Json/String field",
    "TypeScript double-cast through 'unknown' (as unknown as Record) near credential-related code"
  ],
  "negative_patterns": [
    "Code that actually reads .connectorCredentials or .credentials from the fetched record",
    "Environment variable reads for app-wide config (DATABASE_URL, PORT) not related to per-record credentials",
    "Comments that say 'stored in env' matching the actual env var usage",
    "Test files and mock data"
  ],
  "evidence_required": [
    "Prisma model with a credential-related Json or String field (connectorCredentials, credentials, apiSecret, webhookSecret)",
    "Comment in a route/handler claiming the field is the source of auth credentials",
    "The same handler reading credentials from process.env instead of the fetched database record",
    "The fetched database record variable is unused after assignment (dead code)",
    "No encryption/decryption logic exists despite 'encrypted' claim in comments"
  ],
  "false_positive_controls": [
    "Verify the database variable is truly unused after assignment (not passed to another function off-screen)",
    "Check that the env var and claimed DB field refer to the same credential type",
    "Exclude cases where env vars are used as a fallback after a DB read attempt",
    "Require the 'encrypted' or 'stored in' claim comment to be within 10 lines of the DB lookup"
  ],
  "user_impact": "Multi-tenant credential isolation is broken — all tenants sharing a connector type use the same global API key from environment variables. Per-supplier credentials entered by users (if a UI exists) are silently ignored. The 'encrypted' claim in comments gives a false sense of security for a field that is plain JSON. Future developers investigating the credential flow waste time following dead-code database lookups that appear intentional but go nowhere.",
  "repair_guidance": "Read credentials from the supplier record's connectorCredentials field at runtime, decrypt if encryption is used, and use those per-supplier credentials for API calls and webhook verification. Remove the dead-code supplier lookup or actually use its result. Either implement real encryption for the connectorCredentials field or remove the 'encrypted' claim from comments. If per-tenant credentials are not yet supported, document that limitation explicitly rather than maintaining deceptive comments.",
  "example_source": {
    "file": "apps/api/app/api/inventory/supplier-sync/route.ts",
    "line_or_snippet": "// Credentials are stored as encrypted JSON on the InventorySupplier record\n    const supplier = (await (database as unknown as Record<string, unknown>)\n      .inventorySupplier) as\n      | {\n          findFirst: (args: unknown) => Promise<unknown>;\n        }\n      | undefined;\n\n    // For now, build config with placeholder credentials\n    // In production, credentials would be fetched from the supplier record's\n    // encrypted connectorCredentials field\n    const config = {\n      credentials: {\n        apiBaseUrl: process.env[...] || \"\",\n        apiKey: process.env[...] || \"\",\n      },\n    };"
  }
}
```

### Implementation note
Build a cross-file detector: (1) identify Prisma models with credential-related fields (connectorCredentials, credentials, webhookSecret patterns), (2) find route/handler files that comment-claim those fields are the credential source, (3) verify the fetched record variable is dead code (assigned but never referenced), (4) check if the same handler reads from process.env for the same credential type, (5) search for encryption/decryption logic — if the comment says "encrypted" but no crypto operations exist near the field, boost severity. This rule is distinct from existing rules because it targets the specific pattern of dead-code database lookups paired with misleading credential-source claims, not just stub integrations or env var usage in general. Official docs not required: generic implementation-evidence rule.
---
## [2026-05-07 14:30] Rule Discovery — feature_claim_mismatch.ai_branded_regex_parser

### Finding
The `/api/ai-event-setup/parse` route is branded as "AI Event Setup" in its API path, e2e test suite, and planning documentation, but the implementation is entirely regex-based with zero LLM/AI calls. The 532-line file contains only hand-written regex patterns for date parsing, event type inference, guest count extraction, and venue name detection — no `openai`, `ai`, `generateText`, or any AI SDK import exists. The planning docs explicitly describe it as "AI-assisted event setup" and the e2e test file is named `ai-event-setup-e2e.spec.ts`, reinforcing the AI branding to anyone auditing the feature surface.

### Evidence
- File: `apps/api/app/api/ai-event-setup/parse/route.ts`
- Snippet:
```typescript
// Line 1: File is under /api/ai-event-setup/ — branded as AI
// Line 16: Comment says "Natural Language Event Parsing Logic"
// Lines 32-51: Hand-written regex patterns for event type detection
// Lines 84-94: parseMonth() — manual regex over month name arrays
// Lines 96-120: parseDayOfMonth() — manual regex for day extraction
// Lines 127-198: parseRelativeDate() — hand-coded relative date patterns
// Lines 246-262: parseGuestCount() — regex patterns for "for N guests"
// Lines 264-340: parseVenue() — regex venue extraction with stop words
// Lines 390-444: parseNaturalLanguageEvent() — pure regex orchestration, no AI
// Line 484: const parsed = parseNaturalLanguageEvent(originalInput, referenceDate);
// No imports from "ai", "@ai-sdk/*", "openai", or any LLM library
```
- Planning doc: `planning/workflows.md` line 11: "AI-assisted event setup (via `ai-event-setup` manifest) pre-fills details"
- E2e test: `e2e/ai-event-setup-e2e.spec.ts` — entire suite branded as "AI Event Setup"
- Contrast: `apps/api/app/api/ai/suggestions/route.ts` imports `openai` and `generateText` from `ai` SDK — this route does not

### Why this matters
Users (and sales/engineering teams) see "AI Event Setup" and expect intelligent NLP understanding — the ability to handle varied phrasing, ambiguous inputs, context from conversation history, and complex event specifications. What they get is a brittle regex parser that fails on any input outside its ~15 hardcoded patterns. A user typing "I need catering next Friday the 13th for about fifty people at my sister's place" will get a partial parse with wrong confidence scores, while the "AI" branding creates false expectations. This is feature claim mismatch — the name promises intelligence, the code delivers grep.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ai_branded_regex_parser",
  "title": "AI-branded route uses only regex, no LLM/AI SDK calls",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "route path or directory contains 'ai-' or '/ai/' prefix",
    "file contains extensive RegExp patterns (>= 5 distinct regex literals)",
    "file does NOT import from 'ai', '@ai-sdk/*', 'openai', 'anthropic', '@anthropic-ai/*', 'google', '@google/*' (AI SDKs)"
  ],
  "negative_patterns": [
    "files that import any AI SDK alongside regex (regex may be preprocessing for AI)",
    "test files that mock AI responses",
    "utility files under shared lib that are clearly helper modules"
  ],
  "evidence_required": [
    "route or API handler file with ai-branded path",
    "absence of AI/LLM SDK imports",
    "presence of 5+ regex literals suggesting regex-only parsing logic"
  ],
  "false_positive_controls": [
    "skip files that import AI SDKs (regex may be pre-processing)",
    "skip files in test/ or __tests__/ directories",
    "skip utility/helper files that don't claim to be AI features",
    "require the ai-branding to be in the file path or API route, not just comments"
  ],
  "user_impact": "Users see 'AI-powered' feature labels and expect intelligent natural language understanding, but receive brittle regex parsing that fails on unexpected phrasing. This creates false expectations and erodes trust when the feature underperforms on real-world inputs.",
  "repair_guidance": "Either (1) integrate an actual LLM call for the parsing logic using the existing ai SDK and openai provider already used in ai/suggestions/route.ts, or (2) rename the feature to remove AI branding (e.g., 'smart-parse', 'quick-setup', 'template-setup') to accurately reflect the regex-based implementation.",
  "example_source": {
    "file": "apps/api/app/api/ai-event-setup/parse/route.ts",
    "line_or_snippet": "// Line 16: 'Natural Language Event Parsing Logic' — 532 lines of pure regex, no AI SDK imports, route path branded as /api/ai-event-setup/"
  }
}
```

### Implementation note
Build a cross-file detector: (1) scan route handler files whose directory path contains `/ai-` or `/ai/` as a path segment, (2) for each matched file, check import statements for any known AI SDK package names (ai, @ai-sdk/openai, @ai-sdk/anthropic, openai, @anthropic-ai/sdk, google/generative-ai), (3) count distinct RegExp literals in the file body, (4) if AI SDK imports are absent AND regex count >= 5, flag as feature_claim_mismatch. Exclude test files and utility modules. The rule should also check planning/docs for matching ai-branding language to strengthen the mismatch signal. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 19:58] Rule Discovery — skeleton_crud.phantom_database_table_unwired

### Finding
The `iot_alert_rules` table exists as a fully-structured PostgreSQL table with 16 columns, foreign keys, indexes, and a comment stating its purpose is "for automated alert configuration." However, no Prisma model maps to it, no API route provides CRUD operations for it, no background worker or cron job evaluates its rules against incoming sensor data, and no UI page exists to manage alert rules. The only code references are in the trash/restore endpoints listing soft-deleted entities. Meanwhile, the `iot_alerts` table has an `alert_rule_id` column designed to reference it, but alerts are generated using hardcoded probe min/max thresholds in the readings route instead of configurable rules. This is a phantom database table — schema and infrastructure built for a feature that was never wired to application code.

### Evidence
- File: `packages/database/prisma/migrations/20260305000000_add_iot_kitchen_monitoring/migration.sql` (lines 51-92)
- Snippet:
```sql
-- Create iot_alert_rules table for automated alert configuration
CREATE TABLE "tenant_kitchen"."iot_alert_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sensor_type" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "threshold_min" DOUBLE PRECISION,
    "threshold_max" DOUBLE PRECISION,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "alert_action" TEXT NOT NULL DEFAULT 'notification',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notify_roles" TEXT[] NOT NULL DEFAULT '{}',
    "notify_channels" TEXT[] NOT NULL DEFAULT '{"in_app"}',
    ...
);
```
- File: `apps/api/app/api/kitchen/iot/readings/route.ts` (lines 100-128) — uses hardcoded `probe.minTemp`/`probe.maxTemp` instead of evaluating `iot_alert_rules`
- No Prisma model for `iot_alert_rules` in `packages/database/prisma/schema.prisma`
- No API route files matching `alert-rules` or `alertRule` in `apps/api/app/api/`
- No UI pages matching `alert-rules` or `alertRule` in `apps/app/`

### Why this matters
The database advertises a configurable, role-aware, multi-channel alert rule engine (with `notify_roles`, `notify_channels`, `alert_action`, `duration_ms`, `condition` fields). Users who inspect the schema or migration history would reasonably assume this feature works. In reality, alerts are generated using only static probe thresholds — users cannot create custom rules, assign notifications to specific roles, or configure alert actions. If a food safety audit asked "can I configure temperature alert rules per equipment?" the schema says yes, but the application says no.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.phantom_database_table_unwired",
  "title": "Phantom database table — migrated but no Prisma model, API route, or worker consumes it",
  "category": "skeleton_crud",
  "severity": "medium",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["sql", "prisma", "typescript", "any"],
  "patterns": [
    "CREATE TABLE in migration SQL with comment mentioning 'rule', 'config', 'notification', 'automation', or 'alert'",
    "Table referenced by foreign key in another table (e.g. alert_rule_id column)",
    "No matching Prisma model in schema.prisma",
    "No API route files in route directories matching the table name (snake_case or camelCase)",
    "No worker/cron references in codebase"
  ],
  "negative_patterns": [
    "Tables prefixed with _prisma_migrations",
    "Tables that are pure join/pivot tables",
    "Tables referenced in Prisma @@map",
    "Raw SQL query references (database.$queryRaw) to the table",
    "Views, materialized views, or trigger-function tables"
  ],
  "evidence_required": [
    "Migration SQL creating the table with business-meaningful columns",
    "Absence of Prisma model mapping",
    "Absence of API route files",
    "Absence of worker/cron/trigger code referencing the table",
    "Presence of foreign key reference from another table confirming intended use"
  ],
  "false_positive_controls": [
    "Exclude tables only referenced via $queryRaw or $executeRaw (intentionally unmapped)",
    "Exclude tables that have matching API routes in any format",
    "Exclude tables under 3 business-meaningful columns (could be utility/join tables)",
    "Require foreign key evidence to confirm the table was designed for active use"
  ],
  "user_impact": "Users and auditors see a feature in the database schema that doesn't exist in the application. Configurable alert rules appear supported but are not — leading to false confidence in monitoring capabilities.",
  "repair_guidance": "Either (a) create a Prisma model, CRUD API routes, a UI management page, and a rule-evaluation engine that processes incoming readings against active rules, or (b) if the feature is deprioritized, add a schema comment marking the table as deprecated/unused and remove the foreign key reference from iot_alerts.alert_rule_id.",
  "example_source": {
    "file": "packages/database/prisma/migrations/20260305000000_add_iot_kitchen_monitoring/migration.sql",
    "line_or_snippet": "-- Create iot_alert_rules table for automated alert configuration\nCREATE TABLE \"tenant_kitchen\".\"iot_alert_rules\" ("
  }
}
```

### Implementation note
Build a cross-file detector: (1) scan all migration SQL files for CREATE TABLE statements with business-meaningful comments (containing keywords like 'rule', 'config', 'notification', 'automation', 'alert'), (2) extract the table name and its snake_case/camelCase variants, (3) check if a Prisma model exists in schema.prisma mapping to the table name (via @@map or model name convention), (4) check if any API route file path segments match the table name, (5) check if any TypeScript file references the table name in raw queries ($queryRaw, $executeRaw, sql tagged template), (6) check if any other migration has a foreign key referencing the table, (7) flag if the table has no Prisma model, no API routes, and no raw query references, but does have a foreign key from another table. This indicates a designed-but-unwired feature. Official docs not required: generic implementation-evidence rule.
---

---
## [2026-05-07 15:30] Rule Discovery — placeholder.forecasting_core_formula_is_constant

### Finding
The `inventory-forecasting.ts` module presents a full-featured depletion forecasting and reorder suggestion service with confidence levels, accuracy tracking, and batch processing. However, the core per-SKU event usage projection — the function that determines how much of a specific inventory item each upcoming event will consume — uses a single hardcoded constant: `guestCount * 0.1` units per event, regardless of the SKU. The function `getUpcomingEventsUsingInventory` accepts `_sku` as a parameter but never uses it (underscore-prefixed = intentionally ignored). The code explicitly comments "In production, this would be based on actual menu items and recipes."

The database already has `Recipe`, `RecipeIngredient`, `Menu`, and `MenuDish` models that could connect events to specific ingredient usage. The Event model has `eventDate` and `guestCount` fields that are used, but no relation to menus or recipes exists on the Event model, meaning even the correct implementation would need a join path that doesn't exist yet.

Additionally, the confidence bounds saved to the database are deterministic ±10% (`forecastValue * 0.9` and `forecastValue * 1.1`) regardless of the actual confidence level or variability — making the "high/medium/low" confidence label and the stored bounds disconnected from any statistical model. The MAPE calculation in `getForecastAccuracyMetrics` uses a hardcoded 30-day baseline assumption (`averageErrorDays / 30 * 100`) rather than the actual forecast horizon.

### Evidence
- File: `apps/api/app/lib/inventory-forecasting.ts`
- Snippet (core fake calculation):
```typescript
async function getUpcomingEventsUsingInventory(
  tenantId: string,
  _sku: string,  // <-- accepted but never used
  horizonDays: number
): Promise<Array<{ eventId: string; eventName: string; startDate: Date; usage: number }>> {
  // ...
  const eventUsage = events.map((event) => ({
    eventId: event.id,
    eventName: event.title || `Event ${event.id}`,
    startDate: event.eventDate,
    // Simplified usage calculation: 0.1 units per guest per event
    // In production, this would be based on actual menu items and recipes
    usage: Math.ceil((event.guestCount || 0) * 0.1),
  }));
  return eventUsage;
}
```
- Snippet (deterministic confidence bounds):
```typescript
const forecastValue = point.projectedStock;
const lowerBound = forecastValue * 0.9;
const upperBound = forecastValue * 1.1;
```
- Prisma schema evidence: `model Recipe` (schema.prisma:1037), `model RecipeIngredient` (schema.prisma:1095), `model Menu` (schema.prisma:1216), `model MenuDish` (schema.prisma:1238) — all exist but are never queried by the forecasting module.
- The `calculateConfidenceLevel` function accepts `_currentStock` and `_projectedUsage` as parameters but never uses them (lines 493-494).

### Why this matters
A catering company relying on this forecasting service will get identical depletion predictions for every SKU — salmon, napkins, champagne, and ice all deplete at the same rate per guest. Reorder suggestions will recommend the same order quantities regardless of what's actually needed. The confidence bounds provide false precision (±10%) that has no statistical basis. When the system reports "high confidence" depletion in 12 days, the real depletion could be anywhere — the number is meaningless because the underlying usage rate is a made-up constant. This could lead to over-ordering some items and under-ordering others, directly impacting food costs and event quality.

### Proposed detector rule
```json
{
  "id": "placeholder.forecasting_core_formula_is_constant",
  "title": "Forecasting/analytics service uses hardcoded constant as core business formula",
  "category": "placeholder",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "function accepting _parameter (underscore-prefixed unused) that should correlate output to input",
    "hardcoded magic number multiplied by entity count (e.g., guestCount * 0.1) inside a forecasting/prediction/estimation function",
    "'in production' / 'simplified' comments near core calculation logic",
    "deterministic confidence bounds (value * 0.9 / value * 1.1) disconnected from variability data"
  ],
  "negative_patterns": [
    "hardcoded constants in utility/math libraries not claiming business prediction",
    "test fixtures and mock data generators",
    "functions explicitly named 'mock', 'stub', 'dummy', or 'fake'"
  ],
  "evidence_required": [
    "function in a forecasting/prediction/analytics module with business-meaningful name",
    "underscore-prefixed parameter that should drive output but doesn't",
    "hardcoded multiplier applied to entity count as the sole usage/consumption driver",
    "comment acknowledging this is a placeholder or simplified version",
    "related domain models (Recipe, Menu, etc.) exist in the schema but are not queried"
  ],
  "false_positive_controls": [
    "exclude files under __tests__/, mocks/, fixtures/, or with 'test' in filename",
    "exclude functions with fewer than 5 lines of business logic",
    "require at least one 'in production' / 'simplified' / 'TODO' comment near the constant"
  ],
  "user_impact": "Forecasting service produces meaningless predictions — all inventory items get identical depletion rates regardless of actual usage. Reorder suggestions are wrong. Confidence levels and bounds provide false precision that could mislead purchasing decisions.",
  "repair_guidance": "Replace the hardcoded 0.1 multiplier with actual per-SKU usage derived from RecipeIngredient quantities joined to Event menus. Build an Event-to-Menu relationship in the schema. Calculate confidence bounds from the historical variability data already computed by getHistoricalUsage() instead of applying a flat ±10%. Use the _currentStock and _projectedUsage parameters in calculateConfidenceLevel or remove them.",
  "example_source": {
    "file": "apps/api/app/lib/inventory-forecasting.ts",
    "line_or_snippet": "usage: Math.ceil((event.guestCount || 0) * 0.1),"
  }
}
```

### Implementation note
Build a hybrid detector: (1) regex scan for functions in forecasting/prediction/analytics files that contain underscore-prefixed parameters alongside a hardcoded multiplier on an entity count field (guestCount, attendeeCount, orderCount, etc.), (2) check for 'in production' / 'simplified' / 'for now' comments within 5 lines of the multiplier, (3) cross-reference with Prisma schema for domain models that should be joined (Recipe, Menu, etc.) but aren't imported, (4) flag deterministic confidence bound patterns (value * 0.9 / value * 1.1) in the same file. Official docs not required: generic implementation-evidence rule.
---
