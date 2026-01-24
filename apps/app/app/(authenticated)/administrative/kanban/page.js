Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
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
const priorityVariant = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};
const AdministrativeKanbanPage = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Administrative
        </p>
        <h1 className="text-2xl font-semibold">Operational Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Keep critical cross-functional requests visible and moving.
        </p>
      </div>
      <button_1.Button className="gap-2" variant="outline">
        Add board item
      </button_1.Button>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kanbanColumns.map((column) => (
        <card_1.Card className="flex h-full flex-col" key={column.title}>
          <card_1.CardHeader>
            <card_1.CardTitle>{column.title}</card_1.CardTitle>
            <card_1.CardDescription>
              {column.description}
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-3 overflow-hidden">
            {column.tasks.map((task) => (
              <div
                className="flex flex-col gap-2 rounded-md border border-border/50 bg-card/50 p-3"
                key={task.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold leading-tight">
                    {task.title}
                  </h2>
                  <badge_1.Badge className="uppercase">
                    {task.badge}
                  </badge_1.Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{task.owner}</span>
                  <span>Due {task.due}</span>
                </div>
                <div
                  className={`w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${priorityVariant[task.priority]}`}
                >
                  {task.priority} priority
                </div>
              </div>
            ))}
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>
  </div>
);
exports.default = AdministrativeKanbanPage;
