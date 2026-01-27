"use client";

import type {
  User as DbUser,
  KitchenTask,
  KitchenTaskClaim,
} from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Progress } from "@repo/design-system/components/ui/progress";
import { addDays, format, isToday, isYesterday, subDays } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Clock3,
  Flame,
  Lightbulb,
  Plus,
  Search,
  Snowflake,
  Sparkles,
  Sun,
  TrendingUp,
  User as UserIcon,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SuggestionsPanel } from "./components/suggestions-panel";
import { useSuggestions } from "./lib/use-suggestions";
import { TaskCard } from "./task-card";

type UserSelect = Pick<
  DbUser,
  "id" | "firstName" | "lastName" | "email" | "avatarUrl"
>;

type TaskWithRelations = KitchenTask & {
  claims: Array<KitchenTaskClaim & { user: UserSelect | null }>;
};

type ProductionBoardClientProps = {
  initialTasks: TaskWithRelations[];
  currentUserId?: string | null;
  tenantId?: string;
};

const STATIONS = [
  { id: "all", label: "All Stations", icon: UtensilsCrossed },
  { id: "hot-line", label: "Hot Line", icon: Flame },
  { id: "cold-prep", label: "Cold Prep", icon: Snowflake },
  { id: "bakery", label: "Bakery", icon: ChefHat },
];

function formatDateLabel(date: Date): string {
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "EEEE, MMM d");
}

function KitchenClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 font-medium text-slate-600 text-sm">
      <Clock className="h-4 w-4" />
      <span>{format(time, "h:mm:ss a")}</span>
    </div>
  );
}

function WeatherWidget() {
  // Mock weather data - replace with real API in production
  const weather = {
    temp: 72,
    condition: "sunny",
    icon: Sun,
  };

  const Icon = weather.icon;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-1.5 text-amber-500">
        <Icon className="h-5 w-5" />
        <span className="font-semibold text-lg">{weather.temp}</span>
      </div>
      <div className="hidden sm:block">
        <div className="font-medium text-slate-600 text-xs">Sunny</div>
        <div className="text-slate-400 text-xs">Kitchen temp normal</div>
      </div>
    </div>
  );
}

function DateNavigator({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        className="h-8 w-8 rounded-full"
        onClick={() => onDateChange(subDays(selectedDate, 1))}
        size="icon"
        variant="outline"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-slate-100">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-700">
          {formatDateLabel(selectedDate)}
        </span>
      </div>
      <Button
        className="h-8 w-8 rounded-full"
        onClick={() => onDateChange(addDays(selectedDate, 1))}
        size="icon"
        variant="outline"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        className="ml-1 h-8 text-slate-500 hover:text-slate-700"
        onClick={() => onDateChange(new Date())}
        size="sm"
        variant="ghost"
      >
        Today
      </Button>
    </div>
  );
}

function StatsSidebar({
  totalTasks,
  pendingTasks,
  inProgressTasks,
  completedTasks,
  myTasks,
}: {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  myTasks: number;
}) {
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: Circle,
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    },
    {
      label: "Completed",
      value: completedTasks,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      icon: Clock3,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "My Tasks",
      value: myTasks,
      icon: UserIcon,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-semibold text-sm">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            Shift Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Completion Rate</span>
              <span className="font-semibold text-slate-800">
                {completionRate}%
              </span>
            </div>
            <Progress className="h-2" value={completionRate} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stats.slice(0, 2).map((stat) => (
              <div
                className="rounded-lg bg-slate-50 p-3 text-center"
                key={stat.label}
              >
                <div className={`font-bold text-2xl ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-slate-500 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-sm">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.slice(2).map((stat) => (
            <div
              className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50"
              key={stat.label}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-md p-1.5 ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-slate-600 text-sm">{stat.label}</span>
              </div>
              <span className="font-semibold text-slate-800">{stat.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team Activity */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-sm">Team Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4 text-muted-foreground text-sm">
            Team activity tracking coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  currentUserId,
  icon: Icon,
  count,
  iconColor,
}: {
  title: string;
  tasks: TaskWithRelations[];
  currentUserId?: string | null;
  icon: React.ElementType;
  count: number;
  iconColor: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-slate-50/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-slate-700">{title}</h3>
        </div>
        <Badge className="font-medium text-xs" variant="secondary">
          {count}
        </Badge>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-slate-200 border-dashed text-center">
            <Icon className="h-6 w-6 text-slate-300" />
            <p className="mt-2 text-slate-400 text-sm">No tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard currentUserId={currentUserId} key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}

export function ProductionBoardClient({
  initialTasks,
  currentUserId,
  tenantId,
}: ProductionBoardClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStation, setSelectedStation] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Suggestions hook
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
    handleAction,
  } = useSuggestions(tenantId);

  // Fetch suggestions on mount
  useEffect(() => {
    if (tenantId && showSuggestions) {
      fetchSuggestions();
    }
  }, [tenantId, showSuggestions, fetchSuggestions]);

  // Filter tasks by search query and station
  const filteredTasks = initialTasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStation =
      selectedStation === "all" ||
      task.tags.includes(selectedStation.toLowerCase().replace(" ", "-"));

    return matchesSearch && matchesStation;
  });

  // Group tasks by status
  const pendingTasks = filteredTasks.filter(
    (task) => task.status === "pending"
  );
  const inProgressTasks = filteredTasks.filter(
    (task) => task.status === "in_progress"
  );
  const completedTasks = filteredTasks.filter(
    (task) => task.status === "completed"
  );

  // Calculate my tasks
  const myTasks = filteredTasks.filter((task) =>
    task.claims.some(
      (claim) => claim.employeeId === currentUserId && !claim.releasedAt
    )
  );

  const handleCreateTask = useCallback(() => {
    router.push("/kitchen/tasks/new");
  }, [router]);

  const _currentStation = STATIONS.find((s) => s.id === selectedStation);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-slate-200 border-b bg-white/80 backdrop-blur-md">
        <div className="flex flex-col gap-4 px-6 py-4">
          {/* Top Row: Date Navigation and Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DateNavigator
                onDateChange={setSelectedDate}
                selectedDate={selectedDate}
              />
              <div className="hidden sm:block">
                <KitchenClock />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WeatherWidget />
              <Button
                className="gap-2"
                onClick={() => setShowSuggestions((prev) => !prev)}
                size="sm"
                variant={showSuggestions ? "default" : "outline"}
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI Tips</span>
                {suggestions.length > 0 && (
                  <Badge className="ml-1 h-5 px-1" variant="secondary">
                    {suggestions.length}
                  </Badge>
                )}
              </Button>
              <Button
                className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
                onClick={handleCreateTask}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Task</span>
              </Button>
            </div>
          </div>

          {/* Bottom Row: Station Tabs and Search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Station Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
              {STATIONS.map((station) => {
                const Icon = station.icon;
                const isActive = selectedStation === station.id;
                return (
                  <button
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                    key={station.id}
                    onClick={() => setSelectedStation(station.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="xs:inline hidden">{station.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                value={searchQuery}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Task Board */}
          <div className="space-y-6">
            {/* My Tasks Section */}
            {myTasks.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg text-slate-800">
                    My Tasks
                  </h2>
                  <Badge variant="secondary">{myTasks.length} assigned</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {myTasks.map((task) => (
                    <TaskCard
                      currentUserId={currentUserId}
                      key={task.id}
                      task={task}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Kanban Board */}
            <div className="grid gap-4 lg:grid-cols-3">
              <TaskColumn
                count={pendingTasks.length}
                currentUserId={currentUserId}
                icon={Circle}
                iconColor="bg-amber-100 text-amber-600"
                tasks={pendingTasks}
                title="Pending"
              />
              <TaskColumn
                count={inProgressTasks.length}
                currentUserId={currentUserId}
                icon={Clock3}
                iconColor="bg-blue-100 text-blue-600"
                tasks={inProgressTasks}
                title="In Progress"
              />
              <TaskColumn
                count={completedTasks.length}
                currentUserId={currentUserId}
                icon={CheckCircle2}
                iconColor="bg-emerald-100 text-emerald-600"
                tasks={completedTasks}
                title="Completed"
              />
            </div>
          </div>

          {/* Stats Sidebar / Suggestions Panel */}
          <aside className="space-y-4">
            {showSuggestions ? (
              <Card className="border-slate-200 shadow-sm">
                <SuggestionsPanel
                  isLoading={suggestionsLoading}
                  onAction={handleAction}
                  onClose={() => setShowSuggestions(false)}
                  onDismiss={dismissSuggestion}
                  onRefresh={fetchSuggestions}
                  suggestions={suggestions}
                />
              </Card>
            ) : (
              <>
                <StatsSidebar
                  completedTasks={completedTasks.length}
                  inProgressTasks={inProgressTasks.length}
                  myTasks={myTasks.length}
                  pendingTasks={pendingTasks.length}
                  totalTasks={filteredTasks.length}
                />
                {/* AI Suggestions teaser */}
                {suggestions.length > 0 && (
                  <Card className="border-purple-200 bg-purple-50/50 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 font-semibold text-sm text-purple-900">
                        <Lightbulb className="h-4 w-4 text-purple-600" />
                        AI Suggestions Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-purple-700 text-xs">
                        You have {suggestions.length} suggestion
                        {suggestions.length !== 1 ? "s" : ""} that could help
                        optimize your kitchen operations.
                      </p>
                      <Button
                        className="w-full bg-purple-600 text-white hover:bg-purple-700"
                        onClick={() => setShowSuggestions(true)}
                        size="sm"
                      >
                        <Sparkles className="h-3 w-3" />
                        View Suggestions
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
