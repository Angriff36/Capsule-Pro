import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { OptimizationDashboard } from "./optimization-client";
import { BrainCircuitIcon } from "lucide-react";

export default async function WorkforceOptimizationPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Scheduling</MonoLabel>
            <div className="flex items-center gap-3">
              <DisplayHeading>Workforce Optimization</DisplayHeading>
              <Badge variant="outline" className="gap-1 text-xs">
                <BrainCircuitIcon className="h-3 w-3" />
                AI-Powered
              </Badge>
            </div>
            <CommandBandLede>
              AI-driven schedule optimization, performance prediction, and workforce
              analytics. Analyze trends, identify risks, and optimize shift
              assignments.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <PageBody>
        <OptimizationDashboard tenantId={tenantId} />
      </PageBody>
    </PageCanvas>
  );
}
