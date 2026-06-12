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
import { PaymentMethodsClient } from "./payment-methods-client";

function _formatDate(value: Date | null) {
  if (!value) {
    return "\u2014";
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

function getDisplayInfo(pm: {
  type: string;
  cardLastFour: string | null;
  cardNetwork: string | null;
}): string {
  if (pm.type === "CREDIT_CARD" || pm.type === "DEBIT_CARD") {
    return `${pm.cardNetwork || "Card"} \u2022\u2022\u2022\u2022 ${pm.cardLastFour || "****"}`;
  }
  if (pm.type === "ACH" || pm.type === "WIRE_TRANSFER") {
    return "Bank Account";
  }
  if (pm.type === "DIGITAL_WALLET") {
    return "Digital Wallet";
  }
  if (pm.type === "CHECK") {
    return "Check";
  }
  if (pm.type === "CASH") {
    return "Cash";
  }
  return pm.type;
}

export default async function PaymentMethodsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const [totalCount, activeCount, verifiedCount, flaggedCount, paymentMethods] =
    await Promise.all([
      database.paymentMethod.count({
        where: { tenantId, deletedAt: null },
      }),
      database.paymentMethod.count({
        where: { tenantId, deletedAt: null, status: "ACTIVE" },
      }),
      database.paymentMethod.count({
        where: { tenantId, deletedAt: null, status: "VERIFIED" },
      }),
      database.paymentMethod.count({
        where: { tenantId, deletedAt: null, status: "FLAGGED" },
      }),
      database.paymentMethod.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          cardLastFour: true,
          cardNetwork: true,
          isDefault: true,
          status: true,
          clientId: true,
          createdAt: true,
          client: {
            select: {
              company_name: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      }),
    ]);

  const serializedMethods = paymentMethods.map((pm) => ({
    id: pm.id,
    type: pm.type,
    cardLastFour: pm.cardLastFour,
    cardNetwork: pm.cardNetwork,
    isDefault: pm.isDefault,
    status: pm.status,
    clientId: pm.clientId,
    displayInfo: getDisplayInfo(pm),
    clientLabel: getClientLabel(pm.client),
    createdAt: pm.createdAt.toISOString(),
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Accounting</MonoLabel>
            <DisplayHeading>Payment Methods</DisplayHeading>
            <CommandBandLede>
              Manage saved payment methods across clients. Verify credentials,
              flag suspicious entries, and control which methods are available
              for billing.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/payments">View payments</Link>
            </Button>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/invoices">Open invoices</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total methods</MetricLabel>
              <MetricValue>{totalCount}</MetricValue>
              <p className="text-sm text-white/70">Saved across all clients</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Active</MetricLabel>
              <MetricValue>{activeCount}</MetricValue>
              <p className="text-sm text-white/70">Ready for transactions</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Verified</MetricLabel>
              <MetricValue>{verifiedCount}</MetricValue>
              <p className="text-sm text-white/70">Confirmed and trusted</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Flagged</MetricLabel>
              <MetricValue>{flaggedCount}</MetricValue>
              <p className="text-sm text-white/70">Under review for fraud</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${paymentMethods.length} shown`}
            description="A tenant-scoped list of payment methods with type, status, and client association."
            eyebrow="Cards & Accounts"
            title="Saved payment methods"
          />

          <PaymentMethodsClient
            initialMethods={serializedMethods}
            metrics={{ totalCount, activeCount, verifiedCount, flaggedCount }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
