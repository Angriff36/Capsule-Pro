import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  PageCanvas,
  CommandBand,
  CommandBandHeader,
  CommandBandActions,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  PageBody,
  OperationalColumn,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Button } from "@repo/design-system/components/ui/button";
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

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[_\s]+/)
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

  const tenantId = await getTenantIdForOrg(orgId);

  const [
    leadSummary,
    proposalSummary,
    invoiceSummary,
    paymentSummary,
    recentProposals,
    recentInvoices,
  ] = await Promise.all([
    database.lead.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: true,
      _sum: {
        estimatedValue: true,
      },
    }),
    database.proposal.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: true,
      _sum: {
        total: true,
      },
    }),
    database.invoice.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: true,
      _sum: {
        total: true,
        amountDue: true,
      },
    }),
    database.payment.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: true,
      _sum: {
        amount: true,
      },
    }),
    database.proposal.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        proposalNumber: true,
        title: true,
        status: true,
        eventDate: true,
        total: true,
        client: {
          select: {
            company_name: true,
            first_name: true,
            last_name: true,
          },
        },
        lead: {
          select: {
            companyName: true,
            contactName: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    }),
    database.invoice.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceType: true,
        status: true,
        dueDate: true,
        issuedAt: true,
        total: true,
        amountDue: true,
        client: {
          select: {
            company_name: true,
            first_name: true,
            last_name: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  const leadCount = leadSummary._count;
  const proposalCount = proposalSummary._count;
  const invoiceCount = invoiceSummary._count;
  const paymentCount = paymentSummary._count;
  const estimatedPipelineValue = Number(leadSummary._sum.estimatedValue ?? 0);
  const proposedRevenue = Number(proposalSummary._sum.total ?? 0);
  const invoicedRevenue = Number(invoiceSummary._sum.total ?? 0);
  const outstandingRevenue = Number(invoiceSummary._sum.amountDue ?? 0);
  const collectedRevenue = Number(paymentSummary._sum.amount ?? 0);

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
              title="Recent proposals"
              description="Current opportunities linked to leads, clients, and upcoming events."
              actions={
                <Link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href="/crm/pipeline"
                >
                  Open CRM pipeline
                </Link>
              }
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
              title="Latest invoices"
              description="Collection visibility for the newest billed events."
              actions={
                <Link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href="/accounting/payments"
                >
                  Open payments dashboard
                </Link>
              }
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
