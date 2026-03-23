import { requireCurrentUser, getTenantId } from "@/lib/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardCheck, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Plus
} from "lucide-react";

export default function QualityAssurancePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quality Assurance</h1>
          <p className="text-muted-foreground">HACCP compliance and food safety monitoring</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Check
        </Button>
      </div>

      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Quality Checks
          </TabsTrigger>
          <TabsTrigger value="temperature">
            <Thermometer className="h-4 w-4 mr-2" />
            Temperature Logs
          </TabsTrigger>
          <TabsTrigger value="corrective">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Corrective Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          <QualityChecksTab />
        </TabsContent>

        <TabsContent value="temperature" className="space-y-4">
          <TemperatureLogsTab />
        </TabsContent>

        <TabsContent value="corrective" className="space-y-4">
          <CorrectiveActionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QualityChecksTab() {
  const checkTypes = [
    { type: "receiving", label: "Receiving", description: "Inspect incoming deliveries" },
    { type: "storage", label: "Storage", description: "Verify proper storage conditions" },
    { type: "prep", label: "Prep", description: "Monitor food preparation" },
    { type: "cooking", label: "Cooking", description: "Verify cooking temperatures" },
    { type: "cooling", label: "Cooling", description: "Track cooling times and temps" },
    { type: "holding", label: "Holding", description: "Monitor hot/cold holding" },
    { type: "transport", label: "Transport", description: "Verify transport conditions" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {checkTypes.map((ct) => (
        <Card key={ct.type} className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              {ct.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{ct.description}</p>
            <div className="mt-3 flex gap-2">
              <Badge variant="outline">0 pending</Badge>
              <Badge variant="secondary">0 today</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TemperatureLogsTab() {
  const logTypes = [
    { type: "cooler", label: "Cooler", temp: "35-38°F", icon: "❄️" },
    { type: "freezer", label: "Freezer", temp: "-10 to 0°F", icon: "🧊" },
    { type: "hot_hold", label: "Hot Hold", temp: "135°F+", icon: "🔥" },
    { type: "cooking", label: "Cooking", temp: "Varies", icon: "🍳" },
    { type: "receiving", label: "Receiving", temp: "Check specs", icon: "📦" },
    { type: "cooling", label: "Cooling", temp: "70°F in 2hr", icon: "⬇️" },
  ];

  const recentLogs = [
    { id: 1, type: "cooler", temp: "36°F", time: "10:30 AM", status: "ok" },
    { id: 2, type: "freezer", temp: "-5°F", time: "10:25 AM", status: "ok" },
    { id: 3, type: "hot_hold", temp: "142°F", time: "10:20 AM", status: "ok" },
    { id: 4, type: "cooler", temp: "41°F", time: "9:45 AM", status: "warning" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {logTypes.map((lt) => (
          <Card key={lt.type}>
            <CardContent className="pt-4">
              <div className="text-2xl mb-1">{lt.icon}</div>
              <div className="font-medium">{lt.label}</div>
              <div className="text-xs text-muted-foreground">{lt.temp}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Temperature Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Thermometer className={`h-4 w-4 ${log.status === 'warning' ? 'text-yellow-500' : 'text-green-500'}`} />
                  <span className="font-medium capitalize">{log.type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono">{log.temp}</span>
                  <span className="text-sm text-muted-foreground">{log.time}</span>
                  {log.status === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CorrectiveActionsTab() {
  const actions = [
    { 
      id: 1, 
      severity: "critical", 
      title: "Cooler temperature exceeded threshold",
      status: "open",
      assignedTo: "Kitchen Manager",
      dueDate: "Today"
    },
    { 
      id: 2, 
      severity: "high", 
      title: "Missing temperature log for morning receiving",
      status: "in_progress",
      assignedTo: "Prep Cook",
      dueDate: "Today"
    },
    { 
      id: 3, 
      severity: "medium", 
      title: "Calibrate thermometer",
      status: "resolved",
      assignedTo: "Maintenance",
      dueDate: "Completed"
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "warning";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "verified": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge variant="destructive">1 Critical</Badge>
        <Badge variant="warning">1 High</Badge>
        <Badge variant="secondary">1 Medium</Badge>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <Card key={action.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(action.status)}
                    <span className="font-medium">{action.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Assigned: {action.assignedTo}</span>
                    <span>Due: {action.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(action.severity) as any}>
                    {action.severity}
                  </Badge>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
