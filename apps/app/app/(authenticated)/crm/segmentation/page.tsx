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
import { DeleteTagButton } from "./components/delete-tag-button";

export const metadata = {
  title: "Client Segmentation",
  description:
    "Tag-, type-, and source-based segments for the CRM client base.",
};

const numberFormatter = new Intl.NumberFormat("en-US");

const CLIENT_TYPE_LABELS: Record<string, string> = {
  company: "Company",
  individual: "Individual",
};

interface SegmentRow {
  key: string;
  label: string;
  count: number;
  href: string;
}

const buildTagSegments = (
  clients: { tags: string[] }[],
  total: number
): SegmentRow[] => {
  const counts = new Map<string, number>();
  for (const client of clients) {
    for (const tag of client.tags) {
      const trimmed = tag.trim();
      if (!trimmed) {
        continue;
      }
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({
      key: `tag:${tag}`,
      label: tag,
      count,
      href: `/crm/clients?tags=${encodeURIComponent(tag)}`,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((row) => ({
      ...row,
      // Re-bind so we keep ordering stable; total only used for share calc later.
      total,
    }))
    .map(({ total: _t, ...row }) => row);
};

const buildClientTypeSegments = (
  clients: { clientType: string }[]
): SegmentRow[] => {
  const counts = new Map<string, number>();
  for (const client of clients) {
    const key = client.clientType || "company";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([clientType, count]) => ({
      key: `type:${clientType}`,
      label: CLIENT_TYPE_LABELS[clientType] ?? clientType,
      count,
      href: `/crm/clients?clientType=${encodeURIComponent(clientType)}`,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const buildSourceSegments = (
  clients: { source: string | null }[]
): SegmentRow[] => {
  const counts = new Map<string, number>();
  for (const client of clients) {
    const raw = client.source?.trim();
    const key = raw && raw.length > 0 ? raw : "__unset__";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([source, count]) => {
      if (source === "__unset__") {
        return {
          key: "source:__unset__",
          label: "Unspecified",
          count,
          href: "/crm/clients",
        };
      }
      return {
        key: `source:${source}`,
        label: source,
        count,
        href: `/crm/clients?source=${encodeURIComponent(source)}`,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const SegmentTable = ({
  rows,
  total,
  emptyMessage,
  renderAction,
}: {
  rows: SegmentRow[];
  total: number;
  emptyMessage: string;
  renderAction?: (row: SegmentRow) => React.ReactNode;
}) => (
  <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Segment</TableHead>
          <TableHead className="text-right">Clients</TableHead>
          <TableHead className="text-right">Share</TableHead>
          <TableHead className="text-right">Filter</TableHead>
          {renderAction && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={renderAction ? 5 : 4}>
              <div className="py-6 text-center text-muted-foreground text-sm">
                {emptyMessage}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const share = total > 0 ? row.count / total : 0;
            return (
              <TableRow key={row.key}>
                <TableCell className="font-medium text-ink">
                  <Badge variant="secondary">{row.label}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-ink">
                  {numberFormatter.format(row.count)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {(share * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    className="text-ink underline underline-offset-4"
                    href={row.href}
                  >
                    View clients
                  </Link>
                </TableCell>
                {renderAction && (
                  <TableCell>{renderAction(row)}</TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  </div>
);

const ClientSegmentationPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const clients = await database.client.findMany({
    where: { tenantId, deletedAt: null },
    select: { tags: true, clientType: true, source: true },
  });

  const totalClients = clients.length;
  const tagSegments = buildTagSegments(clients, totalClients);
  const typeSegments = buildClientTypeSegments(clients);
  const sourceSegments = buildSourceSegments(clients);
  const taggedClients = clients.filter((c) => c.tags.length > 0).length;
  const untaggedClients = totalClients - taggedClients;

  const heroStats = [
    {
      label: "Total clients",
      value: numberFormatter.format(totalClients),
    },
    {
      label: "Unique tags",
      value: numberFormatter.format(tagSegments.length),
    },
    {
      label: "Tagged clients",
      value: numberFormatter.format(taggedClients),
    },
    {
      label: "Untagged",
      value: numberFormatter.format(untaggedClients),
    },
  ];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">CRM / Segmentation</MonoLabel>
            <DisplayHeading>Segments &amp; tags</DisplayHeading>
            <CommandBandLede>
              Group clients by tag, type, or acquisition source. Counts update
              live and each segment links into a filtered client list.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/crm">Back to CRM</Link>
            </Button>
            <Button asChild size="default" variant="on-dark">
              <Link href="/crm/clients">Open clients</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {heroStats.map((item) => (
              <MetricCell key={item.label}>
                <MetricLabel>{item.label}</MetricLabel>
                <MetricValue>{item.value}</MetricValue>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${tagSegments.length} tags`}
            description="Free-form tags assigned on the client detail page. Use them for value tier (vip, repeat), industry (corporate, hospitality), or any custom taxonomy."
            eyebrow="By tag"
            title="Tag segments"
          />
          <SegmentTable
            emptyMessage="No tags yet. Open a client and add tags from the contact info tab."
            renderAction={(row) => (
              <DeleteTagButton
                clientCount={row.count}
                tag={row.label}
              />
            )}
            rows={tagSegments}
            total={totalClients}
          />
        </section>

        <section className="space-y-4">
          <SectionHeader
            count={`${typeSegments.length} types`}
            description="Client type is set on creation: company accounts vs. individual customers. Use for billing and reporting splits."
            eyebrow="By type"
            title="Client type"
          />
          <SegmentTable
            emptyMessage="No clients yet."
            rows={typeSegments}
            total={totalClients}
          />
        </section>

        <section className="space-y-4">
          <SectionHeader
            count={`${sourceSegments.length} sources`}
            description="Acquisition source captured at intake (referral, website, trade show, …). Drives marketing-attribution reports."
            eyebrow="By source"
            title="Acquisition source"
          />
          <SegmentTable
            emptyMessage="No source data yet."
            rows={sourceSegments}
            total={totalClients}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default ClientSegmentationPage;
