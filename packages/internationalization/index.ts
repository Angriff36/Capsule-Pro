import "server-only";
import type en from "./dictionaries/en.json";
import languine from "./languine.json" with { type: "json" };

export const locales = [
  languine.locale.source,
  ...languine.locale.targets,
] as const;

export type Dictionary = typeof en;

type Locale = (typeof locales)[number];

/**
 * Safely validates and normalizes a locale string for use with Intl APIs.
 * Handles edge cases like whitespace, empty strings, malformed locales, and invalid locales.
 * 
 * @param locale - The locale string to validate (may be undefined, null, or malformed)
 * @returns A valid locale string safe for Intl APIs, defaults to "en"
 */
export function safeLocale(locale: unknown): Locale {
  // Handle undefined/null/empty
  if (locale === undefined || locale === null) {
    return "en";
  }
  
  // Must be a string
  if (typeof locale !== "string") {
    return "en";
  }
  
  // Trim whitespace and get base locale (e.g., "en-US" -> "en", "en_US" -> "en")
  const trimmed = locale.trim();
  if (!trimmed) {
    return "en";
  }
  
  // Extract base locale (handle both "-" and "_" separators)
  const base = trimmed.split(/[-_]/)[0]?.toLowerCase();
  if (!base) {
    return "en";
  }
  
  // Validate against known locales
  if (locales.includes(base as Locale)) {
    return base as Locale;
  }
  
  return "en";
}

/**
 * Validates if a locale string is supported.
 * 
 * @param locale - The locale string to validate
 * @returns true if the locale is supported, false otherwise
 */
export function isValidLocale(locale: unknown): boolean {
  return safeLocale(locale) !== "en" || locale === "en";
}

const dictionaries: Record<string, () => Promise<Dictionary>> =
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      () =>
        import(`./dictionaries/${locale}.json`)
          .then((mod) => mod.default)
          .catch((_err) =>
            import("./dictionaries/en.json").then((mod) => mod.default)
          ),
    ])
  );

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  const normalizedLocale = safeLocale(locale);

  try {
    return await dictionaries[normalizedLocale]();
  } catch (_error) {
    return dictionaries.en();
  }
};
