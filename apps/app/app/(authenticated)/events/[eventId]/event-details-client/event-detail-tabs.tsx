"use client";

import { cn } from "@repo/design-system/lib/utils";
import {
  CalendarCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Play,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type EventMode = "planning" | "execution" | "reports";

const PLANNING_TABS = [
  "overview",
  "board",
  "menu",
  "copilot",
  "guests",
  "operations",
  "followups",
  "explore",
] as const;

const EXECUTION_TABS = [
  "overview",
  "battleboard",
  "run-sheet",
  "kitchen-tasks",
  "guest-checkin",
  "operations",
] as const;

const REPORTS_TABS = ["overview", "reports", "followups", "explore"] as const;

type PlanningTab = (typeof PLANNING_TABS)[number];
type ExecutionTab = (typeof EXECUTION_TABS)[number];
type ReportsTab = (typeof REPORTS_TABS)[number];
type EventDetailTabValue = PlanningTab | ExecutionTab | ReportsTab;

const ALL_TAB_VALUES = new Set<string>([
  ...PLANNING_TABS,
  ...EXECUTION_TABS,
  ...REPORTS_TABS,
]);

interface EventDetailTabsProps {
  battleBoardHref: string;
  battleboard?: ReactNode;
  board: ReactNode;
  copilot: ReactNode;
  eventDate: string | Date | null | undefined;
  eventId: string;
  eventStatus: string | null;
  explore: ReactNode;
  followups: ReactNode;
  guestCheckin?: ReactNode;
  guests: ReactNode;
  kitchenTasks?: ReactNode;
  menu: ReactNode;
  operations: ReactNode;
  overview: ReactNode;
  reports?: ReactNode;
  runSheet?: ReactNode;
}

const TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  board: "Event tree",
  menu: "Menu",
  copilot: "Copilot",
  guests: "Guests",
  operations: "Operations",
  followups: "Follow-Ups",
  explore: "Explore",
  battleboard: "Battle Board",
  "run-sheet": "Run Sheet",
  "kitchen-tasks": "Kitchen Tasks",
  "guest-checkin": "Check-In",
  reports: "Reports",
};

function inferMode(
  eventDate: string | Date | null | undefined,
  eventStatus: string | null
): EventMode {
  if (eventStatus === "completed" || eventStatus === "cancelled") {
    return "reports";
  }
  if (!eventDate) {
    return "planning";
  }
  const date = typeof eventDate === "string" ? new Date(eventDate) : eventDate;
  const hoursUntil = (date.getTime() - Date.now()) / (1000 * 60 * 60);
  if (
    hoursUntil <= 24 &&
    (eventStatus === "in-progress" || eventStatus === "confirmed")
  ) {
    return "execution";
  }
  return "planning";
}

function getTabsForMode(mode: EventMode): readonly string[] {
  switch (mode) {
    case "planning":
      return PLANNING_TABS;
    case "execution":
      return EXECUTION_TABS;
    case "reports":
      return REPORTS_TABS;
  }
}

export function EventDetailTabs({
  eventId,
  battleBoardHref,
  eventDate,
  eventStatus,
  overview,
  board,
  menu,
  copilot,
  guests,
  operations,
  followups,
  explore,
  battleboard,
  runSheet,
  kitchenTasks,
  guestCheckin,
  reports,
}: EventDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const inferred = useMemo(
    () => inferMode(eventDate, eventStatus),
    [eventDate, eventStatus]
  );

  const [mode, setMode] = useState<EventMode>(() => {
    if (typeof window === "undefined") {
      return inferred;
    }
    const stored = localStorage.getItem(`event-mode:${eventId}`);
    if (
      stored === "planning" ||
      stored === "execution" ||
      stored === "reports"
    ) {
      return stored;
    }
    return inferred;
  });

  // Sync with inferred mode when it changes (e.g., status update)
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = localStorage.getItem(`event-mode:${eventId}`);
    if (!stored) {
      setMode(inferred);
    }
  }, [inferred, eventId]);

  const handleModeChange = useCallback(
    (newMode: EventMode) => {
      setMode(newMode);
      if (typeof window !== "undefined") {
        localStorage.setItem(`event-mode:${eventId}`, newMode);
      }
      // Reset tab to first tab of new mode
      const _newTabs = getTabsForMode(newMode);
      const nextSearchParams = new URLSearchParams(
        searchParams?.toString() ?? ""
      );
      nextSearchParams.delete("tab");
      const query = nextSearchParams.toString();
      startTransition(() => {
        router.replace(
          query ? `${pathname ?? ""}?${query}` : (pathname ?? ""),
          { scroll: false }
        );
      });
    },
    [eventId, pathname, router, searchParams]
  );

  const tabsForMode = useMemo(() => getTabsForMode(mode), [mode]);

  const activeTab = useMemo(() => {
    const raw = searchParams?.get("tab") ?? null;
    if (!raw) {
      return tabsForMode[0] as string;
    }
    return ALL_TAB_VALUES.has(raw) ? raw : (tabsForMode[0] as string);
  }, [searchParams, tabsForMode]);

  const handleTabChange = (tab: string) => {
    if (!pathname || tab === activeTab) {
      return;
    }
    const nextSearchParams = new URLSearchParams(
      searchParams?.toString() ?? ""
    );
    if (tab === tabsForMode[0]) {
      nextSearchParams.delete("tab");
    } else {
      nextSearchParams.set("tab", tab);
    }
    const query = nextSearchParams.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  const tabContent: Record<string, ReactNode> = {
    overview,
    board,
    menu,
    copilot,
    guests,
    operations,
    followups,
    explore,
    battleboard: battleboard ?? (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ClipboardList className="mb-3 h-12 w-12 opacity-40" />
        <p className="text-sm">
          Open the battle board to coordinate menu finalization.
        </p>
        <a
          className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
          href={battleBoardHref}
        >
          Open Battle Board
        </a>
      </div>
    ),
    "run-sheet": runSheet ?? (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="mb-3 h-12 w-12 opacity-40" />
        <p className="text-sm">
          Generate a run sheet with menu, staff, timeline, and shopping list.
        </p>
        <a
          className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
          href={`/events/${eventId}/run-sheet`}
        >
          Open Run Sheet
        </a>
      </div>
    ),
    "kitchen-tasks": kitchenTasks ?? operations,
    "guest-checkin": guestCheckin ?? guests,
    reports: reports ?? (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CalendarCheck className="mb-3 h-12 w-12 opacity-40" />
        <p className="text-sm">
          Generate post-event reports and review performance.
        </p>
        <a
          className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
          href={`/events/${eventId}/reports`}
        >
          View Reports
        </a>
      </div>
    ),
  };

  const modeConfig: {
    value: EventMode;
    label: string;
    icon: React.ElementType;
  }[] = [
    { value: "planning", label: "Planning", icon: LayoutDashboard },
    { value: "execution", label: "Execution", icon: Play },
    { value: "reports", label: "Reports", icon: CalendarCheck },
  ];

  return (
    <div className="w-full">
      <div className="md:sticky md:top-4 md:z-20 md:pb-4">
        {/* Mode toggle */}
        <div className="mb-2 flex items-center gap-1 rounded-xl border border-border/70 bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          {modeConfig.map(({ value, label, icon: Icon }) => (
            <button
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-sm ring-offset-background transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                mode === value
                  ? "bg-ink text-ink-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={value}
              onClick={() => handleModeChange(value)}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div className="overflow-x-auto">
          <div
            className="inline-flex h-auto min-w-full gap-1 rounded-xl border border-border/70 bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/70"
            role="tablist"
          >
            {tabsForMode.map((tab) => (
              <button
                aria-selected={activeTab === tab}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-sm ring-offset-background transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={tab}
                onClick={() => handleTabChange(tab)}
                role="tab"
                type="button"
              >
                {TAB_LABELS[tab] ?? tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Render only the active tab content */}
      <div className="space-y-4 pt-2">{tabContent[activeTab] ?? overview}</div>
    </div>
  );
}
