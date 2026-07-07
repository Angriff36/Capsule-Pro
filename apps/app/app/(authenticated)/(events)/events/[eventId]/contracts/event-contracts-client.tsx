"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  AlertCircleIcon,
  CalendarIcon,
  FileTextIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  sent: "default",
  signed: "default",
  active: "default",
  expired: "destructive",
  cancelled: "secondary",
  canceled: "secondary",
  terminated: "destructive",
};

const statusColorMap: Record<string, string> = {
  draft: "text-gray-600 dark:text-gray-400",
  sent: "text-blue-600 dark:text-blue-400",
  signed: "text-green-600 dark:text-green-400",
  active: "text-green-600 dark:text-green-400",
  expired: "text-yellow-600 dark:text-yellow-400",
  cancelled: "text-red-600 dark:text-red-400",
  canceled: "text-red-600 dark:text-red-400",
  terminated: "text-red-600 dark:text-red-400",
};

interface SerializedContract {
  client: { id: string; name: string } | null;
  contractNumber: string | null;
  createdAt: string;
  documentType: string | null;
  documentUrl: string | null;
  expiresAt: string | null;
  id: string;
  notes: string | null;
  status: string;
  title: string;
  updatedAt: string;
}

interface EventContractsClientProps {
  contracts: SerializedContract[];
  eventId: string;
  eventLabel: string;
}

export function EventContractsClient({
  contracts,
  eventId,
  eventLabel,
}: EventContractsClientProps) {
  if (contracts.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileTextIcon />
          </EmptyMedia>
          <EmptyTitle>No contracts found for this event</EmptyTitle>
          <EmptyDescription>
            Contracts created for {eventLabel} will appear here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Badge asChild variant="outline">
            <Link href={`/events/contracts?eventId=${eventId}`}>
              Create a Contract
            </Link>
          </Badge>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {contracts.map((contract) => (
        <Link
          className="group"
          href={`/events/contracts/${contract.id}`}
          key={contract.id}
        >
          <Card
            className="h-full transition hover:border-primary/40"
            tone="canvas"
          >
            <CardHeader className="gap-2">
              <div className="flex items-start justify-between gap-2">
                <CardDescription className="flex items-center gap-1.5">
                  <FileTextIcon className="size-4" />
                  <span className="truncate">
                    {contract.contractNumber ?? "No contract number"}
                  </span>
                </CardDescription>
                <Badge
                  className={
                    statusColorMap[contract.status.toLowerCase()] || ""
                  }
                  variant={
                    statusVariantMap[contract.status.toLowerCase()] || "outline"
                  }
                >
                  {contract.status}
                </Badge>
              </div>
              <CardTitle className="line-clamp-2 text-lg">
                {contract.title}
              </CardTitle>
              {contract.notes && (
                <CardDescription className="line-clamp-2">
                  {contract.notes}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {contract.client && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="size-4 shrink-0" />
                  <span className="truncate">{contract.client.name}</span>
                </div>
              )}
              {contract.expiresAt && (
                <div
                  className={`flex items-center gap-2 ${
                    contract.status.toLowerCase() === "expired" ||
                    (
                      new Date(contract.expiresAt) < new Date() &&
                        contract.status.toLowerCase() !== "signed"
                    )
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>
                    Expires:{" "}
                    {dateFormatter.format(new Date(contract.expiresAt))}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="size-4 shrink-0" />
                <span>
                  Created: {dateFormatter.format(new Date(contract.createdAt))}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
