import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCompleteTask,
  useReleaseTask,
  useStartTask,
} from "../api/mutations";
import { useMyTasks } from "../api/queries";
import ErrorState from "../components/ErrorState";
import TaskCard from "../components/TaskCard";
import type { Task } from "../types";

export default function MyWorkScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // API hooks - refetch every 30 seconds for auto-refresh
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useMyTasks({ refetchInterval: 30_000 });

  // Mutations
  const startTaskMutation = useStartTask();
  const completeTaskMutation = useCompleteTask();
  const releaseTaskMutation = useReleaseTask();

  // Group tasks into active and claimed
  const { activeTasks, claimedTasks } = useMemo(() => {
    const active: Task[] = [];
    const claimed: Task[] = [];

    for (const task of tasks) {
      if (task.status === "in_progress") {
        active.push(task);
      } else if (task.status !== "done") {
        claimed.push(task);
      }
    }

    return { activeTasks: active, claimedTasks: claimed };
  }, [tasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleStart = useCallback(
    (taskId: string) => {
      startTaskMutation.mutate(taskId);
    },
    [startTaskMutation]
  );

  const handleComplete = useCallback(
    (taskId: string) => {
      completeTaskMutation.mutate(taskId);
    },
    [completeTaskMutation]
  );

  const handleRelease = useCallback(
    (taskId: string) => {
      releaseTaskMutation.mutate(taskId);
    },
    [releaseTaskMutation]
  );

  const isMutating =
    startTaskMutation.isPending ||
    completeTaskMutation.isPending ||
    releaseTaskMutation.isPending;

  const totalTasks = activeTasks.length + claimedTasks.length;

  // Loading state
  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Loading your work...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Failed to load your work"
        }
        onRetry={() => void refetch()}
      />
    );
  }

  // Render section header
  const renderSectionHeader = (
    title: string,
    count: number,
    icon: string,
    color: string
  ) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.countBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.countText, { color }]}>{count}</Text>
      </View>
    </View>
  );

  // Create list data with sections
  const listData: Array<
    | {
        type: "header";
        key: string;
        title: string;
        count: number;
        icon: string;
        color: string;
      }
    | { type: "task"; key: string; task: Task; section: "active" | "claimed" }
  > = [];

  if (activeTasks.length > 0) {
    listData.push({
      type: "header",
      key: "active-header",
      title: "Active",
      count: activeTasks.length,
      icon: "▶️",
      color: "#2563eb",
    });
    for (const task of activeTasks) {
      listData.push({ type: "task", key: task.id, task, section: "active" });
    }
  }

  if (claimedTasks.length > 0) {
    listData.push({
      type: "header",
      key: "claimed-header",
      title: "Claimed",
      count: claimedTasks.length,
      icon: "📦",
      color: "#64748b",
    });
    for (const task of claimedTasks) {
      listData.push({ type: "task", key: task.id, task, section: "claimed" });
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Work</Text>
          <Text style={styles.subtitle}>
            {totalTasks} task{totalTasks !== 1 ? "s" : ""} assigned
          </Text>
        </View>
        <Text style={styles.autoRefreshHint}>Auto-refresh: 30s</Text>
      </View>

      {/* Task list with sections */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={listData}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💼</Text>
            <Text style={styles.emptyTitle}>No work claimed</Text>
            <Text style={styles.emptySubtitle}>
              Claim tasks from the Tasks tab to see them here.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return renderSectionHeader(
              item.title,
              item.count,
              item.icon,
              item.color
            );
          }
          return (
            <View style={styles.taskCardContainer}>
              <TaskCard
                isLoading={isMutating}
                onComplete={handleComplete}
                onRelease={handleRelease}
                onStart={handleStart}
                task={item.task}
                type="my-tasks"
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  autoRefreshHint: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
  },
  taskCardContainer: {
    marginBottom: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
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
    maxWidth: 260,
  },
});
