import { redirect } from "next/navigation";

/**
 * /accounting — redirect to invoices as the primary accounting view.
 */
export default function AccountingPage() {
  redirect("/accounting/invoices");
}
