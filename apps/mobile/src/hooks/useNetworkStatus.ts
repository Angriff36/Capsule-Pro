// Network status hook using @react-native-community/netinfo

import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Hook to track network connectivity status
 * Returns isOnline (true if connected with internet) and other connection details
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true, // Assume online initially to avoid flicker
    isConnected: null,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline =
        state.isConnected === true && state.isInternetReachable !== false;

      setNetworkStatus({
        isOnline,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Fetch initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      const isOnline =
        state.isConnected === true && state.isInternetReachable !== false;

      setNetworkStatus({
        isOnline,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
}
