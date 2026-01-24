Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
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
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Payroll
      </p>
      <h1 className="text-2xl font-semibold">Payouts</h1>
      <p className="text-sm text-muted-foreground">
        Manage payout channels and statuses for the upcoming run.
      </p>
    </div>

    <card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Scheduled Payouts</card_1.CardTitle>
        <card_1.CardDescription>
          All channels sync through the payout engine before runs.
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent className="overflow-x-auto">
        <div className="rounded-md border">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Channel</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Amount
                </table_1.TableHead>
                <table_1.TableHead>Date</table_1.TableHead>
                <table_1.TableHead>Status</table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {payouts.map((payout) => (
                <table_1.TableRow key={payout.target}>
                  <table_1.TableCell>{payout.target}</table_1.TableCell>
                  <table_1.TableCell className="text-right">
                    {payout.amount}
                  </table_1.TableCell>
                  <table_1.TableCell>{payout.runDate}</table_1.TableCell>
                  <table_1.TableCell>
                    <badge_1.Badge
                      variant={
                        payout.status === "Scheduled" ? "secondary" : "outline"
                      }
                    >
                      {payout.status}
                    </badge_1.Badge>
                  </table_1.TableCell>
                </table_1.TableRow>
              ))}
            </table_1.TableBody>
          </table_1.Table>
        </div>
      </card_1.CardContent>
    </card_1.Card>
  </div>
);
exports.default = PayrollPayoutsPage;
