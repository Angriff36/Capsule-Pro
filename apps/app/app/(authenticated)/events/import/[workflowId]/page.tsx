import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { Header } from "../../../components/header";
import { WorkflowDetailClient } from "./workflow-detail-client";

export default async function ImportWorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { orgId, userId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  const { workflowId } = await params;

  return (
    <>
      <Header
        page="Import Workflow"
        pages={[
          { label: "Events", href: "/events" },
          { label: "Import", href: "/events/import" },
        ]}
      >
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/events/import">Back to Import</Link>
          </Button>
        </div>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <WorkflowDetailClient workflowId={workflowId} />
      </div>
    </>
  );
}
