import { redirect } from "next/navigation";

/**
 * Redirect /contracts → /events/contracts
 *
 * Bug #11: Direct URL /contracts crashed because no top-level route existed.
 * Contracts live under /events/contracts, so this redirects users who
 * navigate directly to /contracts.
 */
export default function ContractsRedirectPage() {
  redirect("/events/contracts");
}
