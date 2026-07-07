import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
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
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";

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
  period_end: Date;
  period_start: Date;
  status: string;
}

interface PayrollRunRow {
  run_date: Date;
  status: string;
  total_deductions: string | null;
  total_gross: string | null;
  total_net: string | null;
}

interface HeadcountRow {
  count: bigint;
}

interface PendingApprovalRow {
  created_at: Date;
  employeeId: string;
  first_name: string;
  id: string;
  last_name: string;
  status: string;
}

interface MissingRateRow {
  count: bigint;
}

const fetchPayrollData = async (tenantId: string) => {
  const [
    periodRecords,
    runRecords,
    activeHeadcount,
    approvalRecords,
    missingRateCount,
  ] = await Promise.all([
    database.payrollPeriod.findMany({
      where: { tenantId, deletedAt: null, status: "open" },
      orderBy: { periodEnd: "asc" },
      take: 1,
    }),
    database.payrollRun.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { runDate: "desc" },
      take: 1,
    }),
    database.user.count({
      where: { tenantId, deletedAt: null, isActive: true },
    }),
    database.timecardApproval.findMany({
      where: { tenantId, deletedAt: null, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    database.user.count({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        hourlyRate: null,
      },
    }),
  ]);

  const approvalEmployees = await database.user.findMany({
    where: {
      tenantId,
      id: { in: approvalRecords.map((approval) => approval.employeeId) },
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true },
  });
  const employeesById = new Map(
    approvalEmployees.map((employee) => [employee.id, employee])
  );

  const periodRows: PayrollPeriodRow[] = periodRecords.map((period) => ({
    id: period.id,
    period_start: period.periodStart,
    period_end: period.periodEnd,
    status: period.status,
  }));
  const runRows: PayrollRunRow[] = runRecords.map((run) => ({
    total_gross: run.totalGross.toString(),
    total_deductions: run.totalDeductions.toString(),
    total_net: run.totalNet.toString(),
    status: run.status,
    run_date: run.runDate,
  }));
  const headcountRows: HeadcountRow[] = [{ count: BigInt(activeHeadcount) }];
  const approvalRows: PendingApprovalRow[] = approvalRecords.map((approval) => {
    const employee = employeesById.get(approval.employeeId);
    return {
      id: approval.id,
      employeeId: approval.employeeId,
      status: approval.status,
      created_at: approval.createdAt,
      first_name: employee?.firstName ?? "",
      last_name: employee?.lastName ?? "",
    };
  });
  const missingRateRows: MissingRateRow[] = [
    { count: BigInt(missingRateCount) },
  ];

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
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Payroll</MonoLabel>
            <DisplayHeading size="md">Payroll overview</DisplayHeading>
            <CommandBandLede>
              Confirm totals, approvals, and risks before the next payout.
            </CommandBandLede>
          </div>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {summaryCards.map((summary) => (
              <MetricCell key={summary.label}>
                <MetricLabel>{summary.label}</MetricLabel>
                <MetricValue>{summary.value}</MetricValue>
                {summary.detail ? (
                  <div className="text-white/55 text-xs">{summary.detail}</div>
                ) : null}
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link href="/payroll/timecards">
                  View all
                  <ArrowRightIcon className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            }
            count={`${approvalRows.length} pending`}
            description="Timecards awaiting sign-off before payroll can close."
            eyebrow="Approvals"
            title="Pending Approvals"
          />

          <div className="rounded-[22px] border border-hairline bg-canvas p-6">
            {approvalRows.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No pending timecard approvals.
              </p>
            ) : (
              <div className="space-y-3">
                {approvalRows.map((approval) => (
                  <div
                    className="rounded-[14px] border border-hairline bg-canvas px-4 py-3"
                    key={approval.id}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">
                        {`${approval.first_name} ${approval.last_name}`.trim()}
                      </p>
                      <Badge variant="secondary">{approval.status}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Submitted {dateTimeFormatter.format(approval.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeader
            count={`${payrollRisks.length} issue${payrollRisks.length === 1 ? "" : "s"}`}
            description="Conditions that may block or delay the next payout."
            eyebrow="Risks"
            title="Payroll Risks"
          />

          <div className="rounded-[22px] border border-hairline bg-canvas p-6">
            {payrollRisks.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No payroll risks detected.
              </p>
            ) : (
              <div className="space-y-3">
                {payrollRisks.map((issue) => (
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
                ))}
              </div>
            )}
          </div>
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default PayrollOverviewPage;
