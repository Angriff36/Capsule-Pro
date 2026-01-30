import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { ReportEditorClient } from "./report-editor-client";

type PageProps = {
  params: Promise<{ reportId: string }>;
};

const EventReportDetailPage = async ({ params }: PageProps) => {
  const { orgId } = await auth();
  const { reportId } = await params;

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const report = await database.event_reports.findFirst({
    where: {
      id: reportId,
      tenant_id: tenantId,
      deleted_at: null,
    },
  });

  if (!report) {
    notFound();
  }

  const event = await database.events.findFirst({
    where: {
      tenant_id: tenantId,
      id: report.event_id,
      deleted_at: null,
    },
    select: {
      id: true,
      event_number: true,
      title: true,
      event_date: true,
      venue_name: true,
      venue_address: true,
      guest_count: true,
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <>
      <Header
        page={event.title || "Event Report"}
        pages={["Events", "Reports"]}
      />
      <div className="flex flex-1 flex-col p-4 pt-0">
        <ReportEditorClient
          event={{
            id: event.id,
            eventNumber: event.event_number,
            title: event.title,
            eventDate: event.event_date.toISOString(),
            venueName: event.venue_name,
            venueAddress: event.venue_address,
            guestCount: event.guest_count,
          }}
          report={{
            id: report.id,
            eventId: report.event_id,
            status: report.status,
            completion: report.completion,
            checklistData: report.report_config as Record<string, unknown>,
            autoFillScore: report.auto_fill_score,
            reviewNotes: null,
            createdAt: report.created_at.toISOString(),
            updatedAt: report.updated_at.toISOString(),
          }}
        />
      </div>
    </>
  );
};

export default EventReportDetailPage;
