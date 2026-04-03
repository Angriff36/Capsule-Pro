/**
 * @module PaymentsPage
 * @intent Server component for Payments listing page
 * @responsibility Render the payments client component
 * @domain Accounting
 */

import { PaymentListClient } from "./components/payment-list-client";

export default function PaymentsPage() {
  return <PaymentListClient />;
}
