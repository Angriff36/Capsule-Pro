import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryText?: string;
}

export default function ErrorState({
  message = "Something went wrong",
  onRetry,
  retryText = "Try Again",
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerIcon}>⚠️</Text>
      <Text numberOfLines={2} style={styles.bannerMessage}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRetry}
          style={styles.bannerRetry}
        >
          <Text style={styles.bannerRetryText}>Retry</Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onDismiss}
          style={styles.bannerDismiss}
        >
          <Text style={styles.bannerDismissText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  bannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bannerMessage: {
    flex: 1,
    fontSize: 14,
    color: "#991b1b",
  },
  bannerRetry: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  bannerRetryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  bannerDismiss: {
    padding: 4,
    marginLeft: 8,
  },
  bannerDismissText: {
    fontSize: 16,
    color: "#991b1b",
  },
});
