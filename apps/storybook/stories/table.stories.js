Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const table_1 = require("@repo/design-system/components/ui/table");
const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
];
/**
 * Powerful table and datagrids built using TanStack Table.
 */
const meta = {
  title: "ui/Table",
  component: table_1.Table,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <table_1.Table {...args}>
      <table_1.TableCaption>
        A list of your recent invoices.
      </table_1.TableCaption>
      <table_1.TableHeader>
        <table_1.TableRow>
          <table_1.TableHead className="w-[100px]">Invoice</table_1.TableHead>
          <table_1.TableHead>Status</table_1.TableHead>
          <table_1.TableHead>Method</table_1.TableHead>
          <table_1.TableHead className="text-right">Amount</table_1.TableHead>
        </table_1.TableRow>
      </table_1.TableHeader>
      <table_1.TableBody>
        {invoices.map((invoice) => (
          <table_1.TableRow key={invoice.invoice}>
            <table_1.TableCell className="font-medium">
              {invoice.invoice}
            </table_1.TableCell>
            <table_1.TableCell>{invoice.paymentStatus}</table_1.TableCell>
            <table_1.TableCell>{invoice.paymentMethod}</table_1.TableCell>
            <table_1.TableCell className="text-right">
              {invoice.totalAmount}
            </table_1.TableCell>
          </table_1.TableRow>
        ))}
      </table_1.TableBody>
    </table_1.Table>
  ),
};
exports.default = meta;
/**
 * The default form of the table.
 */
exports.Default = {};
