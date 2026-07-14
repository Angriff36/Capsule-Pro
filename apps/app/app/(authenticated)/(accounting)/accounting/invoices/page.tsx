/**
 * @module InvoicesPage
 * @intent Server component for Invoices listing page
 * @responsibility Fetch and display tenant invoices
 * @domain Accounting
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  // ponytail: select only the 8 fields the row map consumes — drops the heavy
  // `notes`/`internalNotes` (@db.Text) + `lineItems`/`metadata` (Json) blobs +
  // ~21 unused scalars per row. `select` is a column projection (never removes
  // rows), so take:50 + the serialized shape are byte-identical.
  const invoices = await database.invoice.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      invoiceNumber: true,
      invoiceType: true,
      status: true,
      total: true,
      amountDue: true,
      dueDate: true,
      createdAt: true,
    },
  });

  const serialized = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceType: inv.invoiceType,
    status: inv.status,
    total: Number(inv.total),
    amountDue: Number(inv.amountDue),
    dueDate: inv.dueDate.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  return <InvoicesClient invoices={serialized} />;
}
