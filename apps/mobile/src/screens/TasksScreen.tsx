import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useBundleClaimTasks,
  useClaimTask,
  useCompleteTask,
  useReleaseTask,
  useStartTask,
} from "../api/mutations";
import { useAvailableTasks, useMyTasks } from "../api/queries";
import ErrorState from "../components/ErrorState";
import type { FilterState, Task } from "../types";

const MY_STATION_KEY = "mobile-kitchen-my-station";

type BoardMode = "all" | "unclaimed" | "at-risk" | "my-tasks";

type TaskSection = {
  key: string;
  title: string;
  tasks: Task[];
};

function isDoneStatus(status: string): boolean {
  return status === "complete" || status === "completed" || status === "done";
}

function isTaskAtRisk(task: Task): boolean {
  if (task.priority <= 3) {
    return true;
  }

  if (!task.dueDate) {
    return false;
  }

  const now = Date.now();
  const due = new Date(task.dueDate).getTime();
  const diffMins = (due - now) / (1000 * 60);
  return diffMins <= 60;
}

function getTaskGroup(task: Task): string {
  const firstTag = task.tags?.[0]?.trim();
  return firstTag && firstTag.length > 0 ? firstTag : "General Tasks";
}

export default function TasksScreen() {
  const [boardMode, setBoardMode] = useState<BoardMode>("unclaimed");
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    station: null,
    minPriority: null,
    eventId: null,
    myStation: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: availableTasks = [],
    isLoading: isLoadingAvailable,
    isError: isErrorAvailable,
    error: errorAvailable,
    refetch: refetchAvailable,
    isRefetching: isRefetchingAvailable,
  } = useAvailableTasks();

  const {
    data: myTasks = [],
    isLoading: isLoadingMyTasks,
    isError: isErrorMyTasks,
    error: errorMyTasks,
    refetch: refetchMyTasks,
    isRefetching: isRefetchingMyTasks,
  } = useMyTasks();

  const claimTask = useClaimTask();
  const bundleClaimTasks = useBundleClaimTasks();
  const releaseTask = useReleaseTask();
  const startTask = useStartTask();
  const completeTask = useCompleteTask();

  const isMutating =
    claimTask.isPending ||
    bundleClaimTasks.isPending ||
    releaseTask.isPending ||
    startTask.isPending ||
    completeTask.isPending;

  const uniqueStations = useMemo(() => {
    return Array.from(new Set(availableTasks.flatMap((t) => t.tags || []).filter(Boolean)));
  }, [availableTasks]);

  useMemo(() => {
    AsyncStorage.getItem(MY_STATION_KEY).then((savedStation) => {
      if (savedStation) {
        setFilters((prev) => ({ ...prev, myStation: savedStation }));
      }
    });
  }, []);

  const filteredAvailableTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      if (filters.station && !(task.tags || []).includes(filters.station)) {
        return false;
      }
      if (filters.myStation && !(task.tags || []).includes(filters.myStation)) {
        return false;
      }
      if (filters.minPriority && task.priority > filters.minPriority) {
        return false;
      }
      return true;
    });
  }, [availableTasks, filters]);

  const visibleAvailableTasks = useMemo(() => {
    if (boardMode === "all") {
      return filteredAvailableTasks;
    }
    if (boardMode === "unclaimed") {
      return filteredAvailableTasks.filter((task) => task.isAvailable !== false);
    }
    if (boardMode === "at-risk") {
      return filteredAvailableTasks.filter(isTaskAtRisk);
    }
    return [];
  }, [boardMode, filteredAvailableTasks]);

  const tasks = boardMode === "my-tasks" ? myTasks : visibleAvailableTasks;

  const sections = useMemo<TaskSection[]>(() => {
    const grouped = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = getTaskGroup(task);
      const list = grouped.get(key);
      if (list) {
        list.push(task);
      } else {
        grouped.set(key, [task]);
      }
    }
    return Array.from(grouped.entries()).map(([title, groupTasks]) => ({
      key: title,
      title,
      tasks: groupTasks,
    }));
  }, [tasks]);

  const modeCounts = useMemo(() => {
    const all = filteredAvailableTasks.length;
    const unclaimed = filteredAvailableTasks.filter((task) => task.isAvailable !== false).length;
    const atRisk = filteredAvailableTasks.filter(isTaskAtRisk).length;
    const mine = myTasks.length;
    return { all, unclaimed, atRisk, mine };
  }, [filteredAvailableTasks, myTasks.length]);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const enterMultiSelectMode = useCallback((taskId: string) => {
    if (boardMode === "my-tasks") {
      return;
    }
    setIsMultiSelectMode(true);
    setSelectedTaskIds(new Set([taskId]));
  }, [boardMode]);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedTaskIds(new Set());
  }, []);

  const selectAllVisible = useCallback(() => {
    const ids = visibleAvailableTasks.filter((task) => task.isAvailable !== false).map((task) => task.id);
    setSelectedTaskIds(new Set(ids));
  }, [visibleAvailableTasks]);

  const handleClaim = useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        await claimTask.mutateAsync(taskId);
        setBoardMode("my-tasks");
      } catch {
        setError("Failed to claim task. Please try again.");
      }
    },
    [claimTask]
  );

  const handleBundleClaim = useCallback(async () => {
    if (selectedTaskIds.size === 0) {
      return;
    }

    setError(null);
    const taskIds = Array.from(selectedTaskIds);

    try {
      const response = await bundleClaimTasks.mutateAsync(taskIds);
      if (response.success) {
        exitMultiSelectMode();
        setBoardMode("my-tasks");
      } else if (response.alreadyClaimedTaskIds?.length) {
        setError(`${response.alreadyClaimedTaskIds.length} task(s) were already claimed by others.`);
      } else {
        setError(response.message || "Failed to claim tasks");
      }
    } catch {
      setError("Failed to claim tasks. Please try again.");
    }
  }, [selectedTaskIds, bundleClaimTasks, exitMultiSelectMode]);

  const handleRelease = useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        await releaseTask.mutateAsync(taskId);
      } catch {
        setError("Failed to release task. Please try again.");
      }
    },
    [releaseTask]
  );

  const handleStart = useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        await startTask.mutateAsync(taskId);
      } catch {
        setError("Failed to start task. Please try again.");
      }
    },
    [startTask]
  );

  const handleComplete = useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        await completeTask.mutateAsync(taskId);
      } catch {
        setError("Failed to complete task. Please try again.");
      }
    },
    [completeTask]
  );

  const setMyStation = useCallback((station: string | null) => {
    setFilters((prev) => ({ ...prev, myStation: station }));
    if (station) {
      AsyncStorage.setItem(MY_STATION_KEY, station);
    } else {
      AsyncStorage.removeItem(MY_STATION_KEY);
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      station: null,
      minPriority: null,
      eventId: null,
      myStation: filters.myStation,
    });
  }, [filters.myStation]);

  const activeFilterCount = (filters.station ? 1 : 0) + (filters.minPriority ? 1 : 0) + (filters.eventId ? 1 : 0);

  const onRefresh = useCallback(() => {
    if (boardMode === "my-tasks") {
      refetchMyTasks();
    } else {
      refetchAvailable();
    }
  }, [boardMode, refetchMyTasks, refetchAvailable]);

  const isLoadingCurrent = boardMode === "my-tasks" ? isLoadingMyTasks : isLoadingAvailable;
  const isErrorCurrent = boardMode === "my-tasks" ? isErrorMyTasks : isErrorAvailable;
  const errorCurrent = boardMode === "my-tasks" ? errorMyTasks : errorAvailable;
  const isRefreshingCurrent = boardMode === "my-tasks" ? isRefetchingMyTasks : isRefetchingAvailable;

  const statusPill = (task: Task) => {
    if (boardMode !== "my-tasks") {
      return (
        <TouchableOpacity
          style={[styles.statusPill, styles.statusPillNeutral]}
          disabled={isMutating || task.isAvailable === false}
          onPress={() => handleClaim(task.id)}
        >
          <Text style={styles.statusPillNeutralText}>Unclaimed</Text>
        </TouchableOpacity>
      );
    }

    if (isDoneStatus(task.status)) {
      return (
        <View style={[styles.statusPill, styles.statusPillDone]}>
          <Text style={styles.statusPillDoneText}>Done</Text>
        </View>
      );
    }

    if (task.status === "in_progress") {
      return (
        <TouchableOpacity
          style={[styles.statusPill, styles.statusPillWorking]}
          disabled={isMutating}
          onPress={() => handleComplete(task.id)}
        >
          <Text style={styles.statusPillWorkingText}>Working</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.statusPill, styles.statusPillAssigned]}
        disabled={isMutating}
        onPress={() => handleStart(task.id)}
      >
        <Text style={styles.statusPillAssignedText}>Start</Text>
      </TouchableOpacity>
    );
  };

  const renderTaskRow = (task: Task) => {
    const isSelected = selectedTaskIds.has(task.id);
    const selectable = isMultiSelectMode && boardMode !== "my-tasks";

    const onPress = () => {
      if (selectable) {
        toggleTaskSelection(task.id);
      }
    };

    return (
      <Pressable
        key={task.id}
        style={[styles.taskRow, isSelected && styles.taskRowSelected]}
        onPress={onPress}
        onLongPress={() => enterMultiSelectMode(task.id)}
        delayLongPress={500}
      >
        <View style={styles.taskMain}>
          {selectable && (
            <View style={[styles.selectDot, isSelected && styles.selectDotActive]}>
              {isSelected && <Text style={styles.selectDotMark}>✓</Text>}
            </View>
          )}

          <View style={styles.taskTextWrap}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {task.title}
            </Text>
            {task.summary ? (
              <Text style={styles.taskSummary} numberOfLines={2}>
                {task.summary}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.taskActions}>
          {boardMode !== "my-tasks" ? (
            <TouchableOpacity
              style={styles.claimCircle}
              onPress={() => handleClaim(task.id)}
              disabled={isMutating || task.isAvailable === false}
            >
              <Text style={styles.claimCircleText}>+</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.assigneeAvatar}>
              <Text style={styles.assigneeInitial}>
                {(task.claims[0]?.user?.firstName?.[0] || "Y").toUpperCase()}
              </Text>
            </View>
          )}

          {statusPill(task)}

          {boardMode === "my-tasks" && !isDoneStatus(task.status) && (
            <TouchableOpacity onPress={() => handleRelease(task.id)}>
              <Text style={styles.releaseInline}>Release</Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    if (isLoadingCurrent) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      );
    }

    if (isErrorCurrent) {
      return (
        <ErrorState
          message={errorCurrent?.message || "Failed to load tasks"}
          onRetry={() => void onRefresh()}
        />
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No tasks</Text>
        <Text style={styles.emptySubtitle}>No tasks match your current view.</Text>
      </View>
    );
  };

  const sectionCountLabel = (groupTasks: Task[]) => {
    if (boardMode !== "my-tasks") {
      return `${groupTasks.length} Open`;
    }
    const done = groupTasks.filter((task) => isDoneStatus(task.status)).length;
    const active = groupTasks.length - done;
    if (active > 0) {
      return `${active} Active`;
    }
    return `${done} Done`;
  };

  const setMode = (mode: BoardMode) => {
    setBoardMode(mode);
    if (mode === "my-tasks") {
      exitMultiSelectMode();
    }
  };

  return (
    <View style={styles.container}>
      {isMultiSelectMode && (
        <View style={styles.multiSelectHeader}>
          <Text style={styles.multiSelectCount}>{selectedTaskIds.size} selected</Text>
          <View style={styles.multiSelectActions}>
            <TouchableOpacity onPress={selectAllVisible}>
              <Text style={styles.multiSelectActionText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exitMultiSelectMode}>
              <Text style={styles.multiSelectCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingCurrent}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Task Claim Board</Text>
          </View>
          <TouchableOpacity style={styles.filterIconButton} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterIcon}>≡</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.modeChipsRow}>
          <TouchableOpacity
            style={[styles.modeChip, boardMode === "all" && styles.modeChipActive]}
            onPress={() => setMode("all")}
          >
            <Text style={[styles.modeChipText, boardMode === "all" && styles.modeChipTextActive]}>
              All Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, boardMode === "unclaimed" && styles.modeChipActive]}
            onPress={() => setMode("unclaimed")}
          >
            <Text style={[styles.modeChipText, boardMode === "unclaimed" && styles.modeChipTextActive]}>
              Unclaimed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, boardMode === "at-risk" && styles.modeChipActive]}
            onPress={() => setMode("at-risk")}
          >
            <Text style={[styles.modeChipText, boardMode === "at-risk" && styles.modeChipTextActive]}>
              At Risk
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, boardMode === "my-tasks" && styles.modeChipActive]}
            onPress={() => setMode("my-tasks")}
          >
            <Text style={[styles.modeChipText, boardMode === "my-tasks" && styles.modeChipTextActive]}>
              My Tasks
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {boardMode === "all" && `${modeCounts.all} total`}
            {boardMode === "unclaimed" && `${modeCounts.unclaimed} unclaimed`}
            {boardMode === "at-risk" && `${modeCounts.atRisk} at risk`}
            {boardMode === "my-tasks" && `${modeCounts.mine} assigned to me`}
          </Text>
        </View>

        {(filters.myStation || filters.station || activeFilterCount > 0) && (
          <View style={styles.filterChipsRow}>
            {filters.myStation && (
              <TouchableOpacity style={styles.filterChipPrimary} onPress={() => setMyStation(null)}>
                <Text style={styles.filterChipPrimaryText}>My Task Group: {filters.myStation}</Text>
                <Text style={styles.filterChipClose}> ×</Text>
              </TouchableOpacity>
            )}
            {filters.station && filters.station !== filters.myStation && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => setFilters((prev) => ({ ...prev, station: null }))}
              >
                <Text style={styles.filterChipText}>Task Group: {filters.station}</Text>
                <Text style={styles.filterChipClose}> ×</Text>
              </TouchableOpacity>
            )}
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {sections.length === 0 ? (
          renderEmptyState()
        ) : (
          sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionMeta}>{sectionCountLabel(section.tasks)}</Text>
              </View>
              {section.tasks.map(renderTaskRow)}
            </View>
          ))
        )}
      </ScrollView>

      {showFilters && (
        <Pressable style={styles.filterOverlay} onPress={() => setShowFilters(false)}>
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter Tasks</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.filterSheetClose}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>My Task Group</Text>
              <View style={styles.filterButtonsRow}>
                {uniqueStations.length > 0 ? (
                  uniqueStations.map((station) => (
                    <TouchableOpacity
                      key={station}
                      style={[styles.filterButton, filters.myStation === station && styles.filterButtonActive]}
                      onPress={() => setMyStation(filters.myStation === station ? null : station)}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          filters.myStation === station && styles.filterButtonTextActive,
                        ]}
                      >
                        {station}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noFiltersText}>No task groups found</Text>
                )}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Task Group</Text>
              <View style={styles.filterButtonsRow}>
                {uniqueStations.map((station) => (
                  <TouchableOpacity
                    key={`station-${station}`}
                    style={[styles.filterButton, filters.station === station && styles.filterButtonActive]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        station: prev.station === station ? null : station,
                      }))
                    }
                  >
                    <Text
                      style={[styles.filterButtonText, filters.station === station && styles.filterButtonTextActive]}
                    >
                      {station}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Max Priority</Text>
              <View style={styles.filterButtonsRow}>
                {[1, 2, 3, 4, 5].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.filterButton, filters.minPriority === p && styles.filterButtonActive]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        minPriority: prev.minPriority === p ? null : p,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        filters.minPriority === p && styles.filterButtonTextActive,
                      ]}
                    >
                      {`≤${p}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {isMultiSelectMode && selectedTaskIds.size > 0 && boardMode !== "my-tasks" && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, isMutating && styles.fabDisabled]}
            onPress={handleBundleClaim}
            disabled={isMutating}
          >
            <Text style={styles.fabText}>
              CLAIM {selectedTaskIds.size} TASK{selectedTaskIds.size > 1 ? "S" : ""}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  filterIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
  modeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  modeChipActive: {
    backgroundColor: "#111111",
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  modeChipTextActive: {
    color: "#ffffff",
  },
  countRow: {
    marginBottom: 10,
  },
  countText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  section: {
    marginTop: 8,
    marginBottom: 14,
  },
  sectionHeader: {
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  sectionMeta: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  taskRow: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  taskRowSelected: {
    backgroundColor: "#eff6ff",
  },
  taskMain: {
    flex: 1,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  taskTextWrap: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  taskSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    fontWeight: "500",
  },
  taskActions: {
    minWidth: 110,
    alignItems: "flex-end",
    gap: 8,
  },
  claimCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  claimCircleText: {
    fontSize: 22,
    color: "#4b5563",
    fontWeight: "600",
    marginTop: -1,
  },
  assigneeAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeInitial: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  statusPill: {
    minWidth: 102,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statusPillNeutral: {
    backgroundColor: "#eef2f7",
  },
  statusPillNeutralText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "700",
  },
  statusPillAssigned: {
    backgroundColor: "#eef2f7",
  },
  statusPillAssignedText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  statusPillWorking: {
    backgroundColor: "#facc15",
  },
  statusPillWorkingText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
  },
  statusPillDone: {
    backgroundColor: "#4ade80",
  },
  statusPillDoneText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "800",
  },
  releaseInline: {
    fontSize: 12,
    color: "#6b7280",
    textDecorationLine: "underline",
  },
  selectDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  selectDotActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  selectDotMark: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  multiSelectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  multiSelectCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  multiSelectActions: {
    flexDirection: "row",
    gap: 14,
  },
  multiSelectActionText: {
    fontSize: 14,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  multiSelectCancelText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  errorBannerText: {
    flex: 1,
    color: "#b91c1c",
    fontSize: 14,
    marginRight: 8,
  },
  dismissText: {
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 13,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  filterChipPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipPrimaryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4b5563",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipClose: {
    color: "#ffffff",
    fontSize: 13,
  },
  clearFiltersText: {
    color: "#4b5563",
    textDecorationLine: "underline",
    fontSize: 12,
    alignSelf: "center",
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#6b7280",
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  filterOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    zIndex: 200,
  },
  filterSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  filterSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  filterSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  filterSheetClose: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },
  filterSection: {
    marginBottom: 18,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  filterButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  filterButtonText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  noFiltersText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  clearAllButton: {
    marginTop: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearAllButtonText: {
    color: "#4b5563",
    fontWeight: "700",
    fontSize: 14,
  },
  fabContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 90,
  },
  fab: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  fabDisabled: {
    opacity: 0.5,
  },
  fabText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});
