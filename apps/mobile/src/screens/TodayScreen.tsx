import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { useEventsToday } from "../api/queries";
import EventCard from "../components/EventCard";
import type { TodayEvent } from "../types";

export default function TodayScreen() {
  // Use the tab navigation to switch to PrepListsTab, which will navigate internally
  const navigation = useNavigation();

  const { data: events, isLoading, isError, error, refetch, isRefetching } = useEventsToday();

  const handleEventPress = useCallback(
    (event: TodayEvent) => {
      // Navigate to the Prep Lists tab, which has the stack navigator
      // The PrepListsScreen will handle showing the list filtered by eventId
      // For now, we navigate to the tab - future enhancement: pass params to auto-open detail
      navigation.navigate("PrepListsTab" as never);

      // Future: Could use navigation.navigate with nested structure:
      // navigation.navigate("PrepListsTab", { screen: "PrepListDetail", params: { id: event.prepListIds[0] } });
    },
    [navigation]
  );

  const renderEvent = useCallback(
    ({ item }: { item: TodayEvent }) => (
      <EventCard event={item} onPress={handleEventPress} />
    ),
    [handleEventPress]
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Failed to load events</Text>
          <Text style={styles.errorSubtitle}>
            {error?.message || "Please try again."}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{"\u{1F4C5}"}</Text>
        <Text style={styles.emptyTitle}>No events today</Text>
        <Text style={styles.emptySubtitle}>
          Events with prep work will appear here.
        </Text>
      </View>
    );
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={events ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor="#2563eb"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.subtitle}>{dateStr}</Text>
          </View>
        }
        ListEmptyComponent={renderEmpty}
      />
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
  },
  header: {
    marginBottom: 16,
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
