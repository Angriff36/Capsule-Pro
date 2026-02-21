// Offline queue using AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OfflineQueueItem } from "../types";

const OFFLINE_QUEUE_KEY = "offline_queue";

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return queueJson ? (JSON.parse(queueJson) as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

export async function addToOfflineQueue(item: OfflineQueueItem): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push(item);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromOfflineQueue(itemId: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== itemId);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}
