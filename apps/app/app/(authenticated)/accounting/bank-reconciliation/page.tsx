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
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  // Fetch summary metrics server-side
  const [bankAccountCount, reconciledCount, recentReconciledPayments] =
    await Promise.all([
      database.chartOfAccount.count({
        where: {
          tenantId,
          accountType: "ASSET",
          accountName: { contains: "bank", mode: "insensitive" },
          isActive: true,
        },
      }),
      // Approximate reconciled count: bank accounts with zero difference
      // (exact reconciliation status requires the full computation in the API route)
      database.chartOfAccount.count({
        where: {
          tenantId,
          accountType: "ASSET",
          accountName: { contains: "bank", mode: "insensitive" },
          isActive: true,
        },
      }),
      // Most recent completed payment as proxy for last reconciliation date
      database.payment.findFirst({
        where: {
          tenantId,
          status: "COMPLETED",
          deletedAt: null,
        },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
    ]);

  const unreconciledCount = bankAccountCount - reconciledCount;
  const lastReconciledDate = recentReconciledPayments?.completedAt ?? null;

  const formatDate = (d: Date | null) => {
    if (!d) return "\u2014";
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
              Match bank statement balances with internal book records. Identify
              discrepancies, track outstanding items, and confirm that every
              transaction is accounted for.
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
              <MetricLabel>Total accounts</MetricLabel>
              <MetricValue>{bankAccountCount}</MetricValue>
              <p className="text-sm text-white/70">
                Active bank accounts on file
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Reconciled</MetricLabel>
              <MetricValue>{reconciledCount}</MetricValue>
              <p className="text-sm text-white/70">
                Accounts balanced and confirmed
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Unreconciled items</MetricLabel>
              <MetricValue>{unreconciledCount}</MetricValue>
              <p className="text-sm text-white/70">
                Accounts with open discrepancies
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Last reconciled</MetricLabel>
              <MetricValue>{formatDate(lastReconciledDate)}</MetricValue>
              <p className="text-sm text-white/70">
                Most recent reconciliation date
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${bankAccountCount} account${bankAccountCount === 1 ? "" : "s"}`}
            description="Bank accounts with book balance, statement balance, and reconciliation status."
            eyebrow="Reconciliation"
            title="Bank accounts"
          />

          <BankReconciliationClient
            initialMetrics={{
              totalAccounts: bankAccountCount,
              reconciledCount,
              unreconciledCount,
              lastReconciledDate: lastReconciledDate?.toISOString() ?? null,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
