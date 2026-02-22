import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

interface PayrollPeriodRow {
  id: string;
  period_start: Date;
  period_end: Date;
  status: string;
}

interface PayrollRunRow {
  total_gross: string | null;
  total_deductions: string | null;
  total_net: string | null;
  status: string;
  run_date: Date;
}

interface HeadcountRow {
  count: bigint;
}

interface PendingApprovalRow {
  id: string;
  employee_id: string;
  status: string;
  created_at: Date;
  first_name: string;
  last_name: string;
}

interface MissingRateRow {
  count: bigint;
}

const fetchPayrollData = async (tenantId: string) => {
  const [periodRows, runRows, headcountRows, approvalRows, missingRateRows] =
    await Promise.all([
      database.$queryRaw<PayrollPeriodRow[]>(
        Prisma.sql`
          SELECT id, period_start, period_end, status
          FROM tenant_staff.payroll_periods
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND status = 'open'
          ORDER BY period_end ASC
          LIMIT 1
        `
      ),
      database.$queryRaw<PayrollRunRow[]>(
        Prisma.sql`
          SELECT total_gross, total_deductions, total_net, status, run_date
          FROM tenant_staff.payroll_runs
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
          ORDER BY run_date DESC
          LIMIT 1
        `
      ),
      database.$queryRaw<HeadcountRow[]>(
        Prisma.sql`
          SELECT COUNT(*) as count
          FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND is_active = true
        `
      ),
      database.$queryRaw<PendingApprovalRow[]>(
        Prisma.sql`
          SELECT ta.id, ta.employee_id, ta.status, ta.created_at,
                 e.first_name, e.last_name
          FROM tenant_staff.timecard_approvals ta
          JOIN tenant_staff.employees e
            ON ta.employee_id = e.id AND ta.tenant_id = e.tenant_id
          WHERE ta.tenant_id = ${tenantId}::uuid
            AND ta.deleted_at IS NULL
            AND ta.status = 'pending'
          ORDER BY ta.created_at DESC
          LIMIT 10
        `
      ),
      database.$queryRaw<MissingRateRow[]>(
        Prisma.sql`
          SELECT COUNT(*) as count
          FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND is_active = true
            AND hourly_rate IS NULL
            AND employment_type != 'salaried'
        `
      ),
    ]);

  return { periodRows, runRows, headcountRows, approvalRows, missingRateRows };
};

const buildSummaryCards = (
  period: PayrollPeriodRow | null,
  latestRun: PayrollRunRow | null,
  activeHeadcount: number
) => {
  const totalGross = Number(latestRun?.total_gross ?? 0);
  const totalDeductions = Number(latestRun?.total_deductions ?? 0);
  const totalNet = Number(latestRun?.total_net ?? 0);

  return [
    {
      label: "Next payroll period",
      value: period
        ? `${dateFormatter.format(period.period_start)} — ${dateFormatter.format(period.period_end)}`
        : "No open payroll period",
      detail: period ? `Status: ${period.status}` : null,
    },
    {
      label: "Latest run total",
      value: latestRun ? currencyFormatter.format(totalNet) : "No runs yet",
      detail: latestRun
        ? `Gross ${currencyFormatter.format(totalGross)} · Deductions ${currencyFormatter.format(totalDeductions)}`
        : null,
    },
    {
      label: "Active headcount",
      value: `${activeHeadcount} employee${activeHeadcount === 1 ? "" : "s"}`,
      detail: null,
    },
  ];
};

const buildPayrollRisks = (
  missingRateCount: number,
  pendingApprovalCount: number
) => {
  const risks: Array<{ label: string; severity: "High" | "Medium" }> = [];

  if (missingRateCount > 0) {
    risks.push({
      label: `Missing hourly rate for ${missingRateCount} non-salaried employee${missingRateCount === 1 ? "" : "s"}`,
      severity: "High",
    });
  }

  if (pendingApprovalCount > 0) {
    risks.push({
      label: `${pendingApprovalCount} pending timecard approval${pendingApprovalCount === 1 ? "" : "s"}`,
      severity: "Medium",
    });
  }

  return risks;
};

const PayrollOverviewPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { periodRows, runRows, headcountRows, approvalRows, missingRateRows } =
    await fetchPayrollData(tenantId);

  const period = periodRows[0] ?? null;
  const latestRun = runRows[0] ?? null;
  const activeHeadcount = Number(headcountRows[0]?.count ?? 0);
  const missingRateCount = Number(missingRateRows[0]?.count ?? 0);

  const summaryCards = buildSummaryCards(period, latestRun, activeHeadcount);
  const payrollRisks = buildPayrollRisks(missingRateCount, approvalRows.length);

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Payroll Overview</h1>
        <p className="text-muted-foreground">
          Confirm totals, approvals, and risks before the next payout.
        </p>
      </div>

      <Separator />

      {/* Performance Overview Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {summaryCards.map((summary) => (
            <Card key={summary.label}>
              <CardHeader>
                <CardDescription>{summary.label}</CardDescription>
                <CardTitle>{summary.value}</CardTitle>
              </CardHeader>
              {summary.detail ? (
                <CardContent>
                  <span className="text-xs text-muted-foreground">
                    {summary.detail}
                  </span>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      {/* Approvals & Risks Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Approvals & Risks
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvalRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending timecard approvals.
                </p>
              ) : (
                approvalRows.map((approval) => (
                  <div
                    className="rounded-md border border-border/60 px-4 py-3"
                    key={approval.id}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">
                        {`${approval.first_name} ${approval.last_name}`.trim()}
                      </p>
                      <Badge variant="secondary">{approval.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {dateTimeFormatter.format(approval.created_at)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll Risks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {payrollRisks.length === 0 ? (
                <p className="text-muted-foreground">
                  No payroll risks detected.
                </p>
              ) : (
                payrollRisks.map((issue) => (
                  <div
                    className="flex items-center justify-between"
                    key={issue.label}
                  >
                    <p className="text-muted-foreground">{issue.label}</p>
                    <Badge
                      variant={
                        issue.severity === "High" ? "destructive" : "outline"
                      }
                    >
                      {issue.severity}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PayrollOverviewPage;
