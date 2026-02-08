/**
 * Utility functions and formatters for event details.
 *
 * IMPORTANT: Intl formatters are wrapped in functions to ensure
 * consistent locale handling between server and client rendering.
 * This prevents hydration mismatches.
 */

/**
 * Hydration-safe currency formatter.
 * Memoize this in your component if using frequently.
 */
export const createCurrencyFormatter = (locale = "en-US") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
};

/**
 * Format a currency value using the specified locale.
 */
export const formatCurrency = (value: number, locale = "en-US"): string => {
  return createCurrencyFormatter(locale).format(value);
};

/**
 * Hydration-safe short date formatter (month: short, day: numeric).
 */
export const createShortDateFormatter = (locale = "en-US") => {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });
};

/**
 * Hydration-safe calendar date formatter for calendar URLs (YYYY-MM-DD format).
 */
export const createCalendarDateFormatter = () => {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Format event format enum to display label.
 */
export const formatEventFormat = (value?: string | null): string => {
  if (!value) {
    return "Format not set";
  }
  if (value === "in_person") {
    return "In-person";
  }
  if (value === "virtual") {
    return "Virtual";
  }
  if (value === "hybrid") {
    return "Hybrid";
  }
  return value;
};

/**
 * Format duration from milliseconds to human-readable string.
 */
export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Scale recipe ingredients based on servings and yield quantity.
 */
export const scaleIngredients = (
  ingredients: import("../event-details-types").RecipeIngredientSummary[],
  dishServings: number,
  yieldQuantity: number
): Array<
  import("../event-details-types").RecipeIngredientSummary & {
    scaledQuantity: number;
  }
> => {
  const servingsMultiplier = dishServings / Math.max(1, yieldQuantity);
  return ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity:
      Math.round(ingredient.quantity * servingsMultiplier * 100) / 100,
  }));
};

/**
 * Date utility functions.
 */
export const startOfDay = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const endOfDay = (date: Date) => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
};

export const addDays = (date: Date, days: number) => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

/**
 * Get the time zone label for the current locale.
 */
export const getTimeZoneLabel = (): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
  }).formatToParts(new Date());
  const timeZone = parts.find((part) => part.type === "timeZoneName");
  return timeZone?.value ?? "Local time";
};

/**
 * Build a Google Calendar URL for the event.
 */
export const buildCalendarUrl = (
  eventTitle: string,
  eventDate: Date,
  eventType: string | null | undefined,
  venueName: string | null | undefined,
  venueAddress: string | null | undefined,
  notes: string | null | undefined
): string => {
  const calendarDateFormatter = createCalendarDateFormatter();
  const start = calendarDateFormatter.format(eventDate).replace(/-/g, "");
  const end = calendarDateFormatter
    .format(addDays(eventDate, 1))
    .replace(/-/g, "");
  const title = encodeURIComponent(eventTitle);
  const details = encodeURIComponent(
    [eventType ? `Event type: ${eventType}` : "", notes ?? ""]
      .filter(Boolean)
      .join("\n")
  );
  const location = encodeURIComponent(
    [venueName, venueAddress].filter(Boolean).join(" · ")
  );
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
};
