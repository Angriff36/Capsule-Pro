import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Megaphone } from "lucide-react";
import { notFound } from "next/navigation";

const CampaignsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Marketing</MonoLabel>
            <DisplayHeading>Campaigns</DisplayHeading>
            <CommandBandLede>
              Create and manage multi-channel marketing campaigns with
              performance tracking.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody />
      </CommandBand>

      <OperationalColumn>
        <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-hairline bg-soft-stone px-6 py-16 text-center">
          <Megaphone className="mb-4 size-10 text-muted-foreground" />
          <h3 className="text-lg font-medium text-ink">
            Campaigns — Coming Soon
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Campaign management features are currently in development. Check
            back soon for multi-channel campaign tools.
          </p>
        </div>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default CampaignsPage;
