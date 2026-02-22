import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TodayEvent } from "../types";

interface EventCardProps {
  event: TodayEvent;
  onPress: (event: TodayEvent) => void;
}

function getUrgencyColors(urgency: TodayEvent["urgency"]) {
  switch (urgency) {
    case "critical":
      return {
        border: "#f43f5e",
        background: "#fff1f2",
        badge: "#f43f5e",
        label: "Urgent",
      };
    case "warning":
      return {
        border: "#f59e0b",
        background: "#fffbeb",
        badge: "#f59e0b",
        label: "Soon",
      };
    default:
      return {
        border: "#10b981",
        background: "#ecfdf5",
        badge: "#10b981",
        label: "On Track",
      };
  }
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

export default function EventCard({ event, onPress }: EventCardProps) {
  const colors = getUrgencyColors(event.urgency);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: colors.border }]}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={[styles.cardContent, { backgroundColor: colors.background }]}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.eventName} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={styles.headerRight}>
            <View style={[styles.urgencyBadge, { backgroundColor: colors.badge }]}>
              <Text style={styles.urgencyText}>{colors.label}</Text>
            </View>
            <Text style={styles.chevron}>{">"}</Text>
          </View>
        </View>

        {/* Event details */}
        <View style={styles.detailsRow}>
          <Text style={styles.detailText}>
            {formatEventDate(event.startTime)}
          </Text>
          {event.headcount !== null && (
            <>
              <Text style={styles.dot}>{"\u2022"}</Text>
              <Text style={styles.detailText}>{event.headcount} guests</Text>
            </>
          )}
        </View>

        {/* Task counts */}
        <View style={styles.badgeRow}>
          {event.unclaimedPrepCount > 0 && (
            <View style={styles.unclaimedBadge}>
              <Text style={styles.unclaimedText}>
                {event.unclaimedPrepCount} unclaimed
              </Text>
            </View>
          )}
          {event.incompleteItemsCount > 0 && (
            <View style={styles.incompleteBadge}>
              <Text style={styles.incompleteText}>
                {event.incompleteItemsCount} items left
              </Text>
            </View>
          )}
          {event.unclaimedPrepCount === 0 && event.incompleteItemsCount === 0 && (
            <View style={styles.completeBadge}>
              <Text style={styles.completeText}>All prep complete</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  cardContent: {
    padding: 16,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  urgencyText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 16,
    color: "#94a3b8",
    marginLeft: 4,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#64748b",
  },
  dot: {
    fontSize: 14,
    color: "#94a3b8",
    marginHorizontal: 6,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  unclaimedBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unclaimedText: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "500",
  },
  incompleteBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incompleteText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "500",
  },
  completeBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "500",
  },
});
