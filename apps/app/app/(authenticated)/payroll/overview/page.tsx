import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

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
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Payroll
      </p>
      <h1 className="text-2xl font-semibold">Payroll Overview</h1>
      <p className="text-sm text-muted-foreground">
        Confirm totals, approvals, and risks before the next payout.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {payrollSummaries.map((summary) => (
        <Card key={summary.label}>
          <CardHeader>
            <CardTitle>{summary.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {summary.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvals.map((approval) => (
            <div key={approval.title} className="rounded-md border border-border/60 px-4 py-3">
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
            <div key={issue.label} className="flex items-center justify-between">
              <p className="text-muted-foreground">{issue.label}</p>
              <Badge variant={issue.severity === "High" ? "destructive" : "outline"}>
                {issue.severity}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

export default PayrollOverviewPage;
