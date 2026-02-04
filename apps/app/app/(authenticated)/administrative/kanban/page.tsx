import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";

const kanbanColumns = [
  {
    title: "Backlog",
    description: "Requests that need clarification or approval.",
    tasks: [
      {
        id: "kb-1",
        title: "Finalize rehearsal dinner menu",
        owner: "Kara Sinclair",
        due: "Jan 27",
        badge: "Menu",
        priority: "High",
      },
      {
        id: "kb-2",
        title: "Lock in tasting panel for new garnish",
        owner: "Marcus",
        due: "Jan 30",
        badge: "Kitchen",
        priority: "Medium",
      },
    ],
  },
  {
    title: "In Progress",
    description: "Assignments that are actively tracked today.",
    tasks: [
      {
        id: "kb-3",
        title: "Confirm vendor delivery windows",
        owner: "Priya",
        due: "Jan 24",
        badge: "Logistics",
        priority: "High",
      },
      {
        id: "kb-4",
        title: "Staff briefing for command board rollout",
        owner: "Dom",
        due: "Jan 25",
        badge: "Training",
        priority: "Low",
      },
    ],
  },
  {
    title: "Review",
    description: "Pending approval by leadership or clients.",
    tasks: [
      {
        id: "kb-5",
        title: "Approve kitchen waste reduction targets",
        owner: "Mara",
        due: "Jan 26",
        badge: "Sustainability",
        priority: "Medium",
      },
      {
        id: "kb-6",
        title: "Darzi contract amendment for audio",
        owner: "Sanjay",
        due: "Jan 28",
        badge: "Operations",
        priority: "High",
      },
    ],
  },
  {
    title: "Done",
    description: "Closed items from this week.",
    tasks: [
      {
        id: "kb-7",
        title: "Share CPM output with event team",
        owner: "Lena",
        due: "Jan 22",
        badge: "Events",
        priority: "Low",
      },
      {
        id: "kb-8",
        title: "Schedule mobile task training session",
        owner: "Casey",
        due: "Jan 23",
        badge: "Kitchen",
        priority: "Low",
      },
    ],
  },
];

const priorityVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  High: "destructive",
  Medium: "secondary",
  Low: "outline",
};

const AdministrativeKanbanPage = () => (
  <div className="space-y-8">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Operational Kanban
        </h1>
        <p className="text-sm text-muted-foreground">
          Keep critical cross-functional requests visible and moving.
        </p>
      </div>
      <Button className="gap-2" variant="outline">
        Add board item
      </Button>
    </div>

    <Separator />

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kanbanColumns.map((column) => (
        <Card className="flex h-full flex-col" key={column.title}>
          <CardHeader>
            <CardTitle>{column.title}</CardTitle>
            <CardDescription>{column.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 overflow-hidden">
            {column.tasks.map((task) => (
              <div
                className="flex flex-col gap-2 rounded-md border border-border/50 bg-card/50 p-3"
                key={task.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold leading-tight">
                    {task.title}
                  </h2>
                  <Badge className="uppercase">{task.badge}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{task.owner}</span>
                  <span>Due {task.due}</span>
                </div>
                <Badge
                  className="w-fit text-[11px] font-semibold"
                  variant={priorityVariant[task.priority]}
                >
                  {task.priority} priority
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default AdministrativeKanbanPage;
