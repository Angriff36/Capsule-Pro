import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";

const payouts = [
  {
    target: "Direct deposit",
    runDate: "Jan 31",
    amount: "$98,200",
    status: "Scheduled",
  },
  {
    target: "Contractor wire",
    runDate: "Jan 31",
    amount: "$15,400",
    status: "Awaiting approval",
  },
  {
    target: "Special disbursement",
    runDate: "Feb 3",
    amount: "$4,800",
    status: "Planned",
  },
];

const PayrollPayoutsPage = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
      <p className="text-muted-foreground">
        Manage payout channels and statuses for the upcoming run.
      </p>
    </div>

    <Separator />

    {/* Scheduled Payouts Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Scheduled Payouts
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>All Payout Channels</CardTitle>
          <CardDescription>
            All channels sync through the payout engine before runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.target}>
                    <TableCell>{payout.target}</TableCell>
                    <TableCell className="text-right">{payout.amount}</TableCell>
                    <TableCell>{payout.runDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payout.status === "Scheduled" ? "secondary" : "outline"
                        }
                      >
                        {payout.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  </div>
);

export default PayrollPayoutsPage;
