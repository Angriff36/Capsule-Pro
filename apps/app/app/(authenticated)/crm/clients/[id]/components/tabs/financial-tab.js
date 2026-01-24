"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialTab = FinancialTab;
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
function FinancialTab({ client }) {
  const totalRevenue = client.totalRevenue
    ? Number(client.totalRevenue.total)
    : 0;
  const avgRevenuePerEvent =
    client.eventCount > 0 ? totalRevenue / client.eventCount : 0;
  const clientYears =
    Math.ceil(
      (Date.now() - new Date(client.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
    ) || 1;
  const annualRevenue = totalRevenue / clientYears;
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Financial Summary</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <lucide_react_1.DollarSignIcon className="h-4 w-4" />
              Total Revenue
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {client.eventCount} event
              {client.eventCount !== 1 ? "s" : ""}
            </p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <lucide_react_1.TrendingUpIcon className="h-4 w-4" />
              Avg per Event
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              $
              {avgRevenuePerEvent.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average event value
            </p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <lucide_react_1.CalendarIcon className="h-4 w-4" />
              Est. Annual
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              $
              {annualRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{clientYears} year{clientYears !== 1 ? "s" : ""} as client
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Payment Terms</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            {client.defaultPaymentTerms ? (
              <div>
                <div className="text-2xl font-bold">
                  Net {client.defaultPaymentTerms}
                </div>
                <p className="text-sm text-muted-foreground">days</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Not specified</p>
            )}
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Tax Status</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            {client.taxExempt ? (
              <badge_1.Badge className="text-base py-1" variant="secondary">
                Tax Exempt
              </badge_1.Badge>
            ) : (
              <p className="text-muted-foreground">Standard tax applies</p>
            )}
            {client.taxId && (
              <p className="text-sm text-muted-foreground mt-2">
                Tax ID: {client.taxId}
              </p>
            )}
          </card_1.CardContent>
        </card_1.Card>
      </div>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Lifetime Value Metrics</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Client since</span>
              <span className="font-medium">
                {new Date(client.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total events</span>
              <span className="font-medium">{client.eventCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lifetime value</span>
              <span className="font-bold text-lg">
                ${totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
}
