import { auth } from "@repo/auth/server";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Megaphone } from "lucide-react";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";

const CampaignsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header
        page="Campaigns"
        pages={[{ href: "/marketing", label: "Marketing" }]}
      />

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your multi-channel marketing campaigns
          </p>
        </div>

        <Separator />

        <Empty>
          <EmptyMedia>
            <Megaphone className="h-16 w-16 text-muted-foreground/50" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Campaigns — Coming Soon</EmptyTitle>
            <EmptyDescription>
              Campaign management features are currently in development.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
};

export default CampaignsPage;
