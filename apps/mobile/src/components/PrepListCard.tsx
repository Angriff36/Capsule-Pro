import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { PrepList } from "../types";

interface PrepListCardProps {
  prepList: PrepList;
  onPress: (prepList: PrepList) => void;
}

function getCompletionPercentage(list: PrepList): number {
  if (list.totalCount === 0) {
    return 0;
  }
  return Math.round((list.completedCount / list.totalCount) * 100);
}

function getCompletionColor(percentage: number): string {
  if (percentage >= 100) {
    return "#10b981"; // emerald-500
  }
  if (percentage >= 50) {
    return "#f59e0b"; // amber-500
  }
  return "#cbd5e1"; // slate-300
}

export default function PrepListCard({ prepList, onPress }: PrepListCardProps) {
  const completionPercentage = getCompletionPercentage(prepList);
  const completionColor = getCompletionColor(completionPercentage);
  const isComplete = completionPercentage >= 100;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(prepList)}
      activeOpacity={0.7}
    >
      {/* Header: Name and Station */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {prepList.name}
          </Text>
          {prepList.station && (
            <View style={styles.stationBadge}>
              <Text style={styles.stationText}>{prepList.station.name}</Text>
            </View>
          )}
        </View>
        {isComplete && (
          <Text style={styles.checkIcon}>✓</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressCount}>
            {prepList.completedCount}/{prepList.totalCount} items
          </Text>
          <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${completionPercentage}%`, backgroundColor: completionColor },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  stationBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  stationText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  checkIcon: {
    fontSize: 24,
    color: "#10b981",
    fontWeight: "700",
  },
  progressContainer: {
    marginTop: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressCount: {
    fontSize: 14,
    color: "#64748b",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
});
