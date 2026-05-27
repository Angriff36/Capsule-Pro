"use client";

import { useServerInsertedHTML } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeToDocument,
  buildThemeInitScript,
  disableThemeTransitions,
  getSystemTheme,
  resolveThemeValue,
} from "./theme-script";

const DEFAULT_THEMES = ["light", "dark"] as const;
const STORAGE_KEY = "theme";

export interface ThemeProviderProps {
  children: ReactNode;
  attribute?: "class" | `data-${string}`;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
  forcedTheme?: string;
  themes?: string[];
  nonce?: string;
}

interface ThemeContextValue {
  theme: string | undefined;
  setTheme: (theme: string | ((current: string | undefined) => string)) => void;
  forcedTheme?: string;
  resolvedTheme: string | undefined;
  themes: string[];
  systemTheme: "light" | "dark" | undefined;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: undefined,
  setTheme: () => undefined,
  resolvedTheme: undefined,
  themes: [],
  systemTheme: undefined,
});

const readStoredTheme = (storageKey: string, defaultTheme: string): string => {
  if (typeof window === "undefined") {
    return defaultTheme;
  }
  try {
    return localStorage.getItem(storageKey) ?? defaultTheme;
  } catch {
    return defaultTheme;
  }
};

export const ThemeProvider = ({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = STORAGE_KEY,
  forcedTheme,
  themes = [...DEFAULT_THEMES],
  nonce,
}: ThemeProviderProps) => {
  useServerInsertedHTML(() => (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: blocking theme init must run before paint
      dangerouslySetInnerHTML={{
        __html: buildThemeInitScript({
          attribute,
          storageKey,
          defaultTheme,
          themes,
          enableSystem,
        }),
      }}
      suppressHydrationWarning
    />
  ));

  const [theme, setThemeState] = useState<string>(() =>
    readStoredTheme(storageKey, defaultTheme)
  );
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
    getSystemTheme()
  );

  const activeTheme = forcedTheme ?? theme;
  const resolvedTheme = resolveThemeValue(activeTheme, enableSystem);

  const applyTheme = useCallback(
    (nextTheme: string) => {
      const resolved = resolveThemeValue(nextTheme, enableSystem);
      const restoreTransitions = disableTransitionOnChange
        ? disableThemeTransitions(nonce)
        : undefined;
      applyThemeToDocument(resolved, attribute, themes);
      restoreTransitions?.();
    },
    [attribute, disableTransitionOnChange, enableSystem, nonce, themes]
  );

  const setTheme = useCallback(
    (value: string | ((current: string | undefined) => string)) => {
      setThemeState((current) => {
        const next = typeof value === "function" ? value(current) : value;
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // Private browsing or blocked storage — theme still applies for session.
        }
        return next;
      });
    },
    [storageKey]
  );

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme, applyTheme]);

  useEffect(() => {
    if (!enableSystem) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const nextSystemTheme = getSystemTheme();
      setSystemTheme(nextSystemTheme);
      if (activeTheme === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [activeTheme, applyTheme, enableSystem]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return;
      }
      setThemeState(event.newValue ?? defaultTheme);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme, storageKey]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme: activeTheme,
      setTheme,
      forcedTheme,
      resolvedTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme: enableSystem ? systemTheme : undefined,
    }),
    [
      activeTheme,
      enableSystem,
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme,
      themes,
    ]
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
