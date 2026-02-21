import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
import {
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { AppNavigator } from "./src/navigation";
import { useNetworkStatus, useOfflineSync } from "./src/hooks";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { SignInScreen } from "./src/screens";
import { clearAuthTokenGetter, setAuthTokenGetter } from "./src/store";

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

function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return () => clearAuthTokenGetter();
  }, [getToken]);

  return null;
}

function MissingConfig() {
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 10 }}>
        Missing auth config
      </Text>
      <Text style={{ color: "#4b5563", fontSize: 16 }}>
        Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in the mobile app environment to
        enable sign in.
      </Text>
    </View>
  );
}

export default function App() {
  const publishableKey =
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <MissingConfig />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ClerkLoading>
              <View style={{ flex: 1 }} />
            </ClerkLoading>
            <ClerkLoaded>
              <SignedIn>
                <AuthTokenBridge />
                <AppContent />
              </SignedIn>
              <SignedOut>
                <SignInScreen />
              </SignedOut>
            </ClerkLoaded>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
