import { auth } from "@repo/auth/server";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Prisma, database } from "@repo/database";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
import { attachEventImport, deleteEvent, updateEvent } from "../actions";
import { EventImportsViewer } from "../components/event-imports-viewer";
import { EventForm } from "../components/event-form";
import { getTenantIdForOrg } from "../../../lib/tenant";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

const EventDetailsPage = async ({ params }: EventDetailsPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });

  if (!event || event.deletedAt) {
    notFound();
  }

  const prepTasks = await database.$queryRaw<
    {
      id: string;
      name: string;
      status: string;
      quantity_total: number;
      servings_total: number | null;
      due_by_date: Date;
      is_event_finish: boolean;
    }[]
  >(
    Prisma.sql`
      SELECT id,
             name,
             status,
             quantity_total,
             servings_total,
             due_by_date,
             is_event_finish
      FROM tenant_kitchen.prep_tasks
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
      ORDER BY due_by_date ASC, created_at ASC
    `,
  );

  const imports = await database.$queryRaw<
    {
      id: string;
      file_name: string;
      mime_type: string;
      file_size: number;
      created_at: Date;
    }[]
  >(
    Prisma.sql`
      SELECT id,
             file_name,
             mime_type,
             file_size,
             created_at
      FROM tenant_events.event_imports
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
      ORDER BY created_at DESC
    `,
  );

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  });

  return (
    <>
      <Header page={event.title} pages={["Operations", "Events"]}>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/events">Back to events</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/events/import">Import new</Link>
          </Button>
        </div>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <EventForm action={updateEvent} event={event} submitLabel="Save changes" />
        <Collapsible className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="text-sm font-semibold">Source documents</div>
              <div className="text-muted-foreground text-sm">
                {imports.length} files attached
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                View files
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            <form action={attachEventImport} className="flex flex-col gap-3">
              <input name="eventId" type="hidden" value={event.id} />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  accept=".csv,.pdf,image/*"
                  className="text-sm"
                  name="file"
                  required
                  type="file"
                />
                <Button type="submit" variant="secondary">
                  Attach file
                </Button>
              </div>
            </form>
            <Separator className="my-4" />
            {imports.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No source files yet.
              </div>
            ) : (
              <EventImportsViewer imports={imports} />
            )}
          </CollapsibleContent>
        </Collapsible>
        <Collapsible className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="text-sm font-semibold">Prep tasks</div>
              <div className="text-muted-foreground text-sm">
                {prepTasks.length} tasks linked to this event
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                View tasks
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            {prepTasks.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No prep tasks yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {prepTasks.map((task) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"
                    key={task.id}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{task.name}</span>
                      <span className="text-muted-foreground text-xs">
                        Due {dateFormatter.format(new Date(task.due_by_date))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.is_event_finish ? (
                        <Badge variant="outline">Finish</Badge>
                      ) : null}
                      <Badge className="capitalize" variant="secondary">
                        {task.status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {task.servings_total ?? Math.round(task.quantity_total)}
                        {task.servings_total ? " servings" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        <form action={deleteEvent} className="flex justify-end">
          <input name="eventId" type="hidden" value={event.id} />
          <Button type="submit" variant="destructive">
            Delete event
          </Button>
        </form>
      </div>
    </>
  );
};

export default EventDetailsPage;
