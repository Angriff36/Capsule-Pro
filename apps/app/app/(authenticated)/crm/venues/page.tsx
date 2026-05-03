import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Building2, MapPin, Phone, Mail, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const VENUE_TYPE_LABELS: Record<string, string> = {
  banquet_hall: "Banquet Hall",
  hotel: "Hotel",
  restaurant: "Restaurant",
  outdoor: "Outdoor",
  conference_center: "Conference Center",
  residence: "Residence",
  other: "Other",
};

export default async function CrmVenuesPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const venues = await database.venue.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ name: "asc" }],
  });

  const activeCount = venues.filter((v) => v.isActive).length;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">CRM</MonoLabel>
            <DisplayHeading>Venues</DisplayHeading>
            <CommandBandLede>
              Manage venues, capacity, and coordination notes for every site.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/crm">Back to CRM</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader
          count={`${venues.length} venue${venues.length !== 1 ? "s" : ""}`}
          description={`${activeCount} active — registered venues and event sites.`}
          eyebrow="Sites"
          title="Your Venues"
        />

        {venues.length === 0 ? (
          <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 opacity-50" />
            <p className="mt-3 text-ink text-sm leading-relaxed">
              No venues registered yet. Venues are created when you add event
              locations.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div
                className="rounded-[22px] border border-hairline bg-canvas p-5"
                key={venue.id}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink border border-hairline">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{venue.name}</span>
                      <Badge variant="outline">
                        {VENUE_TYPE_LABELS[venue.venueType] || venue.venueType}
                      </Badge>
                      {!venue.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      {venue.city || venue.stateProvince ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[venue.city, venue.stateProvince]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      ) : null}
                      {venue.capacity ? (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {venue.capacity.toLocaleString()} capacity
                        </div>
                      ) : null}
                      {venue.contactName ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {venue.contactName}
                          {venue.contactEmail
                            ? ` (${venue.contactEmail})`
                            : ""}
                        </div>
                      ) : null}
                      {venue.contactPhone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {venue.contactPhone}
                        </div>
                      ) : null}
                    </div>
                    {venue.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {venue.tags.map((tag) => (
                          <Badge
                            className="text-xs"
                            key={tag}
                            variant="secondary"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationalColumn>
    </PageCanvas>
  );
}

export const metadata = {
  title: "Venues",
  description:
    "Manage venues, capacity, and coordination notes for every site.",
};
