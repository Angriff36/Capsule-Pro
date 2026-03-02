import { StyleSheet, Text, View } from "react-native";

interface StationBadgeProps {
  /** Station name to display */
  name: string;
  /** Size variant (default: medium) */
  size?: "small" | "medium";
  /** Custom background color (default: #f1f5f9) */
  backgroundColor?: string;
  /** Custom text color (default: #475569) */
  textColor?: string;
}

export default function StationBadge({
  name,
  size = "medium",
  backgroundColor = "#f1f5f9",
  textColor = "#475569",
}: StationBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
        size === "small" && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor },
          size === "small" && styles.textSmall,
        ]}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
  textSmall: {
    fontSize: 10,
  },
});
