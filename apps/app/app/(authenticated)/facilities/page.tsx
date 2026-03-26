import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { 
  Building2, 
  Wrench, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Plus,
  Calendar,
  MapPin
} from "lucide-react";

export default function FacilitiesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Facility Management</h1>
          <p className="text-muted-foreground">Maintenance scheduling, work orders, and preventive care</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      <Tabs defaultValue="work-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-orders">
            <Wrench className="h-4 w-4 mr-2" />
            Work Orders
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Calendar className="h-4 w-4 mr-2" />
            PM Schedules
          </TabsTrigger>
          <TabsTrigger value="areas">
            <MapPin className="h-4 w-4 mr-2" />
            Areas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders" className="space-y-4">
          <WorkOrdersTab />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <PreventiveMaintenanceTab />
        </TabsContent>

        <TabsContent value="areas" className="space-y-4">
          <AreasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkOrdersTab() {
  const workOrders = [
    { 
      id: 1, 
      workOrderNumber: "WO-2026-00001",
      priority: "critical", 
      title: "Walk-in cooler compressor failure",
      status: "in_progress",
      workOrderType: "corrective",
      area: "Main Kitchen",
      assignedTo: "Mike (Maintenance)",
      scheduledDate: "Today"
    },
    { 
      id: 2, 
      workOrderNumber: "WO-2026-00002",
      priority: "high", 
      title: "Dishwasher leaking water",
      status: "open",
      workOrderType: "corrective",
      area: "Main Kitchen",
      assignedTo: null,
      scheduledDate: "Tomorrow"
    },
    { 
      id: 3, 
      workOrderNumber: "WO-2026-00003",
      priority: "medium", 
      title: "Replace HVAC filters",
      status: "completed",
      workOrderType: "preventive",
      area: "All Areas",
      assignedTo: "HVAC Services Inc.",
      scheduledDate: "Completed"
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "warning";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge variant="destructive">1 Critical</Badge>
        <Badge variant="warning">1 High</Badge>
        <Badge variant="secondary">3 Medium</Badge>
        <Badge variant="outline">5 Low</Badge>
      </div>

      <div className="space-y-3">
        {workOrders.map((wo) => (
          <Card key={wo.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(wo.status)}
                    <span className="font-mono text-sm text-muted-foreground">{wo.workOrderNumber}</span>
                    <span className="font-medium">{wo.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {wo.area}
                    </span>
                    <span>Assigned: {wo.assignedTo || "Unassigned"}</span>
                    <span>Due: {wo.scheduledDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityColor(wo.priority) as any}>
                    {wo.priority}
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

function PreventiveMaintenanceTab() {
  const schedules = [
    { 
      id: 1, 
      scheduleNumber: "PM-2026-0001",
      title: "HVAC Filter Replacement",
      frequency: "monthly",
      nextDue: "Mar 25, 2026",
      status: "upcoming",
      assignedTo: "HVAC Services Inc."
    },
    { 
      id: 2, 
      scheduleNumber: "PM-2026-0002",
      title: "Grease Trap Cleaning",
      frequency: "quarterly",
      nextDue: "Apr 1, 2026",
      status: "upcoming",
      assignedTo: "Plumbing Pro"
    },
    { 
      id: 3, 
      scheduleNumber: "PM-2026-0003",
      title: "Fire Suppression Inspection",
      frequency: "semiannual",
      nextDue: "Mar 20, 2026",
      status: "overdue",
      assignedTo: "Fire Safety Co."
    },
  ];

  const frequencyColors: Record<string, string> = {
    daily: "bg-blue-100 text-blue-800",
    weekly: "bg-cyan-100 text-cyan-800",
    monthly: "bg-green-100 text-green-800",
    quarterly: "bg-yellow-100 text-yellow-800",
    semiannual: "bg-orange-100 text-orange-800",
    annual: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge variant="destructive">1 Overdue</Badge>
        <Badge variant="secondary">2 Due This Week</Badge>
        <Badge variant="outline">5 Due This Month</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <Card key={schedule.id} className={schedule.status === "overdue" ? "border-red-300" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{schedule.title}</CardTitle>
                {schedule.status === "overdue" && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="font-mono text-xs text-muted-foreground">{schedule.scheduleNumber}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frequency</span>
                  <span className={`text-xs px-2 py-1 rounded ${frequencyColors[schedule.frequency] || "bg-gray-100"}`}>
                    {schedule.frequency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Due</span>
                  <span className={`text-sm ${schedule.status === "overdue" ? "text-red-600 font-medium" : ""}`}>
                    {schedule.nextDue}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Assigned</span>
                  <span className="text-sm">{schedule.assignedTo}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1">Complete</Button>
                <Button size="sm" variant="outline">Reschedule</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AreasTab() {
  const areas = [
    { id: 1, name: "Main Kitchen", code: "KIT-01", areaType: "kitchen", status: "active", squareFeet: 1200 },
    { id: 2, name: "Prep Area", code: "PREP-01", areaType: "prep", status: "active", squareFeet: 400 },
    { id: 3, name: "Walk-in Cooler", code: "COOL-01", areaType: "storage", status: "active", squareFeet: 300 },
    { id: 4, name: "Dry Storage", code: "STOR-01", areaType: "storage", status: "active", squareFeet: 500 },
    { id: 5, name: "Loading Dock", code: "DOCK-01", areaType: "loading_dock", status: "active", squareFeet: 600 },
  ];

  const areaTypeIcons: Record<string, string> = {
    kitchen: "🍳",
    prep: "🔪",
    storage: "📦",
    dining: "🍽️",
    office: "💼",
    loading_dock: "🚚",
    restroom: "🚻",
    other: "🏢",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="secondary">5 Areas</Badge>
          <Badge variant="outline">3,000 sq ft total</Badge>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Area
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Card key={area.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{areaTypeIcons[area.areaType] || "🏢"}</div>
                <div className="flex-1">
                  <div className="font-medium">{area.name}</div>
                  <div className="text-sm text-muted-foreground">{area.code}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{area.areaType.replace("_", " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{area.squareFeet} sq ft</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
