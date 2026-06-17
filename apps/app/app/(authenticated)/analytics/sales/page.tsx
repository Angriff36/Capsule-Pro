import {
  listInvoices,
  listLeads,
  listPayments,
  listProposals,
} from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantIdForOrg } from "../../../lib/tenant";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const TITLE_CASE_SEPARATOR = /[_\s]+/;

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(TITLE_CASE_SEPARATOR)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatClientName = (
  client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null
) => {
  if (!client) {
    return "Unassigned";
  }

  if (client.company_name?.trim()) {
    return client.company_name;
  }

  const fullName = [client.first_name, client.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Unassigned";
};

const formatLeadLabel = (lead: {
  companyName: string | null;
  contactName: string;
}) => lead.companyName?.trim() || lead.contactName;

const statusVariant = (status: string) => {
  const normalized = status.toLowerCase();

  if (
    ["paid", "accepted", "won", "confirmed", "completed"].includes(normalized)
  ) {
    return "default" as const;
  }

  if (["overdue", "rejected", "lost", "failed", "void"].includes(normalized)) {
    return "destructive" as const;
  }

  if (["draft", "new", "pending"].includes(normalized)) {
    return "outline" as const;
  }

  return "secondary" as const;
};

const AnalyticsSalesPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  await getTenantIdForOrg(orgId);

  const [leads, proposals, invoices, payments] = await Promise.all([
    (await listLeads()).data,
    (await listProposals()).data,
    (await listInvoices()).data,
    (await listPayments()).data,
  ]);

  const leadCount = leads.length;
  const proposalCount = proposals.length;
  const invoicedRevenue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total ?? 0),
    0
  );
  const collectedRevenue = payments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0
  );
  const recentProposals = [...proposals]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12);
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div>
            <MonoLabel tone="dark">Analytics</MonoLabel>
            <DisplayHeading size="md">Sales analytics</DisplayHeading>
            <CommandBandLede>
              Live pipeline, proposal, invoice, and payment activity for this
              tenant.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button asChild size="sm" variant="on-dark">
              <Link href="/analytics/sales/chart-builder">Chart builder</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <MetricBand cols={4}>
          <MetricCell>
            <MetricLabel>Lead pipeline</MetricLabel>
            <MetricValue>{leadCount}</MetricValue>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Proposals in play</MetricLabel>
            <MetricValue>{proposalCount}</MetricValue>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Invoices issued</MetricLabel>
            <MetricValue>
              {currencyFormatter.format(invoicedRevenue)}
            </MetricValue>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Cash collected</MetricLabel>
            <MetricValue>
              {currencyFormatter.format(collectedRevenue)}
            </MetricValue>
          </MetricCell>
        </MetricBand>
      </CommandBand>

      <PageBody>
        <OperationalColumn>
          <section className="space-y-4">
            <SectionHeader
              actions={
                <Link
                  className="font-medium text-primary text-sm underline-offset-4 hover:underline"
                  href="/crm/pipeline"
                >
                  Open CRM pipeline
                </Link>
              }
              description="Current opportunities linked to leads, clients, and upcoming events."
              title="Recent proposals"
            />

            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProposals.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-8 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        No proposals found for this tenant yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentProposals.map((proposal) => {
                      const accountLabel = proposal.client
                        ? formatClientName(proposal.client)
                        : proposal.lead
                          ? formatLeadLabel(proposal.lead)
                          : "Unassigned";

                      return (
                        <TableRow key={proposal.id}>
                          <TableCell>
                            <div className="font-medium">{proposal.title}</div>
                            <div className="text-muted-foreground text-xs">
                              {proposal.proposalNumber}
                            </div>
                          </TableCell>
                          <TableCell>{accountLabel}</TableCell>
                          <TableCell>
                            {proposal.event?.title ?? "Not linked"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className="w-fit"
                              variant={statusVariant(proposal.status)}
                            >
                              {titleCase(proposal.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {proposal.eventDate
                              ? dateFormatter.format(proposal.eventDate)
                              : "TBD"}
                          </TableCell>
                          <TableCell className="text-right">
                            {currencyFormatter.format(
                              Number(proposal.total ?? 0)
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              actions={
                <Link
                  className="font-medium text-primary text-sm underline-offset-4 hover:underline"
                  href="/accounting/payments"
                >
                  Open payments dashboard
                </Link>
              }
              description="Collection visibility for the newest billed events."
              title="Latest invoices"
            />

            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-8 text-center text-muted-foreground"
                        colSpan={7}
                      >
                        No invoices found for this tenant yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-medium">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {titleCase(invoice.invoiceType)} ·{" "}
                            {currencyFormatter.format(
                              Number(invoice.total ?? 0)
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatClientName(invoice.client)}
                        </TableCell>
                        <TableCell>{invoice.event.title}</TableCell>
                        <TableCell>
                          <Badge
                            className="w-fit"
                            variant={statusVariant(invoice.status)}
                          >
                            {titleCase(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dateFormatter.format(invoice.issuedAt)}
                        </TableCell>
                        <TableCell>
                          {dateFormatter.format(invoice.dueDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencyFormatter.format(
                            Number(invoice.amountDue ?? 0)
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
};

export default AnalyticsSalesPage;
