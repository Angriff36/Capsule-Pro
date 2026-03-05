import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import Link from "next/link";
import { Receipt, Plus, Upload, FileText, Building2, CheckCircle2, Clock, XCircle, MoreHorizontal } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  submitted: "default",
  approved: "default",
  rejected: "destructive",
  exported: "outline",
};

const statusIconMap: Record<string, React.ReactNode> = {
  draft: <Clock className="h-4 w-4" />,
  submitted: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
  exported: <FileText className="h-4 w-4 text-blue-500" />,
};

export default async function ExpenseReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; event?: string }>;
}) {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  let tenantId: string;
  try {
    tenantId = await getTenantIdForOrg(orgId);
  } catch {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Expense Reports Unavailable</h1>
        <p className="text-muted-foreground">
          Unable to load expense reports. Please try again later.
        </p>
      </div>
    );
  }

  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status;

  // Fetch expense reports with receipt counts
  const reports = await database.expenseReport.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter as "draft" | "submitted" | "approved" | "rejected" | "exported" } : {}),
    },
    include: {
      receipts: true,
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Reports</h1>
          <p className="text-muted-foreground text-sm">
            Submit, track, and export expense reports with receipt capture
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      <Separator />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Draft</CardDescription>
            <CardTitle className="text-xl">
              {reports.filter((r) => r.status === "draft").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-xl">
              {reports.filter((r) => r.status === "submitted").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-xl">
              {reports.filter((r) => r.status === "approved").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-xl">
              {currencyFormatter.format(
                reports.reduce((sum, r) => sum + Number(r.totalAmount), 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Receipts</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No expense reports found. Create your first report to get started.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-medium">{report.title}</div>
                      {report.notes && (
                        <div className="text-muted-foreground text-xs truncate max-w-48">
                          {report.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {report.eventId ? (
                        <Link
                          href={`/events/${report.eventId}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Building2 className="h-3 w-3" />
                          {report.eventName || "View Event"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Receipt className="h-3 w-3" />
                        {report.receipts?.length ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {currencyFormatter.format(Number(report.totalAmount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariantMap[report.status] ?? "outline"}
                        className="gap-1"
                      >
                        {statusIconMap[report.status]}
                        <span className="capitalize">{report.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(report.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-4 text-sm">
        <Link
          href="/analytics/expense-reports/new"
          className="flex items-center gap-1 text-blue-600 hover:underline"
        >
          <Plus className="h-4 w-4" />
          Create New Report
        </Link>
        <Link
          href="/analytics/expense-reports/export"
          className="flex items-center gap-1 text-blue-600 hover:underline"
        >
          <Upload className="h-4 w-4" />
          Export Reports
        </Link>
      </div>
    </div>
  );
}
