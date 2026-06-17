import { getEventReport, listEvents } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { ReportEditorClient } from "./report-editor-client";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

const EventReportDetailPage = async ({ params }: PageProps) => {
  const { orgId } = await auth();
  const { reportId } = await params;

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  let report;
  try {
    report = await getEventReport(reportId);
  } catch {
    notFound();
  }

  if (!report) {
    notFound();
  }

  let event;
  try {
    event = (await listEvents()).data[0] ?? null;
  } catch {
    notFound();
  }

  if (!event) {
    notFound();
  }

  return (
    <>
      <Header
        page={event.title || event.eventNumber || event.id}
        pages={[
          { label: "Events", href: "/events" },
          { label: "Reports", href: "/events/reports" },
        ]}
      />
      <div className="flex flex-1 flex-col p-4 pt-0">
        <ReportEditorClient
          event={{
            id: event.id,
            eventNumber: event.eventNumber,
            title: event.title,
            eventDate: event.eventDate.toISOString(),
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            guestCount: event.guestCount,
          }}
          report={{
            id: report.id,
            eventId: report.eventId,
            status: report.status,
            completion: report.completion,
            checklistData: report.checklistData as Record<string, unknown>,
            autoFillScore: report.autoFillScore,
            reviewNotes: report.reviewNotes ?? null,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString(),
          }}
        />
      </div>
    </>
  );
};

export default EventReportDetailPage;
