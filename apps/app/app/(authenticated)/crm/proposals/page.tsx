/**
 * Proposals List Page
 *
 * Displays all proposals with filtering and search capabilities
 */

import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProposalsClient } from "./components/proposals-client";

export const metadata: Metadata = {
  title: "Proposals",
  description: "Manage client proposals and event estimates",
};

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const search = params.search as string | undefined;
  const status = params.status as string | undefined;
  const clientId = params.clientId as string | undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground">
            Manage client proposals and event estimates
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/proposals/new">
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Link>
        </Button>
      </div>

      <Separator />

      <ProposalsClient
        initialClientId={clientId}
        initialPage={page}
        initialSearch={search}
        initialStatus={status}
      />
    </div>
  );
}
