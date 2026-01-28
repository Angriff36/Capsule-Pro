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

  const report = await database.eventReport.findFirst({
    where: {
      id: reportId,
      tenantId,
      deletedAt: null,
    },
    include: {
      event: {
        select: {
          id: true,
          eventNumber: true,
          title: true,
          eventDate: true,
          venueName: true,
          venueAddress: true,
          guestCount: true,
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  return (
    <>
      <Header
        page={report.event.title || "Event Report"}
        pages={["Events", "Reports"]}
      />
      <div className="flex flex-1 flex-col p-4 pt-0">
        <ReportEditorClient
          event={{
            id: report.event.id,
            eventNumber: report.event.eventNumber,
            title: report.event.title,
            eventDate: report.event.eventDate.toISOString(),
            venueName: report.event.venueName,
            venueAddress: report.event.venueAddress,
            guestCount: report.event.guestCount,
          }}
          report={{
            id: report.id,
            eventId: report.eventId,
            status: report.status,
            completion: report.completion,
            checklistData: report.checklistData as Record<string, unknown>,
            autoFillScore: report.autoFillScore,
            reviewNotes: report.reviewNotes,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString(),
          }}
        />
      </div>
    </>
  );
};

export default EventReportDetailPage;
