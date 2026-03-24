import type { Dictionary } from "@repo/internationalization";
import { MoveDownLeft, MoveUpRight } from "lucide-react";

// Valid locales from languine config - must match packages/internationalization/languine.json
const VALID_LOCALES = ["en", "es", "de", "zh", "fr", "pt"] as const;

/**
 * Safely validates and normalizes a locale string for use with Intl APIs.
 * Handles edge cases like whitespace, empty strings, and invalid locales.
 * 
 * @param locale - The locale string to validate (may be undefined or malformed)
 * @returns A valid locale string safe for Intl APIs, defaults to "en"
 */
function safeLocale(locale: string | undefined): string {
  // Handle undefined/null/empty
  if (!locale || typeof locale !== "string") {
    return "en";
  }
  
  // Trim whitespace and get base locale (e.g., "en-US" -> "en")
  const trimmed = locale.trim();
  if (!trimmed) {
    return "en";
  }
  
  const base = trimmed.split("-")[0]?.toLowerCase() || "en";
  
  // Validate against known locales
  if (VALID_LOCALES.includes(base as typeof VALID_LOCALES[number])) {
    return base;
  }
  
  return "en";
}

/**
 * Safely formats a number using Intl.NumberFormat with error handling.
 * Falls back to basic string formatting if Intl fails.
 */
function safeFormatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    // Fallback to basic formatting if Intl fails (shouldn't happen with safeLocale, but belt-and-suspenders)
    return value.toLocaleString();
  }
}

interface StatsProps {
  dictionary: Dictionary;
  locale?: string;
}

export const Stats = ({ dictionary, locale }: StatsProps) => {
  const safeLocaleValue = safeLocale(locale);
  
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-left font-regular text-xl tracking-tighter md:text-5xl lg:max-w-xl">
                {dictionary.web.home.stats.title}
              </h2>
              <p className="text-left text-lg text-muted-foreground leading-relaxed tracking-tight lg:max-w-sm">
                {dictionary.web.home.stats.description}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-2 lg:grid-cols-2">
              {dictionary.web.home.stats.items.map((item) => (
                <div
                  className="flex flex-col justify-between gap-0 rounded-md border p-6"
                  key={item.title}
                >
                  {Number.parseFloat(item.delta) > 0 ? (
                    <MoveUpRight className="mb-10 h-4 w-4 text-primary" />
                  ) : (
                    <MoveDownLeft className="mb-10 h-4 w-4 text-destructive" />
                  )}
                  <h2 className="flex max-w-xl flex-row items-end gap-4 text-left font-regular text-4xl tracking-tighter">
                    {item.type === "currency" && "$"}
                    {safeFormatNumber(Number.parseFloat(item.metric), safeLocaleValue)}
                    <span className="text-muted-foreground text-sm tracking-normal">
                      {Number.parseFloat(item.delta) > 0 ? "+" : ""}
                      {item.delta}%
                    </span>
                  </h2>
                  <p className="max-w-xl text-left text-base text-muted-foreground leading-relaxed tracking-tight">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
