import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound, redirect } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

type SearchPageProperties = {
  searchParams: Promise<{
    q: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export const generateMetadata = async ({
  searchParams,
}: SearchPageProperties) => {
  const { q } = await searchParams;

  return {
    title: `${q} - Search results`,
    description: `Search results for ${q}`,
  };
};

const SearchPage = async ({ searchParams }: SearchPageProperties) => {
  const { q } = await searchParams;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  if (!q) {
    redirect("/");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const events = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          eventNumber: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          venueName: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    take: 12,
  });

  return (
    <>
      <Header page="Search" pages={["Building Your Application"]} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
          <p className="text-muted-foreground">
            Showing results for "{q}"
          </p>
        </div>

        <Separator />

        {/* Search Results Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Events ({events.length})
          </h2>
          {events.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No matching events found.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid auto-rows-min gap-6 md:grid-cols-3">
              {events.map((event) => (
                <Card key={`${event.tenantId}-${event.id}`} asChild>
                  <Link href={`/events/${event.id}`}>
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-2">
                        {event.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        {dateFormatter.format(event.eventDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {event.venueName}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default SearchPage;
