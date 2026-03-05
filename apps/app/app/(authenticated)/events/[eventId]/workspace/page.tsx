import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { EventWorkspaceClient } from "./workspace-client";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function isEventIdUuid(value: string): boolean {
  return EVENT_ID_UUID_REGEX.test(value);
}

interface WorkspacePageProps {
  params: Promise<{
    eventId: string;
  }>;
}

/**
 * Event Workspace Page
 *
 * Collaborative workspace for event planning with real-time task lists,
 * document collaboration, team chat, and activity streams.
 */
const WorkspacePage = async ({ params }: WorkspacePageProps) => {
  const { eventId } = await params;
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    notFound();
  }

  if (!isEventIdUuid(eventId)) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!tenantId) {
    notFound();
  }

  // Fetch event and workspace data
  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
      deletedAt: null,
    },
  });

  if (!event) {
    notFound();
  }

  // Get or create workspace
  let workspace = await database.eventWorkspace.findFirst({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  // Auto-create workspace if it doesn't exist
  if (!workspace) {
    workspace = await database.eventWorkspace.create({
      data: {
        tenantId,
        eventId,
        name: `${event.title} - Workspace`,
        description: `Collaborative workspace for ${event.title}`,
        createdBy: userId,
        members: {
          create: {
            tenantId,
            userId,
            role: "owner",
            status: "active",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  // Get users for assignment dropdown
  const users = await database.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
    orderBy: {
      firstName: "asc",
    },
    take: 50,
  });

  return (
    <>
      <Header
        page={`${event.title} — Workspace`}
        pages={[
          { label: "Events", href: "/events" },
          { label: event.title, href: `/events/${eventId}` },
        ]}
      >
        <div className="flex items-center gap-2">
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href={`/events/${eventId}`}
          >
            Back to Event
          </a>
        </div>
      </Header>
      <EventWorkspaceClient
        event={{
          id: event.id,
          title: event.title,
          eventDate: event.eventDate,
          status: event.status,
        }}
        tenantId={tenantId}
        userId={userId}
        users={users.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          email: u.email,
          avatarUrl: u.avatarUrl,
        }))}
        workspace={{
          id: workspace.id,
          name: workspace.name,
          description: workspace.description ?? "",
          isPublic: workspace.isPublic,
          status: workspace.status,
          layoutConfig:
            (workspace.layoutConfig as Record<string, unknown> | null) ??
            undefined,
          members: workspace.members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            name: `${m.user.firstName} ${m.user.lastName}`.trim(),
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
            role: m.role,
            status: m.status,
          })),
        }}
      />
    </>
  );
};

export default WorkspacePage;
