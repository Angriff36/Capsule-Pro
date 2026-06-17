import { listPayments } from "@/app/lib/manifest-client.generated";
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
import { Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }
  return dateFormatter.format(value);
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

export default async function PaymentsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const payments = (await listPayments()).data;
  const paymentCount = payments.length;
  const completedPaymentCount = payments.filter(
    (payment) => String(payment.status) === "COMPLETED"
  ).length;
  const pendingPaymentCount = payments.filter((payment) =>
    ["PENDING", "PROCESSING"].includes(String(payment.status))
  ).length;
  const refundedPaymentCount = payments.filter((payment) =>
    ["REFUNDED", "PARTIALLY_REFUNDED"].includes(String(payment.status))
  ).length;
  const recordedTotal = payments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0
  );
  const recentPayments = [...payments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 16);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Accounting</MonoLabel>
            <DisplayHeading>Payments</DisplayHeading>
            <CommandBandLede>
              Review the latest tenant payment records, see what has cleared,
              and spot refunds or pending activity before reconciliation drifts.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/payments/export" target="_blank">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Link>
            </Button>
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
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/payments/new">Record payment</Link>
            </Button>
            <Button
              asChild
              className="bg-white text-deep-green hover:bg-white/90"
              size="sm"
            >
              <Link href="/accounting/chart-of-accounts">View ledger</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Recorded</MetricLabel>
              <MetricValue>{paymentCount}</MetricValue>
              <p className="text-sm text-white/70">
                {formatCurrency(recordedTotal)} total value
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Completed</MetricLabel>
              <MetricValue>{completedPaymentCount}</MetricValue>
              <p className="text-sm text-white/70">Captured successfully</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Pending</MetricLabel>
              <MetricValue>{pendingPaymentCount}</MetricValue>
              <p className="text-sm text-white/70">
                Awaiting settlement or processing
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Refunded</MetricLabel>
              <MetricValue>{refundedPaymentCount}</MetricValue>
              <p className="text-sm text-white/70">
                Fully or partially reversed
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${recentPayments.length} shown`}
            description="A tenant-scoped list of recent payments with invoice, client, event, and settlement status."
            eyebrow="Cash"
            title="Latest payment records"
          />

          {recentPayments.length === 0 ? (
            <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-8 text-muted-foreground text-sm">
              No payments have been recorded for this tenant yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              <div className="grid grid-cols-[1fr_1.15fr_1.1fr_0.7fr_0.85fr_0.8fr] gap-4 border-hairline border-b px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                <span>Invoice</span>
                <span>Client / Event</span>
                <span>Method</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Recorded</span>
              </div>
              {recentPayments.map((payment) => (
                <div
                  className="grid grid-cols-[1fr_1.15fr_1.1fr_0.7fr_0.85fr_0.8fr] gap-4 border-hairline border-b px-5 py-4 text-sm last:border-b-0"
                  key={payment.id}
                >
                  <div className="space-y-1">
                    <div className="font-medium text-ink">
                      {payment.invoice.invoiceNumber}
                    </div>
                    <div className="text-muted-foreground">
                      {payment.processor || "Manual record"}
                    </div>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>{getClientLabel(payment.client)}</div>
                    <div>{payment.event.title}</div>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>{payment.methodType.replaceAll("_", " ")}</div>
                    <div>
                      {payment.completedAt ? "Completed" : "Recorded"}{" "}
                      {formatDate(payment.completedAt ?? payment.createdAt)}
                    </div>
                  </div>
                  <div>
                    <StatusPill>
                      {payment.status.replaceAll("_", " ")}
                    </StatusPill>
                  </div>
                  <div className="text-right font-medium text-ink">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency,
                    }).format(Number(payment.amount))}
                  </div>
                  <div className="text-right text-muted-foreground">
                    {formatDate(payment.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
