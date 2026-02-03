import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";

const statusVariantMap = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  approved: "default",
} as const;

const statusLabelMap = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  approved: "Approved",
} as const;

const EventReportsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch reports
  const reports = await database.eventReport.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // Fetch events for reports
  const eventIds = reports.map((report) => report.eventId);
  const events = await database.event.findMany({
    where: {
      tenantId,
      id: { in: eventIds },
      deletedAt: null,
    },
    select: {
      id: true,
      eventNumber: true,
      title: true,
      eventDate: true,
    },
  });

  // Create a map for quick lookup
  const eventMap = new Map(events.map((e) => [e.id, e]));

  // Combine reports with their events
  const reportsWithEvents = reports.map((report) => ({
    ...report,
    event: eventMap.get(report.eventId) ?? null,
  }));

  // Calculate stats
  const _draftCount = reportsWithEvents.filter(
    (r) => r.status === "draft"
  ).length;
  const inProgressCount = reportsWithEvents.filter(
    (r) => r.status === "in_progress"
  ).length;
  const completedCount = reportsWithEvents.filter(
    (r) => r.status === "completed" || r.status === "approved"
  ).length;
  const avgCompletion =
    reportsWithEvents.length > 0
      ? Math.round(
          reportsWithEvents.reduce((sum, r) => sum + r.completion, 0) /
            reportsWithEvents.length
        )
      : 0;

  return (
    <>
      <Header page="Event Reports" pages={["Events"]}>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/events">
              <ClipboardList className="mr-2 size-4" />
              Events
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/events/battle-boards">Battle Boards</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/events/import">Import</Link>
          </Button>
        </div>
      </Header>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Event Reports</h1>
          <p className="text-muted-foreground">
            Pre-Event Review checklists for upcoming events
          </p>
        </div>

        <Separator />

        {/* Performance Overview Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Performance Overview
          </h2>
          <div className="grid gap-6 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Reports</CardDescription>
              <CardTitle className="text-2xl">
                {reportsWithEvents.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Pre-Event Review checklists
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-2xl">{inProgressCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm flex items-center gap-1">
              <Clock3 className="size-3.5" />
              Needs attention
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl">{completedCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              Ready for event
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Avg. Completion</CardDescription>
              <CardTitle className="text-2xl">{avgCompletion}%</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Across all reports
            </CardContent>
          </Card>
        </div>
        </section>

        {/* Reports List Section */}
        {reportsWithEvents.length === 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Reports
            </h2>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>No event reports yet</EmptyTitle>
                <EmptyDescription>
                  Import an event PDF to auto-generate a Pre-Event Review
                  checklist, or create one manually from an existing event.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href="/events/import">
                    <Plus className="mr-2 size-4" />
                    Import Event
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Reports ({reportsWithEvents.length})
            </h2>
            <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {reportsWithEvents.map((report) => (
              <Link
                className="group"
                href={`/events/reports/${report.id}`}
                key={report.id}
              >
                <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                  <CardHeader className="gap-1">
                    <CardDescription className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {report.event?.eventNumber ?? report.eventId}
                      </span>
                      <Badge
                        className="capitalize"
                        variant={
                          statusVariantMap[
                            report.status as keyof typeof statusVariantMap
                          ] ?? "outline"
                        }
                      >
                        {statusLabelMap[
                          report.status as keyof typeof statusLabelMap
                        ] ?? report.status}
                      </Badge>
                    </CardDescription>
                    <CardTitle className="text-lg">
                      {report.event?.title ?? report.eventId}
                    </CardTitle>
                    <CardDescription>
                      {report.event?.eventDate
                        ? new Date(report.event.eventDate).toLocaleDateString(
                            "en-US",
                            { dateStyle: "medium" }
                          )
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{report.completion}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${report.completion}%` }}
                      />
                    </div>
                    {report.autoFillScore !== null && (
                      <div className="text-sm text-muted-foreground">
                        Auto-filled: {report.autoFillScore} questions
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default EventReportsPage;
