import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { AvatarStack } from "./components/avatar-stack";
import { Cursors } from "./components/cursors";
import { Header } from "./components/header";
import { getTenantIdForOrg } from "../lib/tenant";

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
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const events = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    take: 6,
  });

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
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
};

export default App;
