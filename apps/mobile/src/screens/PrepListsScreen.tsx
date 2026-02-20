import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { usePrepLists } from "../api/queries";
import { PrepListCard } from "../components";
import type { PrepList, PrepListStackParamList } from "../types";

type NavigationProp = StackNavigationProp<PrepListStackParamList, "PrepListsIndex">;

// Group prep lists by event
interface EventGroup {
  eventKey: string;
  event: PrepList["event"];
  lists: PrepList[];
}

function formatEventDate(dateString: string | null): string {
  if (!dateString) {
    return "No date";
  }

  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow, ${timeStr}`;
  }

  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${dayName}, ${month} ${day}, ${timeStr}`;
}

export default function PrepListsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: prepLists, isLoading, error, refetch, isRefetching } = usePrepLists({ status: "active" });

  // Group prep lists by event
  const groupedData = useMemo((): EventGroup[] => {
    if (!prepLists) return [];

    const grouped = prepLists.reduce<Record<string, EventGroup>>((acc, list) => {
      const eventKey = list.event?.id || "no-event";
      if (!acc[eventKey]) {
        acc[eventKey] = {
          eventKey,
          event: list.event,
          lists: [],
        };
      }
      acc[eventKey].lists.push(list);
      return acc;
    }, {});

    // Sort: events with dates first, then no-event items
    return Object.values(grouped).sort((a, b) => {
      // No-event items go last
      if (a.eventKey === "no-event") return 1;
      if (b.eventKey === "no-event") return -1;

      // Sort by event start time
      const aTime = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
      const bTime = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
      return aTime - bTime;
    });
  }, [prepLists]);

  const handlePrepListPress = useCallback(
    (prepList: PrepList) => {
      navigation.navigate("PrepListDetail", { id: prepList.id, eventId: prepList.eventId ?? undefined });
    },
    [navigation]
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading prep lists...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Failed to load prep lists</Text>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : "Something went wrong"}
        </Text>
        <Text style={styles.retryHint}>Pull down to retry</Text>
      </View>
    );
  }

  // Empty state
  if (!groupedData || groupedData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Prep Lists</Text>
          <Text style={styles.subtitle}>No active lists</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>No prep lists</Text>
          <Text style={styles.emptySubtitle}>
            Prep lists for upcoming events will appear here.
          </Text>
        </View>
      </View>
    );
  }

  // Render section header (event info)
  const renderSectionHeader = (group: EventGroup) => {
    if (!group.event) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.noEventText}>General Prep Lists</Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.eventCalendarIcon}>📅</Text>
        <Text style={styles.eventName}>{group.event.name}</Text>
        <Text style={styles.eventDate}>{formatEventDate(group.event.startTime)}</Text>
      </View>
    );
  };

  // Render prep list item
  const renderPrepListItem = ({ item }: { item: PrepList }) => (
    <PrepListCard prepList={item} onPress={handlePrepListPress} />
  );

  // Render event group section
  const renderSection = ({ item: group }: { item: EventGroup }) => (
    <View style={styles.section}>
      {renderSectionHeader(group)}
      {group.lists.map((list) => (
        <View key={list.id} style={styles.cardWrapper}>
          <PrepListCard prepList={list} onPress={handlePrepListPress} />
        </View>
      ))}
    </View>
  );

  // Count total prep lists
  const totalLists = prepLists?.length || 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.eventKey}
        renderItem={renderSection}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Prep Lists</Text>
            <Text style={styles.subtitle}>
              {totalLists} active list{totalLists !== 1 ? "s" : ""}
            </Text>
          </View>
        }
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  eventCalendarIcon: {
    fontSize: 16,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  eventDate: {
    fontSize: 14,
    color: "#94a3b8",
  },
  noEventText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#94a3b8",
  },
  cardWrapper: {
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  retryHint: {
    fontSize: 12,
    color: "#94a3b8",
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
  },
});
