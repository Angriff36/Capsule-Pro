import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "../store/auth";
import { apiClient } from "../api/client";
import {
  configurePushNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "../notifications/push-handlers";

interface AppSettings {
  hapticFeedback: boolean;
  autoRefresh: boolean;
  autoRefreshInterval: number;
}

interface SettingsResponse {
  settings: AppSettings;
}

async function fetchAppSettings(): Promise<AppSettings> {
  const token = await getAuthToken();
  const response = await apiClient<SettingsResponse>("/api/mobile/app-settings", {
    token: token ?? undefined,
  });
  return response.settings;
}

async function updateAppSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const token = await getAuthToken();
  const response = await apiClient<SettingsResponse>("/api/mobile/app-settings", {
    method: "PATCH",
    token: token ?? undefined,
    body: data,
  });
  return response.settings;
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();

  // Local state for immediate UI feedback
  const [pushEnabled, setPushEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Fetch notification preferences
  const { data: notificationPrefs, isLoading: isLoadingPrefs } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: getNotificationPreferences,
  });

  // Fetch app settings
  const { data: appSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: fetchAppSettings,
  });

  // Update app settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: updateAppSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["appSettings"], updatedSettings);
    },
  });

  // Update notification preferences mutation
  const updateNotifMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (updatedPrefs) => {
      queryClient.setQueryData(["notificationPreferences"], updatedPrefs);
    },
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (appSettings) {
      setHapticEnabled(appSettings.hapticFeedback);
      setAutoRefreshEnabled(appSettings.autoRefresh);
    }
  }, [appSettings]);

  // Check push notification permission status
  useEffect(() => {
    async function checkPushStatus() {
      const { status } = await Notifications.getPermissionsAsync();
      setPushEnabled(status === "granted");
    }
    void checkPushStatus();
  }, []);

  const handleTogglePush = useCallback(async (value: boolean) => {
    if (value) {
      const token = await configurePushNotifications();
      if (token) {
        setPushEnabled(true);
        Alert.alert("Success", "Push notifications enabled");
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings"
        );
      }
    } else {
      // Can't really disable push from app, just inform user
      Alert.alert(
        "Info",
        "To disable notifications, please go to your device settings"
      );
    }
  }, []);

  const handleToggleHaptic = useCallback((value: boolean) => {
    setHapticEnabled(value);
    updateSettingsMutation.mutate({ hapticFeedback: value });
  }, [updateSettingsMutation]);

  const handleToggleAutoRefresh = useCallback((value: boolean) => {
    setAutoRefreshEnabled(value);
    updateSettingsMutation.mutate({ autoRefresh: value });
  }, [updateSettingsMutation]);

  const handleToggleNotificationType = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      updateNotifMutation.mutate({ [key]: value });
    },
    [updateNotifMutation]
  );

  const handleClearCache = useCallback(() => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached data. You may need to reload content.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            queryClient.clear();
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ]
    );
  }, [queryClient]);

  const isLoading = isLoadingPrefs || isLoadingSettings;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive alerts on your device
            </Text>
          </View>
          <Switch
            onValueChange={handleTogglePush}
            trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
            thumbColor={pushEnabled ? "#2563eb" : "#f4f3f4"}
            value={pushEnabled}
          />
        </View>

        {pushEnabled && notificationPrefs && (
          <>
            <View style={styles.divider} />
            <Text style={styles.subsectionTitle}>Notification Types</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Task Assignments</Text>
              <Switch
                onValueChange={(v) => handleToggleNotificationType("taskAssigned", v)}
                trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
                thumbColor={notificationPrefs.taskAssigned ? "#2563eb" : "#f4f3f4"}
                value={notificationPrefs.taskAssigned}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Task Completions</Text>
              <Switch
                onValueChange={(v) => handleToggleNotificationType("taskCompleted", v)}
                trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
                thumbColor={notificationPrefs.taskCompleted ? "#2563eb" : "#f4f3f4"}
                value={notificationPrefs.taskCompleted}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Event Reminders</Text>
              <Switch
                onValueChange={(v) => handleToggleNotificationType("eventReminder", v)}
                trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
                thumbColor={notificationPrefs.eventReminder ? "#2563eb" : "#f4f3f4"}
                value={notificationPrefs.eventReminder}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Schedule Changes</Text>
              <Switch
                onValueChange={(v) => handleToggleNotificationType("scheduleChange", v)}
                trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
                thumbColor={notificationPrefs.scheduleChange ? "#2563eb" : "#f4f3f4"}
                value={notificationPrefs.scheduleChange}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Inventory Alerts</Text>
              <Switch
                onValueChange={(v) => handleToggleNotificationType("inventoryAlert", v)}
                trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
                thumbColor={notificationPrefs.inventoryAlert ? "#2563eb" : "#f4f3f4"}
                value={notificationPrefs.inventoryAlert}
              />
            </View>
          </>
        )}
      </View>

      {/* App Behavior Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Behavior</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Text style={styles.settingDescription}>
              Vibration on interactions
            </Text>
          </View>
          <Switch
            onValueChange={handleToggleHaptic}
            trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
            thumbColor={hapticEnabled ? "#2563eb" : "#f4f3f4"}
            value={hapticEnabled}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Refresh</Text>
            <Text style={styles.settingDescription}>
              Automatically update task lists
            </Text>
          </View>
          <Switch
            onValueChange={handleToggleAutoRefresh}
            trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
            thumbColor={autoRefreshEnabled ? "#2563eb" : "#f4f3f4"}
            value={autoRefreshEnabled}
          />
        </View>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <TouchableOpacity onPress={handleClearCache} style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Clear Cache</Text>
            <Text style={styles.settingDescription}>
              Free up storage space
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Build</Text>
          <Text style={styles.settingValue}>2026.03.08</Text>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity style={styles.settingRow}>
          <Text style={styles.settingLabel}>Help Center</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <Text style={styles.settingLabel}>Contact Support</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <Text style={styles.settingLabel}>Privacy Policy</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <Text style={styles.settingLabel}>Terms of Service</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  section: {
    backgroundColor: "#ffffff",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    marginTop: 8,
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    minHeight: 44,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: "#0f172a",
  },
  settingDescription: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  settingValue: {
    fontSize: 16,
    color: "#64748b",
  },
  chevron: {
    fontSize: 20,
    color: "#94a3b8",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 4,
  },
});
