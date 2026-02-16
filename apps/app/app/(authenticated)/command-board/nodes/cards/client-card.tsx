"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { Building2, Mail, Phone, User } from "lucide-react";
import { memo } from "react";
import type { ResolvedClient } from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface ClientNodeCardProps {
  data: ResolvedClient;
  stale: boolean;
}

const clientTypeConfig = {
  company: { label: "Company", icon: Building2 },
  individual: { label: "Individual", icon: User },
} as const satisfies Record<string, { label: string; icon: typeof Building2 }>;

export const ClientNodeCard = memo(function ClientNodeCard({
  data,
  stale,
}: ClientNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.client;
  const typeConfig =
    clientTypeConfig[data.clientType as keyof typeof clientTypeConfig] ??
    clientTypeConfig.company;
  const TypeIcon = typeConfig.icon;

  const displayName =
    data.companyName ??
    (`${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() ||
      "Unknown Client");

  return (
    <div className={cn("flex h-full flex-col", stale && "opacity-50")}>
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TypeIcon className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>
            Client
          </span>
        </div>
        <Badge className="text-xs" variant="outline">
          {typeConfig.label}
        </Badge>
      </div>

      {/* Name */}
      <h3 className="mb-1.5 line-clamp-2 font-semibold text-sm leading-tight">
        {displayName}
      </h3>

      {/* Contact details */}
      <div className="space-y-1">
        {data.email && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="size-3 shrink-0" />
            <span className="line-clamp-1 text-xs">{data.email}</span>
          </div>
        )}
        {data.phone && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="size-3 shrink-0" />
            <span className="text-xs">{data.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
});
