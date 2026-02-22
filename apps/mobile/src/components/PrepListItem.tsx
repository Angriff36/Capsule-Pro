import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import type { PrepListItem as PrepListItemType } from "../types";
import { useHaptics } from "../hooks";

interface PrepListItemProps {
  item: PrepListItemType;
  onToggleComplete: (item: PrepListItemType) => void;
  onAddNote: (item: PrepListItemType) => void;
}

export default function PrepListItem({
  item,
  onToggleComplete,
  onAddNote,
}: PrepListItemProps) {
  const haptics = useHaptics();
  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [0, 50, 100],
      outputRange: [0, 0, 1],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.swipeAction,
          styles.completeAction,
          { opacity: trans },
        ]}
      >
        <Text style={styles.swipeActionIcon}>✓</Text>
        <Text style={styles.swipeActionText}>Complete</Text>
      </Animated.View>
    );
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0, 0],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.swipeAction,
          styles.noteAction,
          { opacity: trans },
        ]}
      >
        <Text style={styles.swipeActionIcon}>📝</Text>
        <Text style={styles.swipeActionText}>Note</Text>
      </Animated.View>
    );
  };

  const handleSwipeLeftOpen = () => {
    haptics.success();
    onToggleComplete(item);
  };

  const handleSwipeRightOpen = () => {
    haptics.light();
    onAddNote(item);
  };

  const handleToggle = () => {
    haptics.selection();
    onToggleComplete(item);
  };

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableLeftOpen={handleSwipeLeftOpen}
      onSwipeableRightOpen={handleSwipeRightOpen}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[
          styles.container,
          item.completed && styles.containerCompleted,
        ]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            item.completed && styles.checkboxCompleted,
          ]}
        >
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.itemName,
                item.completed && styles.itemNameCompleted,
              ]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {item.notes && <Text style={styles.noteFlag}>📝</Text>}
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.quantity}>
              {item.quantity} {item.unit || "pcs"}
            </Text>
            {item.station && (
              <View style={styles.stationBadge}>
                <Text style={styles.stationText}>{item.station.name}</Text>
              </View>
            )}
          </View>
          {item.notes && (
            <Text style={styles.notePreview} numberOfLines={2}>
              📝 {item.notes}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  containerCompleted: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  itemNameCompleted: {
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  noteFlag: {
    fontSize: 14,
    marginLeft: 8,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  quantity: {
    fontSize: 14,
    color: "#64748b",
    marginRight: 8,
  },
  stationBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stationText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  notePreview: {
    fontSize: 13,
    color: "#d97706",
    marginTop: 6,
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
  },
  completeAction: {
    backgroundColor: "#10b981",
  },
  noteAction: {
    backgroundColor: "#f59e0b",
  },
  swipeActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
});
