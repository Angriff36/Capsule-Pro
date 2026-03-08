import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getAuthToken } from "../store/auth";
import { apiClient } from "../api/client";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushTokenResponse {
  pushToken: string;
  success: boolean;
}

export interface NotificationPreferences {
  taskAssigned: boolean;
  taskCompleted: boolean;
  eventReminder: boolean;
  scheduleChange: boolean;
  inventoryAlert: boolean;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permissions not granted");
    return false;
  }

  return true;
}

/**
 * Get the Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

/**
 * Register the push token with the backend
 */
export async function registerPushTokenWithBackend(
  token: string
): Promise<boolean> {
  try {
    const authToken = await getAuthToken();
    await apiClient<PushTokenResponse>("/api/mobile/push-token", {
      method: "POST",
      token: authToken ?? undefined,
      body: { pushToken: token },
    });
    return true;
  } catch (error) {
    console.error("Error registering push token:", error);
    return false;
  }
}

/**
 * Configure push notifications for the app
 * Call this on app startup
 */
export async function configurePushNotifications(): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  // Configure Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563eb",
    });
  }

  const token = await getExpoPushToken();
  if (token) {
    await registerPushTokenWithBackend(token);
  }

  return token;
}

/**
 * Set up notification received listener
 * Returns a subscription that should be removed on cleanup
 */
export function setupNotificationReceivedListener(
  onNotification: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(onNotification);
}

/**
 * Set up notification response listener (when user taps notification)
 * Returns a subscription that should be removed on cleanup
 */
export function setupNotificationResponseListener(
  onResponse: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(onResponse);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number,
  data?: Record<string, unknown>
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    return identifier;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

/**
 * Get notification preferences from backend
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    const authToken = await getAuthToken();
    const response = await apiClient<{ preferences: NotificationPreferences }>(
      "/api/mobile/notification-preferences",
      { token: authToken ?? undefined }
    );
    return response.preferences;
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return null;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    const authToken = await getAuthToken();
    await apiClient<{ success: boolean }>("/api/mobile/notification-preferences", {
      method: "PATCH",
      token: authToken ?? undefined,
      body: preferences,
    });
    return true;
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return false;
  }
}
