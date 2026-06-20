"use client";

import { useServerInsertedHTML } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * User-level display preferences: base font size and UI density.
 *
 * Orthogonal to the light/dark theme and to high-contrast mode. Each preference
 * toggles a single class on <html>:
 *   font size → `font-large` / `font-x-large` (default = no class), which drive the
 *               `--base-font-size` custom property consumed by `html { font-size }`.
 *   density   → `density-compact` / `density-spacious` (default = no class), which
 *               adjust list/table cell padding + row heights (see styles/globals.css).
 *
 * Per-device persistence + no-FOUC are handled here (localStorage + a blocking init
 * script, mirroring ThemeProvider / HighContrastProvider). Per-account persistence is
 * layered on by the app (see DisplayPreferencesAccountSync), which reconciles this
 * state with the user's stored preference on load and on change.
 */

export type FontSize = "default" | "large" | "x-large";
export type Density = "default" | "compact" | "spacious";

const FONT_SIZE_KEY = "display-font-size";
const DENSITY_KEY = "display-density";

const FONT_SIZE_CLASS: Record<FontSize, string> = {
  default: "",
  large: "font-large",
  "x-large": "font-x-large",
};

const DENSITY_CLASS: Record<Density, string> = {
  default: "",
  compact: "density-compact",
  spacious: "density-spacious",
};

const FONT_SIZE_VALUES: FontSize[] = ["default", "large", "x-large"];
const DENSITY_VALUES: Density[] = ["compact", "default", "spacious"];

interface DisplayPreferencesContextValue {
  /** Cycle to the next density (compact → default → spacious → compact). */
  cycleDensity: () => void;
  /** Cycle to the next font size (default → large → x-large → default). */
  cycleFontSize: () => void;
  density: Density;
  fontSize: FontSize;
  setDensity: (value: Density) => void;
  setFontSize: (value: FontSize) => void;
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue>(
  {
    fontSize: "default",
    density: "default",
    setFontSize: () => undefined,
    setDensity: () => undefined,
    cycleFontSize: () => undefined,
    cycleDensity: () => undefined,
  }
);

const readStored = <T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T
): T => {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const stored = localStorage.getItem(key);
    return allowed.includes(stored as T) ? (stored as T) : fallback;
  } catch {
    return fallback;
  }
};

const persist = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing or blocked storage — the class still applies for the session.
  }
};

/** Swap the active class for a preference group, removing the others. */
const applyClass = (active: string, all: Record<string, string>): void => {
  if (typeof document === "undefined") {
    return;
  }
  const { classList } = document.documentElement;
  for (const cls of Object.values(all)) {
    if (cls) {
      classList.remove(cls);
    }
  }
  if (active) {
    classList.add(active);
  }
};

/** Blocking init script — adds the classes before paint to avoid FOUC (mirrors the theme script). */
const INIT_SCRIPT = `(function(){try{var d=document.documentElement,m={${JSON.stringify(
  FONT_SIZE_KEY
)}:{large:"font-large","x-large":"font-x-large"},${JSON.stringify(
  DENSITY_KEY
)}:{compact:"density-compact",spacious:"density-spacious"}};for(var k in m){var v=localStorage.getItem(k),c=m[k][v];if(c){d.classList.add(c)}}}catch(e){}})();`;

export interface DisplayPreferencesProviderProps {
  children: ReactNode;
}

export const DisplayPreferencesProvider = ({
  children,
}: DisplayPreferencesProviderProps) => {
  useServerInsertedHTML(() => (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: blocking init must run before paint
      dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }}
      suppressHydrationWarning
    />
  ));

  const [fontSize, setFontSizeState] = useState<FontSize>(() =>
    readStored(FONT_SIZE_KEY, FONT_SIZE_VALUES, "default")
  );
  const [density, setDensityState] = useState<Density>(() =>
    readStored(DENSITY_KEY, DENSITY_VALUES, "default")
  );

  const setFontSize = useCallback((next: FontSize) => {
    setFontSizeState(next);
    persist(FONT_SIZE_KEY, next);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    persist(DENSITY_KEY, next);
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontSizeState((current) => {
      const next =
        FONT_SIZE_VALUES[
          (FONT_SIZE_VALUES.indexOf(current) + 1) % FONT_SIZE_VALUES.length
        ];
      persist(FONT_SIZE_KEY, next);
      return next;
    });
  }, []);

  const cycleDensity = useCallback(() => {
    setDensityState((current) => {
      const next =
        DENSITY_VALUES[
          (DENSITY_VALUES.indexOf(current) + 1) % DENSITY_VALUES.length
        ];
      persist(DENSITY_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    applyClass(FONT_SIZE_CLASS[fontSize], FONT_SIZE_CLASS);
  }, [fontSize]);

  useEffect(() => {
    applyClass(DENSITY_CLASS[density], DENSITY_CLASS);
  }, [density]);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FONT_SIZE_KEY) {
        setFontSizeState(
          readStored(FONT_SIZE_KEY, FONT_SIZE_VALUES, "default")
        );
      } else if (event.key === DENSITY_KEY) {
        setDensityState(readStored(DENSITY_KEY, DENSITY_VALUES, "default"));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<DisplayPreferencesContextValue>(
    () => ({
      fontSize,
      density,
      setFontSize,
      setDensity,
      cycleFontSize,
      cycleDensity,
    }),
    [fontSize, density, setFontSize, setDensity, cycleFontSize, cycleDensity]
  );

  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
};

export const useDisplayPreferences = (): DisplayPreferencesContextValue =>
  useContext(DisplayPreferencesContext);
