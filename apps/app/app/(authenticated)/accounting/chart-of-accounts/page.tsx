import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OperationalPageShell, OperationalSection } from "../../components/operational-page-shell";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ChartOfAccountsActions } from "./chart-of-accounts-actions";

const typeLabels = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
} as const;

export default async function ChartOfAccountsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const accounts = await database.chartOfAccount.findMany({
    where: { tenantId },
    orderBy: [{ accountNumber: "asc" }],
    select: {
      id: true,
      accountNumber: true,
      accountName: true,
      accountType: true,
      parentId: true,
      isActive: true,
      description: true,
      updatedAt: true,
    },
  });

  const parentNames = new Map(
    accounts.map((account) => [account.id, account.accountName])
  );
  const activeCount = accounts.filter((account) => account.isActive).length;
  const inactiveCount = accounts.length - activeCount;
  const groupedCounts = accounts.reduce<Record<string, number>>(
    (totals, account) => {
      totals[account.accountType] = (totals[account.accountType] ?? 0) + 1;
      return totals;
    },
    {}
  );

  return (
    <OperationalPageShell
      actions={
        <div className="flex flex-wrap gap-2">
          <ChartOfAccountsActions />
          <Button asChild variant="outline">
            <Link href="/accounting">Back to accounting overview</Link>
          </Button>
        </div>
      }
      description="Live ledger accounts for the current tenant, pulled directly from Prisma."
      eyebrow="Accounting / Chart of accounts"
      title="Chart of accounts"
    >
      <OperationalSection title="Overview">
        <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total accounts</CardDescription>
            <CardTitle className="text-2xl">{accounts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {inactiveCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Account types</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(typeLabels).map(([value, label]) => (
              <Badge key={value} variant="outline">
                {label}: {groupedCounts[value] ?? 0}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
      </OperationalSection>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen />
                </EmptyMedia>
                <EmptyTitle>No accounts in your chart yet</EmptyTitle>
                <EmptyDescription>
                  Set up your ledger structure with asset, liability, equity,
                  revenue, and expense accounts to start tracking balances.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <p className="text-muted-foreground text-xs">
                  Click <strong>Add Account</strong> above to create your first
                  ledger account.
                </p>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Account list</CardTitle>
            <CardDescription>
              Simple database-backed view of account codes, hierarchy, and
              status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-sm">
                      {account.accountNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{account.accountName}</div>
                      {account.description ? (
                        <div className="text-muted-foreground text-xs">
                          {account.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{typeLabels[account.accountType]}</TableCell>
                    <TableCell>
                      {account.parentId
                        ? (parentNames.get(account.parentId) ??
                          "Unknown parent")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={account.isActive ? "default" : "secondary"}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(account.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </OperationalPageShell>
  );
}
