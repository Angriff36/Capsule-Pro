import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { getTenantIdForOrg } from "../lib/tenant";
import { AvatarStack } from "./components/avatar-stack";
import { Cursors } from "./components/cursors";
import { Header } from "./components/header";

const title = "Acme Inc";
const description = "My application.";
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const CollaborationProvider = dynamic(() =>
  import("./components/collaboration-provider").then(
    (mod) => mod.CollaborationProvider
  )
);

export const metadata: Metadata = {
  title,
  description,
};

const App = async () => {
  const authResult = await auth();
  const orgId = authResult.orgId ?? null;

  if (!orgId) {
    notFound();
  }

  let events: Awaited<ReturnType<typeof database.event.findMany>> = [];
  let dataError: string | null = null;

  try {
    const tenantId = await getTenantIdForOrg(orgId);
    events = await database.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      take: 6,
    });
  } catch (err) {
    dataError =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
  }

  return (
    <>
      <Header page="Data Fetching" pages={["Building Your Application"]}>
        {env.LIVEBLOCKS_SECRET && (
          <CollaborationProvider orgId={orgId}>
            <AvatarStack />
            <Cursors />
          </CollaborationProvider>
        )}
      </Header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {dataError ? (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Database unavailable</p>
            <p className="mt-1 text-muted-foreground">{dataError}</p>
            <p className="mt-2 text-muted-foreground text-xs">
              Neon: use the pooled connection string (dashboard → Connection
              string → Pooled) and ensure the project is not paused.
            </p>
          </div>
        ) : (
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {events.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No events yet.
              </div>
            ) : (
              events.map((event) => (
                <div
                  className="flex flex-col justify-between gap-2 rounded-xl bg-muted/50 p-4"
                  key={`${event.tenantId}-${event.id}`}
                >
                  <div className="font-medium text-sm">{event.title}</div>
                  <div className="text-muted-foreground text-xs">
                    {dateFormatter.format(event.eventDate)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
};

export default App;
