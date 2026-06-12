type ThemeScriptOptions = {
  attribute: string;
  storageKey: string;
  defaultTheme: string;
  themes: readonly string[];
  enableSystem: boolean;
};

/** Blocking script injected via useServerInsertedHTML — avoids FOUC without a React-tree <script>. */
export function buildThemeInitScript({
  attribute,
  storageKey,
  defaultTheme,
  themes,
  enableSystem,
}: ThemeScriptOptions): string {
  return `(function(){try{var d=document.documentElement,t=${JSON.stringify(themes)},a=${JSON.stringify(attribute)},k=${JSON.stringify(storageKey)},def=${JSON.stringify(defaultTheme)},sys=${enableSystem};var s=localStorage.getItem(k)||def;var r=s==="system"&&sys?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":s;if(a==="class"){d.classList.remove.apply(d.classList,t);d.classList.add(r)}else{d.setAttribute(a,r)}d.style.colorScheme=r}catch(e){}})();`;
}

export function disableThemeTransitions(
  nonce?: string
): (() => void) | undefined {
  if (typeof document === "undefined") {
    return;
  }

  const style = document.createElement("style");
  if (nonce) {
    style.setAttribute("nonce", nonce);
  }
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
    )
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveThemeValue(
  theme: string,
  enableSystem: boolean
): "light" | "dark" {
  if (theme === "system" && enableSystem) {
    return getSystemTheme();
  }
  return theme === "dark" ? "dark" : "light";
}

export function applyThemeToDocument(
  resolved: "light" | "dark",
  attribute: string,
  themes: readonly string[]
): void {
  const root = document.documentElement;
  if (attribute === "class") {
    root.classList.remove(...themes);
    root.classList.add(resolved);
  } else {
    root.setAttribute(attribute, resolved);
  }
  root.style.colorScheme = resolved;
}
