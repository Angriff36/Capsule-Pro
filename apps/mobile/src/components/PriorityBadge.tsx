import { StyleSheet, Text, View } from "react-native";
import { priorityConfig } from "../types";

interface PriorityBadgeProps {
  /** Priority level (1-10, where 1 is highest priority) */
  priority: number;
  /** Size variant (default: medium) */
  size?: "small" | "medium";
}

export default function PriorityBadge({
  priority,
  size = "medium",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] ?? priorityConfig[5];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.color },
        size === "small" && styles.badgeSmall,
      ]}
    >
      <Text style={[styles.text, size === "small" && styles.textSmall]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  textSmall: {
    fontSize: 10,
  },
});
