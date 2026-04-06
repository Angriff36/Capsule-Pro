import { auth } from "@repo/auth/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { Header } from "../components/header";

const MarketingPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header page="Marketing" pages={[]} />

      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">
            Manage multi-channel campaigns, automation, and analytics
          </p>
        </div>

        <Separator />

        <Empty>
          <EmptyMedia>
            <Megaphone className="h-16 w-16 text-muted-foreground/50" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Marketing — Coming Soon</EmptyTitle>
            <EmptyDescription>
              Marketing features including campaigns, channels, and automation
              rules are currently in development.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaigns</CardTitle>
              <CardDescription>
                Multi-channel marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and manage email, SMS, and social media campaigns with
                performance tracking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channels</CardTitle>
              <CardDescription>Communication channels</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure and manage your marketing channels across different
                platforms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Automation</CardTitle>
              <CardDescription>Marketing automation rules</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Set up automated workflows to engage customers at the right
                time.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};

export default MarketingPage;
