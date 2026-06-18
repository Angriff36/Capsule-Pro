/**
 * Reaction Execution Log (developer/admin dashboard)
 *
 * Tenant-scoped, live audit trail of Manifest runtime command/reaction
 * executions: which reaction fired, what command triggered it, the payload
 * shape, success/failure, and any error message. Backed by the append-only
 * `reaction_logs` table written by the runtime dispatcher.
 */

import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ReactionsLogClient } from "./reactions-log-client";

export const metadata = {
  title: "Reaction Execution Log",
  description:
    "Live audit trail of Manifest reaction and command executions across your organization.",
};

export default async function ReactionsLogPage() {
  const { orgId, userId } = await auth();

  if (!(userId && orgId)) {
    redirect("/login");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!tenantId) {
    redirect("/onboarding");
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-semibold text-2xl tracking-tight">
          Reaction Execution Log
        </h1>
        <p className="mt-2 text-muted-foreground">
          Live trace of every governed command and the reactions it fired —
          which reaction ran, what triggered it, the payload shape, and whether
          it succeeded or silently failed.
        </p>
      </div>

      <ReactionsLogClient tenantId={tenantId} />
    </div>
  );
}
