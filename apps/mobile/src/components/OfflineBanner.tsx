// Offline banner component to show network status

import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

export interface OfflineBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

export function OfflineBanner({
  isOnline,
  isSyncing,
  pendingCount,
}: OfflineBannerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    // Animate in when going offline or syncing
    if (!isOnline || isSyncing || pendingCount > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (isOnline && !isSyncing && pendingCount === 0) {
      // Briefly show "synced" message then fade out
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, pendingCount, fadeAnim]);

  // Don't render if online with no pending items and not just came online
  if (isOnline && !isSyncing && pendingCount === 0 && prevOnlineRef.current) {
    return null;
  }

  prevOnlineRef.current = isOnline;

  // Determine banner state
  const getState = () => {
    if (!isOnline) {
      return {
        message: "You're offline. Changes will sync when connected.",
        backgroundColor: "#ef4444",
        iconName: "\u26A0", // Warning sign
      };
    }
    if (isSyncing) {
      return {
        message: `Syncing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}...`,
        backgroundColor: "#f59e0b",
        iconName: "\u21BB", // Refresh arrow
      };
    }
    if (pendingCount > 0) {
      return {
        message: `${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending`,
        backgroundColor: "#f59e0b",
        iconName: "\u26A0",
      };
    }
    // Just came online and synced
    return {
      message: "All changes synced",
      backgroundColor: "#22c55e",
      iconName: "\u2713", // Check mark
    };
  };

  const { message, backgroundColor, iconName } = getState();

  return (
    <Animated.View
      style={[styles.container, { backgroundColor, opacity: fadeAnim }]}
    >
      <Text style={styles.icon}>{iconName}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
    color: "#ffffff",
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
  },
});
