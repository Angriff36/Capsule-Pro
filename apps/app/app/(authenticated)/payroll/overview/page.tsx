import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";

const payrollSummaries = [
  { label: "Next payroll run", value: "Jan 31 — Pending approval" },
  { label: "Total payroll", value: "$118,400" },
  { label: "Headcount", value: "186 active employees" },
];

const approvals = [
  {
    title: "Approve timecards for Week 4",
    owner: "Ops Director",
    due: "Today 4:00 PM",
    status: "Needs review",
  },
  {
    title: "Confirm overtime caps",
    owner: "Finance Lead",
    due: "Jan 27",
    status: "Drafting",
  },
];

const payrollIssues = [
  { label: "Missing hourly rate for 6 contract roles", severity: "High" },
  { label: "Pending PTO approvals", severity: "Medium" },
];

const PayrollOverviewPage = () => (
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
        {payrollSummaries.map((summary) => (
          <Card key={summary.label}>
            <CardHeader>
              <CardDescription>{summary.label}</CardDescription>
              <CardTitle>{summary.value}</CardTitle>
            </CardHeader>
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
            {approvals.map((approval) => (
              <div
                className="rounded-md border border-border/60 px-4 py-3"
                key={approval.title}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{approval.title}</p>
                  <Badge variant="secondary">{approval.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {approval.owner} · {approval.due}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {payrollIssues.map((issue) => (
              <div
                className="flex items-center justify-between"
                key={issue.label}
              >
                <p className="text-muted-foreground">{issue.label}</p>
                <Badge
                  variant={issue.severity === "High" ? "destructive" : "outline"}
                >
                  {issue.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
);

export default PayrollOverviewPage;
