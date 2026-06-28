import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  highContrastPalette,
  type HighContrastPalette,
  standardPalette,
} from "../theme/high-contrast";

interface HighContrastContextValue {
  colors: HighContrastPalette;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

const HighContrastContext = createContext<HighContrastContextValue>({
  colors: standardPalette,
  enabled: false,
  setEnabled: () => undefined,
  toggle: () => undefined,
});

export function HighContrastProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((current) => !current);
  }, []);

  const value = useMemo<HighContrastContextValue>(
    () => ({
      enabled,
      setEnabled,
      toggle,
      colors: enabled ? highContrastPalette : standardPalette,
    }),
    [enabled, setEnabled, toggle]
  );

  return (
    <HighContrastContext.Provider value={value}>
      {children}
    </HighContrastContext.Provider>
  );
}

export function useHighContrast(): HighContrastContextValue {
  return useContext(HighContrastContext);
}
