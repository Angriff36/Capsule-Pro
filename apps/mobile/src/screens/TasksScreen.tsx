import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useAvailableTasks, useMyTasks } from "../api/queries";
import {
  useBundleClaimTasks,
  useClaimTask,
  useCompleteTask,
  useReleaseTask,
  useStartTask,
} from "../api/mutations";
import TaskCard from "../components/TaskCard";
import type { Task, FilterState } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MY_STATION_KEY = "mobile-kitchen-my-station";

type TabType = "available" | "my-tasks";

export default function TasksScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("available");
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

  // Queries
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

  // Mutations
  const claimTask = useClaimTask();
  const bundleClaimTasks = useBundleClaimTasks();
  const releaseTask = useReleaseTask();
  const startTask = useStartTask();
  const completeTask = useCompleteTask();

  const isLoading =
    claimTask.isPending ||
    bundleClaimTasks.isPending ||
    releaseTask.isPending ||
    startTask.isPending ||
    completeTask.isPending;

  // Extract unique stations from available tasks
  const uniqueStations = useMemo(() => {
    return Array.from(
      new Set(availableTasks.flatMap((t) => t.tags || []).filter(Boolean))
    );
  }, [availableTasks]);

  // Load "My Station" from AsyncStorage on mount
  useMemo(() => {
    AsyncStorage.getItem(MY_STATION_KEY).then((savedStation) => {
      if (savedStation) {
        setFilters((prev) => ({ ...prev, myStation: savedStation }));
      }
    });
  }, []);

  // Filter available tasks based on current filters
  const filteredAvailableTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      // Apply station filter
      if (filters.station && !(task.tags || []).includes(filters.station)) {
        return false;
      }
      // Apply my station quick filter
      if (filters.myStation && !(task.tags || []).includes(filters.myStation)) {
        return false;
      }
      // Apply priority filter
      if (filters.minPriority && task.priority > filters.minPriority) {
        return false;
      }
      return true;
    });
  }, [availableTasks, filters]);

  // Multi-select handlers
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const enterMultiSelectMode = useCallback((taskId: string) => {
    setIsMultiSelectMode(true);
    setSelectedTaskIds(new Set([taskId]));
  }, []);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedTaskIds(new Set());
  }, []);

  const selectAllVisible = useCallback(() => {
    const availableTaskIds = filteredAvailableTasks
      .filter((t) => t.isAvailable)
      .map((t) => t.id);
    setSelectedTaskIds(new Set(availableTaskIds));
  }, [filteredAvailableTasks]);

  // Task action handlers
  const handleClaim = useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        await claimTask.mutateAsync(taskId);
        setActiveTab("my-tasks");
      } catch (err) {
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
        setActiveTab("my-tasks");
      } else if (response.alreadyClaimedTaskIds && response.alreadyClaimedTaskIds.length > 0) {
        setError(`${response.alreadyClaimedTaskIds.length} task(s) were already claimed by others.`);
      } else {
        setError(response.message || "Failed to claim tasks");
      }
    } catch (err) {
      setError("Failed to claim tasks. Please try again.");
    }
  }, [selectedTaskIds, bundleClaimTasks, exitMultiSelectMode]);

  const handleRelease = useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        await releaseTask.mutateAsync(taskId);
      } catch (err) {
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
      } catch (err) {
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
      } catch (err) {
        setError("Failed to complete task. Please try again.");
      }
    },
    [completeTask]
  );

  // Filter handlers
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
      myStation: filters.myStation, // Preserve myStation
    });
  }, [filters.myStation]);

  const activeFilterCount =
    (filters.station ? 1 : 0) +
    (filters.minPriority ? 1 : 0) +
    (filters.eventId ? 1 : 0);

  const onRefresh = useCallback(() => {
    if (activeTab === "available") {
      refetchAvailable();
    } else {
      refetchMyTasks();
    }
  }, [activeTab, refetchAvailable, refetchMyTasks]);

  const renderTaskCard = useCallback(
    ({ item }: { item: Task }) => (
      <TaskCard
        task={item}
        type={activeTab}
        isLoading={isLoading}
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedTaskIds.has(item.id)}
        onClaim={activeTab === "available" ? handleClaim : undefined}
        onRelease={activeTab === "my-tasks" ? handleRelease : undefined}
        onStart={activeTab === "my-tasks" ? handleStart : undefined}
        onComplete={activeTab === "my-tasks" ? handleComplete : undefined}
        onToggleSelect={toggleTaskSelection}
        onLongPress={activeTab === "available" ? enterMultiSelectMode : undefined}
      />
    ),
    [
      activeTab,
      isLoading,
      isMultiSelectMode,
      selectedTaskIds,
      handleClaim,
      handleRelease,
      handleStart,
      handleComplete,
      toggleTaskSelection,
      enterMultiSelectMode,
    ]
  );

  const renderEmptyState = useCallback(() => {
    if (activeTab === "available") {
      if (isLoadingAvailable) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        );
      }

      if (isErrorAvailable) {
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorTitle}>Failed to load tasks</Text>
            <Text style={styles.errorSubtitle}>
              {errorAvailable?.message || "Please try again."}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{"\u2713"}</Text>
          <Text style={styles.emptyTitle}>No available tasks</Text>
          <Text style={styles.emptySubtitle}>
            {availableTasks.length === 0
              ? "All caught up! Check back later."
              : "No tasks match your filters."}
          </Text>
        </View>
      );
    }

    // My Tasks tab
    if (isLoadingMyTasks) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading your tasks...</Text>
        </View>
      );
    }

    if (isErrorMyTasks) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Failed to load tasks</Text>
          <Text style={styles.errorSubtitle}>
            {errorMyTasks?.message || "Please try again."}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{"\u23F3"}</Text>
        <Text style={styles.emptyTitle}>No claimed tasks</Text>
        <Text style={styles.emptySubtitle}>
          Switch to Available tab to claim tasks.
        </Text>
      </View>
    );
  }, [
    activeTab,
    isLoadingAvailable,
    isErrorAvailable,
    errorAvailable,
    availableTasks.length,
    isLoadingMyTasks,
    isErrorMyTasks,
    errorMyTasks,
  ]);

  const tasks = activeTab === "available" ? filteredAvailableTasks : myTasks;

  return (
    <View style={styles.container}>
      {/* Multi-select header */}
      {isMultiSelectMode && (
        <View style={styles.multiSelectHeader}>
          <View style={styles.multiSelectInfo}>
            <Text style={styles.multiSelectCount}>{selectedTaskIds.size} selected</Text>
          </View>
          <View style={styles.multiSelectActions}>
            <TouchableOpacity onPress={selectAllVisible} style={styles.selectAllButton}>
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exitMultiSelectMode} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "available" && styles.tabActive]}
          onPress={() => setActiveTab("available")}
        >
          <Text style={[styles.tabText, activeTab === "available" && styles.tabTextActive]}>
            Available ({filteredAvailableTasks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "my-tasks" && styles.tabActive]}
          onPress={() => setActiveTab("my-tasks")}
        >
          <Text style={[styles.tabText, activeTab === "my-tasks" && styles.tabTextActive]}>
            My Tasks ({myTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      {(filters.myStation || filters.station || activeFilterCount > 0) && !isMultiSelectMode && (
        <View style={styles.filterChipsRow}>
          {filters.myStation && (
            <TouchableOpacity
              style={styles.filterChipPrimary}
              onPress={() => setMyStation(null)}
            >
              <Text style={styles.filterChipPrimaryText}>My Station: {filters.myStation}</Text>
              <Text style={styles.filterChipClose}> {"\u00D7"}</Text>
            </TouchableOpacity>
          )}
          {filters.station && filters.station !== filters.myStation && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setFilters((prev) => ({ ...prev, station: null }))}
            >
              <Text style={styles.filterChipText}>Station: {filters.station}</Text>
              <Text style={styles.filterChipClose}> {"\u00D7"}</Text>
            </TouchableOpacity>
          )}
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter modal (simplified - shows bottom sheet style) */}
      {showFilters && (
        <Pressable style={styles.filterOverlay} onPress={() => setShowFilters(false)}>
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter Tasks</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.filterSheetClose}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* My Station quick filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>My Station</Text>
              <View style={styles.filterButtonsRow}>
                {uniqueStations.length > 0 ? (
                  uniqueStations.map((station) => (
                    <TouchableOpacity
                      key={station}
                      style={[
                        styles.filterButton,
                        filters.myStation === station && styles.filterButtonActive,
                      ]}
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
                  <Text style={styles.noFiltersText}>No stations found</Text>
                )}
              </View>
            </View>

            {/* Station filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Station</Text>
              <View style={styles.filterButtonsRow}>
                {uniqueStations.map((station) => (
                  <TouchableOpacity
                    key={`station-${station}`}
                    style={[
                      styles.filterButton,
                      filters.station === station && styles.filterButtonActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        station: prev.station === station ? null : station,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        filters.station === station && styles.filterButtonTextActive,
                      ]}
                    >
                      {station}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Max Priority</Text>
              <View style={styles.filterButtonsRow}>
                {[1, 2, 3, 4, 5].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.filterButton,
                      filters.minPriority === p && styles.filterButtonActive,
                    ]}
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
                      {`\u2264${p}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clear button */}
            <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* Task list */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={activeTab === "available" ? isRefetchingAvailable : isRefetchingMyTasks}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.title}>Tasks</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.filterIconButton}
                onPress={() => setShowFilters(true)}
              >
                <Text style={styles.filterIcon}>{"\u2699"}</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Floating Action Button for bundle claim */}
      {isMultiSelectMode && selectedTaskIds.size > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, isLoading && styles.fabDisabled]}
            onPress={handleBundleClaim}
            disabled={isLoading}
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
    backgroundColor: "#f8fafc",
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100, // Extra padding for FAB
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  filterIcon: {
    fontSize: 20,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  // Tab bar
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#0f172a",
  },
  // Multi-select header
  multiSelectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  multiSelectInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  multiSelectCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  multiSelectActions: {
    flexDirection: "row",
    gap: 12,
  },
  selectAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectAllText: {
    fontSize: 14,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  // Error banner
  errorBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fce7f3",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#be185d",
  },
  dismissText: {
    fontSize: 14,
    color: "#be185d",
    fontWeight: "600",
  },
  // Filter chips
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChipPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipPrimaryText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "500",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#64748b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "500",
  },
  filterChipClose: {
    fontSize: 14,
    color: "#ffffff",
    marginLeft: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: "#64748b",
    textDecorationLine: "underline",
    alignSelf: "center",
  },
  // Filter sheet
  filterOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    zIndex: 100,
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
    marginBottom: 20,
  },
  filterSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  filterSheetClose: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 10,
  },
  filterButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterButtonText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  noFiltersText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  clearAllButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  clearAllButtonText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  // Loading and empty states
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: "700",
    color: "#f43f5e",
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    color: "#10b981",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  // FAB
  fabContainer: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
  },
  fab: {
    backgroundColor: "#2563eb",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabled: {
    opacity: 0.5,
  },
  fabText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
