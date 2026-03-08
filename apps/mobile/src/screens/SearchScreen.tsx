import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAvailableTasks, usePrepLists } from "../api/queries";
import ErrorState from "../components/ErrorState";
import TaskCard from "../components/TaskCard";
import type { PrepList, Task } from "../types";

type SearchResult =
  | { type: "task"; key: string; task: Task }
  | { type: "prepList"; key: string; prepList: PrepList };

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data for searching
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useAvailableTasks();

  const {
    data: prepLists = [],
    isLoading: isLoadingPrepLists,
    refetch: refetchPrepLists,
  } = usePrepLists();

  const isLoading = isLoadingTasks || isLoadingPrepLists;

  // Filter results based on search query
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search tasks
    for (const task of tasks) {
      const titleMatch = task.title.toLowerCase().includes(query);
      const summaryMatch = task.summary?.toLowerCase().includes(query);
      const tagsMatch = task.tags.some((tag) => tag.toLowerCase().includes(query));

      if (titleMatch || summaryMatch || tagsMatch) {
        results.push({ type: "task", key: `task-${task.id}`, task });
      }
    }

    // Search prep lists
    for (const prepList of prepLists) {
      const nameMatch = prepList.name.toLowerCase().includes(query);
      const eventNameMatch = prepList.event?.name?.toLowerCase().includes(query);
      const stationNameMatch = prepList.station?.name?.toLowerCase().includes(query);

      if (nameMatch || eventNameMatch || stationNameMatch) {
        results.push({ type: "prepList", key: `prepList-${prepList.id}`, prepList });
      }
    }

    return results;
  }, [searchQuery, tasks, prepLists]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTasks(), refetchPrepLists()]);
    setRefreshing(false);
  }, [refetchTasks, refetchPrepLists]);

  const renderPrepListCard = useCallback((prepList: PrepList) => (
    <View style={styles.prepListCard}>
      <View style={styles.prepListHeader}>
        <Text style={styles.prepListName}>{prepList.name}</Text>
        <View style={[styles.statusBadge, getStatusStyle(prepList.status)]}>
          <Text style={styles.statusText}>{prepList.status}</Text>
        </View>
      </View>
      {prepList.event && (
        <Text style={styles.prepListEvent}>Event: {prepList.event.name}</Text>
      )}
      {prepList.station && (
        <Text style={styles.prepListStation}>Station: {prepList.station.name}</Text>
      )}
      <View style={styles.prepListProgress}>
        <Text style={styles.progressText}>
          {prepList.completedCount}/{prepList.totalCount} items
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${prepList.totalCount > 0
                  ? (prepList.completedCount / prepList.totalCount) * 100
                  : 0}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  ), []);

  if (tasksError) {
    return (
      <ErrorState
        message={tasksError instanceof Error ? tasksError.message : "Search failed"}
        onRetry={() => void onRefresh()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="Search tasks, prep lists, events..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          value={searchQuery}
        />
        {searchQuery.length > 0 && (
          <Text
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            ✕
          </Text>
        )}
      </View>

      {/* Loading State */}
      {isLoading && searchQuery.length === 0 && (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#2563eb" size="large" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      )}

      {/* Empty State - No Query */}
      {!isLoading && searchQuery.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Search</Text>
          <Text style={styles.emptySubtitle}>
            Find tasks, prep lists, and events by name, tags, or station.
          </Text>
        </View>
      )}

      {/* Empty State - No Results */}
      {!isLoading && searchQuery.length > 0 && searchResults.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔎</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try different keywords or check your spelling.
          </Text>
        </View>
      )}

      {/* Results List */}
      {searchResults.length > 0 && (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={searchResults}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.key}
          refreshControl={
            <RefreshControl onRefresh={onRefresh} refreshing={refreshing} />
          }
          renderItem={({ item }) => {
            if (item.type === "task") {
              return (
                <View style={styles.taskCardContainer}>
                  <TaskCard task={item.task} type="available" />
                </View>
              );
            }
            return renderPrepListCard(item.prepList);
          }}
        />
      )}
    </View>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case "completed":
      return { backgroundColor: "#dcfce7" };
    case "in_progress":
      return { backgroundColor: "#dbeafe" };
    default:
      return { backgroundColor: "#f1f5f9" };
  }
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
    paddingVertical: 8,
  },
  clearButton: {
    fontSize: 16,
    color: "#94a3b8",
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  taskCardContainer: {
    marginBottom: 8,
  },
  prepListCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  prepListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  prepListName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
    textTransform: "capitalize",
  },
  prepListEvent: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  prepListStation: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  prepListProgress: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 3,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
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
