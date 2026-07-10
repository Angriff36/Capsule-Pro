/**
 * Runtime smoke for the 2026-07-10 wiring-mismatch signature sweep.
 *
 * Proves, through the PRODUCTION command path (runManifestCommandCore = zod
 * pre-flight gate + engine) against the live DB:
 *
 *   1. Trusted server-owned params: Notification.markRead succeeds with an
 *      EMPTY body — the engine injects context.user.id (pre-sweep this 400'd
 *      at the zod gate with "userId: Required").
 *   2. Partial-update semantics: Dish.update with an empty body passes guards
 *      and coalesce-to-self mutates keep every stored value intact.
 *   3. FSM consumer wiring: FacilityWorkOrder create → start (trusted actor)
 *      → complete (optional actualCost/completionNotes) walks the real FSM.
 *   4. Newly declared governed creates: Invoice.create and Payment.create
 *      persist real rows (pre-sweep: 404 unknown_command / "not found").
 *
 * Runs ONLY when RUN_DB_SMOKE=1 (same guard as flip-durable-smoke):
 *
 *   RUN_DB_SMOKE=1 SKIP_ENV_VALIDATION=1 \
 *   pnpm --filter api exec vitest run --config vitest.config.integration.mts \
 *     wiring-fix-smoke --testTimeout=60000
 *
 * IDs are discovered from the DB (first admin/manager user + an event with a
 * client). Every row the smoke creates is hard-deleted in afterAll.
 */
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const ENABLED = process.env.RUN_DB_SMOKE === "1";
const d = describe.runIf(ENABLED);

type UserCtx = { id: string; tenantId: string; role: string };
let user: UserCtx;
let eventId = "";
let clientId = "";

const cleanups: Array<() => Promise<void>> = [];
afterAll(async () => {
  for (const c of cleanups.reverse()) {
    try {
      await c();
    } catch {
      /* best-effort */
    }
  }
}, 60_000);

function run(
  entity: string,
  command: string,
  body: Record<string, unknown>,
  instanceId?: string
) {
  return runManifestCommandCore(
    {
      createRuntime: (ctx) =>
        createManifestRuntime({ user: ctx.user, entityName: entity }),
    },
    {
      entity,
      command,
      body,
      user,
      ...(instanceId ? { instanceId } : {}),
    }
  );
}

d("wiring-fix smoke (live DB)", () => {
  beforeAll(async () => {
    const u = await database.user.findFirst({
      select: { id: true, tenantId: true, role: true },
    });
    if (!u) {
      throw new Error("No user in DB — cannot smoke");
    }
    user = { id: u.id, tenantId: u.tenantId, role: u.role || "admin" };

    // The dev DB may be freshly rebuilt (near-empty) — fixture a client and
    // an event directly; both are pure test scaffolding, cleaned in afterAll.
    const client = await database.client.create({
      data: { tenantId: user.tenantId, companyName: "wiring-fix smoke client" },
      select: { id: true },
    });
    clientId = client.id;
    cleanups.push(async () => {
      await database.client.deleteMany({
        where: { tenantId: user.tenantId, id: clientId },
      });
    });
    const ev = await database.event.create({
      data: {
        tenantId: user.tenantId,
        clientId,
        title: "wiring-fix smoke event",
        tags: [],
        accessibilityOptions: [],
      },
      select: { id: true },
    });
    eventId = ev.id;
    cleanups.push(async () => {
      await database.event.deleteMany({
        where: { tenantId: user.tenantId, id: eventId },
      });
    });
  });

  it("1. trusted userId: Notification.markRead with EMPTY body", async () => {
    const created = await run("Notification", "create", {
      recipientEmployeeId: user.id,
      notificationType: "system",
      title: "wiring-fix smoke",
      body: "smoke",
      actionUrl: "",
    });
    expect(created.ok, JSON.stringify(created)).toBe(true);
    const id = String(
      (created as { result?: { id?: string } }).result?.id ?? ""
    );
    expect(id).not.toBe("");
    cleanups.push(async () => {
      await database.notification.deleteMany({
        where: { tenantId: user.tenantId, id },
      });
    });

    // THE assertion: no userId in the body — gate + engine must accept.
    const marked = await run("Notification", "markRead", { id }, id);
    expect(marked.ok, JSON.stringify(marked)).toBe(true);

    const row = await database.notification.findFirst({
      where: { tenantId: user.tenantId, id },
      select: { isRead: true },
    });
    expect(row?.isRead).toBe(true);
  });

  it("2. partial update: Dish.update with empty body keeps stored values", async () => {
    let dish = await database.dish.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, description: true, category: true },
    });
    if (!dish) {
      const recipe = await database.recipe.findFirst({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });
      dish = await database.dish.create({
        data: {
          tenantId: user.tenantId,
          recipeId: recipe?.id ?? crypto.randomUUID(),
          name: "wiring-fix smoke dish",
          description: "smoke",
          category: "entree",
        },
        select: { id: true, name: true, description: true, category: true },
      });
      const dishId = dish.id;
      cleanups.push(async () => {
        await database.dish.deleteMany({
          where: { tenantId: user.tenantId, id: dishId },
        });
      });
    }

    const updated = await run("Dish", "update", { id: dish.id }, dish.id);
    expect(updated.ok, JSON.stringify(updated)).toBe(true);

    const after = await database.dish.findFirst({
      where: { tenantId: user.tenantId, id: dish.id },
      select: { name: true, description: true, category: true },
    });
    // Coalesce-to-self: nothing sent → nothing changed.
    expect(after?.name).toBe(dish.name);
    expect(after?.description).toBe(dish.description);
    expect(after?.category).toBe(dish.category);
  });

  it("3. FSM: FacilityWorkOrder create → start (trusted) → complete (optionals)", async () => {
    const created = await run("FacilityWorkOrder", "create", {
      title: "wiring-fix smoke WO",
      description: "smoke",
      priority: "low",
      scheduledDate: Date.now(),
    });
    expect(created.ok, JSON.stringify(created)).toBe(true);
    const id = String(
      (created as { result?: { id?: string } }).result?.id ?? ""
    );
    expect(id).not.toBe("");
    cleanups.push(async () => {
      await database.facilityWorkOrder.deleteMany({
        where: { tenantId: user.tenantId, id },
      });
    });

    // start: userId is trusted-injected — empty body.
    const started = await run("FacilityWorkOrder", "start", { id }, id);
    expect(started.ok, JSON.stringify(started)).toBe(true);

    // complete: actualCost omitted (optional), completionNotes sent.
    const completed = await run(
      "FacilityWorkOrder",
      "complete",
      { id, completionNotes: "smoke complete" },
      id
    );
    expect(completed.ok, JSON.stringify(completed)).toBe(true);

    const row = await database.facilityWorkOrder.findFirst({
      where: { tenantId: user.tenantId, id },
      select: { status: true, assignedTo: true, notes: true },
    });
    expect(row?.status).toBe("completed");
    expect(row?.assignedTo).toBe(user.id); // trusted injection wrote the caller
    expect(row?.notes).toBe("smoke complete");
  });

  it("4. governed creates: Invoice.create then Payment.create persist rows", async () => {
    const invoiceNumber = `SMOKE-${Date.now()}`;
    const createdInvoice = await run("Invoice", "create", {
      // Mirrors POST /api/accounting/invoices — clientId rides the seed body
      // (parent-owned context), not the param list.
      invoiceNumber,
      clientId,
      eventId,
      subtotal: 100,
      taxAmount: 0,
      discountAmount: 0,
      total: 100,
      amountPaid: 0,
      amountDue: 100,
      paymentTerms: 30,
      dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      notes: "wiring-fix smoke",
      lineItems: [],
      metadata: {},
    });
    expect(createdInvoice.ok, JSON.stringify(createdInvoice)).toBe(true);
    const invoiceId = String(
      (createdInvoice as { result?: { id?: string } }).result?.id ?? ""
    );
    expect(invoiceId).not.toBe("");
    cleanups.push(async () => {
      await database.invoice.deleteMany({
        where: { tenantId: user.tenantId, id: invoiceId },
      });
    });

    const invoiceRow = await database.invoice.findFirst({
      where: { tenantId: user.tenantId, id: invoiceId },
      select: { invoiceNumber: true, clientId: true, status: true },
    });
    expect(invoiceRow?.invoiceNumber).toBe(invoiceNumber);
    expect(invoiceRow?.clientId).toBe(clientId);
    expect(invoiceRow?.status).toBe("DRAFT");

    const createdPayment = await run("Payment", "create", {
      // Mirrors POST /api/accounting/payments.
      invoiceId,
      eventId,
      clientId,
      amount: 50,
      currency: "USD",
      methodType: "CREDIT_CARD",
      gatewayTransactionId: `SMOKE-PAY-${Date.now()}`,
      processedAt: Date.now(),
    });
    expect(createdPayment.ok, JSON.stringify(createdPayment)).toBe(true);
    const paymentId = String(
      (createdPayment as { result?: { id?: string } }).result?.id ?? ""
    );
    expect(paymentId).not.toBe("");
    cleanups.push(async () => {
      await database.payment.deleteMany({
        where: { tenantId: user.tenantId, id: paymentId },
      });
    });

    const paymentRow = await database.payment.findFirst({
      where: { tenantId: user.tenantId, id: paymentId },
      select: { invoiceId: true, status: true, amount: true },
    });
    expect(paymentRow?.invoiceId).toBe(invoiceId);
    expect(paymentRow?.status).toBe("PENDING");
  });
});
