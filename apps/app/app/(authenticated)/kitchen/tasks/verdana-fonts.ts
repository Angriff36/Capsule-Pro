import { cn } from "@repo/design-system/lib/utils";
import { DM_Sans, Fira_Code, Plus_Jakarta_Sans } from "next/font/google";

const verdanaDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--vh-font-display",
  display: "swap",
});

const verdanaBody = DM_Sans({
  subsets: ["latin"],
  variable: "--vh-font-body",
  display: "swap",
});

const verdanaMono = Fira_Code({
  subsets: ["latin"],
  variable: "--vh-font-mono",
  display: "swap",
});

/** Scoped to `[data-verdana-health]` on `/kitchen/tasks` only. */
export const verdanaFontVariables = cn(
  verdanaDisplay.variable,
  verdanaBody.variable,
  verdanaMono.variable
);
