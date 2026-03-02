import { StyleSheet, View } from "react-native";

interface LoadingSkeletonProps {
  /** Width of the skeleton (number or percentage string) */
  width?: number | string;
  /** Height of the skeleton */
  height?: number;
  /** Border radius (default: 4) */
  borderRadius?: number;
  /** Additional style overrides */
  style?: object;
}

export default function LoadingSkeleton({
  width = "100%",
  height = 16,
  borderRadius = 4,
  style,
}: LoadingSkeletonProps) {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

interface LoadingCardProps {
  /** Number of skeleton lines to show */
  lines?: number;
  /** Show header skeleton */
  showHeader?: boolean;
}

export function LoadingCard({
  lines = 3,
  showHeader = true,
}: LoadingCardProps) {
  return (
    <View style={styles.card}>
      {showHeader && (
        <View style={styles.headerRow}>
          <LoadingSkeleton borderRadius={4} height={24} width={80} />
          <LoadingSkeleton borderRadius={4} height={24} width={60} />
        </View>
      )}
      <LoadingSkeleton
        borderRadius={4}
        height={20}
        style={styles.titleGap}
        width="90%"
      />
      {Array.from({ length: lines }).map((_, index) => (
        <LoadingSkeleton
          borderRadius={4}
          height={14}
          key={index}
          style={styles.lineGap}
          width={`${Math.random() * 30 + 60}%`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#e2e8f0",
  },
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
    marginBottom: 12,
  },
  titleGap: {
    marginBottom: 8,
  },
  lineGap: {
    marginBottom: 6,
  },
});
