/** WCAG AAA high-contrast palettes — mirrors web `.high-contrast` tokens. */

export interface HighContrastPalette {
  background: string;
  border: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  sectionBackground: string;
  switchTrackOff: string;
  switchTrackOn: string;
}

export const standardPalette: HighContrastPalette = {
  background: "#f8fafc",
  border: "#e2e8f0",
  card: "#ffffff",
  foreground: "#0f172a",
  mutedForeground: "#64748b",
  primary: "#2563eb",
  primaryForeground: "#ffffff",
  sectionBackground: "#ffffff",
  switchTrackOff: "#e2e8f0",
  switchTrackOn: "#bfdbfe",
};

/** Light high-contrast (7:1+) — matches web `.high-contrast`. */
export const highContrastPalette: HighContrastPalette = {
  background: "#ffffff",
  border: "#000000",
  card: "#ffffff",
  foreground: "#000000",
  mutedForeground: "#1a1a1a",
  primary: "#000000",
  primaryForeground: "#ffffff",
  sectionBackground: "#ffffff",
  switchTrackOff: "#000000",
  switchTrackOn: "#00309e",
};
