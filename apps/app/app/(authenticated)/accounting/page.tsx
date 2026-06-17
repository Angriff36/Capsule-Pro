import { listChartOfAccounts, listInvoices, listPayments } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
  StatusPill,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  FileText,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function getClientLabel(
  client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null
) {
  if (!client) {
    return "No client";
  }

  const personName = [client.first_name, client.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return client.company_name || personName || "Unnamed client";
}

const moduleLinks = [
  {
    href: "/accounting/invoices",
    label: "Invoices",
    description: "Review invoice status, due dates, and receivables.",
    icon: FileText,
  },
  {
    href: "/accounting/payments",
    label: "Payments",
    description: "Track recorded payments and reconciliation progress.",
    icon: CreditCard,
  },
  {
    href: "/accounting/collections",
    label: "Collections",
    description: "Manage overdue invoices, dunning escalations, and recovery.",
    icon: Scale,
  },
  {
    href: "/accounting/chart-of-accounts",
    label: "Chart of accounts",
    description: "Manage ledger structure and active account codes.",
    icon: BookOpen,
  },
];

export default async function AccountingPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const now = new Date();

  const [invoices, payments, accounts] = await Promise.all([
    (await listInvoices()).data,
    (await listPayments()).data,
    (await listChartOfAccounts()).data,
  ]);

  const invoiceCount = invoices.length;
  const outstandingInvoiceCount = invoices.filter(
    (invoice) =>
      Number(invoice.amountDue ?? 0) > 0 &&
      !["VOID", "PAID"].includes(String(invoice.status))
  ).length;
  const overdueInvoiceCount = invoices.filter(
    (invoice) =>
      Number(invoice.amountDue ?? 0) > 0 &&
      invoice.dueDate < now &&
      !["VOID", "PAID"].includes(String(invoice.status))
  ).length;
  const invoicedTotal = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total ?? 0),
    0
  );
  const outstandingTotal = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.amountDue ?? 0),
    0
  );
  const paymentCount = payments.length;
  const collectedTotal = payments
    .filter((payment) => String(payment.status) === "COMPLETED")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const activeAccountCount = accounts.filter((account) => account.isActive).length;
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);
  const recentPayments = [...payments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 9);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Accounting</MonoLabel>
            <DisplayHeading>Accounting overview</DisplayHeading>
            <CommandBandLede>
              Keep receivables, payments, and your ledger structure in one
              place. This page gives operations a fast read on cash collection
              and the work that still needs attention.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/invoices">Open invoices</Link>
            </Button>
            <Button
              asChild
              className="bg-white text-deep-green hover:bg-white/90"
              size="sm"
            >
              <Link href="/accounting/payments">Review payments</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Invoices</MetricLabel>
              <MetricValue>{invoiceCount}</MetricValue>
              <p className="text-sm text-white/70">
                {formatCurrency(invoicedTotal)} billed
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Outstanding</MetricLabel>
              <MetricValue>{formatCurrency(outstandingTotal)}</MetricValue>
              <p className="text-sm text-white/70">
                {outstandingInvoiceCount} invoice
                {outstandingInvoiceCount === 1 ? "" : "s"} still open
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Collected</MetricLabel>
              <MetricValue>{formatCurrency(collectedTotal)}</MetricValue>
              <p className="text-sm text-white/70">
                {paymentCount} payment record{paymentCount === 1 ? "" : "s"}
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Ledger</MetricLabel>
              <MetricValue>{activeAccountCount}</MetricValue>
              <p className="text-sm text-white/70">
                active chart-of-account codes
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${overdueInvoiceCount} overdue`}
            description="Overdue invoices and recent billing activity for the current tenant."
            eyebrow="Attention"
            title="Receivables that need follow-up"
          />

          {recentInvoices.length === 0 ? (
            <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-8 text-muted-foreground text-sm">
              No invoices yet. Start in the invoices module to create your first
              billing record.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr] gap-4 border-hairline border-b px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                <span>Invoice</span>
                <span>Client / Event</span>
                <span>Status</span>
                <span className="text-right">Amount due</span>
              </div>
              {recentInvoices.map((invoice) => (
                <div
                  className="grid grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr] gap-4 border-hairline border-b px-5 py-4 text-sm last:border-b-0"
                  key={invoice.id}
                >
                  <div className="space-y-1">
                    <div className="font-medium text-ink">
                      {invoice.invoiceNumber}
                    </div>
                    <div className="text-muted-foreground">
                      Due {formatDate(invoice.dueDate)}
                    </div>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>{getClientLabel(invoice.client)}</div>
                    <div>{invoice.event.title}</div>
                  </div>
                  <div>
                    <StatusPill>
                      {invoice.status.replaceAll("_", " ")}
                    </StatusPill>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="font-medium text-ink">
                      {formatCurrency(Number(invoice.amountDue))}
                    </div>
                    <div className="text-muted-foreground">
                      of {formatCurrency(Number(invoice.total))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader
            count={`${recentPayments.length} recent`}
            description="Latest recorded payments across invoices, with method and completion status."
            eyebrow="Cash"
            title="Recent payment activity"
          />

          {recentPayments.length === 0 ? (
            <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-8 text-muted-foreground text-sm">
              No payments recorded yet.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentPayments.map((payment) => (
                <div
                  className="rounded-[22px] border border-hairline bg-canvas p-5"
                  key={payment.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-medium text-ink">
                        {formatCurrency(Number(payment.amount))}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {getClientLabel(payment.client)}
                      </div>
                    </div>
                    <StatusPill>
                      {payment.status.replaceAll("_", " ")}
                    </StatusPill>
                  </div>
                  <div className="mt-4 space-y-1 text-muted-foreground text-sm">
                    <div>Invoice {payment.invoice.invoiceNumber}</div>
                    <div>{payment.methodType.replaceAll("_", " ")}</div>
                    <div>
                      {payment.completedAt ? "Completed" : "Recorded"}{" "}
                      {formatDate(payment.completedAt ?? payment.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader
            count={`${moduleLinks.length} destinations`}
            description="Jump straight into the accounting surfaces that already exist in Capsule Pro."
            eyebrow="Navigate"
            title="Accounting modules"
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {moduleLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  className="group rounded-[22px] border border-hairline bg-canvas p-5 transition-colors hover:border-ink"
                  href={link.href}
                  key={link.href}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background text-ink">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="font-medium text-ink">{link.label}</div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {link.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
