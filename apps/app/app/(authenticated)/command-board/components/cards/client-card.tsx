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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";
import type { ClientEntityData } from "../../actions/entity-data";
import { getEntityData } from "../../actions/entity-data";
import type { CommandBoardCard } from "../../types";

interface ClientCardProps {
  card: CommandBoardCard;
}

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
  const router = useRouter();
  const [entityData, setEntityData] = useState<ClientEntityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live entity data if card is linked to an entity
  useEffect(() => {
    if (card.entityType === "client" && card.entityId) {
      setIsLoading(true);
      getEntityData("client", card.entityId)
        .then((data) => {
          if (data && data.entityType === "client") {
            setEntityData(data);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [card.entityId, card.entityType]);

  // Use live data if available, otherwise fall back to metadata (for backwards compatibility)
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

  const clientType = entityData?.clientType ?? metadata.clientType ?? "company";
  const config =
    clientTypeConfig[clientType as keyof typeof clientTypeConfig] ||
    clientTypeConfig.company;
  const companyName =
    entityData?.companyName ??
    metadata.companyName ??
    (entityData?.firstName && entityData?.lastName
      ? `${entityData.firstName} ${entityData.lastName}`
      : metadata.first_name && metadata.last_name
        ? `${metadata.first_name} ${metadata.last_name}`
        : "Unknown Client");
  const email = entityData?.email ?? metadata.email;
  const phone = entityData?.phone ?? metadata.phone;
  const location = [
    entityData?.city ?? metadata.city,
    entityData?.stateProvince ?? metadata.stateProvince,
  ]
    .filter(Boolean)
    .join(", ");

  const isLinked = !!card.entityId && card.entityType === "client";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {isLinked ? (
            <Link
              className="hover:underline"
              href={`/crm/clients/${card.entityId}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="line-clamp-1 font-semibold text-sm">
                {companyName}
              </h3>
            </Link>
          ) : (
            <h3 className="line-clamp-1 font-semibold text-sm">
              {companyName}
            </h3>
          )}
          {isLinked && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Live
            </span>
          )}
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
            {isLinked ? (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/crm/clients/${card.entityId}`);
                  }}
                >
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/crm/clients/${card.entityId}/edit`);
                  }}
                >
                  Edit Client
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/new?clientId=${card.entityId}`);
                  }}
                >
                  Create Event
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                <DropdownMenuItem disabled>Edit Client</DropdownMenuItem>
                <DropdownMenuItem disabled>Create Event</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem disabled>View History</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
