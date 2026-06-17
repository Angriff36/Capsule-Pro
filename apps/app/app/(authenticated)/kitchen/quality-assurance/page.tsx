import { listQACorrectiveActions, listQualityChecks, listTemperatureLogs } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { AlertTriangle, ClipboardCheck, Thermometer } from "lucide-react";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import {
  ChecksTabContent,
  CorrectiveActionsTabContent,
  TemperatureTabContent,
} from "./qa-actions-client";

const QualityAssurancePage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const qualityChecksRaw = (await listQualityChecks()).data;

  const temperatureLogsRaw = (await listTemperatureLogs()).data;

  const correctiveActionsRaw = (await listQACorrectiveActions()).data;

  const qualityChecks = qualityChecksRaw.map((qc) => ({
    id: qc.id,
    checkType: qc.checkType,
    title: qc.title,
    status: qc.status,
    completedAt: qc.completedAt?.toISOString() ?? null,
    scheduledAt: qc.scheduledAt?.toISOString() ?? null,
    items: qc.items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      criterion: item.criterion,
    })),
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
