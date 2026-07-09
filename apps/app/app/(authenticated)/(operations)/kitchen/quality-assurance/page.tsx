import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { AlertTriangle, ClipboardCheck, Thermometer } from "lucide-react";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { ChecksTabContent } from "./checks-tab";
import {
  CorrectiveActionsTabContent,
  TemperatureTabContent,
} from "./qa-actions-client";

const QualityAssurancePage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Checks tab is Manifest-first: list the same QACheck rows that New Check creates.
  // Temperature / Corrective tabs still read legacy tables until those tabs are migrated.
  const qaChecksRaw = await database.qACheck.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const temperatureLogsRaw = await database.temperatureLog.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { loggedAt: "desc" },
    take: 10,
  });

  const correctiveActionsRaw = await database.correctiveAction.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const qualityChecks = qaChecksRaw.map((qc) => ({
    id: qc.id,
    checkType: qc.checkType,
    location: qc.location,
    inspector: qc.inspector,
    result: qc.result,
    status: qc.status,
    notes: qc.notes ?? "",
    completedAt: qc.completedAt?.toISOString() ?? null,
  }));

  const temperatureLogs = temperatureLogsRaw.map((log) => ({
    id: log.id,
    logType: log.logType,
    temperature: Number(log.temperature),
    unit: log.unit,
    withinRange: log.withinRange,
    itemName: log.itemName,
    loggedAt: log.loggedAt.toISOString(),
  }));

  const correctiveActions = correctiveActionsRaw.map((action) => ({
    id: action.id,
    title: action.title,
    status: action.status,
    severity: action.severity,
    dueDate: action.dueDate?.toISOString() ?? null,
  }));

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Quality Assurance</h1>
          <p className="text-muted-foreground">
            HACCP compliance and food safety monitoring
          </p>
        </div>
      </div>

      <Tabs className="space-y-4" defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Quality Checks ({qualityChecks.length})
          </TabsTrigger>
          <TabsTrigger value="temperature">
            <Thermometer className="mr-2 h-4 w-4" />
            Temperature Logs ({temperatureLogs.length})
          </TabsTrigger>
          <TabsTrigger value="corrective">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Corrective Actions ({correctiveActions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="checks">
          <ChecksTabContent qualityChecks={qualityChecks} />
        </TabsContent>

        <TabsContent className="space-y-4" value="temperature">
          <TemperatureTabContent temperatureLogs={temperatureLogs} />
        </TabsContent>

        <TabsContent className="space-y-4" value="corrective">
          <CorrectiveActionsTabContent correctiveActions={correctiveActions} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QualityAssurancePage;
