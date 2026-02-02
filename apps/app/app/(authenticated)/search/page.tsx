import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound, redirect } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";

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
    orderBy: [{ event_date: "desc" }, { created_at: "desc" }],
    take: 12,
  });

  return (
    <>
      <Header page="Search" pages={["Building Your Application"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {events.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No matching events.
            </div>
          ) : (
            events.map((event) => (
              <div
                className="flex flex-col justify-between gap-2 rounded-xl bg-muted/50 p-4"
                key={`${event.tenant_id}-${event.id}`}
              >
                <div className="font-medium text-sm">{event.title}</div>
                <div className="text-muted-foreground text-xs">
                  {dateFormatter.format(event.event_date)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
};

export default SearchPage;
