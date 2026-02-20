import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View } from "react-native";
import { AppNavigator } from "./src/navigation";
import { useNetworkStatus, useOfflineSync } from "./src/hooks";
import { OfflineBanner } from "./src/components/OfflineBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { isOnline } = useNetworkStatus();
  const { syncStatus } = useOfflineSync();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <OfflineBanner
        isOnline={isOnline}
        isSyncing={syncStatus.isSyncing}
        pendingCount={syncStatus.pendingCount}
      />
      <AppNavigator />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
