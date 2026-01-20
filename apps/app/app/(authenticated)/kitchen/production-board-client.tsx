"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, subDays, isToday, isYesterday } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Sun,
  Plus,
  Search,
  ChefHat,
  Flame,
  Snowflake,
  UtensilsCrossed,
  TrendingUp,
  CheckCircle2,
  Circle,
  Clock3,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/design-system/components/ui/avatar";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { KitchenTask, User as DbUser, KitchenTaskClaim } from "@repo/database";
import { TaskCard } from "./task-card";

type UserSelect = Pick<DbUser, "id" | "firstName" | "lastName" | "email">;

type TaskWithRelations = KitchenTask & {
  claims: Array<KitchenTaskClaim & { user: UserSelect | null }>;
};

type ProductionBoardClientProps = {
  initialTasks: TaskWithRelations[];
  currentUserId?: string | null;
};

const STATIONS = [
  { id: "all", label: "All Stations", icon: UtensilsCrossed },
  { id: "hot-line", label: "Hot Line", icon: Flame },
  { id: "cold-prep", label: "Cold Prep", icon: Snowflake },
  { id: "bakery", label: "Bakery", icon: ChefHat },
];

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
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
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => onDateChange(subDays(selectedDate, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-slate-100">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-700">{formatDateLabel(selectedDate)}</span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => onDateChange(addDays(selectedDate, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="ml-1 h-8 text-slate-500 hover:text-slate-700"
        onClick={() => onDateChange(new Date())}
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
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
              <span className="font-semibold text-slate-800">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stats.slice(0, 2).map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-slate-50 p-3 text-center"
              >
                <div className={`font-bold text-2xl ${stat.color}`}>{stat.value}</div>
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
              key={stat.label}
              className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50"
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
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium text-slate-700 text-sm">John Doe</div>
              <div className="text-slate-500 text-xs">Completed 3 tasks</div>
            </div>
            <Badge variant="secondary" className="text-xs">3</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xs">AS</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium text-slate-700 text-sm">Alice Smith</div>
              <div className="text-slate-500 text-xs">Working on 2 tasks</div>
            </div>
            <Badge variant="secondary" className="text-xs">2</Badge>
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
        <Badge variant="secondary" className="font-medium text-xs">
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
            <TaskCard key={task.id} task={task} currentUserId={currentUserId} />
          ))
        )}
      </div>
    </div>
  );
}

export function ProductionBoardClient({
  initialTasks,
  currentUserId,
}: ProductionBoardClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStation, setSelectedStation] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
  const pendingTasks = filteredTasks.filter((task) => task.status === "pending");
  const inProgressTasks = filteredTasks.filter(
    (task) => task.status === "in_progress",
  );
  const completedTasks = filteredTasks.filter((task) => task.status === "completed");

  // Calculate my tasks
  const myTasks = filteredTasks.filter(
    (task) =>
      task.claims.some(
        (claim) => claim.employeeId === currentUserId && !claim.releasedAt,
      ),
  );

  const handleCreateTask = useCallback(() => {
    router.push("/kitchen/tasks/new");
  }, [router]);

  const currentStation = STATIONS.find((s) => s.id === selectedStation);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-slate-200 border-b bg-white/80 backdrop-blur-md">
        <div className="flex flex-col gap-4 px-6 py-4">
          {/* Top Row: Date Navigation and Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DateNavigator
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
              <div className="hidden sm:block">
                <KitchenClock />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WeatherWidget />
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
                    key={station.id}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
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
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                      key={task.id}
                      task={task}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Kanban Board */}
            <div className="grid gap-4 lg:grid-cols-3">
              <TaskColumn
                title="Pending"
                tasks={pendingTasks}
                currentUserId={currentUserId}
                icon={Circle}
                count={pendingTasks.length}
                iconColor="bg-amber-100 text-amber-600"
              />
              <TaskColumn
                title="In Progress"
                tasks={inProgressTasks}
                currentUserId={currentUserId}
                icon={Clock3}
                count={inProgressTasks.length}
                iconColor="bg-blue-100 text-blue-600"
              />
              <TaskColumn
                title="Completed"
                tasks={completedTasks}
                currentUserId={currentUserId}
                icon={CheckCircle2}
                count={completedTasks.length}
                iconColor="bg-emerald-100 text-emerald-600"
              />
            </div>
          </div>

          {/* Stats Sidebar */}
          <aside className="space-y-4">
            <StatsSidebar
              totalTasks={filteredTasks.length}
              pendingTasks={pendingTasks.length}
              inProgressTasks={inProgressTasks.length}
              completedTasks={completedTasks.length}
              myTasks={myTasks.length}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
