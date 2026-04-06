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
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  const invoices = await database.invoice.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
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
