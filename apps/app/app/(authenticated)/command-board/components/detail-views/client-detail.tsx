"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Building2, ExternalLink, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import type { ResolvedClient } from "../../types/entities";

// ============================================================================
// Client Detail View
// ============================================================================

interface ClientDetailProps {
  data: ResolvedClient;
}

/** Client type display config */
const clientTypeConfig = {
  company: { label: "Company", icon: Building2 },
  individual: { label: "Individual", icon: User },
} as const satisfies Record<string, { label: string; icon: typeof Building2 }>;

export function ClientDetail({ data }: ClientDetailProps) {
  const typeConfig =
    clientTypeConfig[data.clientType as keyof typeof clientTypeConfig] ??
    clientTypeConfig.company;

  const displayName =
    data.companyName ??
    (`${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() ||
      "Unknown Client");

  return (
    <div className="space-y-4">
      {/* Client Type Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">{typeConfig.label}</Badge>
      </div>

      <Separator />

      {/* Name */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <User className="size-4 text-muted-foreground" />
          Name
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          {data.companyName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{data.companyName}</span>
            </div>
          )}
          {(data.firstName || data.lastName) && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">
                {`${data.firstName ?? ""} ${data.lastName ?? ""}`.trim()}
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Contact Info */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Mail className="size-4 text-muted-foreground" />
          Contact
        </h4>
        <div className="space-y-2 pl-6 text-sm">
          {data.email && (
            <div className="flex items-center gap-2">
              <Mail className="size-3.5 text-muted-foreground" />
              <span>{data.email}</span>
            </div>
          )}
          {data.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 text-muted-foreground" />
              <span>{data.phone}</span>
            </div>
          )}
          {data.email == null && data.phone == null && (
            <p className="text-muted-foreground">No contact info available</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Open Full Page */}
      <Button asChild className="w-full" variant="outline">
        <Link href={`/crm/clients/${data.id}`}>
          <ExternalLink className="mr-2 size-4" />
          Open in CRM
        </Link>
      </Button>
    </div>
  );
}
