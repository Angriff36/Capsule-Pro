/**
 * Command Performance (developer/admin dashboard)
 *
 * Per-command latency percentiles (P50/P95/P99) for governed Manifest commands,
 * ranked by P95 so the slowest commands surface first. Backed by the
 * `duration_ms` the runtime dispatcher records for every settled command in the
 * append-only `reaction_logs` table — aggregated on demand with Postgres'
 * `percentile_cont`. Read-only: this surface never mutates governed state.
 */

import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { OperationalPageShell } from "@/app/(authenticated)/components/operational-page-shell";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { CommandPerfClient } from "./command-perf-client";

export const metadata = {
  title: "Command Performance",
  description:
    "P50/P95/P99 latency per governed command, ranked by P95, with slow-command alerts.",
};

export default async function CommandPerfPage() {
  const { orgId, userId } = await auth();

  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!tenantId) {
    redirect("/");
  }

  return (
    <OperationalPageShell
      description="Latency percentiles for every governed command, ranked by P95 — the slowest commands rise to the top so optimization becomes a ranked list instead of guesswork."
      eyebrow="Tools / Performance"
      title="Command performance"
    >
      <CommandPerfClient />
    </OperationalPageShell>
  );
}
