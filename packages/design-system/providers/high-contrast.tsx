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
 * High-contrast accessibility mode.
 *
 * Orthogonal to the light/dark theme: it toggles a single `high-contrast` class on
 * <html> that layers WCAG AAA (7:1) token overrides on top of whichever theme is active
 * (see the `.high-contrast` / `.high-contrast.dark` blocks in styles/globals.css). The
 * ThemeProvider only ever adds/removes the `light`/`dark` classes, so the two never collide.
 *
 * Per-device persistence + no-FOUC are handled here (localStorage + a blocking init script).
 * Per-account persistence is layered on by the app (see HighContrastAccountSync), which
 * reconciles this state with the user's stored preference on load and on change.
 */

const STORAGE_KEY = "high-contrast";
const CLASS_NAME = "high-contrast";

interface HighContrastContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

const HighContrastContext = createContext<HighContrastContextValue>({
  enabled: false,
  setEnabled: () => undefined,
  toggle: () => undefined,
});

const readStored = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const persist = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Private browsing or blocked storage — the class still applies for the session.
  }
};

const applyToDocument = (enabled: boolean): void => {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle(CLASS_NAME, enabled);
  }
};

/** Blocking init script — adds the class before paint to avoid FOUC (mirrors the theme script). */
const INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  STORAGE_KEY
)},c=${JSON.stringify(
  CLASS_NAME
)};if(localStorage.getItem(k)==="true"){document.documentElement.classList.add(c)}}catch(e){}})();`;

/** Default shortcut: Ctrl/Cmd + Alt + C (avoids the screen-reader-reserved Alt+Shift combos). */
const defaultShortcut = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) &&
  event.altKey &&
  (event.key === "c" || event.key === "C");

export interface HighContrastProviderProps {
  children: ReactNode;
  /** Predicate that fires the toggle. Pass `null` to disable the keyboard shortcut. */
  shortcut?: ((event: KeyboardEvent) => boolean) | null;
}

export const HighContrastProvider = ({
  children,
  shortcut = defaultShortcut,
}: HighContrastProviderProps) => {
  useServerInsertedHTML(() => (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: blocking init must run before paint
      dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }}
      suppressHydrationWarning
    />
  ));

  const [enabled, setEnabledState] = useState<boolean>(() => readStored());

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((current) => {
      const next = !current;
      persist(next);
      return next;
    });
  }, []);

  useEffect(() => {
    applyToDocument(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!shortcut) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (shortcut(event)) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, toggle]);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setEnabledState(event.newValue === "true");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<HighContrastContextValue>(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle]
  );

  return (
    <HighContrastContext.Provider value={value}>
      {children}
    </HighContrastContext.Provider>
  );
};

export const useHighContrast = (): HighContrastContextValue =>
  useContext(HighContrastContext);
