"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientTable = ClientTable;
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
const utils_1 = require("@repo/design-system/lib/utils");
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
function ClientTable({ clients, className }) {
  const getBadgeVariant = (index) => {
    if (index === 0) return "default";
    if (index === 1) return "secondary";
    return "outline";
  };
  return (
    <card_1.Card className={(0, utils_1.cn)("", className)}>
      <card_1.CardHeader>
        <card_1.CardTitle>Top Clients by LTV</card_1.CardTitle>
        <card_1.CardDescription>
          Highest lifetime value clients
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="rounded-md border">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Client</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Orders
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  LTV
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  AOV
                </table_1.TableHead>
                <table_1.TableHead>Last Order</table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {clients.length === 0 ? (
                <table_1.TableRow>
                  <table_1.TableCell
                    className="text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No client data available
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : (
                clients.map((client, index) => (
                  <table_1.TableRow key={client.id}>
                    <table_1.TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.name}</span>
                        {index < 3 && (
                          <badge_1.Badge
                            className="text-xs"
                            variant={getBadgeVariant(index)}
                          >
                            #{index + 1}
                          </badge_1.Badge>
                        )}
                      </div>
                      {client.email && (
                        <span className="text-xs text-muted-foreground">
                          {client.email}
                        </span>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {client.orderCount}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right font-medium">
                      {formatCurrency(client.lifetimeValue)}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right text-muted-foreground">
                      {formatCurrency(client.averageOrderValue)}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-muted-foreground text-sm">
                      {formatDate(client.lastOrderDate)}
                    </table_1.TableCell>
                  </table_1.TableRow>
                ))
              )}
            </table_1.TableBody>
          </table_1.Table>
        </div>
      </card_1.CardContent>
    </card_1.Card>
  );
}
