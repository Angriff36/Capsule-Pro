import { StyleSheet, Text, View } from "react-native";

interface ProgressBarProps {
  /** Current progress value (0-100) */
  progress: number;
  /** Height of the progress bar (default: 8) */
  height?: number;
  /** Whether to show the percentage label (default: false) */
  showLabel?: boolean;
  /** Custom color for the fill (overrides automatic color) */
  color?: string;
  /** Custom background color (default: #e2e8f0) */
  backgroundColor?: string;
}

function getProgressColor(progress: number): string {
  if (progress >= 100) {
    return "#10b981"; // emerald-500
  }
  if (progress >= 50) {
    return "#f59e0b"; // amber-500
  }
  return "#cbd5e1"; // slate-300
}

export default function ProgressBar({
  progress,
  height = 8,
  showLabel = false,
  color,
  backgroundColor = "#e2e8f0",
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const fillColor = color ?? getProgressColor(clampedProgress);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.percentage}>{clampedProgress}%</Text>
        </View>
      )}
      <View
        style={[
          styles.background,
          { height, backgroundColor },
          { borderRadius: height / 2 },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: fillColor,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  percentage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  background: {
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
