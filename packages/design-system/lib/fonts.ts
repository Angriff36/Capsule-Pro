import { cn } from "@repo/design-system/lib/utils";
import { GeistMono } from "geist/font/mono";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";

const brandSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-brand-sans",
  display: "swap",
});

const brandDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-brand-display",
  display: "swap",
});

export const fonts = cn(
  brandSans.variable,
  brandDisplay.variable,
  GeistMono.variable,
  "touch-manipulation font-sans antialiased"
);
