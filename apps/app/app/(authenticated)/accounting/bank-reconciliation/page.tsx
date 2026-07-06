import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { BankReconciliationClient } from "./bank-reconciliation-client";

export default async function BankReconciliationPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  // Real, verifiable metrics only. There is no reconciliation model yet, so
  // no reconciled/unreconciled counts are shown — earlier versions fabricated
  // them from duplicate account queries.
  const [bankAccountCount, paymentAggregate, lastPayment] = await Promise.all([
    database.chartOfAccount.count({
      where: {
        tenantId,
        accountType: "ASSET",
        accountName: { contains: "bank", mode: "insensitive" },
        isActive: true,
      },
    }),
    database.payment.aggregate({
      where: { tenantId, status: "COMPLETED", deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    }),
    database.payment.findFirst({
      where: { tenantId, status: "COMPLETED", deletedAt: null },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
  ]);

  const completedPaymentCount = paymentAggregate._count.id;
  const completedPaymentTotal = Number(paymentAggregate._sum.amount ?? 0);
  const lastPaymentDate = lastPayment?.completedAt ?? null;

  const formatDate = (d: Date | null) => {
    if (!d) {
      return "\u2014";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Accounting</MonoLabel>
            <DisplayHeading>Bank Reconciliation</DisplayHeading>
            <CommandBandLede>
              Review your bank accounts and completed payment activity.
              Statement import and per-account matching are coming; nothing on
              this page is simulated.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/chart-of-accounts">
                Chart of accounts
              </Link>
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
              <MetricLabel>Bank accounts</MetricLabel>
              <MetricValue>{bankAccountCount}</MetricValue>
              <p className="text-sm text-white/70">
                Active bank accounts on file
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Completed payments</MetricLabel>
              <MetricValue>{completedPaymentCount}</MetricValue>
              <p className="text-sm text-white/70">All time, tenant-wide</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Payments total</MetricLabel>
              <MetricValue>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(completedPaymentTotal)}
              </MetricValue>
              <p className="text-sm text-white/70">Sum of completed payments</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Last payment</MetricLabel>
              <MetricValue>{formatDate(lastPaymentDate)}</MetricValue>
              <p className="text-sm text-white/70">
                Most recent completed payment
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${bankAccountCount} account${bankAccountCount === 1 ? "" : "s"}`}
            description="Bank-type accounts from your chart of accounts."
            eyebrow="Reconciliation"
            title="Bank accounts"
          />

          <BankReconciliationClient />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
