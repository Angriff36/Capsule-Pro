"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Building2, Mail, MapPin, MoreVertical, Phone } from "lucide-react";
import { memo } from "react";
import type { CommandBoardCard } from "../../types";

type ClientCardProps = {
  card: CommandBoardCard;
};

const clientTypeConfig = {
  company: {
    label: "Company",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  individual: {
    label: "Individual",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

export const ClientCard = memo(function ClientCard({ card }: ClientCardProps) {
  const metadata = card.metadata as {
    clientType?: string;
    companyName?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    city?: string;
    stateProvince?: string;
  };
  const clientType = metadata.clientType || "company";
  const config =
    clientTypeConfig[clientType as keyof typeof clientTypeConfig] ||
    clientTypeConfig.company;
  const companyName =
    metadata.companyName || (metadata.first_name && metadata.last_name)
      ? `${metadata.first_name} ${metadata.last_name}`
      : "Unknown Client";
  const email = metadata.email;
  const phone = metadata.phone;
  const location = [metadata.city, metadata.stateProvince]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="line-clamp-1 font-semibold text-sm">{companyName}</h3>
        </div>
        <Badge className={config.color} variant="outline">
          {config.label}
        </Badge>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {email && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Mail className="h-3 w-3" />
            <span className="line-clamp-1 max-w-[180px]">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Phone className="h-3 w-3" />
            <span>{phone}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}
      </div>

      {card.content && (
        <p className="mb-3 line-clamp-3 text-muted-foreground text-xs">
          {card.content}
        </p>
      )}

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Client</DropdownMenuItem>
            <DropdownMenuItem>Create Event</DropdownMenuItem>
            <DropdownMenuItem>View History</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
