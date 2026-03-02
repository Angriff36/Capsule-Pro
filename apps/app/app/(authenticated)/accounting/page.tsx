import { redirect } from "next/navigation";

/**
 * /accounting — redirect to the chart of accounts (the only accounting
 * sub-page that currently exists). Add additional accounting sub-pages here
 * as the module expands.
 */
export default function AccountingPage() {
  redirect("/accounting/chart-of-accounts");
}
